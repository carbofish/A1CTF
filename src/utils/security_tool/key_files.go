package securitytool

import (
	"log"
	"os"
)

// SecureKeyFiles sets restrictive permissions on sensitive key files
func SecureKeyFiles(keyFiles ...string) {
	for _, file := range keyFiles {
		if file == "" {
			continue
		}
		// Set file permissions to 600 (owner read/write only)
		if err := os.Chmod(file, 0600); err != nil {
			if !os.IsNotExist(err) {
				log.Printf("Warning: Failed to set permissions on %s: %v", file, err)
			}
		}
	}
}

// VerifyKeyFilePermissions checks if key files have secure permissions
func VerifyKeyFilePermissions(keyFiles ...string) []string {
	var insecureFiles []string
	for _, file := range keyFiles {
		if file == "" {
			continue
		}
		info, err := os.Stat(file)
		if err != nil {
			if !os.IsNotExist(err) {
				insecureFiles = append(insecureFiles, file+": cannot stat")
			}
			continue
		}
		mode := info.Mode().Perm()
		// Check if group or others have any permissions
		if mode&0077 != 0 {
			insecureFiles = append(insecureFiles, file+": permissions too open")
		}
	}
	return insecureFiles
}
