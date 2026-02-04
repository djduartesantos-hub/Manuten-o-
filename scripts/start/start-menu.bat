@echo off
color 0A
cls

:menu
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║         🏭 CMMS Enterprise - Windows Control Panel       ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   ┌─ OPÇÕES DISPONÍVEIS ─┐
echo   │                      │
echo   │  [1] Setup (Primeira vez)
echo   │  [2] Iniciar Projeto
echo   │  [3] Backend apenas
echo   │  [4] Frontend apenas
echo   │  [5] Limpar dados (reinstalar)
echo   │  [6] Ver logs
echo   │  [7] Abrir documentação
echo   │  [8] Sair
echo   │                      │
echo   └─────────────────────┘
echo.
set /p choice="Escolha uma opção (1-8): "

if "%choice%"=="1" goto setup
if "%choice%"=="2" goto start
if "%choice%"=="3" goto backend
if "%choice%"=="4" goto frontend
if "%choice%"=="5" goto clean
if "%choice%"=="6" goto logs
if "%choice%"=="7" goto docs
if "%choice%"=="8" exit /b 0

echo Opção inválida! Pressione qualquer tecla para tentar novamente.
pause >nul
goto menu

:setup
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo  SETUP INICIAL - Instalando dependências...
echo ═══════════════════════════════════════════════════════════
echo.

call setup-windows.bat
pause
goto menu

:start
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo  INICIANDO PROJETO (Backend + Frontend)
echo ═══════════════════════════════════════════════════════════
echo.

if not exist "backend\package.json" (
    echo ERRO: Execute a partir da raiz do projeto!
    pause
    goto menu
)

echo Iniciando Backend em nova janela...
start "CMMS Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak

echo Iniciando Frontend em nova janela...
start "CMMS Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 /nobreak

echo.
echo ═══════════════════════════════════════════════════════════
echo  ✓ Projeto iniciado!
echo ═══════════════════════════════════════════════════════════
echo.
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:3000
echo.
echo  Credenciais Demo:
echo  Email: admin@cmms.com
echo  Senha: Admin@123456
echo.
timeout /t 3
start http://localhost:5173
goto menu

:backend
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo  INICIANDO APENAS BACKEND
echo ═══════════════════════════════════════════════════════════
echo.
pushd backend
npm run dev
popd
goto menu

:frontend
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo  INICIANDO APENAS FRONTEND
echo ═══════════════════════════════════════════════════════════
echo.
pushd frontend
npm run dev
popd
goto menu

:clean
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo  LIMPEZA E REINSTALAÇÃO
echo ═══════════════════════════════════════════════════════════
echo.
echo AVISO: Isto vai deletar node_modules e reinstalar tudo!
echo.
set /p confirm="Tem certeza? (S/N): "
if /i not "%confirm%"=="S" goto menu

echo.
echo Limpando Backend...
pushd backend
if exist node_modules (
    echo Removendo node_modules do Backend...
    rmdir /s /q node_modules 2>nul || echo Aviso: não foi possível remover alguns arquivos
)
if exist package-lock.json del package-lock.json
echo Reinstalando Backend...
call npm install
popd

echo.
echo Limpando Frontend...
pushd frontend
if exist node_modules (
    echo Removendo node_modules do Frontend...
    rmdir /s /q node_modules 2>nul || echo Aviso: não foi possível remover alguns arquivos
)
if exist package-lock.json del package-lock.json
echo Reinstalando Frontend...
call npm install
popd
echo.
echo ✓ Limpeza completa! Pressione qualquer tecla.
pause
goto menu

:logs
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo  VISUALIZAÇÃO DE LOGS
echo ═══════════════════════════════════════════════════════════
echo.
echo  Para ver logs, use:
echo.
echo  1. Janela do Backend: Veja a saída em tempo real
echo  2. Janela do Frontend: Veja compilações e erros
echo  3. Browser DevTools: F12 na página
echo.
echo Deseja abrir o backend em nova janela? (S/N)
set /p view="Escolha (S/N): "
if /i "%view%"=="S" (
    cd backend
    npm run dev
)
goto menu

:docs
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo  DOCUMENTAÇÃO
echo ═══════════════════════════════════════════════════════════
echo.
echo  Documentos disponíveis:
echo.
echo  [1] QUICKSTART_WINDOWS.md (recomendado para novos usuários)
echo  [2] WINDOWS_SETUP.md (guia completo)
echo  [3] WINDOWS_TROUBLESHOOTING.md (resolvendo problemas)
echo  [4] DEVELOPMENT.md (desenvolvimento geral)
echo  [5] README.md (visão geral do projeto)
echo  [6] Voltar ao menu
echo.
set /p doc="Escolha um documento (1-6): "

if "%doc%"=="1" start "" notepad "QUICKSTART_WINDOWS.md"
if "%doc%"=="2" start "" notepad "WINDOWS_SETUP.md"
if "%doc%"=="3" start "" notepad "WINDOWS_TROUBLESHOOTING.md"
if "%doc%"=="4" start "" notepad "DEVELOPMENT.md"
if "%doc%"=="5" start "" notepad "README.md"

if "%doc%"=="6" goto menu
goto docs

echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu
