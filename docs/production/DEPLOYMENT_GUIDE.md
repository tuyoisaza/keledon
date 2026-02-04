# KELEDON V1 Production Deployment Guide

## Overview

This guide provides complete instructions for deploying KELEDON V1 to production environment with all runtime components operational.

## Prerequisites

### Infrastructure Requirements
- Docker Engine 20.10+ with Docker Compose v2
- 2GB+ RAM, 2+ CPU cores minimum
- 10GB+ storage minimum
- SSL/TLS certificates for production domains

### External Services
- Custom domain (e.g., api.yourdomain.com)
- SSL certificate (wildcard recommended)
- DNS management access
- Email service (optional, for notifications)

## Quick Start Deployment

### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/tuyoisaza/keledon.git
cd keledon

# Configure production environment
cp .env.production .env
# Edit .env with your production values
```

### 2. Production Deployment
```bash
# Make scripts executable
chmod +x scripts/deploy-production.sh scripts/orchestrate-services.sh

# Deploy production stack
./scripts/deploy-production.sh
```

### 3. Verify Deployment
```bash
# Run production tests
node test/production/production-test-cli.js run --production

# Check service status
./scripts/orchestrate-services.sh status
```

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Cloud Run     │     │   Browser Agent │
│   (Port 8080)  │     │   (Extension)     │
│                │     │                 │
│   ┌──────┐       │     │   ┌──────────┐   │
│   │ Qdrant│       │     │   │  Redis    │   │
│   │ Redis  │◀────│───┼──► │   │   │
│   └──────┘       │     │   └──────────┘   │
│                │     │                 │
│   PostgreSQL      │     │                 │
│   (Port 5432)   │     │                 │
└────────────────┘       │     │                 │
│                │     │                 │
│   Nginx         │     │                 │
│   (Port 443)    │◀────►──────────┘
└─────────────────┘       │
```

## Service Configuration

### Cloud Backend (Port 3001)
- **Purpose**: WebSocket gateway, session management, decision engine
- **Health Check**: `GET /health`
- **WebSocket**: `wss://api.yourdomain.com/agent`

### Vector Database (Port 6333)
- **Purpose**: Session storage, event indexing, RAG
- **Health**: HTTP API on port 6333

### Session Cache (Port 6379)
- **Purpose**: Real-time session coordination, message queuing
- **Health**: Redis protocol on port 6379

### Database (Port 5432)
- **Purpose**: Persistent data storage, user management, audit logs
- **Health**: PostgreSQL protocol on port 5432

### Reverse Proxy (Port 443)
- **Purpose**: SSL termination, load balancing, static content serving
- **SSL**: Required for production domains

## Production Environment Variables

### Required Configuration
```bash
# Production mode
NODE_ENV=production
SINGLE_CONTAINER=true

# Database
POSTGRES_DB=keledon_prod
POSTGRES_USER=keledon
POSTGRES_PASSWORD=your_secure_password

# API Keys (Required for production)
DEEPGRAM_API_KEY=your_deepgram_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Security
JWT_SECRET=your_jwt_secret_at_least_32_chars
ENCRYPTION_KEY=your_encryption_key

# Domains
CORS_ORIGIN=https://api.yourdomain.com
WEBSOCKET_PORT=3001
```

### Optional Configuration
```bash
# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info

# Backup
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=us-east-1

# Performance
MAX_SESSIONS=1000
RATE_LIMIT_MAX_REQUESTS=100
```

## SSL/TLS Setup

### Certificate Requirements
- Domain-validated SSL certificate
- Private key without passphrase
- Intermediate certificates if chain
- Strong ciphers (TLS 1.2+)

### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/api.yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/api.yourdomain.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5:!3DES;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://keledon-app:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Deployment Verification

### Health Checks
```bash
# Check all services
./scripts/orchestrate-services.sh health

# Individual service checks
curl -f https://api.yourdomain.com/health
curl -f https://api.yourdomain.com/health/websocket
curl -f https://api.yourdomain.com/health/database
```

### Production Tests
```bash
# Run comprehensive production tests
node test/production/production-test-cli.js run --production

# Quick readiness check
node test/production/production-test-cli.js quick --production

# Generate production report
node test/production/production-test-cli.js report --input ./production-results.json
```

## Browser Extension Installation

### Chrome Web Store
1. Build extension: `cd agent && npm run build`
2. Load unpacked extension in Chrome developer mode
3. Test with production backend: `chrome://extensions/`
4. Submit to Chrome Web Store with production manifest

