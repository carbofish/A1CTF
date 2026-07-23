package securitytool

import (
	"bytes"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
)

// MagicBytesValidator validates file content by checking magic bytes
type MagicBytesValidator struct {
	AllowedTypes map[string][]byte // extension -> magic bytes prefix
}

var (
	ErrInvalidMagicBytes = errors.New("file content does not match allowed types")
	ErrEmptyFile         = errors.New("file is empty")
)

// NewMagicBytesValidator creates a new validator with common web file types
func NewMagicBytesValidator() *MagicBytesValidator {
	return &MagicBytesValidator{
		AllowedTypes: map[string][]byte{
			".jpg":  {0xFF, 0xD8, 0xFF},
			".jpeg": {0xFF, 0xD8, 0xFF},
			".png":  {0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
			".gif":  {0x47, 0x49, 0x46, 0x38},
			".webp": {0x52, 0x49, 0x46, 0x46},
			".pdf":  {0x25, 0x50, 0x44, 0x46},
			".zip":  {0x50, 0x4B, 0x03, 0x04},
			".svg":  {0x3C, 0x3F, 0x78, 0x6D, 0x6C}, // <?xml
			".ico":  {0x00, 0x00, 0x01, 0x00},
		},
	}
}

// ValidateFile validates a file's magic bytes match its extension
func (v *MagicBytesValidator) ValidateFile(file *multipart.FileHeader, extension string) error {
	if file.Size == 0 {
		return ErrEmptyFile
	}

	magic, ok := v.AllowedTypes[extension]
	if !ok {
		return errors.New("file type not allowed: " + extension)
	}

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	header := make([]byte, len(magic))
	n, err := io.ReadFull(src, header)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		return err
	}
	if n < len(magic) {
		return ErrInvalidMagicBytes
	}

	if !bytes.Equal(header, magic) {
		return ErrInvalidMagicBytes
	}

	return nil
}

// ValidateFileContent validates raw bytes against allowed types
func (v *MagicBytesValidator) ValidateFileContent(data []byte, extension string) error {
	if len(data) == 0 {
		return ErrEmptyFile
	}

	magic, ok := v.AllowedTypes[extension]
	if !ok {
		return errors.New("file type not allowed: " + extension)
	}

	if len(data) < len(magic) {
		return ErrInvalidMagicBytes
	}

	if !bytes.Equal(data[:len(magic)], magic) {
		return ErrInvalidMagicBytes
	}

	return nil
}

// DetectContentType detects file content type from magic bytes (like http.DetectContentType)
func (v *MagicBytesValidator) DetectContentType(data []byte) string {
	if len(data) < 8 {
		return "application/octet-stream"
	}

	// Check against magic bytes
	for ext, magic := range v.AllowedTypes {
		if len(data) >= len(magic) && bytes.Equal(data[:len(magic)], magic) {
			switch ext {
			case ".jpg", ".jpeg":
				return "image/jpeg"
			case ".png":
				return "image/png"
			case ".gif":
				return "image/gif"
			case ".webp":
				return "image/webp"
			case ".pdf":
				return "application/pdf"
			case ".zip":
				return "application/zip"
			case ".svg":
				return "image/svg+xml"
			case ".ico":
				return "image/x-icon"
			}
		}
	}

	return http.DetectContentType(data)
}
