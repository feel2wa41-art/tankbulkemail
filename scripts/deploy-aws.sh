#!/bin/bash
#
# Tank Bulk Email System - AWS Deployment Script
# Usage: ./deploy-aws.sh
#

set -e

echo "================================================"
echo "  Tank Bulk Email System - AWS Deployment"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/app/tank"
LOG_DIR="/app/tank/logs"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}Please run as root or with sudo${NC}"
  exit 1
fi

echo -e "${GREEN}[1/7] Installing system dependencies...${NC}"
apt update
apt install -y curl git build-essential

# Install Node.js 20.x
echo -e "${GREEN}[2/7] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install Redis
echo -e "${GREEN}[3/7] Installing Redis...${NC}"
if ! command -v redis-server &> /dev/null; then
  apt install -y redis-server
  systemctl enable redis-server
  systemctl start redis-server
fi
echo "Redis status: $(systemctl is-active redis-server)"

# Install PM2
echo -e "${GREEN}[4/7] Installing PM2...${NC}"
npm install -g pm2 serve

# Create app directory
echo -e "${GREEN}[5/7] Setting up application directory...${NC}"
mkdir -p $APP_DIR
mkdir -p $LOG_DIR

echo -e "${GREEN}[6/7] Deployment directory ready at $APP_DIR${NC}"

# Instructions for next steps
echo ""
echo "================================================"
echo -e "${GREEN}  Server Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Copy your built files to the server:"
echo "   scp -r frontend/dist/* user@server:$APP_DIR/frontend/dist/"
echo "   scp -r backend/dist/* user@server:$APP_DIR/backend/dist/"
echo "   scp -r backend/node_modules user@server:$APP_DIR/backend/"
echo "   scp -r worker/dist/* user@server:$APP_DIR/worker/dist/"
echo "   scp -r worker/node_modules user@server:$APP_DIR/worker/"
echo ""
echo "2. Copy environment files:"
echo "   scp backend/.env.prod user@server:$APP_DIR/backend/.env"
echo "   scp worker/.env.prod user@server:$APP_DIR/worker/.env"
echo ""
echo "3. Copy and run PM2 ecosystem:"
echo "   scp ecosystem.config.js user@server:$APP_DIR/"
echo "   cd $APP_DIR && pm2 start ecosystem.config.js"
echo "   pm2 startup && pm2 save"
echo ""
echo "4. Access your application:"
echo "   Frontend: http://YOUR_SERVER_IP:3000"
echo "   Backend:  http://YOUR_SERVER_IP:3001/api/v1/health"
echo ""
echo "================================================"
