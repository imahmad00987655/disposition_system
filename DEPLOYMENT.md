# Docker Deployment Guide

## 📦 Files Created for Deployment

1. **Dockerfile** - Multi-stage optimized build (recommended for production)
2. **Dockerfile.simple** - Simpler single-stage build (easier to debug)
3. **docker-compose.yml** - Easy deployment with docker-compose
4. **.dockerignore** - Excludes unnecessary files from Docker build
5. **.env.example** - Environment variables template

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env file with your server IPs
# Update NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_COMPLAINTS_API, etc.

# 3. Build and run
docker-compose up -d --build

# 4. Check logs
docker-compose logs -f

# 5. Access application
# Open http://YOUR_SERVER_IP:6126
```

### Option 2: Using Docker Directly

```bash
# 1. Build the image
docker build -t disposition-system:latest .

# 2. Run the container
docker run -d \
  --name disposition-system \
  -p 6126:6126 \
  -e NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP/Disposition-system/ \
  -e NEXT_PUBLIC_COMPLAINTS_API=http://192.168.1.209:6004/callcenterreportdata \
  -e NEXT_PUBLIC_ORDERS_API=http://192.168.1.209:5125/api_data \
  disposition-system:latest

# 3. Check logs
docker logs -f disposition-system
```

### Option 3: Using Simple Dockerfile

```bash
# Build with simple Dockerfile
docker build -f Dockerfile.simple -t disposition-system:simple .

# Run
docker run -d \
  --name disposition-system \
  -p 6126:6126 \
  -e NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP/Disposition-system/ \
  disposition-system:simple
```

## ⚙️ Environment Variables

Update these in `.env` file or docker-compose.yml:

```env
NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP/Disposition-system/
NEXT_PUBLIC_COMPLAINTS_API=http://192.168.1.209:6004/callcenterreportdata
NEXT_PUBLIC_ORDERS_API=http://192.168.1.209:5125/api_data
```

## 📝 Important Notes

### PHP Backend
- Your PHP files (`*.php`) need to be accessible via web server (Apache/Nginx)
- Update `lib/api.ts` to use environment variable for API_BASE_URL
- Or ensure PHP files are served from the same server

### Database Connections
- Make sure your databases (SQL Server and MySQL) are accessible from the Docker container
- Update connection strings in PHP files if needed
- For remote databases, use server IP instead of localhost

### Port Configuration
- Default port: 6126
- Change in docker-compose.yml if needed: `"8080:6126"` for port 8080

## 🔧 Troubleshooting

### Container won't start
```bash
# Check logs
docker logs disposition-system-nextjs

# Check if port is already in use
netstat -tulpn | grep 6126
```

### Build fails
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### API calls not working
- Check if PHP backend is accessible
- Verify API_BASE_URL in environment variables
- Check network connectivity from container

## 🛑 Stop/Remove

```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Remove specific container
docker stop disposition-system-nextjs
docker rm disposition-system-nextjs
```

## 📊 Health Check

The container includes a health check. Monitor with:

```bash
docker ps  # Check STATUS column
docker inspect disposition-system-nextjs | grep -A 10 Health
```

## 🔄 Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

