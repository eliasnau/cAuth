#!/bin/bash
set -e

# Configuration
APP_DIR="/opt/auth"
DOCKER_COMPOSE="docker compose"
GITHUB_REPO="eliasnau/cAuth"
BRANCH="main"

# Print commands and their arguments as they are executed
set -x

# Navigate to app directory
cd $APP_DIR

# Create backups directory if it doesn't exist
mkdir -p backups

# Backup database
backup_date=$(date +%Y%m%d_%H%M%S)
$DOCKER_COMPOSE exec -T postgres pg_dump -U ${POSTGRES_USER:-root} ${POSTGRES_DB:-app} > "backups/db_backup_$backup_date.sql"

# Pull latest changes
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# Copy production env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.production .env
fi

# Build and deploy
$DOCKER_COMPOSE pull
$DOCKER_COMPOSE build --no-cache app
$DOCKER_COMPOSE up -d --force-recreate

# Wait for containers to be healthy
echo "Waiting for containers to be healthy..."
sleep 30

# Cleanup
docker system prune -f

# Verify deployment
if $DOCKER_COMPOSE ps | grep -q "auth-app.*running"; then
    echo "✅ Deployment successful! All services are running."
else
    echo "❌ Deployment failed! Check logs for details."
    exit 1
fi

# Print logs
$DOCKER_COMPOSE logs --tail=50 app