# Operations Guide - Open Banking Dashboard

This guide provides detailed information for DevOps engineers, system administrators, and operations personnel responsible for deploying, maintaining, and monitoring the Open Banking Dashboard application.

## Table of Contents

- [Deployment](#deployment)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security](#security)
- [Backup and Recovery](#backup-and-recovery)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Deployment

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git
- Access to OpenBankProject API or sandbox environment

### Deployment Options

#### Option 1: Vercel (Recommended)

The application is optimized for deployment on Vercel:

1. Fork or clone the repository to your GitHub account
2. Connect your GitHub repository to Vercel
3. Configure environment variables in the Vercel dashboard
4. Deploy the application

Vercel automatically handles the build process and deployment.

#### Option 2: Custom Server Deployment

For self-hosted environments:

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/open-banking-dashboard.git
   cd open-banking-dashboard
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the application:

   ```
   npm run build
   ```

4. Start the production server:
   ```
   npm start
   ```

### Continuous Integration/Deployment

For automated deployments, set up a CI/CD pipeline:

1. Configure GitHub Actions workflow:

   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: "18"
         - run: npm ci
         - run: npm run build
         - uses: vercel/actions/cli@master
           with:
             vercel-token: ${{ secrets.VERCEL_TOKEN }}
             vercel-org-id: ${{ secrets.ORG_ID }}
             vercel-project-id: ${{ secrets.PROJECT_ID }}
             vercel-args: "--prod"
   ```

2. Add the necessary secrets to your GitHub repository:
   - `VERCEL_TOKEN`: Your Vercel API token
   - `ORG_ID`: Your Vercel organization ID
   - `PROJECT_ID`: Your Vercel project ID

## Infrastructure Requirements

### Server Requirements

- **Minimum**: 1 vCPU, 1GB RAM
- **Recommended**: 2 vCPU, 2GB RAM
- **Storage**: At least 1GB of storage for the application

### Networking

- HTTPS support is mandatory
- Configure DNS records for your domain
- Set up appropriate firewall rules to allow traffic on ports 80 and 443

### Scaling Considerations

The application is stateless and can be horizontally scaled:

- Use load balancers for multiple instances
- Configure auto-scaling based on traffic patterns
- Consider CDN for static assets

## Environment Configuration

### Required Environment Variables

```
# Client-side API configuration
NEXT_PUBLIC_API_BASE_URL=http://your-domain.com/api

# Server-side API configuration
API_BASE_URL=https://apisandbox.openbankproject.com
OBP_API_VERSION=v5.0.0
OBP_CONSUMER_KEY=your_obp_consumer_key
OBP_DIRECT_LOGIN_URL=https://apisandbox.openbankproject.com/my/logins/direct
```

### Optional Environment Variables

```
# Enable detailed tracing and logging
ENABLE_DETAILED_LOGGING=true

# Set NODE_ENV to production
NODE_ENV=production

# Configure CORS (comma-separated list of domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

### Environment Management Best Practices

1. **Never commit secrets to version control**
2. Use environment-specific configuration files
3. Implement secret rotation policies
4. Use a secure vault service for managing secrets in production
5. Set different configurations for development, staging, and production

## Monitoring and Logging

### Logging System

The application uses a structured logging approach through the tracing utility:

1. **Log Levels**:

   - `debug`: Detailed information useful for debugging
   - `info`: General operational information
   - `warn`: Warning conditions that should be addressed
   - `error`: Error conditions requiring attention

2. **Log Collection**:
   - Configure logs to be sent to your preferred logging service
   - For Vercel deployments, use Vercel Logs or integrate with services like Datadog or LogDNA

### Performance Monitoring

For production environments, implement:

1. **Application Performance Monitoring (APM)**:

   - New Relic, Datadog, or Dynatrace for comprehensive monitoring
   - Track response times, error rates, and resource utilization

2. **Real User Monitoring (RUM)**:
   - Set up client-side monitoring to track user experience
   - Monitor page load times and client-side errors

### Health Checks

Implement health check endpoints:

1. Create a `/api/health` endpoint returning system status
2. Configure uptime monitoring services (Pingdom, UptimeRobot, etc.)
3. Set up alerts for failed health checks

### Alert Configuration

Configure alerts for critical conditions:

1. High error rates (>1% of requests)
2. Slow response times (>2s for API responses)
3. Authentication failures
4. System resource constraints
5. Failed health checks

## Security

### API Key Management

The application requires an OpenBankProject consumer key:

1. **Obtaining Keys**:

   - Register at the OpenBankProject Developer Portal
   - Create an application to get your consumer key
   - Request necessary API permissions

2. **Key Protection**:
   - Store the consumer key as an environment variable
   - Implement key rotation procedures
   - Monitor for unauthorized API usage

### Authentication Security

1. **Cookie Security**:

   - HttpOnly cookies are used to prevent client-side access
   - Secure flag is set in production to ensure HTTPS transmission
   - SameSite=Strict is set to prevent CSRF attacks

2. **Token Management**:
   - Authentication tokens expire after 7 days
   - Implement token revocation mechanisms
   - Avoid passing tokens in URL parameters

### Network Security

1. **TLS Configuration**:

   - Use TLS 1.2 or higher
   - Configure secure cipher suites
   - Enable HSTS headers

2. **CORS Configuration**:

   - Restrict cross-origin requests to trusted domains
   - Avoid using wildcard origins (`*`)

3. **Rate Limiting**:
   - Implement rate limiting on all API endpoints
   - Set appropriate limits based on endpoint sensitivity

### Security Headers

Ensure these security headers are configured:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Backup and Recovery

### Backup Strategy

Although the application is stateless, consider:

1. **Configuration Backup**:

   - Regularly backup environment variables
   - Maintain a secure copy of API keys and secrets

2. **Deployment Versioning**:
   - Tag stable deployments
   - Keep a history of successful deployments

### Disaster Recovery

Implement a disaster recovery plan:

1. **Recovery Procedures**:

   - Document step-by-step recovery process
   - Maintain deployment artifacts for quick restoration
   - Configure automatic rollbacks for failed deployments

2. **Test Recovery**:
   - Regularly test recovery procedures
   - Conduct disaster recovery drills

## Maintenance

### Update Procedures

1. **Application Updates**:

   - Pull latest changes from the repository
   - Test changes in a staging environment
   - Deploy during low-traffic periods
   - Monitor post-deployment for issues

2. **Dependency Management**:
   - Regularly update dependencies using `npm audit fix`
   - Test thoroughly after dependency updates
   - Subscribe to security advisories for critical dependencies

### Performance Tuning

1. **Node.js Optimization**:

   - Configure appropriate heap memory limits
   - Enable compression for responses
   - Optimize server timing parameters

2. **Next.js Optimization**:

   - Implement proper caching strategies
   - Configure ISR (Incremental Static Regeneration) where appropriate
   - Enable image optimization

3. **Frontend Optimization**:
   - Minimize bundle sizes
   - Implement code splitting
   - Optimize client-side rendering

### Scheduled Maintenance

Plan and communicate maintenance windows:

1. Schedule regular maintenance during off-peak hours
2. Notify users in advance for planned downtime
3. Implement maintenance mode page for planned outages

## Troubleshooting

### Common Issues

#### Authentication Failures

- **Symptom**: Users cannot log in or API calls return 401
- **Check**: Verify OBP_CONSUMER_KEY environment variable
- **Resolution**: Update consumer key or request new one if expired

#### API Connection Issues

- **Symptom**: API calls to OpenBankProject fail
- **Check**: Confirm API_BASE_URL and API connectivity
- **Resolution**: Verify network connectivity to OpenBankProject API

#### Performance Degradation

- **Symptom**: Slow response times or timeouts
- **Check**: Monitor server resources and API response times
- **Resolution**: Scale infrastructure or optimize code paths

### Diagnostic Procedures

1. **Log Analysis**:

   - Review application logs for errors
   - Check correlation between errors and user reports
   - Look for patterns in failed requests

2. **Connection Testing**:

   - Use the test scripts to verify API connectivity

   ```
   node scripts/test-banks-api.js
   ```

3. **Configuration Verification**:
   - Validate environment variables
   - Check for misconfigurations
   ```
   node scripts/test-env.js
   ```

### Support Escalation

For unresolved issues:

1. Open an issue in the GitHub repository with detailed information
2. Contact OpenBankProject support for API-related issues
3. For critical production issues, engage with the core development team

---

This operations guide should be treated as a living document and updated regularly as the application evolves.
