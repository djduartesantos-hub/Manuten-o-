# CMMS Enterprise - Improved Windows setup script
Write-Host "================================" -ForegroundColor Cyan
Write-Host "CMMS Enterprise - Windows Auto Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = 'Stop'

function Confirm-YesNo([string]$msg) {
    $r = Read-Host "$msg [Y/n]"
    if ($r -eq '' -or $r -match '^[Yy]') { return $true } else { return $false }
}

Write-Host "Checking project root..." -ForegroundColor Yellow
if (-not (Test-Path "backend\package.json" -PathType Leaf) -or -not (Test-Path "frontend\package.json" -PathType Leaf)) {
    Write-Host "✗ Error: Execute este script a partir da raiz do projeto." -ForegroundColor Red
    exit 1
}

Write-Host "Checking Node.js and npm..." -ForegroundColor Yellow
$nodeFound = $false
try { node --version > $null; npm --version > $null; $nodeFound = $true } catch { $nodeFound = $false }

if (-not $nodeFound) {
    Write-Host "Node.js / npm not found in PATH." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        if (Confirm-YesNo "Install Node.js LTS via winget now?") {
            Write-Host "Installing Node.js (LTS) via winget..." -ForegroundColor Yellow
            winget install --id OpenJS.NodeJS.LTS -e --silent
            if ($LASTEXITCODE -ne 0) {
                Write-Host "✗ winget failed to install Node.js." -ForegroundColor Red
                Write-Host "Please install Node.js manually from https://nodejs.org/" -ForegroundColor Yellow
                exit 1
            }
            Write-Host "✓ Node.js installed (please re-open the terminal if necessary)." -ForegroundColor Green
        } else {
            Write-Host "Please install Node.js LTS manually from https://nodejs.org/ and re-run this script." -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "winget not available. Please install Node.js manually: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Push-Location backend
if (-not (Test-Path ".env")) {
    Write-Host "Creating default .env in backend..." -ForegroundColor Yellow
    if (Test-Path ".env.example") { Copy-Item ".env.example" ".env"; Write-Host "✓ .env created from .env.example" -ForegroundColor Green }
    else { 
        @"
DATABASE_URL=postgresql://usuario:senha@localhost:5432/cmms_enterprise
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-prod
CORS_ORIGIN=http://localhost:5173
"@ | Out-File -FilePath .env -Encoding utf8; Write-Host "✓ default .env written" -ForegroundColor Green }
}

if (Test-Path package-lock.json) { Write-Host "Detected package-lock.json — using npm ci for reproducible install" -ForegroundColor Yellow; npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Error installing backend dependencies" -ForegroundColor Red; Pop-Location; exit 1 }
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location frontend
if (Test-Path package-lock.json) { Write-Host "Detected package-lock.json — using npm ci" -ForegroundColor Yellow; npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Error installing frontend dependencies" -ForegroundColor Red; Pop-Location; exit 1 }
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host " - Configure backend/.env with your PostgreSQL credentials if needed." -ForegroundColor White
Write-Host " - Start backend: cd backend && npm run dev" -ForegroundColor White
Write-Host " - Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
