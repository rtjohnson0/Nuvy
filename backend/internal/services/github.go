package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// GitHubService handles all GitHub API interactions for Nuvy deployments.
// It creates a repo per project, pushes built files to a gh-pages branch,
// and enables GitHub Pages — returning a live github.io URL.
type GitHubService struct {
	token    string
	username string
	client   *http.Client
}

func NewGitHubService() (*GitHubService, error) {
	token := os.Getenv("GITHUB_TOKEN")
	username := os.Getenv("GITHUB_USERNAME")

	if token == "" {
		return nil, fmt.Errorf("GITHUB_TOKEN env var is required")
	}
	if username == "" {
		return nil, fmt.Errorf("GITHUB_USERNAME env var is required")
	}

	return &GitHubService{
		token:    token,
		username: username,
		client:   &http.Client{Timeout: 30 * time.Second},
	}, nil
}

// DeployToPages uploads a local directory to GitHub Pages.
// Returns the live github.io URL on success.
func (g *GitHubService) DeployToPages(ctx context.Context, localRoot, repoSlug string, logFn func(string)) (string, error) {
	repoName := repoSlug

	// Step 1: Create or verify the repo exists
	logFn(fmt.Sprintf("  Creating GitHub repo: %s/%s", g.username, repoName))
	if err := g.ensureRepo(ctx, repoName); err != nil {
		return "", fmt.Errorf("failed to create repo: %w", err)
	}

	// Step 2: Read all files from the local directory
	logFn("  Reading project files...")
	files, err := readDirRecursive(localRoot)
	if err != nil {
		return "", fmt.Errorf("failed to read project files: %w", err)
	}
	logFn(fmt.Sprintf("  Found %d files to deploy", len(files)))

	// Step 3: Create blobs for each file via GitHub API
	logFn("  Uploading files to GitHub...")
	type treeEntry struct {
		Path string `json:"path"`
		Mode string `json:"mode"`
		Type string `json:"type"`
		SHA  string `json:"sha"`
	}
	var treeEntries []treeEntry

	for relPath, content := range files {
		sha, err := g.createBlob(ctx, repoName, content)
		if err != nil {
			return "", fmt.Errorf("failed to upload %s: %w", relPath, err)
		}
		treeEntries = append(treeEntries, treeEntry{
			Path: relPath,
			Mode: "100644",
			Type: "blob",
			SHA:  sha,
		})
	}

	// Step 4: Create a Git tree from all blobs
	logFn("  Building file tree...")
	treeSHA, err := g.createTree(ctx, repoName, treeEntries)
	if err != nil {
		return "", fmt.Errorf("failed to create tree: %w", err)
	}

	// Step 5: Create a commit pointing to the tree
	logFn("  Creating deployment commit...")
	commitMsg := fmt.Sprintf("Deploy via Nuvy — %s", time.Now().Format("2006-01-02 15:04:05"))
	commitSHA, err := g.createCommit(ctx, repoName, treeSHA, commitMsg)
	if err != nil {
		return "", fmt.Errorf("failed to create commit: %w", err)
	}

	// Step 6: Push commit to gh-pages branch (create or force-update)
	logFn("  Pushing to gh-pages branch...")
	if err := g.upsertBranch(ctx, repoName, "gh-pages", commitSHA); err != nil {
		return "", fmt.Errorf("failed to push branch: %w", err)
	}

	// Step 7: Enable GitHub Pages on gh-pages branch
	logFn("  Enabling GitHub Pages...")
	if err := g.enablePages(ctx, repoName); err != nil {
		// Non-fatal — Pages may already be enabled or on a delay
		logFn(fmt.Sprintf("  Warning: could not enable Pages automatically: %v", err))
	}

	// Live URL
	liveURL := fmt.Sprintf("https://%s.github.io/%s/", g.username, repoName)
	return liveURL, nil
}

// DeployRepoToPages clones a GitHub repo URL, runs an optional build, then deploys.
// For React repos it runs npm install && npm run build and deploys the build/ dir.
func (g *GitHubService) DeployRepoToPages(ctx context.Context, sourceRepoURL, repoSlug, siteType string, logFn func(string)) (string, error) {
	// We use the GitHub Contents API to read source files directly
	// without needing git or npm installed on the server.
	// For React repos, we inform the user to push a pre-built artifact instead.
	if strings.ToLower(siteType) == "react" {
		return "", fmt.Errorf(
			"for React repos, please run 'npm run build' locally and upload the build/ folder as a ZIP — " +
				"server-side npm builds require additional infrastructure",
		)
	}

	// For static repos: fetch source files via GitHub Contents API
	owner, repo, err := parseGitHubURL(sourceRepoURL)
	if err != nil {
		return "", fmt.Errorf("invalid GitHub URL: %w", err)
	}

	logFn(fmt.Sprintf("  Reading files from %s/%s...", owner, repo))

	tmpDir, err := os.MkdirTemp("", "nuvy-clone-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := g.downloadRepoContents(ctx, owner, repo, "", tmpDir); err != nil {
		return "", fmt.Errorf("failed to download repo contents: %w", err)
	}

	return g.DeployToPages(ctx, tmpDir, repoSlug, logFn)
}

// ── GitHub API helpers ────────────────────────────────────────────────────────

func (g *GitHubService) apiRequest(ctx context.Context, method, path string, body any) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	url := "https://api.github.com" + path
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+g.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return g.client.Do(req)
}

