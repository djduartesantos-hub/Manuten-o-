@echo off
REM ============================================
REM CMMS Enterprise - Database Connection Test
REM Windows Edition
REM ============================================

setlocal enabledelayedexpansion
color 0A

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║   Database Connection Test             ║
echo ║   PostgreSQL Diagnostic Tool           ║
echo ╚════════════════════════════════════════╝
echo.

REM Check project root
if not exist "backend\.env" (
    if not exist "backend\.env.example" (
        color 0C
        echo [ERROR] Not in project root directory
        color 07
        pause
        exit /b 1
    )
)

echo [STEP 1] Testing PostgreSQL service...
netstat -ano | findstr ":5432 " >nul 2>&1
if errorlevel 1 (
    color 0E
    echo [WARNING] PostgreSQL not running on port 5432
    color 07
    echo.
    echo Fix:
    echo   - Windows: Services ^> PostgreSQL ^> Start
    echo   - Or: net start postgresql-x64-15 (check exact version)
    echo.
    set /p START_PG="Start PostgreSQL now? (y/n): "
    if /i "!START_PG!"=="y" (
        echo Starting PostgreSQL...
        net start postgresql-x64-15 2>nul
        if errorlevel 1 (
            net start postgresql-x64-14 2>nul
        )
        if errorlevel 1 (
            net start postgresql-x64-13 2>nul
        )
        timeout /t 3 /nobreak
        netstat -ano | findstr ":5432 " >nul 2>&1
        if errorlevel 1 (
            color 0C
            echo [ERROR] Could not start PostgreSQL
            color 07
            echo Try starting manually from Services
            pause
            exit /b 1
        )
    ) else (
        color 0C
        echo [ERROR] PostgreSQL must be running
        color 07
        pause
        exit /b 1
    )
) else (
    color 0A
    echo [OK] PostgreSQL is running on port 5432
    color 07
)

echo.
echo [STEP 2] Reading DATABASE_URL from .env...

REM Read DATABASE_URL from .env
for /f "usebackq delims==" %%A in ("backend\.env") do (
    if "%%A"=="DATABASE_URL" set "LINE=%%B"
)

if not defined LINE (
    if not exist "backend\.env" (
        echo [INFO] backend\.env not found, using .env.example
        for /f "usebackq delims==" %%A in ("backend\.env.example") do (
            if "%%A"=="DATABASE_URL" set "LINE=%%B"
        )
    )
)

echo Database URL: !LINE!
echo.

echo [STEP 3] Testing connection...
echo This requires: psql command-line tool
echo.

REM Try to find psql
where psql >nul 2>&1
if errorlevel 1 (
    color 0E
    echo [WARNING] psql not found in PATH
    color 07
    echo.
    echo PostgreSQL tools not installed or not in PATH
    echo.
    echo Options:
    echo   1. Add PostgreSQL bin folder to PATH:
    echo      - Default: C:\Program Files\PostgreSQL\15\bin
    echo      - Check your PostgreSQL version
    echo.
    echo   2. Or test manually:
    echo      - Right-click Computer/This PC ^> Manage
    echo      - Services ^> PostgreSQL
    echo      - Verify Status shows "Running"
    echo.
    echo   3. Or use pgAdmin to test connection
    echo.
    echo [HINT] After PostgreSQL is confirmed running, try:
    echo    npm run db:push
    echo    npm run db:seed
    echo.
    pause
    exit /b 0
)

REM Extract connection details from DATABASE_URL
REM Format: postgresql://user:password@host:port/database
echo Attempting connection...

REM Simple test - just try psql with specific options
psql -h localhost -U postgres -d postgres -c "SELECT NOW();" >nul 2>&1
if errorlevel 1 (
    color 0E
    echo [WARNING] Connection test failed with default credentials
    color 07
    echo.
    echo Possible issues:
    echo   1. Wrong PostgreSQL username (default is 'postgres')
    echo   2. Wrong password (check your installation)
    echo   3. Wrong host/port (should be localhost:5432)
    echo.
    echo Fix:
    echo   1. Open backend\.env
    echo   2. Update DATABASE_URL with correct credentials
    echo      - Check PostgreSQL username: usually 'postgres'
    echo      - Check your installation password
    echo   3. Format: postgresql://user:password@localhost:5432/cmms_enterprise
    echo.
    echo [HINT] If you forgot the password:
    echo   - Windows: Use pgAdmin GUI to reset it
    echo   - Or reinstall PostgreSQL
    echo.
    pause
    exit /b 1
) else (
    color 0A
    echo [OK] PostgreSQL connection successful!
    color 07
    echo.
    echo ✅ Database is ready
    echo.
    echo Next steps:
    echo   1. Make sure backend\.env has correct DATABASE_URL
    echo   2. Verify database exists:
    echo      psql -U postgres -c "CREATE DATABASE cmms_enterprise;"
    echo   3. Apply schema:
    echo      npm run db:push
    echo   4. Load demo data:
    echo      npm run db:seed
    echo.
    pause
)
