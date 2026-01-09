# Tank Bulk Email System - Build Script (PowerShell)
# Usage: .\build-all.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Tank Bulk Email System - Build All" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot

# Build Frontend
Write-Host "`n[1/3] Building Frontend..." -ForegroundColor Green
Set-Location "$RootDir\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Frontend build complete!" -ForegroundColor Green

# Build Backend
Write-Host "`n[2/3] Building Backend..." -ForegroundColor Green
Set-Location "$RootDir\backend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Backend build complete!" -ForegroundColor Green

# Build Worker
Write-Host "`n[3/3] Building Worker..." -ForegroundColor Green
Set-Location "$RootDir\worker"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Worker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Worker build complete!" -ForegroundColor Green

Set-Location $RootDir

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  All builds completed successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`nNext: Run .\scripts\package-deploy.ps1 to create deployment package"
