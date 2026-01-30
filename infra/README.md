# Infrastructure Directory

## Overview
The `infra/` directory contains all infrastructure-as-code (IaC) configurations and deployment artifacts for KELEDON, enabling consistent and reproducible deployments across development, staging, and production environments.

## Directory Structure
```
infra/
├── docker/               # Docker configurations
│   ├── Dockerfile        # Multi-stage build for single-container deployment
│   ├── nginx.conf        # Nginx reverse proxy configuration
│   └── start.sh          # Startup script for runtime container
├── terraform/            # Terraform configurations for cloud infrastructure
│   └── main.tf           # Cloud Run and supporting resources
├── helm/                 # Kubernetes Helm charts
│   └── Chart.yaml        # Helm chart definition
├── scripts/              # Infrastructure automation scripts
└── README.md             # This file
```

## Key Components

### Docker Configuration
- **Multi-stage Dockerfile**: Combines frontend (React) and backend (NestJS) in one container
- **Nginx Configuration**: Reverse proxy setup for serving static assets and routing API requests
- **Startup Script**: Orchestrates starting both backend (port 3001) and nginx (port 8080) services

### Terraform Infrastructure
- **Cloud Run Deployment**: Managed service deployment with auto-scaling
- **Artifact Registry**: Container image storage and management
- **Secret Manager**: Secure storage for API keys, database credentials, and other secrets
- **VPC Networking**: Network configuration for secure communication

### Helm Charts
- **Kubernetes Deployment**: For on-premise or private cloud deployments
- **Service Definitions**: Load balancing and service discovery
- **ConfigMaps and Secrets**: Application configuration management

## Deployment Workflows

### Local Development
```bash
# Build and run locally
docker build -t keledon .
docker run -p 8080:8080 keledon
```

### Cloud Run Deployment
```bash
# Deploy to Google Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/keledon-cloud:latest .
gcloud run deploy keledon \
  --image gcr.io/PROJECT_ID/keledon-cloud:latest \
  --region=us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port=3000
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes cluster
helm install keledon ./helm
kubectl get pods -w
```

## Environment Management
- **Development**: Local Docker containers with mock services
- **Staging**: Cloud Run with test data and limited scaling
- **Production**: Cloud Run with full scaling, monitoring, and security

## Security Considerations
- **Secret Management**: All sensitive data stored in Secret Manager
- **Network Security**: VPC Service Controls and Private IP options
- **Authentication**: JWT-based authentication with OAuth2 support
- **Compliance**: GDPR, HIPAA-ready architecture patterns

## Monitoring & Observability
- **Logging**: Structured logging with Cloud Logging integration
- **Metrics**: Prometheus-compatible metrics endpoints
- **Tracing**: OpenTelemetry tracing for distributed systems
- **Alerting**: Cloud Monitoring alerts for critical failures

## Current Status
✅ **Docker**: Multi-stage build implemented and tested
✅ **Cloud Run**: Deployment scripts available
✅ **Terraform**: Infrastructure definitions complete
⚠️ **Helm**: Kubernetes charts need final testing
⚠️ **CI/CD**: Pipeline automation in progress

## Future Enhancements
- **Multi-region deployment**: Global load balancing and failover
- **Auto-scaling policies**: Intelligent scaling based on workload patterns
- **Cost optimization**: Right-sizing recommendations and reserved instances
- **Disaster recovery**: Multi-zone deployment strategies

## Documentation
- Architecture: `docs/architecture/infrastructure.md`
- Deployment Guide: `docs/runbooks/deployment-guide.md`
- Security: `docs/runbooks/security-best-practices.md`
- Troubleshooting: `docs/runbooks/infrastructure-troubleshooting.md`