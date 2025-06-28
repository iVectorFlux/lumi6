# 🐳 Docker Deployment Guide for Lumi6

This guide explains how to deploy the Lumi6 application using Docker containers.

## 📋 Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Git

## 🏗️ Architecture

The Docker setup includes:
- **Frontend**: React/Vite app served with Nginx
- **Backend**: Node.js/Express API with Prisma
- **Database**: PostgreSQL 15
- **Cache**: Redis (optional)
- **Reverse Proxy**: Nginx (production only)

## 📁 Docker Files Overview

```
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production environment
├── docker.env.example          # Environment variables template
├── deploy.sh                   # Deployment script
├── lumi6frontend/
│   ├── Dockerfile              # Frontend container
│   ├── nginx.conf              # Nginx config for frontend
│   └── .dockerignore
└── lumi6backend/
    ├── Dockerfile              # Backend container
    └── .dockerignore
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/iVectorFlux/lumi6.git
cd lumi6
```

### 2. Configure Environment

```bash
# Copy environment template
cp docker.env.example .env

# Edit with your values
nano .env
```

### 3. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Development deployment
./deploy.sh dev

# Production deployment
./deploy.sh prod
```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env` file with these variables:

```bash
# Database
POSTGRES_DB=lumi6
POSTGRES_USER=lumi6user
POSTGRES_PASSWORD=your-secure-password

# Security
JWT_SECRET=your-super-secret-jwt-key
REDIS_PASSWORD=your-redis-password

# API Keys
OPENAI_API_KEY=your-openai-api-key

# URLs
FRONTEND_URL=https://app.lumi6.com
VITE_API_URL=https://api.lumi6.com
```

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate Redis password
openssl rand -base64 32
```

## 🛠️ Development Deployment

For development with hot reload and debugging:

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development URLs:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Database: localhost:5432
- Redis: localhost:6379

## 🏭 Production Deployment

For production with security hardening:

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Or use the deployment script
./deploy.sh prod
```

### Production Features:
- Nginx reverse proxy
- No external database/redis ports
- Security headers
- Gzip compression
- SSL ready
- Health checks

## 📊 Container Management

### View Running Containers
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Execute Commands in Containers
```bash
# Backend shell
docker-compose exec backend sh

# Database shell
docker-compose exec database psql -U lumi6user -d lumi6

# Run Prisma migrations
docker-compose exec backend npx prisma migrate deploy
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update and Rebuild
```bash
# Pull latest code and rebuild
git pull
docker-compose up -d --build
```

## 🗄️ Database Management

### Run Migrations
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Access Database
```bash
docker-compose exec database psql -U lumi6user -d lumi6
```

### Backup Database
```bash
docker-compose exec database pg_dump -U lumi6user lumi6 > backup.sql
```

### Restore Database
```bash
docker-compose exec -T database psql -U lumi6user -d lumi6 < backup.sql
```

## 🔒 Security Best Practices

### For Production:

1. **Use Strong Passwords**: Generate random passwords for all services
2. **SSL Certificates**: Add SSL certificates to nginx configuration
3. **Firewall**: Limit external access to necessary ports only
4. **Regular Updates**: Keep Docker images updated
5. **Monitoring**: Add monitoring and alerting

### Secure Environment Setup:
```bash
# Use Docker secrets (recommended for production)
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-db-password" | docker secret create db_password -
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Scale with load balancer
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Resource Limits
Add to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## 🐛 Troubleshooting

### Common Issues:

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   sudo netstat -nlp | grep :3000
   ```

2. **Permission Denied**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER ./
   chmod +x deploy.sh
   ```

3. **Database Connection Failed**
   ```bash
   # Check database logs
   docker-compose logs database
   
   # Verify database is running
   docker-compose exec database pg_isready -U lumi6user
   ```

4. **Build Failures**
   ```bash
   # Clean build cache
   docker system prune -a
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

### Debug Commands:
```bash
# Check container health
docker-compose ps

# Check resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

## 🚦 Health Monitoring

All services include health checks:

```bash
# Check health status
docker-compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' container_name
```

## 📝 Logs and Monitoring

### Log Locations:
- Backend logs: `./lumi6backend/logs/`
- Nginx logs: Container logs only
- Database logs: Container logs only

### Centralized Logging:
```bash
# Follow all logs
docker-compose logs -f

# Save logs to file
docker-compose logs > deployment.log
```

## 🔄 CI/CD Integration

### GitHub Actions Example:
```yaml
- name: Deploy to Production
  run: |
    ./deploy.sh prod
    docker-compose -f docker-compose.prod.yml ps
```

### Auto-deployment webhook:
Set up webhooks to trigger deployment on code push.

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables: `cat .env`
3. Check service health: `docker-compose ps`
4. Review this guide for troubleshooting steps

Happy deploying! 🚀 