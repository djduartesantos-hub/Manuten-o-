@echo off
REM ============================================
REM CMMS Enterprise - Smart Startup Script
REM Windows Edition (with Redis check)
REM ============================================

setlocal enabledelayedexpansion
color 0A

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║     CMMS Enterprise - Startup          ║
echo ║      Checking Dependencies...          ║
echo ╚════════════════════════════════════════╝
echo.

REM Check project root
if not exist "backend\package.json" (
    color 0C
    echo [ERROR] Not in project root directory
    echo Please run from the folder containing "backend" and "frontend"
    color 07
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js not found!
    color 07
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found: & node --version

REM Check PostgreSQL
echo.
echo [INFO] Checking PostgreSQL...
netstat -ano | findstr ":5432 " >nul 2>&1
if errorlevel 1 (
    color 0E
    echo [WARNING] PostgreSQL not detected on localhost:5432
    color 07
    echo           Make sure PostgreSQL is running!
    echo           Windows Services ^> PostgreSQL ^> Start
) else (
    echo [OK] PostgreSQL detected on port 5432
)

REM Check Redis (optional warning)
echo.
echo [INFO] Checking Redis (optional)...
netstat -ano | findstr ":6379 " >nul 2>&1
if errorlevel 1 (
    color 0E
    echo [WARNING] Redis not detected on localhost:6379
    echo [INFO]   Redis is optional for local development
    echo [INFO]   For production/full features, install Redis:
    echo           WSL 2: wsl && sudo apt install redis-server
    echo           Docker: docker run -d -p 6379:6379 redis
    color 07
) else (
    echo [OK] Redis detected on port 6379
)

echo.
echo ╔════════════════════════════════════════╗
echo ║      Starting Services...              ║
echo ╚════════════════════════════════════════╝
echo.

REM Start Backend
echo [1/2] Starting Backend (http://localhost:3000)
cd backend

if not exist ".env" (
    echo.
    color 0E
    echo [WARNING] No .env file found in backend/
    echo [INFO] Creating from template...
    color 07
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] Created .env from .env.example
        echo [ACTION REQUIRED] Edit backend\.env with your database credentials
        echo.
    )
)

start "CMMS Backend" cmd /k "cls && echo Starting Backend... && timeout /t 2 /nobreak && npm run dev"

REM Wait for backend
timeout /t 5 /nobreak

cd ..

REM Start Frontend
echo [2/2] Starting Frontend (http://localhost:5173)
cd frontend

start "CMMS Frontend" cmd /k "cls && echo Starting Frontend... && timeout /t 2 /nobreak && npm run dev"

cd ..

echo.
echo ╔════════════════════════════════════════╗
echo ║   Services Starting in New Windows...  ║
echo ║   Opening http://localhost:5173       ║
echo ╚════════════════════════════════════════╝
echo.

REM Wait a bit for services to start
timeout /t 3 /nobreak

REM Try to open browser
start http://localhost:5173

echo.
echo ✅ Startup complete!
echo.
echo 📍 Backend:  http://localhost:3000
echo 📍 Frontend: http://localhost:5173
echo.
echo To stop services, close the terminal windows.
echo.
pause
