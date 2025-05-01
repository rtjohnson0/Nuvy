package handlers

import (
  "encoding/json"
  "net/http"

  "github.com/gorilla/mux"
  "your-module/service"
)

type deployReq struct {
  ProjectID string `json:"project_id"`
}

func DeployHandler(w http.ResponseWriter, r *http.Request) {
  var req deployReq
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    http.Error(w, "invalid JSON", http.StatusBadRequest)
    return
  }

  // stubbed deploy
  success, logOutput := service.RunTerraform(req.ProjectID)

  resp := map[string]interface{}{
    "success": success,
    "log":     logOutput,
  }
  code := http.StatusOK
  if !success {
    code = http.StatusInternalServerError
  }
  w.WriteHeader(code)
  json.NewEncoder(w).Encode(resp)
}

func RegisterDeploy(r *mux.Router) {
  r.HandleFunc("/deploy", DeployHandler).Methods("POST")
}
