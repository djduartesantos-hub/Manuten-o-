@echo off
REM ============================================
REM CMMS Enterprise - Environment Setup
REM Windows Edition
REM ============================================

setlocal enabledelayedexpansion
color 0A

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║   CMMS Enterprise - Environment Setup  ║
echo ║   Creating .env files                  ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if running from project root
if not exist "backend\package.json" (
    color 0C
    echo [ERROR] Not in project root directory
    echo Please run from the folder containing "backend" and "frontend"
    color 07
    pause
    exit /b 1
)

REM Backend .env
echo [1/2] Setting up backend environment...
if exist "backend\.env" (
    color 0E
    echo [WARNING] backend\.env already exists
    color 07
    set /p OVERWRITE="Overwrite? (y/n): "
    if /i not "!OVERWRITE!"=="y" (
        echo Skipping backend .env
        goto frontend_env
    )
)

if exist "backend\.env.example" (
    copy "backend\.env.example" "backend\.env" >nul
    echo [OK] Created backend\.env from template
    echo.
    echo [ACTION REQUIRED] Edit backend\.env with your database credentials:
    echo   - DATABASE_URL: postgresql://user:password@localhost:5432/cmms_enterprise
    echo   - Replace 'user' and 'password' with your PostgreSQL credentials
    echo   - Default PostgreSQL user: postgres
    echo.
    timeout /t 2 /nobreak
    
    REM Open in default editor if possible
    start notepad backend\.env
    
    echo [INFO] .env opened in Notepad
    echo [WARNING] Save the file after making changes!
    echo.
    pause
) else (
    color 0C
    echo [ERROR] backend\.env.example not found
    color 07
    pause
    exit /b 1
)

:frontend_env
echo [2/2] Setting up frontend environment...
if exist "frontend\.env" (
    color 0E
    echo [WARNING] frontend\.env already exists, skipping
    color 07
    echo.
) else (
    if exist "frontend\.env.example" (
        copy "frontend\.env.example" "frontend\.env" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo [OK] Created frontend\.env from template
        ) else (
            echo [INFO] No frontend\.env.example found (normal - frontend doesn't require it)
        )
    ) else (
        echo [INFO] No frontend\.env.example (normal - frontend may not require it)
    )
)

echo.
echo ╔════════════════════════════════════════╗
echo ║     Environment Setup Complete!        ║
echo ╚════════════════════════════════════════╝
echo.

echo ✅ Next steps:
echo    1. Edit backend\.env with your PostgreSQL credentials
echo       - DATABASE_URL should be correct
echo    2. Start PostgreSQL service
echo    3. Run database setup:
echo       npm run db:push
echo       npm run db:seed
echo    4. Start the application:
echo       scripts\setup\setup-and-start.bat
echo.

pause
