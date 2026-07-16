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
	"os/exec"
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
	GitHub      *services.GitHubService
}

func NewStore(ghService *services.GitHubService) *Store {
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
			URL:             "https://rtjohnson0.github.io/finepoint-landing/",
			Updated:         now1.Format(time.RFC3339),
			UpdatedLabel:    now1.Format("Jan 2, 2006 3:04 PM"),
			DeploymentCount: 1,
			UploadedFile:    "finepoint-landing.zip",
			LatestLogLine:   "✔ Live at rtjohnson0.github.io/finepoint-landing/",
		},
		{
			ID:              "proj_2",
			Name:            "Nuvy Marketing",
			Status:          "Deploying",
			Type:            "Static",
			Source:          "GitHub Repo",
			URL:             "",
			Updated:         now2.Format(time.RFC3339),
			UpdatedLabel:    now2.Format("Jan 2, 2006 3:04 PM"),
			DeploymentCount: 1,
			LatestLogLine:   "Pushing to gh-pages branch...",
		},
		{
			ID:              "proj_3",
			Name:            "Portfolio V3",
			Status:          "Error",
			Type:            "React",
			Source:          "ZIP Upload",
			URL:             "",
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
			URL:          "https://rtjohnson0.github.io/finepoint-landing/",
			UploadedFile: "finepoint-landing.zip",
			Logs: []string{
				"[nuvy] Deployment initialized",
				"  Uploading ZIP artifact...",
				"  Extracting files...",
				"  Deploy root detected: build/",
				"  Creating GitHub repo: rtjohnson0/finepoint-landing",
				"  Reading project files...",
				"  Found 24 files to deploy",
				"  Uploading files to GitHub...",
				"  Building file tree...",
				"  Creating deployment commit...",
				"  Pushing to gh-pages branch...",
				"  Enabling GitHub Pages...",
				"✔ Live at https://rtjohnson0.github.io/finepoint-landing/",
				"✔ Deployment successful",
			},
		},
		{
			ID:        "dep_2",
			ProjectID: "proj_2",
			Project:   "Nuvy Marketing",
			Status:    "Deploying",
			Date:      now2.Format(time.RFC3339),
			DateLabel: now2.Format("Jan 2, 2006 3:04 PM"),
			URL:       "",
			RepoURL:   "https://github.com/rtjohnson0/nuvy-marketing",
			Logs: []string{
				"[nuvy] Deployment initialized",
				"  Reading files from rtjohnson0/nuvy-marketing...",
				"  Pushing to gh-pages branch...",
			},
		},
		{
			ID:           "dep_3",
			ProjectID:    "proj_3",
			Project:      "Portfolio V3",
			Status:       "Error",
			Date:         now3.Format(time.RFC3339),
			DateLabel:    now3.Format("Jan 2, 2006 3:04 PM"),
			URL:          "",
			UploadedFile: "portfolio-v3.zip",
			Logs: []string{
				"[nuvy] Deployment initialized",
				"  Uploading ZIP artifact...",
				"  Extracting files...",
				"✗ Validation failed: no deployable index.html found.",
				"  Tip: for React projects upload the build/ folder as a ZIP.",
			},
		},
	}

	return &Store{
		Projects:    projects,
		Deployments: deployments,
		GitHub:      ghService,
	}
}

func (s *Store) GetProjects(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	writeJSON(w, http.StatusOK, s.Projects)
}

