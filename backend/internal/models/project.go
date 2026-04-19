package models

type Project struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Status          string `json:"status"`
	Type            string `json:"type"`
	Source          string `json:"source"`
	URL             string `json:"url"`
	Updated         string `json:"updated"`
	UpdatedLabel    string `json:"updatedLabel"`
	DeploymentCount int    `json:"deploymentCount"`
}