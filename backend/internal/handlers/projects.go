package handlers

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"nuvy-backend/internal/models"
	"nuvy-backend/internal/services"
)

type Store struct {
	mu          sync.RWMutex
	Projects    []models.Project
	Deployments []models.Deployment
	S3          *services.S3Service
}

func NewStore(s3Service *services.S3Service) *Store {
	now1 := time.Now().Add(-2 * time.Hour)
	now2 := time.Now().Add(-1 * time.Hour)
	now3 := time.Now().Add(-4 * time.Hour)

	projects := []models.Project{
		{
			ID:              "proj_1",
			Name:            "FinePoint Landing",
			Status:          "Live",
			Type:            "React",
			Source:          "ZIP Upload",
			URL:             "http://example.com/projects/finepoint-landing/",
			Updated:         now1.Format(time.RFC3339),
			UpdatedLabel:    now1.Format("Jan 2, 2006 3:04 PM"),
			DeploymentCount: 1,
			UploadedFile:    "finepoint-landing.zip",
			LatestLogLine:   "Deployment successful.",
		},
		{
			ID:              "proj_2",
			Name:            "Nuvy Marketing",
			Status:          "Deploying",
			Type:            "Static",
			Source:          "GitHub Repo",
			URL:             "http://example.com/projects/nuvy-marketing/",
			Updated:         now2.Format(time.RFC3339),
			UpdatedLabel:    now2.Format("Jan 2, 2006 3:04 PM"),
			DeploymentCount: 1,
			LatestLogLine:   "Cloning repository...",
		},
		{
			ID:              "proj_3",
			Name:            "Portfolio V3",
			Status:          "Error",
			Type:            "React",
			Source:          "ZIP Upload",
			URL:             "http://example.com/projects/portfolio-v3/",
			Updated:         now3.Format(time.RFC3339),
			UpdatedLabel:    now3.Format("Jan 2, 2006 3:04 PM"),
			DeploymentCount: 1,
			UploadedFile:    "portfolio-v3.zip",
			LatestLogLine:   "Validation failed: no deployable index.html found.",
		},
	}

	deployments := []models.Deployment{
		{
			ID:           "dep_1",
			ProjectID:    "proj_1",
			Project:      "FinePoint Landing",
			Status:       "Live",
			Date:         now1.Format(time.RFC3339),
			DateLabel:    now1.Format("Jan 2, 2006 3:04 PM"),
			URL:          "http://example.com/projects/finepoint-landing/",
			UploadedFile: "finepoint-landing.zip",
			Logs: []string{
				"Deployment initialized.",
				"ZIP uploaded successfully.",
				"ZIP extracted successfully.",
				"Deploy root detected.",
				"Uploading files to S3...",
				"Live URL: http://example.com/projects/finepoint-landing/",
				"Deployment successful.",
			},
		},
		{
			ID:        "dep_2",
			ProjectID: "proj_2",
			Project:   "Nuvy Marketing",
			Status:    "Deploying",
			Date:      now2.Format(time.RFC3339),
			DateLabel: now2.Format("Jan 2, 2006 3:04 PM"),
			URL:       "http://example.com/projects/nuvy-marketing/",
			RepoURL:   "https://github.com/example/nuvy-marketing",
			Logs: []string{
				"Deployment initialized.",
				"Cloning repository...",
			},
		},
		{
			ID:           "dep_3",
			ProjectID:    "proj_3",
			Project:      "Portfolio V3",
			Status:       "Error",
			Date:         now3.Format(time.RFC3339),
			DateLabel:    now3.Format("Jan 2, 2006 3:04 PM"),
			URL:          "http://example.com/projects/portfolio-v3/",
			UploadedFile: "portfolio-v3.zip",
			Logs: []string{
				"Deployment initialized.",
				"ZIP uploaded successfully.",
				"ZIP extracted successfully.",
				"Validation failed: no deployable index.html found.",
			},
		},
	}

	return &Store{
		Projects:    projects,
		Deployments: deployments,
		S3:          s3Service,
	}
}

func (s *Store) GetProjects(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	writeJSON(w, http.StatusOK, s.Projects)
}

