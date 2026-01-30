# Custom Domain and HTTPS Configuration for KELEDON

This guide explains how to set up a custom domain with HTTPS for KELEDON deployed on Google Cloud Run.

## Overview

Google Cloud Run provides automatic HTTPS certificates, but you need to configure custom domain mapping for branded URLs and proper CORS configuration.

## Prerequisites

1. **Deployed KELEDON services** to Cloud Run
2. **Custom domain** ownership (e.g., `your-domain.com`)
3. **DNS provider** access (Cloud DNS, Route53, etc.)

## Step 1: Verify Service URLs

After deployment, get your service URLs:

```bash
# Backend service
gcloud run services describe keledon-cloud \
  --region us-central1 \
  --format 'value(status.url)'

# Frontend service  
gcloud run services describe keledon-landing \
  --region us-central1 \
  --format 'value(status.url)'
```

Example output:
- Backend: `https://keledon-cloud-xxxxx-xx.a.run.app`
- Frontend: `https://keledon-landing-xxxxx-xx.a.run.app`

## Step 2: Configure Custom Domain

### Option A: Using Google Cloud DNS (Recommended)

#### 2.1 Create Domain Mappings

```bash
# Map backend to api.your-domain.com
gcloud run domain-mappings create \
  --service=keledon-cloud \
  --domain=api.your-domain.com \
  --region=us-central1

# Map frontend to app.your-domain.com  
gcloud run domain-mappings create \
  --service=keledon-landing \
  --domain=app.your-domain.com \
  --region=us-central1
```

#### 2.2 Verify Domain Ownership

Google will provide DNS records to verify domain ownership. Add these records to your DNS provider.

### Option B: Using External DNS Provider

If using external DNS (Route53, GoDaddy, etc.):

#### 2.1 Get DNS Records

```bash
# Get required DNS records
gcloud run domain-mappings describe api.your-domain.com \
  --region=us-central1 \
  --format 'value(resourceRecords)'

gcloud run domain-mappings describe app.your-domain.com \
  --region=us-central1 \
  --format 'value(resourceRecords)'
```

#### 2.2 Add DNS Records

Add the provided CNAME or A records to your DNS provider:
```
api.your-domain.com. CNAME ghs.googlehosted.com.
app.your-domain.com. CNAME ghs.googlehosted.com.
```

## Step 3: Wait for SSL Certificates

Google automatically provisions SSL certificates. Check status:

```bash
# Check certificate status
gcloud run domain-mappings describe api.your-domain.com \
  --region=us-central1 \
  --format 'value(certificateStatus)'

gcloud run domain-mappings describe app.your-domain.com \
  --region=us-central1 \
  --format 'value(certificateStatus)'
```

Status should be `CERTIFICATE_READY`. This may take 15-30 minutes.

## Step 4: Update Environment Variables

### Backend CORS Configuration

Update the backend service with new domain:

```bash
gcloud run services update keledon-cloud \
  --region=us-central1 \
  --set-env-vars "CORS_ORIGINS=https://app.your-domain.com,chrome-extension://*,https://api.your-domain.com"
```

### Frontend Environment

Update `landing/.env.production`:

```bash
# Edit the file
nano ../landing/.env.production

# Update URLs
VITE_API_URL=https://api.your-domain.com
VITE_WEBSOCKET_URL=wss://api.your-domain.com
```

Redeploy frontend to apply changes:
```bash
./deploy-landing.sh your-project-id us-central1
```

## Step 5: Update Chrome Extension

Update `agent/background.js`:

```javascript
// Update line 96
const BACKEND_URL = 'https://api.your-domain.com';
```

Rebuild and republish the extension.

## Step 6: Test Configuration

### Health Checks

```bash
# Test backend
curl https://api.your-domain.com/health

# Test frontend
curl -I https://app.your-domain.com
```

### SSL Certificate Test

```bash
# Check certificate details
openssl s_client -connect api.your-domain.com:443 -servername api.your-domain.com
```

### Browser Test

1. Open `https://app.your-domain.com`
2. Test login functionality
3. Verify WebSocket connection works
4. Test Chrome extension connectivity

## Step 7: Optional - Root Domain

To also serve from root domain (`your-domain.com`):

```bash
# Create CNAME record for root domain
gcloud run domain-mappings create \
  --service=keledon-landing \
  --domain=your-domain.com \
  --region=us-central1
```

Add DNS record:
```
your-domain.com. CNAME ghs.googlehosted.com.
```

## Step 8: Monitoring and Maintenance

### Monitor Certificate Renewal

Certificates auto-renew, but monitor:

```bash
# Check all domain mappings
gcloud run domain-mappings list --region=us-central1
```

### Health Monitoring

Set up uptime monitoring:
- Google Cloud Monitoring
- UptimeRobot
- Pingdom

### Backup Configuration

Document your domain mapping configuration:

```bash
# Export current configuration
gcloud run domain-mappings describe api.your-domain.com --region=us-central1 > api-domain-config.yaml
gcloud run domain-mappings describe app.your-domain.com --region=us-central1 > app-domain-config.yaml
```

## Troubleshooting

### Common Issues

1. **Certificate Not Issued**
   - DNS propagation delay (wait 24-48 hours)
   - Incorrect DNS records
   - Domain verification issues

2. **CORS Errors**
   - Update CORS_ORIGINS environment variable
   - Include all required domains
   - Restart service after changes

3. **WebSocket Connection Issues**
   - Ensure WSS URL is correct
   - Check firewall rules
   - Verify SSL certificate

### Debug Commands

```bash
# Check service status
gcloud run services describe keledon-cloud --region=us-central1

# Check domain mapping status
gcloud run domain-mappings describe api.your-domain.com --region=us-central1

# View logs
gcloud run services logs read keledon-cloud --region=us-central1

# Test connectivity
curl -v https://api.your-domain.com/health
```

## Security Considerations

1. **HTTPS Only**: Force HTTPS redirect in your application
2. **HSTS**: Consider adding HTTP Strict Transport Security
3. **CORS**: Restrict to specific domains only
4. **Rate Limiting**: Configure rate limiting on Cloud Run
5. **Monitoring**: Set up alerts for SSL certificate expiry

## Final Checklist

- [ ] Custom domains mapped to services
- [ ] SSL certificates provisioned
- [ ] CORS environment variables updated
- [ ] Frontend environment variables updated
- [ ] Chrome extension updated
- [ ] All services tested and working
- [ ] Monitoring configured
- [ ] Documentation updated

## Cost Considerations

- **Domain Mapping**: Free on Cloud Run
- **SSL Certificates**: Free (managed by Google)
- **DNS**: Cost depends on provider
- **Monitoring**: Minimal cost for basic alerts

## Support

For issues with custom domains:
1. Check Google Cloud Console → Cloud Run → Domain Mappings
2. Review DNS configuration
3. Check service logs
4. Contact Google Cloud Support if needed