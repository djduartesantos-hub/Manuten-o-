@echo off
REM ============================================
REM CMMS Enterprise - Complete Setup & Start
REM Windows Edition - All-in-One Script (v2)
REM Improved: Better error handling and window management
REM ============================================

setlocal enabledelayedexpansion
color 0A

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║   CMMS Enterprise - Full Setup         ║
echo ║   Installing, Configuring, Starting    ║
echo ╚════════════════════════════════════════╝
echo.

REM ============================================
REM 1. Check Project Root
REM ============================================
echo [STEP 1/6] Verifying project structure...
if not exist "backend\package.json" (
    color 0C
    echo [ERROR] Not in project root directory
    echo Please run from the folder containing "backend" and "frontend"
    color 07
    pause
    exit /b 1
)
echo [OK] Project structure verified
echo.

REM ============================================
REM 2. Check Node.js
REM ============================================
echo [STEP 2/6] Checking Node.js and npm...
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js not found!
    color 07
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

npm --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] npm not found!
    color 07
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%
echo.

REM ============================================
REM 3. Setup Backend
REM ============================================
echo [STEP 3/6] Setting up backend...
cd backend

REM Create .env if doesn't exist
if not exist ".env" (
    echo [INFO] Creating .env from template...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] .env created from .env.example
    ) else (
        color 0E
        echo [WARNING] No .env.example found, creating minimal .env
        color 07
        (
            echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cmms_enterprise
            echo REDIS_HOST=localhost
            echo REDIS_PORT=6379
            echo REDIS_PASSWORD=
            echo REDIS_DB=0
            echo PORT=3000
            echo NODE_ENV=development
            echo JWT_SECRET=dev-secret-key-change-in-prod
        ) > .env
        echo [OK] Minimal .env created
        echo [ACTION] Edit backend\.env with your database credentials
    )
)

echo [INFO] Installing backend dependencies...
if exist "package-lock.json" (
    echo [INFO] Using npm ci for reproducible install...
    call npm ci
) else (
    echo [INFO] Using npm install...
    call npm install
)
if errorlevel 1 (
    color 0C
    echo [ERROR] Failed to install backend dependencies
    color 07
    cd ..
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
echo.

REM ============================================
REM 4. Setup Frontend
REM ============================================
echo [STEP 4/6] Setting up frontend...
cd ..\frontend

echo [INFO] Installing frontend dependencies...
if exist "package-lock.json" (
    echo [INFO] Using npm ci for reproducible install...
    call npm ci
) else (
    echo [INFO] Using npm install...
    call npm install
)
if errorlevel 1 (
    color 0C
    echo [ERROR] Failed to install frontend dependencies
    color 07
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
cd ..
echo.

REM ============================================
REM 5. Setup Database
REM ============================================
echo [STEP 5/6] Setting up database...
echo.

REM Check if PostgreSQL is running
netstat -ano | findstr ":5432 " >nul 2>&1
if errorlevel 1 (
    color 0E
    echo [WARNING] PostgreSQL not detected on localhost:5432
    echo [INFO]   Please ensure PostgreSQL is running before continuing
    echo [INFO]   Windows Services ^> PostgreSQL ^> Start
    color 07
    echo.
    set /p POSTGRES_READY="Is PostgreSQL running? (y/n): "
    if /i not "!POSTGRES_READY!"=="y" (
        color 0C
        echo [ERROR] Cannot continue without PostgreSQL
        color 07
        pause
        exit /b 1
    )
) else (
    echo [OK] PostgreSQL detected on port 5432
)
echo.

echo [INFO] Pushing database schema...
cd backend
call npm run db:push
if errorlevel 1 (
    color 0E
    echo [WARNING] Schema push failed - database may need manual setup
    echo [INFO]   Trying to continue with seed...
    color 07
) else (
    echo [OK] Database schema applied
)
echo.

echo [INFO] Seeding demo data...
call npm run db:seed
if errorlevel 1 (
    color 0E
    echo [WARNING] Seed failed but database should be ready
    color 07
) else (
    echo [OK] Demo data seeded
)
cd ..
echo.

REM ============================================
REM 6. Start Services
REM ============================================
echo [STEP 6/6] Starting services...
echo.
echo ╔════════════════════════════════════════╗
echo ║      Services Starting...              ║
echo ║   Each will open in a new window       ║
echo ╚════════════════════════════════════════╝
echo.

REM Save current directory for use in child windows
set "ROOTDIR=%CD%"

REM Start Backend in new window (with better error handling)
echo [1/2] Starting Backend (http://localhost:3000)...
start "CMMS Backend" cmd /k "cd /d ""%ROOTDIR%\backend"" && cls && color 0A && echo ╔════════════════════════════════════════╗ && echo ║  CMMS Backend                          ║ && echo ║  Initializing...                       ║ && echo ╚════════════════════════════════════════╝ && echo. && timeout /t 2 /nobreak && npm run dev && (echo. && color 0A && echo ✅ Backend running successfully && echo. && pause) || (echo. && color 0C && echo ❌ Backend error occurred & echo Press any key to close this window... & pause)"

REM Wait for backend to start
timeout /t 5 /nobreak

REM Start Frontend in new window (with better error handling)
echo [2/2] Starting Frontend (http://localhost:5173)...
start "CMMS Frontend" cmd /k "cd /d ""%ROOTDIR%\frontend"" && cls && color 0A && echo ╔════════════════════════════════════════╗ && echo ║  CMMS Frontend                         ║ && echo ║  Initializing...                       ║ && echo ╚════════════════════════════════════════╝ && echo. && timeout /t 2 /nobreak && npm run dev && (echo. && color 0A && echo ✅ Frontend running successfully && echo. && pause) || (echo. && color 0C && echo ❌ Frontend error occurred & echo Press any key to close this window... & pause)"

echo.
echo ╔════════════════════════════════════════╗
echo ║   Services Starting in New Windows...  ║
echo ║   Opening http://localhost:5173       ║
echo ╚════════════════════════════════════════╝
echo.

REM Wait for services to stabilize
timeout /t 3 /nobreak

REM Try to open browser
start http://localhost:5173

echo.
color 0A
echo ✅ Setup Complete!
color 07
echo.
echo 📍 Backend:  http://localhost:3000
echo 📍 Frontend: http://localhost:5173
echo.
echo ℹ️  Both services are starting in separate windows.
echo    If you see errors, the windows will stay open so you can see them.
echo    Press Ctrl+C in each window to stop the services.
echo.
pause
