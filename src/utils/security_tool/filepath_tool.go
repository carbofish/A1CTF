package securitytool

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

var (
	ErrPathTraversal     = errors.New("path traversal attack detected")
	ErrInvalidBasePath   = errors.New("invalid base path")
	ErrInvalidTargetPath = errors.New("invalid target path")
	ErrPathNotInBase     = errors.New("target path is not within base directory")
)

// SecurePathValidator 安全路径验证器
type SecurePathValidator struct {
	// 是否启用严格模式（禁止符号链接）
	StrictMode bool
	// 是否允许相对路径
	AllowRelativePaths bool
	// 禁止的路径模式
	ForbiddenPatterns []string
}

// NewSecurePathValidator 创建新的安全路径验证器
func NewSecurePathValidator() *SecurePathValidator {
	return &SecurePathValidator{
		StrictMode:         true,
		AllowRelativePaths: true,
		ForbiddenPatterns: []string{
			"..",   // 父目录引用
			"~",    // 用户主目录
			"$",    // 环境变量
			"|",    // 管道符
			";",    // 命令分隔符
			"&",    // 后台执行
			"`",    // 命令替换
			"<",    // 重定向
			">",    // 重定向
			"\x00", // 空字节
			"\n",   // 换行符
			"\r",   // 回车符
		},
	}
}

// ValidatePathSafety 验证目标路径是否安全地位于基础目录内
func (v *SecurePathValidator) ValidatePathSafety(basePath, targetPath string) (string, error) {
	// 1. 基础验证
	if basePath == "" {
		return "", ErrInvalidBasePath
	}
	if targetPath == "" {
		return "", ErrInvalidTargetPath
	}

	// 2. 检查禁止的字符和模式
	if err := v.checkForbiddenPatterns(targetPath); err != nil {
		return "", err
	}

	// 3. 标准化路径（处理各种路径分隔符和相对路径）
	cleanBasePath, err := v.normalizePath(basePath)
	if err != nil {
		return "", fmt.Errorf("failed to normalize base path: %w", err)
	}

	cleanTargetPath, err := v.normalizePath(targetPath)
	if err != nil {
		return "", fmt.Errorf("failed to normalize target path: %w", err)
	}

	// 4. 转换为绝对路径
	absBasePath, err := filepath.Abs(cleanBasePath)
	if err != nil {
		return "", fmt.Errorf("failed to get absolute base path: %w", err)
	}

	absTargetPath, err := filepath.Abs(cleanTargetPath)
	if err != nil {
		return "", fmt.Errorf("failed to get absolute target path: %w", err)
	}

	// 5. 确保路径以目录分隔符结尾（避免前缀匹配误判）
	absBasePath = ensureTrailingSeparator(absBasePath)

	// 6. 检查目标路径是否在基础目录内（使用更严格的检查）
	// 使用 filepath.Rel 来检查路径是否在基础目录内
	rel, err := filepath.Rel(absBasePath, absTargetPath)
	if err != nil {
		return "", ErrPathNotInBase
	}
	
	// 如果相对路径以 ".." 开头，说明目标路径在基础目录之外
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", ErrPathNotInBase
	}

	// 7. 严格模式下检查符号链接
	if v.StrictMode {
		if err := v.checkSymlinks(absTargetPath, absBasePath); err != nil {
			return "", err
		}
	}

	// 8. 额外的安全检查
	if err := v.additionalSecurityChecks(absTargetPath); err != nil {
		return "", err
	}

	return absTargetPath, nil
}

// SecureJoin 安全地连接路径
func (v *SecurePathValidator) SecureJoin(basePath string, elements ...string) (string, error) {
	if basePath == "" {
		return "", ErrInvalidBasePath
	}

	// 逐个验证每个路径元素
	for _, element := range elements {
		if err := v.checkForbiddenPatterns(element); err != nil {
			return "", fmt.Errorf("invalid path element '%s': %w", element, err)
		}
	}

	// 构建目标路径
	targetPath := filepath.Join(append([]string{basePath}, elements...)...)

	// 验证安全性
	if _, err := v.ValidatePathSafety(basePath, targetPath); err != nil {
		return "", err
	}

	return targetPath, nil
}

