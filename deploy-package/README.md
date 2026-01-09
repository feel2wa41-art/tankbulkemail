# Tank Bulk Email System - Deployment Package
Generated: 20260109-074250

## Quick Start (AWS EC2 Ubuntu)

1. Upload this folder to your server:
   scp -r deploy-package/* ubuntu@YOUR_SERVER_IP:/app/tank/

2. SSH to server and run setup:
   ssh ubuntu@YOUR_SERVER_IP
   cd /app/tank
   sudo bash deploy-aws.sh

3. Install serve for frontend:
   npm install -g serve

4. Start all services:
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save

5. Access:
   - Frontend: http://YOUR_SERVER_IP:3000
   - Backend: http://YOUR_SERVER_IP:3001/api/v1/health
   - Worker: http://YOUR_SERVER_IP:3002/health

## Default Login
- ID: admin
- PW: admin123

## Environment Files
- backend/.env - Backend configuration
- worker/.env - Worker configuration

Make sure to update Oracle connection settings if you have a real database.
