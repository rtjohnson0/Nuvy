package services

import (
	"context"
	"fmt"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Service struct {
	Client *s3.Client
	Bucket string
	Region string
}

func NewS3Service() (*S3Service, error) {
	region := os.Getenv("AWS_REGION")
	bucket := os.Getenv("AWS_BUCKET")
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	if region == "" || bucket == "" || accessKey == "" || secretKey == "" {
		return nil, fmt.Errorf("missing AWS environment variables")
	}

	cfg, err := awsconfig.LoadDefaultConfig(
		context.Background(),
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
	)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(cfg)

	return &S3Service{
		Client: client,
		Bucket: bucket,
		Region: region,
	}, nil
}

func (s *S3Service) UploadDirectory(ctx context.Context, localRoot, projectSlug string) (string, error) {
	err := filepath.Walk(localRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(localRoot, path)
		if err != nil {
			return err
		}

		relPath = filepath.ToSlash(relPath)
		key := fmt.Sprintf("projects/%s/%s", projectSlug, relPath)

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		contentType := detectContentType(path)

		_, err = s.Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(s.Bucket),
			Key:         aws.String(key),
			Body:        file,
			ContentType: aws.String(contentType),
		})
		return err
	})
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("http://%s.s3-website-%s.amazonaws.com/projects/%s/index.html", s.Bucket, s.Region, projectSlug)
	return url, nil
}

func detectContentType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	if ext == "" {
		return "application/octet-stream"
	}

	contentType := mime.TypeByExtension(ext)
	if contentType != "" {
		return contentType
	}

	switch ext {
	case ".js":
		return "application/javascript"
	case ".css":
		return "text/css"
	case ".html":
		return "text/html"
	case ".json":
		return "application/json"
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	default:
		return "application/octet-stream"
	}
}