### Manifest Configuration
```json
{
  "manifest_version": "1.0",
  "name": "KELEDON",
  "description": "Autonomous Web Agent for Business Automation",
  "permissions": [
    "activeTab",
    "storage",
    "microphone",
    "desktopCapture"
  ],
  "host_permissions": [
    "https://api.yourdomain.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

## Monitoring and Observability

### Production Metrics
- Application performance metrics
- Error rates and response times
- Session success/failure rates
- Resource utilization (CPU, memory, disk)

### Log Management
```bash
# View application logs
./scripts/orchestrate-services.sh logs keledon-app

# Rotate logs
logrotate -f /etc/logrotate.d/keledon

# Aggregate logs for analysis
./scripts/aggregate-logs.sh --last 24h
```

### Health Monitoring
```bash
# Check service health
./scripts/orchestrate-services.sh health

# Setup monitoring alerts
./scripts/setup-monitoring.sh --email alerts@yourdomain.com
```

## Scaling and Performance

### Horizontal Scaling
```bash
# Scale multiple instances
./scripts/orchestrate-services.sh scale keledon-app 3

# Scale database connections
./scripts/orchestrate-services.sh scale postgres 2
```

### Performance Tuning
```bash
# PostgreSQL optimization
./scripts/database-tuning.sh --production

# Redis optimization
./scripts/redis-tuning.sh --max-memory 256
```

## Security Configuration

### Network Security
- Firewall rules for ports 443, 8080
- DDoS protection and rate limiting
- SSL certificate management and renewal

### Application Security
- JWT token rotation
- API key management and rotation
- Input validation and sanitization
- CORS configuration for production domain

### Data Security
- Database encryption at rest
- Backup encryption
- PII data handling compliance
- Session data retention policies

## Backup and Recovery

### Automated Backups
```bash
# Daily database backup
./scripts/backup-database.sh --s3

# Incremental backups
./scripts/backup-incremental.sh --retention 30d

# Disaster recovery
./scripts/disaster-recovery.sh --restore-from s3
```

### Backup Verification
```bash
# Verify backup integrity
./scripts/verify-backup.sh --last

# Test recovery process
./scripts/test-recovery.sh --dry-run
```

## Troubleshooting

### Common Issues

#### WebSocket Connection Failures
```bash
# Check WebSocket connectivity
curl -i -N -H "Connection: Upgrade" \
  wss://api.yourdomain.com/agent

# Check SSL certificate
openssl s_client -connect api.yourdomain.com:443
```

#### Database Connection Issues
```bash
# Test database connectivity
./scripts/test-database-connection.sh

# Check database performance
./scripts/database-diagnostics.sh
```

#### Performance Issues
```bash
# Resource usage
./scripts/resource-monitoring.sh

# Identify bottlenecks
./scripts/performance-analysis.sh --last 1h
```

## Rollback Procedures

### Emergency Rollback
```bash
# Rollback to previous version
./scripts/rollback.sh --version previous

# Database rollback
./scripts/database-rollback.sh --backup latest

# Service restart
./scripts/emergency-restart.sh
```

## Support and Maintenance

### Routine Maintenance
- Weekly security updates
- Monthly performance reviews
- Quarterly scaling assessments
- Annual security audits

### Support Procedures
- Issue tracking and escalation
- Root cause analysis
- Customer communication protocols

## Production Readiness Checklist

### Pre-Deployment
- [ ] All security configurations verified
- [ ] SSL certificates installed and valid
- [ ] Database schema created and indexed
- [ ] Backup procedures tested
- [ ] Monitoring and alerting configured
- [ ] Performance baseline established
- [ ] Documentation reviewed and approved

### Post-Deployment
- [ ] All services healthy and responding
- [ ] Health checks passing
- [ ] Production tests passing
- [ ] Monitoring data flowing correctly
- [ ] Backup processes working
- [ ] Performance metrics within acceptable ranges
- [ ] No critical errors in logs

## Support Contacts

### Emergency Contacts
- DevOps Team: devops@yourdomain.com
- Security Team: security@yourdomain.com
- Database Admin: dba@yourdomain.com

### Documentation
- API Documentation: https://api.yourdomain.com/docs
- Operations Guide: https://docs.yourdomain.com/operations
- Support Portal: https://support.yourdomain.com

---

## Getting Help

For production deployment support:

1. **Documentation**: https://docs.yourdomain.com
2. **Issues**: https://github.com/tuyoisaza/keledon/issues
3. **Security**: security@yourdomain.com
4. **Emergency**: +1-xxx-xxx-xxxx (24/7)

## Version Information

- **KELEDON Version**: 1.0.0
- **Production Ready**: ✅
- **Last Updated**: 2026-02-03
- **Compatibility**: All major browsers, Docker 20.10+

---

**🎉 KELEDON V1 PRODUCTION READY**

Follow this guide to successfully deploy and operate the complete KELEDON autonomous agent system in production.