func (s *Store) CreateProjectDeployment(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(25 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "failed to parse form data")
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	siteType := strings.TrimSpace(r.FormValue("siteType"))
	customDomain := strings.TrimSpace(r.FormValue("customDomain"))
	repoURL := strings.TrimSpace(r.FormValue("repoURL"))

	if name == "" {
		writeError(w, http.StatusBadRequest, "project name is required")
		return
	}

	file, fileHeader, err := r.FormFile("zipFile")
	hasZip := err == nil

	if !hasZip && repoURL == "" {
		writeError(w, http.StatusBadRequest, "zip file or repository URL is required")
		return
	}

	if hasZip && repoURL != "" {
		writeError(w, http.StatusBadRequest, "choose either a zip file or a repository URL")
		return
	}

	projectID := fmt.Sprintf("proj_%d", time.Now().UnixNano())
	deploymentID := fmt.Sprintf("dep_%d", time.Now().UnixNano())

	source := "GitHub Repo"
	projectType := "React"
	initialStatus := "Queued"

	if strings.ToLower(siteType) == "static" {
		projectType = "Static"
	}
	if hasZip {
		source = "ZIP Upload"
		initialStatus = "Uploading"
	}

	now := time.Now()
	url := fmt.Sprintf("http://placeholder.local/projects/%s/", slugify(name))
	if customDomain != "" {
		url = fmt.Sprintf("https://%s", customDomain)
	}

	project := models.Project{
		ID:              projectID,
		Name:            name,
		Status:          initialStatus,
		Type:            projectType,
		Source:          source,
		URL:             url,
		Updated:         now.Format(time.RFC3339),
		UpdatedLabel:    now.Format("Jan 2, 2006 3:04 PM"),
		DeploymentCount: 1,
		LatestLogLine:   "Deployment initialized.",
	}

	deployment := models.Deployment{
		ID:        deploymentID,
		ProjectID: projectID,
		Project:   name,
		Status:    initialStatus,
		Date:      now.Format(time.RFC3339),
		DateLabel: now.Format("Jan 2, 2006 3:04 PM"),
		URL:       url,
		RepoURL:   repoURL,
		Logs:      []string{"Deployment initialized."},
	}

	var uploadedZipPath string

	if hasZip {
		defer file.Close()

		if filepath.Ext(strings.ToLower(fileHeader.Filename)) != ".zip" {
			writeError(w, http.StatusBadRequest, "only .zip files are allowed")
			return
		}

		zipPath, zipName, err := saveUploadedFile(file, fileHeader)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to save uploaded file")
			return
		}
		uploadedZipPath = zipPath

		extractDir := filepath.Join("tmp", "extracted", deploymentID)
		if err := unzipArchive(zipPath, extractDir); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to extract zip file")
			return
		}

		// cleanup uploaded zip right after successful extraction
		_ = os.Remove(zipPath)

		deployRoot, err := findDeployableRoot(extractDir)
		if err != nil {
			_ = os.RemoveAll(extractDir)
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		deployment.UploadedFile = zipName
		deployment.ExtractedPath = extractDir
		deployment.DeployRootPath = deployRoot
		deployment.Logs = append(deployment.Logs,
			"ZIP uploaded successfully.",
			"ZIP extracted successfully.",
			"Deploy root detected: "+deployRoot,
		)

		project.UploadedFile = zipName
		project.DeployRootPath = deployRoot
		project.LatestLogLine = "Deploy root detected: " + deployRoot
	}

	s.mu.Lock()
	s.Projects = append([]models.Project{project}, s.Projects...)
	s.Deployments = append([]models.Deployment{deployment}, s.Deployments...)
	s.mu.Unlock()

	go s.simulateDeployment(deploymentID, projectID, source, uploadedZipPath)

	resp := models.CreateDeploymentResponse{
		Project:    project,
		Deployment: deployment,
	}

	writeJSON(w, http.StatusCreated, resp)
}

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
			writeJSON(w, http.StatusOK, map[string]any{
				"logs":   deployment.Logs,
				"status": deployment.Status,
			})
			return
		}
	}

	writeError(w, http.StatusNotFound, "deployment not found")
}

