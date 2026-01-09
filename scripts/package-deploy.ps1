# Tank Bulk Email System - Package for Deployment (PowerShell)
# Usage: .\package-deploy.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Tank Bulk Email System - Package Deploy" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot
$DeployDir = "$RootDir\deploy-package"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Clean and create deploy directory
Write-Host "`n[1/5] Creating deployment package directory..." -ForegroundColor Green
if (Test-Path $DeployDir) {
    Remove-Item -Recurse -Force $DeployDir
}
New-Item -ItemType Directory -Path $DeployDir | Out-Null
New-Item -ItemType Directory -Path "$DeployDir\frontend\dist" | Out-Null
New-Item -ItemType Directory -Path "$DeployDir\backend\dist" | Out-Null
New-Item -ItemType Directory -Path "$DeployDir\worker\dist" | Out-Null
New-Item -ItemType Directory -Path "$DeployDir\logs" | Out-Null
New-Item -ItemType Directory -Path "$DeployDir\data\files" | Out-Null

# Copy Frontend
Write-Host "[2/5] Copying Frontend..." -ForegroundColor Green
Copy-Item -Recurse "$RootDir\frontend\dist\*" "$DeployDir\frontend\dist\"

# Copy Backend
Write-Host "[3/5] Copying Backend..." -ForegroundColor Green
Copy-Item -Recurse "$RootDir\backend\dist\*" "$DeployDir\backend\dist\"
Copy-Item -Recurse "$RootDir\backend\node_modules" "$DeployDir\backend\"
Copy-Item "$RootDir\backend\package.json" "$DeployDir\backend\"
Copy-Item "$RootDir\backend\.env.prod" "$DeployDir\backend\.env"

# Copy Worker
Write-Host "[4/5] Copying Worker..." -ForegroundColor Green
Copy-Item -Recurse "$RootDir\worker\dist\*" "$DeployDir\worker\dist\"
Copy-Item -Recurse "$RootDir\worker\node_modules" "$DeployDir\worker\"
Copy-Item "$RootDir\worker\package.json" "$DeployDir\worker\"
Copy-Item "$RootDir\worker\.env.prod" "$DeployDir\worker\.env"

# Copy config files
Write-Host "[5/5] Copying configuration files..." -ForegroundColor Green
Copy-Item "$RootDir\ecosystem.config.js" "$DeployDir\"
Copy-Item "$RootDir\scripts\deploy-aws.sh" "$DeployDir\"

# Create README
$ReadmeContent = @"
# Tank Bulk Email System - Deployment Package
Generated: $Timestamp

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
"@

$ReadmeContent | Out-File -FilePath "$DeployDir\README.md" -Encoding utf8

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  Deployment package created!" -ForegroundColor Green
Write-Host "  Location: $DeployDir" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`nPackage contents:"
Get-ChildItem $DeployDir -Recurse -Directory | Select-Object FullName
