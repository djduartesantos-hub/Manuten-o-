@echo off
REM CMMS Enterprise - Start All Services (Windows)
REM Este script inicia backend, frontend e abre o navegador

echo.
echo ========================================
echo CMMS Enterprise - Starting All Services
echo ========================================
echo.

REM Verificar se estamos no diretorio correto
if not exist "backend\package.json" (
    echo ERROR: Please run this script from the project root directory
    echo Current directory: %cd%
    pause
    exit /b 1
)

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install from https://nodejs.org/
    pause
    exit /b 1
)

REM Iniciar PostgreSQL (se estiver instalado como serviço)
echo Checking PostgreSQL...
sc query PostgreSQL >nul 2>&1
if errorlevel 1 (
    echo WARNING: PostgreSQL service not running
    echo Please ensure PostgreSQL is running before starting
) else (
    echo PostgreSQL is running
)

echo.
echo Starting services...
echo.

REM Iniciar Backend em nova janela
echo [1/2] Starting Backend (http://localhost:3000)...
start "CMMS Backend" cmd /k "cd /d "%cd%\backend" && echo Initializing Backend... && timeout /t 2 && npm run dev"

REM Aguardar um pouco para o backend iniciar
timeout /t 4 /nobreak

REM Iniciar Frontend em nova janela
echo [2/2] Starting Frontend (http://localhost:5173)...
start "CMMS Frontend" cmd /k "cd /d "%cd%\frontend" && echo Initializing Frontend... && timeout /t 2 && npm run dev"

REM Aguardar para frontend ficar pronto
timeout /t 5 /nobreak

REM Abrir navegador
echo Opening browser...
start http://localhost:5173

echo.
echo ========================================
echo ^✓ Services started in 2 new windows!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.
echo Browser should open automatically
echo Close either window to stop the service
echo.
timeout /t 3 /nobreak
