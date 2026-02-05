# Render Deployment Guide

## Complete Guide to Deploy CMMS Application to Render Platform

This guide provides step-by-step instructions to deploy the CMMS application to Render using Docker and the included `render.yaml` blueprint.

---

## Prerequisites

✅ **GitHub Repository**: Your code must be pushed to GitHub  
✅ **Render Account**: Sign up at [render.com](https://render.com) (free tier available)  
✅ **Docker Files**: `Dockerfile`, `.dockerignore`, and `render.yaml` in repository root  
✅ **Environment Variables**: Prepare values for production configuration

---

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
# Add Docker configuration files
git add Dockerfile .dockerignore render.yaml backend/src/app.ts

# Commit changes
git commit -m "feat: Add Docker and Render deployment configuration with static serving"

# Push to GitHub
git push origin main
```

### Step 2: Create Render Account

1. Visit [render.com](https://render.com)
2. Sign up using **GitHub** (recommended for easier integration)
3. Authorize Render to access your repositories

### Step 3: Deploy Using Blueprint

1. **Login to Render Dashboard**
2. Click **"New +"** → **"Blueprint"**
3. **Connect Your Repository**:
   - Select your GitHub repository
   - Grant Render access to the repository
4. **Configure Blueprint**:
   - Render will detect `render.yaml` automatically
   - Review the services to be created:
     - `pserv` - PostgreSQL Database (Standard plan recommended)
     - `web` - Web Service (Docker-based)

### Step 4: Configure Environment Variables

Render will prompt you to set environment variables. Here are the required values:

#### Database Variables (Auto-configured)
These are automatically set by Render from the PostgreSQL service:
- `DATABASE_URL` ✅ Auto-generated

#### Application Variables (Manual configuration required)

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | Generate with: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | JWT expiration | `1h` |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | Generate with: `openssl rand -hex 32` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh expiration | `7d` |
| `BCRYPT_ROUNDS` | Password hash rounds | `10` |
| `CORS_ORIGIN` | Frontend URL | `https://your-app.onrender.com` |
| `ADMIN_PASSWORD` | Superadmin password | `YourStrongPassword123!` ⚠️ **Set as Secret** |

#### ⚠️ Security Notes
- Generate strong secrets using: `openssl rand -hex 32`
- Mark `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `ADMIN_PASSWORD` as **secrets** in Render
- Update `CORS_ORIGIN` with your actual Render URL after first deployment

### Step 5: Deploy Services

1. Click **"Apply"** or **"Create Services"**
2. Render will:
   - Create PostgreSQL database (pserv)
   - Build Docker image from Dockerfile
   - Deploy web service
   - Run database migrations (post-deploy hook)

⏱️ **Build Time**: First build takes 5-10 minutes (multi-stage Docker build)

### Step 6: Monitor Deployment

1. **View Build Logs**:
   - Navigate to your web service
   - Click **"Logs"**
   - Watch for successful build stages:
     - Frontend build (Vite compilation)
     - Backend build (TypeScript compilation)
     - Production image creation
     - Health check initialization

2. **Check Service Status**:
   - PostgreSQL service: Should show "Available"
   - Web service: Should show "Live"

3. **Verify Health Endpoint**:
   ```bash
   curl https://your-app.onrender.com/health
   ```
   Expected response:
   ```json
   {
     "success": true,
     "message": "CMMS Backend is running",
     "timestamp": "2025-01-24T10:00:00.000Z",
     "services": {
       "api": "running"
     }
   }
   ```

### Step 7: Initial Application Setup

1. **Access Your Application**:
   - Open: `https://your-app.onrender.com`

2. **Login as Superadmin**:
   - Email: `admin@cmms.com`
   - Password: Value set in `ADMIN_PASSWORD` env variable

3. **Seed Demo Data**:
   - Navigate to **🔧 Setup BD** page (visible only to superadmin)
   - Click **"Adicionar Dados de Demonstração"**
   - Wait for confirmation message

4. **Verify Installation**:
   - Check dashboard for demo data
   - Test login with demo users:
     - Manager: `carlos.silva@example.com` / `Manager@123`
     - Technician: `ana.santos@example.com` / `Tech@123`

---

## Post-Deployment Configuration

### Update CORS Origin

After first deployment, update the `CORS_ORIGIN` environment variable:

1. Go to Render Dashboard → Your Web Service
2. Navigate to **"Environment"** tab
3. Update `CORS_ORIGIN` to actual deployment URL
4. Save changes (triggers automatic redeployment)

### Database Migrations

Migrations run automatically on each deployment via the `postDeploy` hook in `render.yaml`:

```yaml
buildCommand: npm run build
startCommand: npm start
postDeploy: npm run db:migrate
```

To run migrations manually:
1. Go to Render Dashboard → Web Service
2. Click **"Shell"** tab
3. Run: `npm run db:migrate`

### Enable Auto-Deploy

Auto-deploy is enabled by default in `render.yaml`:

```yaml
autoDeploy: true
```

**What this means**:
- Every push to `main` branch triggers automatic deployment
- Render builds new Docker image
- Runs database migrations
- Deploys updated service with zero-downtime

---

## Service Architecture

### Multi-Stage Docker Build

The Dockerfile uses a **3-stage build** for optimization:

```dockerfile
# Stage 1: Frontend Builder
FROM node:18-alpine AS frontend-builder
# Builds React app with Vite → /app/frontend/dist

# Stage 2: Backend Builder  
FROM node:18-alpine AS backend-builder
# Compiles TypeScript → /app/backend/dist

# Stage 3: Production Runtime
FROM node:18-alpine
# Copies frontend dist → /app/frontend
# Copies backend dist → /app/backend/dist
# Production-only dependencies
```

**Benefits**:
- Smaller final image (~200MB vs ~1GB)
- Faster deployments
- No dev dependencies in production
- Single container serves both frontend and backend

### Static File Serving

The backend Express server serves static frontend files in production:

```typescript
// backend/src/app.ts
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}
```

**Routing**:
- `/api/*` → Backend API routes
- `/*` → Frontend static files + SPA fallback

---

## Troubleshooting

### Build Failures

**Problem**: Docker build fails during frontend stage  
**Solution**: 
```bash
# Test locally
docker build -t cmms-test .

# Check Vite build
cd frontend && npm run build
```

**Problem**: TypeScript compilation errors  
**Solution**:
```bash
# Verify backend compiles
cd backend && npm run build
```

### Database Connection Issues

**Problem**: `ECONNREFUSED` or database connection errors  
**Solution**:
1. Verify PostgreSQL service is "Available" in Render Dashboard
2. Check `DATABASE_URL` environment variable is set
3. Verify internal connection string in logs

**Problem**: "relation does not exist" errors  
**Solution**: Ensure migrations ran successfully:
```bash
# Check deployment logs for migration output
# Or run manually in Shell tab
npm run db:migrate
```

### CORS Errors

**Problem**: Frontend can't communicate with backend  
**Solution**: Update `CORS_ORIGIN` environment variable with exact Render URL (including `https://`)

### Login Not Working

**Problem**: Cannot login with superadmin credentials  
**Solution**:
1. Verify `ADMIN_PASSWORD` matches your login attempt
2. Check database was seeded: Login to Render Shell
   ```bash
   npm run db:seed
   ```

---

## Maintenance Operations

### View Application Logs

```bash
# Real-time logs
Render Dashboard → Service → Logs tab

# Or using Render CLI
render logs --tail
```

### Database Backup

Render provides automatic backups for paid PostgreSQL plans.

**Manual Backup**:
```bash
# Install Render CLI
npm install -g render-cli

# Export database
render db export <database-name> > backup.sql
```

### Scale Service

1. Go to Render Dashboard → Web Service
2. Navigate to **"Scaling"** tab
3. Upgrade to **Standard** or **Pro** plan for:
   - More resources (CPU/Memory)
   - Zero-downtime deployments
   - Custom health check configuration

### Database Management

Access PostgreSQL via Render Shell:
```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Check superadmin user
SELECT * FROM users WHERE role = 'super_admin';
```

---

## Upgrading Plans

### Free Tier Limitations
- Services spin down after 15 minutes of inactivity
- Cold start delay (~30 seconds)
- Limited resources (512MB RAM)

### Recommended for Production
- **Web Service**: Standard ($7/month)
  - 1GB RAM
  - Zero-downtime deployments
  - No spin down
  
- **PostgreSQL**: Standard ($7/month)
  - 1GB storage
  - Automatic backups
  - Point-in-time recovery

---

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL on Render](https://render.com/docs/databases)

---

## Support

For issues specific to this application:
1. Check [TROUBLESHOOTING.md](../GUIDES/TROUBLESHOOTING.md)
2. Review GitHub Issues
3. Contact development team

For Render platform issues:
- [Render Community Forum](https://community.render.com/)
- [Render Support](https://render.com/support)

---

## Quick Reference

### Important URLs
- **Render Dashboard**: https://dashboard.render.com
- **Application**: https://your-app.onrender.com
- **Health Check**: https://your-app.onrender.com/health

### Default Credentials
- **Superadmin**: `admin@cmms.com` / `<ADMIN_PASSWORD>`
- **Manager Demo**: `carlos.silva@example.com` / `Manager@123`
- **Technician Demo**: `ana.santos@example.com` / `Tech@123`

### Key Files
- `Dockerfile` - Multi-stage build configuration
- `.dockerignore` - Build exclusions
- `render.yaml` - Infrastructure as code
- `backend/src/app.ts` - Static file serving logic

---

**Last Updated**: January 2025  
**Version**: 1.0.0