func (s *Store) CreateProjectDeployment(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "failed to parse form data")
		return
	}

	name        := strings.TrimSpace(r.FormValue("name"))
	siteType    := strings.TrimSpace(r.FormValue("siteType"))
	repoURL     := strings.TrimSpace(r.FormValue("repoURL"))

	if name == "" {
		writeError(w, http.StatusBadRequest, "project name is required")
		return
	}

	file, fileHeader, err := r.FormFile("zipFile")
	hasZip := err == nil

	if !hasZip && repoURL == "" {
		writeError(w, http.StatusBadRequest, "upload a ZIP file or enter a GitHub repository URL")
		return
	}

	if hasZip && repoURL != "" {
		writeError(w, http.StatusBadRequest, "choose either a ZIP file or a GitHub repository, not both")
		return
	}

	projectID    := fmt.Sprintf("proj_%d", time.Now().UnixNano())
	deploymentID := fmt.Sprintf("dep_%d", time.Now().UnixNano())
	repoSlug     := slugify(name)

	source        := "GitHub Repo"
	projectType   := "React"
	initialStatus := "Queued"

	if strings.ToLower(siteType) == "static" {
		projectType = "Static"
	}
	if hasZip {
		source        = "ZIP Upload"
		initialStatus = "Uploading"
	}

	now := time.Now()

	project := models.Project{
		ID:              projectID,
		Name:            name,
		Status:          initialStatus,
		Type:            projectType,
		Source:          source,
		URL:             "",
		Updated:         now.Format(time.RFC3339),
		UpdatedLabel:    now.Format("Jan 2, 2006 3:04 PM"),
		DeploymentCount: 1,
		LatestLogLine:   "[nuvy] Deployment initialized",
	}

	deployment := models.Deployment{
		ID:        deploymentID,
		ProjectID: projectID,
		Project:   name,
		Status:    initialStatus,
		Date:      now.Format(time.RFC3339),
		DateLabel: now.Format("Jan 2, 2006 3:04 PM"),
		URL:       "",
		RepoURL:   repoURL,
		Logs:      []string{"[nuvy] Deployment initialized"},
	}

	// ── Handle ZIP upload ────────────────────────────────────────────────────
	var deployRoot    string
	var extractedPath string

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

		s.appendDeployLog(&deployment, "  Uploading ZIP artifact...")

		extractDir := filepath.Join("tmp", "extracted", deploymentID)
		if err := unzipArchive(zipPath, extractDir); err != nil {
			_ = os.Remove(zipPath)
			writeError(w, http.StatusInternalServerError, "failed to extract ZIP file")
			return
		}
		_ = os.Remove(zipPath)
		s.appendDeployLog(&deployment, "  Extracting files...")

		root, err := findDeployableRoot(extractDir)
		if err != nil {
			_ = os.RemoveAll(extractDir)
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		deployRoot    = root
		extractedPath = extractDir

		deployment.UploadedFile   = zipName
		deployment.ExtractedPath  = extractDir
		deployment.DeployRootPath = root
		project.UploadedFile      = zipName
		project.DeployRootPath    = root

		s.appendDeployLog(&deployment, "  Deploy root detected: "+strings.TrimPrefix(root, extractDir+string(os.PathSeparator)))
	}

	s.mu.Lock()
	s.Projects    = append([]models.Project{project}, s.Projects...)
	s.Deployments = append([]models.Deployment{deployment}, s.Deployments...)
	s.mu.Unlock()

	// ── Run real deployment in background ────────────────────────────────────
	go s.runDeployment(deploymentID, projectID, repoSlug, source, siteType, repoURL, deployRoot, extractedPath)

	writeJSON(w, http.StatusCreated, models.CreateDeploymentResponse{
		Project:    project,
		Deployment: deployment,
	})
}

