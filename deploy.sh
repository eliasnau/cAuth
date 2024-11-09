#!/bin/bash
set -e

# Configuration
APP_DIR="/opt/auth"
DOCKER_COMPOSE="docker compose"
GITHUB_REPO="eliasnau/cAuth"
BRANCH="main"
DISCORD_WEBHOOK_URL="your-webhook-url"

# Function to send Discord notifications
send_discord_notification() {
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -H "Content-Type: application/json" \
             -d "{\"content\":\"$1\"}" \
             $DISCORD_WEBHOOK_URL
    fi
}

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

# Run migrations with increased timeout and memory
$DOCKER_COMPOSE exec -T \
    -e NODE_OPTIONS="--max-old-space-size=1024" \
    app npx prisma migrate deploy --timeout 60000

# Cleanup
docker system prune -f

# Verify deployment
if $DOCKER_COMPOSE ps | grep -q "auth-app.*running"; then
    send_discord_notification "✅ Deployment successful! All services are running."
else
    send_discord_notification "❌ Deployment failed! Check logs for details."
    exit 1
fi

# Print logs
$DOCKER_COMPOSE logs --tail=50 app