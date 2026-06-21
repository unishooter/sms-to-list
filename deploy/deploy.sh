#!/usr/bin/env bash
# deploy.sh — Pull latest code, rebuild frontend, restart backend.
# Run as ec2-user from any directory.
set -euo pipefail

APP_DIR=/srv/sms-list-app
FRONTEND_DIST=$APP_DIR/frontend/dist
NGINX_ROOT=/var/www/sms-list-app

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin master

echo "==> Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install --omit=dev

echo "==> Installing frontend dependencies and building..."
cd "$APP_DIR/frontend"
npm install
npm run build

echo "==> Deploying frontend to $NGINX_ROOT..."
sudo mkdir -p "$NGINX_ROOT"
sudo rsync -a --delete "$FRONTEND_DIST/" "$NGINX_ROOT/"

echo "==> Restarting backend service..."
sudo systemctl restart sms-list-api

echo "==> Checking service status..."
sudo systemctl is-active --quiet sms-list-api && echo "Service is running." || echo "WARNING: service failed to start!"

echo ""
echo "Deploy complete! $(date)"
