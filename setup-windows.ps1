# CMMS Enterprise - Setup Script for Windows PowerShell
# This script prepares the project for local development on Windows

Write-Host "================================" -ForegroundColor Cyan
Write-Host "CMMS Enterprise - Windows Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin (optional)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found!" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found!" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version
    Write-Host "✓ PostgreSQL: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ PostgreSQL not found or not in PATH" -ForegroundColor Yellow
    Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "  Make sure to add psql to your system PATH" -ForegroundColor Yellow
}

# Check if in correct directory
if (-not (Test-Path "backend\package.json")) {
    Write-Host "✗ Error: Run this script from the project root" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Backend Setup
Write-Host ""
Write-Host "=== BACKEND SETUP ===" -ForegroundColor Cyan
cd backend

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env created from .env.example" -ForegroundColor Green
        Write-Host "⚠ Update backend\.env with your PostgreSQL credentials" -ForegroundColor Yellow
    } else {
        Write-Host "Creating default .env..." -ForegroundColor Yellow
        $envContent = @"
DATABASE_URL=postgresql://usuario:senha@localhost:5432/cmms_enterprise
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-prod
CORS_ORIGIN=http://localhost:5173
"@
        Set-Content ".env" $envContent
        Write-Host "✓ Default .env created" -ForegroundColor Green
    }
} else {
    Write-Host "✓ .env already exists" -ForegroundColor Green
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Error installing backend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green

# Frontend Setup
cd ..
Write-Host ""
Write-Host "=== FRONTEND SETUP ===" -ForegroundColor Cyan
cd frontend

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Error installing frontend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green

cd ..

# Final message
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update database credentials in backend\.env:" -ForegroundColor White
Write-Host "   DATABASE_URL=postgresql://user:password@localhost:5432/cmms_enterprise" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Option A - Run start-all.bat (automatic):" -ForegroundColor White
Write-Host "   Double-click: start-all.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Option B - Run manually (two terminals):" -ForegroundColor White
Write-Host "   Terminal 1: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "   Terminal 2: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Open browser:" -ForegroundColor White
Write-Host "   http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "Demo credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@cmms.com" -ForegroundColor Gray
Write-Host "  Password: Admin@123456" -ForegroundColor Gray
Write-Host ""