// runDeployment is the real deployment pipeline — calls GitHub API to create
// a repo, push files to gh-pages, and enable GitHub Pages.
func (s *Store) runDeployment(
	deploymentID, projectID, repoSlug, source, siteType, repoURL, deployRoot, extractedPath string,
) {
	ctx := context.Background()

	logFn := func(msg string) {
		s.mu.Lock()
		defer s.mu.Unlock()
		for i := range s.Deployments {
			if s.Deployments[i].ID == deploymentID {
				s.Deployments[i].Logs = append(s.Deployments[i].Logs, msg)
				break
			}
		}
		for i := range s.Projects {
			if s.Projects[i].ID == projectID {
				s.Projects[i].LatestLogLine = msg
				break
			}
		}
	}

	var (
		liveURL string
		deployErr error
	)

	switch source {
	case "ZIP Upload":
		s.updateStatus(deploymentID, projectID, "Deploying")

		// If it's a React project and no build dir exists yet, run npm build
		if strings.ToLower(siteType) == "react" {
			builtRoot, err := s.runNpmBuild(ctx, deployRoot, extractedPath, logFn)
			if err != nil {
				s.failDeployment(deploymentID, projectID, "npm build failed: "+err.Error(), logFn)
				cleanup(extractedPath)
				return
			}
			deployRoot = builtRoot
		}

		liveURL, deployErr = s.GitHub.DeployToPages(ctx, deployRoot, repoSlug, logFn)

	case "GitHub Repo":
		s.updateStatus(deploymentID, projectID, "Cloning")
		liveURL, deployErr = s.GitHub.DeployRepoToPages(ctx, repoURL, repoSlug, siteType, logFn)
	}

	cleanup(extractedPath)

	if deployErr != nil {
		s.failDeployment(deploymentID, projectID, "✗ "+deployErr.Error(), logFn)
		return
	}

	// Success
	now := time.Now()
	logFn(fmt.Sprintf("✔ Live at %s", liveURL))
	logFn("✔ Deployment successful")

	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.Deployments {
		if s.Deployments[i].ID == deploymentID {
			s.Deployments[i].Status    = "Live"
			s.Deployments[i].URL       = liveURL
			s.Deployments[i].Date      = now.Format(time.RFC3339)
			s.Deployments[i].DateLabel = now.Format("Jan 2, 2006 3:04 PM")
			break
		}
	}
	for i := range s.Projects {
		if s.Projects[i].ID == projectID {
			s.Projects[i].Status       = "Live"
			s.Projects[i].URL          = liveURL
			s.Projects[i].Updated      = now.Format(time.RFC3339)
			s.Projects[i].UpdatedLabel = now.Format("Jan 2, 2006 3:04 PM")
			s.Projects[i].LatestLogLine = fmt.Sprintf("✔ Live at %s", liveURL)
			break
		}
	}
}

// runNpmBuild detects if a React build is needed and runs it.
// Returns the path to the built output directory.
func (s *Store) runNpmBuild(ctx context.Context, deployRoot, extractedPath string, logFn func(string)) (string, error) {
	// If build/ or dist/ already exists with index.html, skip building
	for _, dir := range []string{"build", "dist"} {
		candidate := filepath.Join(deployRoot, dir)
		if fileExists(filepath.Join(candidate, "index.html")) {
			logFn(fmt.Sprintf("  Pre-built output found in %s/", dir))
			return candidate, nil
		}
	}

	// Look for package.json to confirm it's a Node project
	pkgJSON := filepath.Join(deployRoot, "package.json")
	if !fileExists(pkgJSON) {
		// Not a Node project — deploy as-is
		return deployRoot, nil
	}

	logFn("  Running npm install...")
	install := exec.CommandContext(ctx, "npm", "install", "--silent", "--no-audit")
	install.Dir = deployRoot
	if out, err := install.CombinedOutput(); err != nil {
		return "", fmt.Errorf("npm install failed: %s", strings.TrimSpace(string(out)))
	}

	logFn("  Running npm run build...")
	build := exec.CommandContext(ctx, "npm", "run", "build")
	build.Dir = deployRoot
	if out, err := build.CombinedOutput(); err != nil {
		return "", fmt.Errorf("npm run build failed: %s", strings.TrimSpace(string(out)))
	}

	// Find the built output
	for _, dir := range []string{"build", "dist"} {
		candidate := filepath.Join(deployRoot, dir)
		if fileExists(filepath.Join(candidate, "index.html")) {
			logFn(fmt.Sprintf("  Build complete — output in %s/", dir))
			return candidate, nil
		}
	}

	return "", fmt.Errorf("build completed but no index.html found in build/ or dist/")
}

