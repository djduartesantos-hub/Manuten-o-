@echo off
REM CMMS Enterprise - Windows Setup Wrapper
echo Calling PowerShell setup (setup-windows.ps1)

where powershell >nul 2>&1
if errorlevel 1 (
    echo PowerShell nao encontrado. Execute o script manualmente: setup-windows.ps1
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"
if errorlevel 1 (
    echo Erro: o script PowerShell retornou um erro.
    pause
    exit /b 1
)

echo.
echo Setup concluido.
pause