func (g *GitHubService) ensureRepo(ctx context.Context, repoName string) error {
	// Check if it exists first
	resp, err := g.apiRequest(ctx, "GET", fmt.Sprintf("/repos/%s/%s", g.username, repoName), nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return nil // already exists
	}

	// Create it with auto_init so GitHub adds an initial commit
	// This prevents "Git Repository is empty" errors on the blob API
	payload := map[string]any{
		"name":        repoName,
		"description": "Deployed via Nuvy",
		"private":     false,
		"auto_init":   true,
	}

	resp2, err := g.apiRequest(ctx, "POST", "/user/repos", payload)
	if err != nil {
		return err
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp2.Body)
		return fmt.Errorf("GitHub API %d: %s", resp2.StatusCode, string(b))
	}

	// Wait for GitHub to finish initializing the repo
	time.Sleep(3 * time.Second)

	return nil
}

func (g *GitHubService) createBlob(ctx context.Context, repoName string, content []byte) (string, error) {
	payload := map[string]string{
		"content":  base64.StdEncoding.EncodeToString(content),
		"encoding": "base64",
	}

	resp, err := g.apiRequest(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/blobs", g.username, repoName),
		payload,
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("create blob %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		SHA string `json:"sha"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.SHA, nil
}

func (g *GitHubService) createTree(ctx context.Context, repoName string, entries any) (string, error) {
	payload := map[string]any{
		"tree": entries,
	}

	resp, err := g.apiRequest(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/trees", g.username, repoName),
		payload,
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("create tree %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		SHA string `json:"sha"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.SHA, nil
}

func (g *GitHubService) createCommit(ctx context.Context, repoName, treeSHA, message string) (string, error) {
	payload := map[string]any{
		"message": message,
		"tree":    treeSHA,
		// No parents = initial commit (orphan branch for gh-pages)
	}

	resp, err := g.apiRequest(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/commits", g.username, repoName),
		payload,
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("create commit %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		SHA string `json:"sha"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.SHA, nil
}

func (g *GitHubService) upsertBranch(ctx context.Context, repoName, branch, commitSHA string) error {
	refPath := fmt.Sprintf("/repos/%s/%s/git/refs/heads/%s", g.username, repoName, branch)

	// Try to update existing ref first
	payload := map[string]any{
		"sha":   commitSHA,
		"force": true,
	}

	resp, err := g.apiRequest(ctx, "PATCH", refPath, payload)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return nil
	}

	// Create new ref
	createPayload := map[string]any{
		"ref": fmt.Sprintf("refs/heads/%s", branch),
		"sha": commitSHA,
	}

	resp2, err := g.apiRequest(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/git/refs", g.username, repoName),
		createPayload,
	)
	if err != nil {
		return err
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp2.Body)
		return fmt.Errorf("upsert branch %d: %s", resp2.StatusCode, string(b))
	}

	return nil
}

func (g *GitHubService) enablePages(ctx context.Context, repoName string) error {
	payload := map[string]any{
		"source": map[string]string{
			"branch": "gh-pages",
			"path":   "/",
		},
	}

	resp, err := g.apiRequest(ctx, "POST",
		fmt.Sprintf("/repos/%s/%s/pages", g.username, repoName),
		payload,
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 201 = created, 409 = already exists (both fine)
	if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusConflict {
		return nil
	}

	b, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("enable pages %d: %s", resp.StatusCode, string(b))
}

func (g *GitHubService) downloadRepoContents(ctx context.Context, owner, repo, path, destDir string) error {
	apiPath := fmt.Sprintf("/repos/%s/%s/contents/%s", owner, repo, path)
	resp, err := g.apiRequest(ctx, "GET", apiPath, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	// Try as array (directory) first
	var items []struct {
		Name        string `json:"name"`
		Type        string `json:"type"`
		Path        string `json:"path"`
		DownloadURL string `json:"download_url"`
	}

	if err := json.Unmarshal(body, &items); err != nil {
		return fmt.Errorf("parse contents response: %w", err)
	}

	for _, item := range items {
		localPath := filepath.Join(destDir, item.Name)

		if item.Type == "dir" {
			if err := os.MkdirAll(localPath, 0o755); err != nil {
				return err
			}
			if err := g.downloadRepoContents(ctx, owner, repo, item.Path, localPath); err != nil {
				return err
			}
			continue
		}

		if item.DownloadURL == "" {
			continue
		}

		req, err := http.NewRequestWithContext(ctx, "GET", item.DownloadURL, nil)
		if err != nil {
			return err
		}

		fileResp, err := g.client.Do(req)
		if err != nil {
			return err
		}

		content, readErr := io.ReadAll(fileResp.Body)
		fileResp.Body.Close()
		if readErr != nil {
			return readErr
		}

		if err := os.WriteFile(localPath, content, 0o644); err != nil {
			return err
		}
	}

	return nil
}

// ── File utilities ────────────────────────────────────────────────────────────

func readDirRecursive(root string) (map[string][]byte, error) {
	files := make(map[string][]byte)

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}

		relPath = filepath.ToSlash(relPath)

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		files[relPath] = content
		return nil
	})

	return files, err
}

func parseGitHubURL(rawURL string) (owner, repo string, err error) {
	// Handles: https://github.com/owner/repo or https://github.com/owner/repo.git
	rawURL = strings.TrimSuffix(rawURL, ".git")
	parts := strings.Split(strings.TrimPrefix(rawURL, "https://github.com/"), "/")
	if len(parts) < 2 {
		return "", "", fmt.Errorf("expected https://github.com/owner/repo, got: %s", rawURL)
	}
	return parts[0], parts[1], nil
}