@echo off
REM CMMS Enterprise - Windows Setup Script
REM Este script inicializa o projeto no Windows

echo.
echo ========================================
echo CMMS Enterprise - Inicializacao Windows
echo ========================================
echo.

REM Verificar Node.js
echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Baixe em: https://nodejs.org/ (versao LTS 18+)
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Node.js: %%i

echo [2/4] Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: npm nao encontrado!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo npm: %%i

REM Backend Setup
echo.
echo === BACKEND ===
echo [3/4] Preparando backend...
cd backend

if not exist ".env" (
    echo Criando arquivo .env...
    if exist ".env.example" (
        copy .env.example .env
        echo Arquivo .env criado com sucesso
        echo.
        echo ATENCAO: Configure as variaveis de ambiente em backend\.env
        echo - DATABASE_URL (sua conexao PostgreSQL)
        echo - JWT_SECRET
    ) else (
        echo Criando .env padrao...
        (
            echo DATABASE_URL=postgresql://usuario:senha@localhost:5432/cmms_enterprise
            echo PORT=3000
            echo NODE_ENV=development
            echo JWT_SECRET=dev-secret-key-change-in-prod
            echo CORS_ORIGIN=http://localhost:5173
        ) > .env
    )
)

echo Instalando dependencias do backend...
call npm install
if errorlevel 1 (
    echo ERRO ao instalar dependencias do backend
    pause
    exit /b 1
)
echo Backend pronto!

REM Frontend Setup
cd ..
echo.
echo === FRONTEND ===
echo [4/4] Preparando frontend...
cd frontend

echo Instalando dependencias do frontend...
call npm install
if errorlevel 1 (
    echo ERRO ao instalar dependencias do frontend
    pause
    exit /b 1
)
echo Frontend pronto!

cd ..

echo.
echo ========================================
echo ^✓ Inicializacao Completa!
echo ========================================
echo.
echo Para iniciar o projeto, execute:
echo.
echo   Terminal 1 - Backend:
echo   cd backend
echo   npm run dev
echo.
echo   Terminal 2 - Frontend:
echo   cd frontend
echo   npm run dev
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Ou use: npm run start-all (se estiver disponivel)
echo.
pause
