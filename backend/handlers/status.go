package handlers

import (
  "encoding/json"
  "net/http"

  "github.com/gorilla/mux"
)

func StatusHandler(w http.ResponseWriter, r *http.Request) {
  // return mock status
  status := map[string]string{
    "status": "Success",
  }
  json.NewEncoder(w).Encode(status)
}

func RegisterStatus(r *mux.Router) {
  r.HandleFunc("/status/{projectID}", StatusHandler).Methods("GET")
}