func (s *Store) setDeploymentStatus(deploymentID, projectID, status string) {
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.Deployments {
		if s.Deployments[i].ID == deploymentID {
			s.Deployments[i].Status = status
			s.Deployments[i].Date = now.Format(time.RFC3339)
			s.Deployments[i].DateLabel = now.Format("Jan 2, 2006 3:04 PM")
			if len(s.Deployments[i].Logs) > 0 {
				latest := s.Deployments[i].Logs[len(s.Deployments[i].Logs)-1]
				for j := range s.Projects {
					if s.Projects[j].ID == projectID {
						s.Projects[j].LatestLogLine = latest
						break
					}
				}
			}
			break
		}
	}

	for i := range s.Projects {
		if s.Projects[i].ID == projectID {
			s.Projects[i].Status = status
			s.Projects[i].Updated = now.Format(time.RFC3339)
			s.Projects[i].UpdatedLabel = now.Format("Jan 2, 2006 3:04 PM")
			break
		}
	}
}

func saveUploadedFile(file multipart.File, header *multipart.FileHeader) (string, string, error) {
	uploadDir := filepath.Join("tmp", "uploads")
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", "", err
	}

	safeName := fmt.Sprintf("%d-%s", time.Now().UnixNano(), sanitizeFilename(header.Filename))
	fullPath := filepath.Join(uploadDir, safeName)

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", "", err
	}

	return fullPath, safeName, nil
}

func unzipArchive(zipPath, destDir string) error {
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return err
	}

	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, f := range reader.File {
		targetPath := filepath.Join(destDir, f.Name)

		cleanDest := filepath.Clean(destDir) + string(os.PathSeparator)
		cleanTarget := filepath.Clean(targetPath)
		if !strings.HasPrefix(cleanTarget, cleanDest) && cleanTarget != filepath.Clean(destDir) {
			return fmt.Errorf("invalid zip content")
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(targetPath, 0o755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return err
		}

		src, err := f.Open()
		if err != nil {
			return err
		}

		dst, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			src.Close()
			return err
		}

		_, copyErr := io.Copy(dst, src)
		closeErr1 := dst.Close()
		closeErr2 := src.Close()

		if copyErr != nil {
			return copyErr
		}
		if closeErr1 != nil {
			return closeErr1
		}
		if closeErr2 != nil {
			return closeErr2
		}
	}

	return nil
}

func findDeployableRoot(extractDir string) (string, error) {
	rootIndex := filepath.Join(extractDir, "index.html")
	if fileExists(rootIndex) {
		return extractDir, nil
	}

	commonDirs := []string{
		filepath.Join(extractDir, "build"),
		filepath.Join(extractDir, "dist"),
		filepath.Join(extractDir, "public"),
	}
	for _, dir := range commonDirs {
		if fileExists(filepath.Join(dir, "index.html")) {
			return dir, nil
		}
	}

	entries, err := os.ReadDir(extractDir)
	if err == nil && len(entries) == 1 && entries[0].IsDir() {
		nestedRoot := filepath.Join(extractDir, entries[0].Name())

		if fileExists(filepath.Join(nestedRoot, "index.html")) {
			return nestedRoot, nil
		}

		for _, dirName := range []string{"build", "dist", "public"} {
			candidate := filepath.Join(nestedRoot, dirName)
			if fileExists(filepath.Join(candidate, "index.html")) {
				return candidate, nil
			}
		}
	}

	found, err := findIndexHTMLRecursively(extractDir, 4)
	if err == nil && found != "" {
		return filepath.Dir(found), nil
	}

	return "", fmt.Errorf("no deployable index.html found in uploaded zip")
}

func findIndexHTMLRecursively(root string, maxDepth int) (string, error) {
	type queueItem struct {
		path  string
		depth int
	}

	queue := []queueItem{{path: root, depth: 0}}

	for len(queue) > 0 {
		item := queue[0]
		queue = queue[1:]

		if item.depth > maxDepth {
			continue
		}

		entries, err := os.ReadDir(item.path)
		if err != nil {
			continue
		}

		for _, entry := range entries {
			fullPath := filepath.Join(item.path, entry.Name())

			if entry.IsDir() {
				queue = append(queue, queueItem{path: fullPath, depth: item.depth + 1})
				continue
			}

			if strings.EqualFold(entry.Name(), "index.html") {
				return fullPath, nil
			}
		}
	}

	return "", fmt.Errorf("index.html not found")
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, " ", "-")
	return name
}

func (s *Store) appendLog(deploymentID, projectID, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.Deployments {
		if s.Deployments[i].ID == deploymentID {
			s.Deployments[i].Logs = append(s.Deployments[i].Logs, message)
			break
		}
	}

	for i := range s.Projects {
		if s.Projects[i].ID == projectID {
			s.Projects[i].LatestLogLine = message
			break
		}
	}
}

