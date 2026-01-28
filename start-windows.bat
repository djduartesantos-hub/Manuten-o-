@echo off
REM CMMS Enterprise - Inicia backend e frontend no Windows
REM Abre ambos em terminais separados

setlocal enabledelayedexpansion

echo.
echo ========================================
echo CMMS Enterprise - Iniciando...
echo ========================================
echo.

REM Verificar se estamos no diretorio correto
if not exist "backend\package.json" (
    echo ERRO: Execute este script da raiz do projeto
    echo Diretorio atual: %cd%
    pause
    exit /b 1
)

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    pause
    exit /b 1
)

REM Iniciar Backend em nova janela
echo [1/2] Iniciando Backend (http://localhost:3000)...
start "CMMS Backend" cmd /k "cd backend && npm run dev"

REM Aguardar um pouco para o backend iniciar
timeout /t 3 /nobreak

REM Iniciar Frontend em nova janela
echo [2/2] Iniciando Frontend (http://localhost:5173)...
start "CMMS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo ^✓ Projeto iniciado em 2 terminais!
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Feche qualquer janela para parar
echo.
