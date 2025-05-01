package main

import (
  "log"
  "net/http"

  "github.com/gorilla/mux"
  "your-module/config"
  "your-module/handlers"
)
func main() {
  config.Init()

  r := mux.NewRouter()
  handlers.RegisterUpload(r)
  handlers.RegisterDeploy(r)
  handlers.RegisterStatus(r)

  log.Println("Starting backend on :8080")
  log.Fatal(http.ListenAndServe(":8080", r))
}
