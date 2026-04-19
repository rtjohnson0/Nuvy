package handlers

import (
	"net/http"
	"strings"

	"nuvy-backend/internal/models"
)

func (s *Store) GetDeployments(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	writeJSON(w, http.StatusOK, s.Deployments)
}

func (s *Store) GetDeploymentLogs(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/deployments/")
	if path == "" {
		writeError(w, http.StatusBadRequest, "deployment id is required")
		return
	}

	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "logs" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	deploymentID := parts[0]

	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, deployment := range s.Deployments {
		if deployment.ID == deploymentID {
			writeJSON(w, http.StatusOK, map[string][]string{
				"logs": deployment.Logs,
			})
			return
		}
	}

	writeError(w, http.StatusNotFound, "deployment not found")
}

func countProjectDeployments(projectID string, deployments []models.Deployment) int {
	count := 0
	for _, d := range deployments {
		if d.ProjectID == projectID {
			count++
		}
	}
	return count
}