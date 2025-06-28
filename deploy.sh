#!/bin/bash

# Lumi6 Docker Deployment Script
set -e

echo "🚀 Starting Lumi6 Deployment..."

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on docker.env.example"
    echo "   Copy docker.env.example to .env and update the values:"
    echo "   cp docker.env.example .env"
    exit 1
fi

# Load environment variables
source .env

# Determine deployment type
DEPLOYMENT_TYPE=${1:-dev}

if [ "$DEPLOYMENT_TYPE" = "prod" ]; then
    echo "🏭 Starting production deployment..."
    COMPOSE_FILE="docker-compose.prod.yml"
else
    echo "🛠️  Starting development deployment..."
    COMPOSE_FILE="docker-compose.yml"
fi

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f $COMPOSE_FILE pull

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f $COMPOSE_FILE up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f $COMPOSE_FILE ps

# Run database migrations
echo "🗃️  Running database migrations..."
docker-compose -f $COMPOSE_FILE exec backend npx prisma migrate deploy || echo "Migration failed or already up to date"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose -f $COMPOSE_FILE exec backend npx prisma generate || echo "Prisma client generation failed"

echo "✅ Deployment completed successfully!"

if [ "$DEPLOYMENT_TYPE" = "prod" ]; then
    echo "🌐 Production services are running:"
    echo "   Frontend: http://localhost (nginx)"
    echo "   API: Available through nginx proxy"
else
    echo "🌐 Development services are running:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend: http://localhost:4000"
    echo "   Database: localhost:5432"
    echo "   Redis: localhost:6379"
fi

echo "📊 To view logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "🛑 To stop: docker-compose -f $COMPOSE_FILE down" 