func (s *Store) failDeployment(deploymentID, projectID, msg string, logFn func(string)) {
	logFn(msg)
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.Deployments {
		if s.Deployments[i].ID == deploymentID {
			s.Deployments[i].Status    = "Error"
			s.Deployments[i].Date      = now.Format(time.RFC3339)
			s.Deployments[i].DateLabel = now.Format("Jan 2, 2006 3:04 PM")
			break
		}
	}
	for i := range s.Projects {
		if s.Projects[i].ID == projectID {
			s.Projects[i].Status        = "Error"
			s.Projects[i].Updated       = now.Format(time.RFC3339)
			s.Projects[i].UpdatedLabel  = now.Format("Jan 2, 2006 3:04 PM")
			s.Projects[i].LatestLogLine = msg
			break
		}
	}
}

func (s *Store) updateStatus(deploymentID, projectID, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.Deployments {
		if s.Deployments[i].ID == deploymentID {
			s.Deployments[i].Status = status
			break
		}
	}
	for i := range s.Projects {
		if s.Projects[i].ID == projectID {
			s.Projects[i].Status = status
			break
		}
	}
}

func (s *Store) appendDeployLog(d *models.Deployment, msg string) {
	d.Logs = append(d.Logs, msg)
	d.Status = msg
}

func (s *Store) GetDeployments(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	writeJSON(w, http.StatusOK, s.Deployments)
}

func (s *Store) GetDeploymentLogs(w http.ResponseWriter, r *http.Request) {
	path  := strings.TrimPrefix(r.URL.Path, "/api/deployments/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "logs" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	deploymentID := parts[0]
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, d := range s.Deployments {
		if d.ID == deploymentID {
			writeJSON(w, http.StatusOK, map[string]any{
				"logs":   d.Logs,
				"status": d.Status,
			})
			return
		}
	}

	writeError(w, http.StatusNotFound, "deployment not found")
}

// ── File helpers ──────────────────────────────────────────────────────────────

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
		target := filepath.Join(destDir, f.Name)

		cleanDest := filepath.Clean(destDir) + string(os.PathSeparator)
		if !strings.HasPrefix(filepath.Clean(target), cleanDest) {
			return fmt.Errorf("invalid zip entry: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(target, 0o755)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}

		src, err := f.Open()
		if err != nil {
			return err
		}

		dst, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			src.Close()
			return err
		}

		_, copyErr  := io.Copy(dst, src)
		closeErr1   := dst.Close()
		closeErr2   := src.Close()

		if copyErr  != nil { return copyErr  }
		if closeErr1 != nil { return closeErr1 }
		if closeErr2 != nil { return closeErr2 }
	}
	return nil
}

func findDeployableRoot(extractDir string) (string, error) {
	// Direct index.html at root
	if fileExists(filepath.Join(extractDir, "index.html")) {
		return extractDir, nil
	}

	// Common build output dirs
	for _, dir := range []string{"build", "dist", "public", "out"} {
		candidate := filepath.Join(extractDir, dir)
		if fileExists(filepath.Join(candidate, "index.html")) {
			return candidate, nil
		}
	}

	// Single nested folder (e.g. zip contains one top-level dir)
	entries, _ := os.ReadDir(extractDir)
	if len(entries) == 1 && entries[0].IsDir() {
		nested := filepath.Join(extractDir, entries[0].Name())
		if fileExists(filepath.Join(nested, "index.html")) {
			return nested, nil
		}
		for _, dir := range []string{"build", "dist", "public", "out"} {
			candidate := filepath.Join(nested, dir)
			if fileExists(filepath.Join(candidate, "index.html")) {
				return candidate, nil
			}
		}
	}

	// package.json present = React project that needs a build
	if fileExists(filepath.Join(extractDir, "package.json")) {
		return extractDir, nil
	}

	return "", fmt.Errorf("no deployable content found — upload a build folder or a static site with an index.html")
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func cleanup(path string) {
	if path != "" {
		_ = os.RemoveAll(path)
	}
}

func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	return strings.ReplaceAll(name, " ", "-")
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