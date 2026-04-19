package models

type Deployment struct {
	ID             string   `json:"id"`
	ProjectID      string   `json:"projectId"`
	Project        string   `json:"project"`
	Status         string   `json:"status"`
	Date           string   `json:"date"`
	DateLabel      string   `json:"dateLabel"`
	URL            string   `json:"url"`
	Logs           []string `json:"logs"`
	UploadedFile   string   `json:"uploadedFile,omitempty"`
	RepoURL        string   `json:"repoURL,omitempty"`
	ExtractedPath  string   `json:"extractedPath,omitempty"`
	DeployRootPath string   `json:"deployRootPath,omitempty"`
}

type CreateDeploymentResponse struct {
	Project    Project    `json:"project"`
	Deployment Deployment `json:"deployment"`
}