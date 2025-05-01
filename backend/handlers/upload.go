package handlers

import (
  "fmt"
  "io"
  "net/http"
  "os"
  "path/filepath"

  "github.com/gorilla/mux"
  "your-module/config"
)

func UploadHandler(w http.ResponseWriter, r *http.Request) {
  // limit to 50MB
  r.ParseMultipartForm(50 << 20)
  file, hdr, err := r.FormFile("zip")
  if err != nil {
    http.Error(w, "file field 'zip' missing", http.StatusBadRequest)
    return
  }
  defer file.Close()

  dest := filepath.Join(config.UploadDir, hdr.Filename)
  out, err := os.Create(dest)
  if err != nil {
    http.Error(w, "cannot save file", http.StatusInternalServerError)
    return
  }
  defer out.Close()
  io.Copy(out, file)

  // mock: return a project ID
  projectID := fmt.Sprintf("%d", os.Getpid()) // or any stub
  w.WriteHeader(http.StatusCreated)
  w.Write([]byte(projectID))
}

func RegisterUpload(r *mux.Router) {
  r.HandleFunc("/upload", UploadHandler).Methods("POST")
}