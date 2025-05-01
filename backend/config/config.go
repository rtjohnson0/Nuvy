package config

import (
  "log"
  "os"
)

var UploadDir string

func Init() {
  UploadDir = os.Getenv("NUVY_UPLOAD_DIR")
  if UploadDir == "" {
    UploadDir = "./uploads"
  }
  if err := os.MkdirAll(UploadDir, 0755); err != nil {
    log.Fatalf("failed to create upload dir: %v", err)
  }
}