// checkForbiddenPatterns 检查禁止的字符和模式
func (v *SecurePathValidator) checkForbiddenPatterns(path string) error {
	for _, pattern := range v.ForbiddenPatterns {
		if strings.Contains(path, pattern) {
			return fmt.Errorf("%w: forbidden pattern '%s' detected in path", ErrPathTraversal, pattern)
		}
	}

	// 检查 URL 编码的危险字符
	dangerousEncoded := []string{
		"%2e%2e",    // ..
		"%2f",       // /
		"%5c",       // \
		"%00",       // null byte
		"..%2f",     // ../
		"..%5c",     // ..\
		"%2e%2e%2f", // ../
		"%2e%2e%5c", // ..\
	}

	lowerPath := strings.ToLower(path)
	for _, encoded := range dangerousEncoded {
		if strings.Contains(lowerPath, encoded) {
			return fmt.Errorf("%w: URL encoded traversal pattern detected", ErrPathTraversal)
		}
	}

	return nil
}

// normalizePath 标准化路径
func (v *SecurePathValidator) normalizePath(path string) (string, error) {
	// 处理不同操作系统的路径分隔符
	if runtime.GOOS == "windows" {
		path = strings.ReplaceAll(path, "/", "\\")
	} else {
		path = strings.ReplaceAll(path, "\\", "/")
	}

	// 清理路径
	cleanPath := filepath.Clean(path)

	// 检查清理后是否包含父目录引用
	if strings.Contains(cleanPath, "..") {
		return "", fmt.Errorf("%w: parent directory reference found after cleaning", ErrPathTraversal)
	}

	// 如果不允许相对路径，确保路径是绝对路径
	if !v.AllowRelativePaths && !filepath.IsAbs(cleanPath) {
		return "", fmt.Errorf("%w: relative path not allowed", ErrInvalidTargetPath)
	}

	return cleanPath, nil
}

// checkSymlinks 检查符号链接（严格模式）
func (v *SecurePathValidator) checkSymlinks(targetPath, basePath string) error {
	// 检查路径中的每个组件是否包含符号链接
	currentPath := targetPath
	for {
		// 检查当前路径是否是符号链接
		if info, err := os.Lstat(currentPath); err == nil {
			if info.Mode()&os.ModeSymlink != 0 {
				// 解析符号链接
				realPath, err := filepath.EvalSymlinks(currentPath)
				if err != nil {
					return fmt.Errorf("failed to resolve symlink: %w", err)
				}

				// 检查符号链接指向的真实路径是否在基础目录内
				if !strings.HasPrefix(realPath+string(filepath.Separator), basePath) {
					return fmt.Errorf("%w: symlink points outside base directory", ErrPathTraversal)
				}
			}
		}

		// 移动到父目录
		parentPath := filepath.Dir(currentPath)
		if parentPath == currentPath || !strings.HasPrefix(currentPath, basePath) {
			break
		}
		currentPath = parentPath
	}

	return nil
}

// additionalSecurityChecks 额外的安全检查
func (v *SecurePathValidator) additionalSecurityChecks(path string) error {
	// 检查路径长度（防止缓冲区溢出）
	if len(path) > 4096 {
		return fmt.Errorf("path too long: %d characters", len(path))
	}

	// 检查是否包含控制字符
	for _, char := range path {
		if char < 32 && char != '\t' {
			return fmt.Errorf("%w: control character detected", ErrPathTraversal)
		}
	}

	// Windows 特定检查
	if runtime.GOOS == "windows" {
		// 检查保留名称
		reservedNames := []string{
			"CON", "PRN", "AUX", "NUL",
			"COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
			"LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
		}

		filename := strings.ToUpper(filepath.Base(path))
		for _, reserved := range reservedNames {
			if filename == reserved || strings.HasPrefix(filename, reserved+".") {
				return fmt.Errorf("reserved filename: %s", filename)
			}
		}

		// 检查文件名结尾的点和空格
		if strings.HasSuffix(filename, ".") || strings.HasSuffix(filename, " ") {
			return fmt.Errorf("invalid filename ending")
		}
	}

	return nil
}

// ensureTrailingSeparator 确保路径以分隔符结尾
func ensureTrailingSeparator(path string) string {
	sep := string(filepath.Separator)
	if !strings.HasSuffix(path, sep) {
		return path + sep
	}
	return path
}