func (s *Store) simulateDeployment(deploymentID, projectID, source, uploadedZipPath string) {
	var deployRoot string
	var projectName string
	var extractedPath string

	s.mu.RLock()
	for _, d := range s.Deployments {
		if d.ID == deploymentID {
			deployRoot = d.DeployRootPath
			projectName = d.Project
			extractedPath = d.ExtractedPath
			break
		}
	}
	s.mu.RUnlock()

	var steps []string
	var statuses []string

	if source == "GitHub Repo" {
		steps = []string{
			"Cloning repository...",
			"Installing dependencies...",
			"Building production bundle...",
			"Deploying assets to static host...",
		}
		statuses = []string{
			"Cloning",
			"Building",
			"Building",
			"Deploying",
		}
	} else {
		steps = []string{
			"Validating project...",
			"Preparing static bundle...",
			"Uploading files to S3...",
		}
		statuses = []string{
			"Validating",
			"Preparing",
			"Uploading to S3",
		}
	}

	for i, step := range steps {
		time.Sleep(1200 * time.Millisecond)
		s.setDeploymentStatus(deploymentID, projectID, statuses[i])
		s.appendLog(deploymentID, projectID, step)
	}

	finalURL := ""
	var uploadErr error

	if source == "ZIP Upload" && deployRoot != "" {
		projectSlug := slugify(projectName)
		finalURL, uploadErr = s.S3.UploadDirectory(context.Background(), deployRoot, projectSlug)
	}

	time.Sleep(1200 * time.Millisecond)
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	if uploadErr != nil {
		for i := range s.Deployments {
			if s.Deployments[i].ID == deploymentID {
				s.Deployments[i].Status = "Error"
				s.Deployments[i].Date = now.Format(time.RFC3339)
				s.Deployments[i].DateLabel = now.Format("Jan 2, 2006 3:04 PM")
				s.Deployments[i].Logs = append(s.Deployments[i].Logs, "S3 upload failed: "+uploadErr.Error())
				break
			}
		}

		for i := range s.Projects {
			if s.Projects[i].ID == projectID {
				s.Projects[i].Status = "Error"
				s.Projects[i].Updated = now.Format(time.RFC3339)
				s.Projects[i].UpdatedLabel = now.Format("Jan 2, 2006 3:04 PM")
				s.Projects[i].LatestLogLine = "S3 upload failed: " + uploadErr.Error()
				break
			}
		}

		if extractedPath != "" {
			_ = os.RemoveAll(extractedPath)
		}
		if uploadedZipPath != "" {
			_ = os.Remove(uploadedZipPath)
		}
		return
	}

	for i := range s.Deployments {
		if s.Deployments[i].ID == deploymentID {
			s.Deployments[i].Status = "Live"
			s.Deployments[i].Date = now.Format(time.RFC3339)
			s.Deployments[i].DateLabel = now.Format("Jan 2, 2006 3:04 PM")
			if finalURL != "" {
				s.Deployments[i].URL = finalURL
				s.Deployments[i].Logs = append(s.Deployments[i].Logs, "Live URL: "+finalURL)
			}
			s.Deployments[i].Logs = append(s.Deployments[i].Logs, "Deployment successful.")
			break
		}
	}

	for i := range s.Projects {
		if s.Projects[i].ID == projectID {
			s.Projects[i].Status = "Live"
			s.Projects[i].Updated = now.Format(time.RFC3339)
			s.Projects[i].UpdatedLabel = now.Format("Jan 2, 2006 3:04 PM")
			if finalURL != "" {
				s.Projects[i].URL = finalURL
				s.Projects[i].LatestLogLine = "Deployment successful."
			}
			break
		}
	}

	// cleanup after successful S3 upload
	if extractedPath != "" {
		_ = os.RemoveAll(extractedPath)
	}
	if uploadedZipPath != "" {
		_ = os.Remove(uploadedZipPath)
	}
}

func slugify(input string) string {
	input = strings.ToLower(strings.TrimSpace(input))
	var b strings.Builder
	lastDash := false

	for _, r := range input {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastDash = false
		} else if !lastDash {
			b.WriteRune('-')
			lastDash = true
		}
	}

	result := strings.Trim(b.String(), "-")
	if result == "" {
		return "project"
	}
	return result
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}