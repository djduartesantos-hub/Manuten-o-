# CMMS Enterprise - Complete Setup & Start (PowerShell)
# All-in-one script: Install deps, setup DB, start services
# Usage: powershell -ExecutionPolicy Bypass -File setup-and-start.ps1

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CMMS Enterprise - Full Setup         ║" -ForegroundColor Cyan
Write-Host "║   Installing, Configuring, Starting    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. Check Project Root
# ============================================
Write-Host "[STEP 1/6] Verifying project structure..." -ForegroundColor Yellow
if (-not (Test-Path "backend\package.json" -PathType Leaf)) {
    Write-Host "[ERROR] Not in project root directory" -ForegroundColor Red
    Write-Host "Please run from the folder containing 'backend' and 'frontend'" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}
Write-Host "[OK] Project structure verified" -ForegroundColor Green
Write-Host ""

# ============================================
# 2. Check Node.js
# ============================================
Write-Host "[STEP 2/6] Checking Node.js and npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "Please install from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "[OK] npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not found!" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}
Write-Host ""

# ============================================
# 3. Setup Backend
# ============================================
Write-Host "[STEP 3/6] Setting up backend..." -ForegroundColor Yellow
Push-Location backend

# Create .env if doesn't exist
if (-not (Test-Path ".env" -PathType Leaf)) {
    Write-Host "[INFO] Creating .env from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example" -PathType Leaf) {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] .env created from .env.example" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] No .env.example found, creating minimal .env" -ForegroundColor Yellow
        @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cmms_enterprise
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-prod
"@ | Out-File -FilePath .env -Encoding utf8
        Write-Host "[OK] Minimal .env created" -ForegroundColor Green
        Write-Host "[ACTION] Edit backend\.env with your database credentials" -ForegroundColor Yellow
    }
}

Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Yellow
if (Test-Path "package-lock.json" -PathType Leaf) {
    Write-Host "[INFO] Using npm ci for reproducible install..." -ForegroundColor Cyan
    npm ci
} else {
    Write-Host "[INFO] Using npm install..." -ForegroundColor Cyan
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press any key to exit"
    exit 1
}
Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# ============================================
# 4. Setup Frontend
# ============================================
Write-Host "[STEP 4/6] Setting up frontend..." -ForegroundColor Yellow
Pop-Location
Push-Location frontend

Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Yellow
if (Test-Path "package-lock.json" -PathType Leaf) {
    Write-Host "[INFO] Using npm ci for reproducible install..." -ForegroundColor Cyan
    npm ci
} else {
    Write-Host "[INFO] Using npm install..." -ForegroundColor Cyan
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press any key to exit"
    exit 1
}
Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
Pop-Location
Write-Host ""

# ============================================
# 5. Setup Database
# ============================================
Write-Host "[STEP 5/6] Setting up database..." -ForegroundColor Yellow
Write-Host ""

# Check if PostgreSQL is running
$pgPort = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
if ($pgPort) {
    Write-Host "[OK] PostgreSQL detected on port 5432" -ForegroundColor Green
} else {
    Write-Host "[WARNING] PostgreSQL not detected on localhost:5432" -ForegroundColor Yellow
    Write-Host "[INFO]   Please ensure PostgreSQL is running before continuing" -ForegroundColor Cyan
    Write-Host "[INFO]   Windows Services > PostgreSQL > Start" -ForegroundColor Cyan
    Write-Host ""
    $postgresReady = Read-Host "Is PostgreSQL running? (y/n)"
    if ($postgresReady -ne "y" -and $postgresReady -ne "Y") {
        Write-Host "[ERROR] Cannot continue without PostgreSQL" -ForegroundColor Red
        Read-Host "Press any key to exit"
        exit 1
    }
}
Write-Host ""

Write-Host "[INFO] Running database migrations..." -ForegroundColor Yellow
Push-Location backend
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Migration failed - database may need manual setup" -ForegroundColor Yellow
    Write-Host "[INFO]   Trying to continue with seed..." -ForegroundColor Cyan
} else {
    Write-Host "[OK] Database migrations completed" -ForegroundColor Green
}
Write-Host ""

Write-Host "[INFO] Seeding demo data..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Seed failed but database should be ready" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Demo data seeded" -ForegroundColor Green
}
Pop-Location
Write-Host ""

# ============================================
# 6. Start Services
# ============================================
Write-Host "[STEP 6/6] Starting services..." -ForegroundColor Yellow
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Services Starting...              ║" -ForegroundColor Cyan
Write-Host "║   Each will open in a new window       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "[1/2] Starting Backend (http://localhost:3000)..." -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "../../backend"
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Push-Location '$backendPath'; Clear-Host; Write-Host 'Starting Backend...' -ForegroundColor Cyan; Start-Sleep -Seconds 2; npm run dev"
)

# Wait for backend
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "[2/2] Starting Frontend (http://localhost:5173)..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "../../frontend"
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Push-Location '$frontendPath'; Clear-Host; Write-Host 'Starting Frontend...' -ForegroundColor Cyan; Start-Sleep -Seconds 2; npm run dev"
)

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Services Starting in New Windows...  ║" -ForegroundColor Cyan
Write-Host "║   Opening http://localhost:5173       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Wait for services
Start-Sleep -Seconds 3

# Try to open browser
Start-Process "http://localhost:5173"

Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "To stop services, close the terminal windows." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press any key to exit"
