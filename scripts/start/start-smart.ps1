# CMMS Enterprise - Smart Startup Script for Windows (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File start-smart.ps1

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     CMMS Enterprise - Startup          ║" -ForegroundColor Cyan
Write-Host "║      Checking Dependencies...          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if in project root
if (-not (Test-Path "backend\package.json" -PathType Leaf)) {
    Write-Host "[ERROR] Not in project root directory" -ForegroundColor Red
    Write-Host "Please run from the folder containing 'backend' and 'frontend'" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "Please install from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

# Check PostgreSQL
Write-Host ""
Write-Host "[INFO] Checking PostgreSQL..." -ForegroundColor Yellow
$pgPort = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
if ($pgPort) {
    Write-Host "[OK] PostgreSQL detected on port 5432" -ForegroundColor Green
} else {
    Write-Host "[WARNING] PostgreSQL not detected on localhost:5432" -ForegroundColor Yellow
    Write-Host "         Make sure PostgreSQL is running!" -ForegroundColor Yellow
    Write-Host "         Windows Services > PostgreSQL > Start" -ForegroundColor Yellow
}

# Check Redis (optional)
Write-Host ""
Write-Host "[INFO] Checking Redis (optional)..." -ForegroundColor Yellow
$redisPort = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
if ($redisPort) {
    Write-Host "[OK] Redis detected on port 6379" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Redis not detected on localhost:6379" -ForegroundColor Yellow
    Write-Host "[INFO]   Redis is optional for local development" -ForegroundColor Yellow
    Write-Host "[INFO]   For production/full features, install Redis:" -ForegroundColor Yellow
    Write-Host "           WSL 2: wsl && sudo apt install redis-server" -ForegroundColor White
    Write-Host "           Docker: docker run -d -p 6379:6379 redis" -ForegroundColor White
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Starting Services...              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Setup Backend
Write-Host "[1/2] Starting Backend (http://localhost:3000)" -ForegroundColor Cyan
Push-Location backend

if (-not (Test-Path ".env" -PathType Leaf)) {
    Write-Host ""
    Write-Host "[WARNING] No .env file found in backend/" -ForegroundColor Yellow
    Write-Host "[INFO] Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example" -PathType Leaf) {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
        Write-Host "[ACTION REQUIRED] Edit backend\.env with your database credentials" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Start Backend in new window
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host 'Starting Backend...' -ForegroundColor Cyan; Start-Sleep -Seconds 2; npm run dev"
)

Pop-Location

# Wait for backend
Start-Sleep -Seconds 5

# Setup Frontend
Write-Host "[2/2] Starting Frontend (http://localhost:5173)" -ForegroundColor Cyan
Push-Location frontend

Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host 'Starting Frontend...' -ForegroundColor Cyan; Start-Sleep -Seconds 2; npm run dev"
)

Pop-Location

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Services Starting in New Windows...  ║" -ForegroundColor Cyan
Write-Host "║   Opening http://localhost:5173       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Wait for services
Start-Sleep -Seconds 3

# Open browser
Start-Process "http://localhost:5173"

Write-Host "✅ Startup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "To stop services, close the terminal windows." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press any key to exit"
