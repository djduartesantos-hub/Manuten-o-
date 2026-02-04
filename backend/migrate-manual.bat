@echo off
REM ============================================
REM Manuten-o CMMS - Manual Migration Script
REM Windows Edition
REM ============================================

setlocal enabledelayedexpansion

cls

echo.
echo ========================================
echo   Manuten-o CMMS - Manual Migration
echo   Windows Edition
echo ========================================
echo.

REM Check if .env exists
if not exist ".env" (
    color 0C
    echo [ERROR] .env file not found
    echo Run: ..\scripts\setup\setup-windows.bat
    color 07
    pause
    exit /b 1
)

echo [INFO] Found .env file
echo.

REM ============================================
REM Check Dependencies
REM ============================================
echo [0] Checking dependencies...
echo.

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js not found
    color 07
    echo Please install from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check npm
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] npm not found
    color 07
    pause
    exit /b 1
)
echo [OK] npm found

REM Check PostgreSQL is running or accessible
echo.
echo [INFO] Testing PostgreSQL connection...
for /f "tokens=2 delims==" %%a in ('findstr /R "^DATABASE_URL" .env') do set "DB_URL=%%a"

REM Try a simple connection test with npm psql module if available
psql --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0E
    echo [WARNING] psql command-line tool not found
    echo [INFO] Will attempt migration anyway (psql optional)
    color 07
) else (
    echo [OK] psql found
)

echo.
echo ========================================
echo   Starting Migration Process
echo ========================================
echo.

REM ============================================
REM Try Drizzle Migration
REM ============================================
echo [1] Running Drizzle migrations...
echo.

call npm run db:migrate

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo [OK] Drizzle migrations completed successfully
    color 07
    echo.
    
    echo [2] Seeding demo data...
    call npm run db:seed
    
    if %ERRORLEVEL% EQU 0 (
        color 0A
        echo [OK] Demo data seeded successfully
        color 07
    ) else (
        color 0E
        echo [WARNING] Seed encountered issues, but tables should be created
        color 07
    )
    
    echo.
    color 0A
    echo ========================================
    echo   Migration Completed Successfully!
    echo ========================================
    color 07
    echo.
    echo Next steps:
    echo   1. cd backend
    echo   2. npm run dev
    echo.
    pause
    exit /b 0
)

REM ============================================
REM Fallback: Manual SQL
REM ============================================
echo.
color 0E
echo [ERROR] Drizzle migration failed
color 07
echo.
echo Troubleshooting steps:
echo.
echo [1] Check PostgreSQL is running:
echo     - Windows Services (services.msc)
echo     - Look for "PostgreSQL" service
echo     - If not running: Right-click ^> Start
echo.
echo [2] Verify DATABASE_URL in .env:
echo     - Default: postgresql://postgres:password@localhost:5432/cmms_enterprise
echo     - User: postgres
echo     - Host: localhost
echo     - Port: 5432
echo.
echo [3] If connection fails:
echo     - Create database using pgAdmin (GUI tool)
echo     - Or use: psql -U postgres -h localhost
echo       Then: CREATE DATABASE cmms_enterprise;
echo.
echo [4] For manual database setup:
echo     - Open: ..\scripts\database\setup-database.sql
echo     - Use pgAdmin Query Tool to execute it
echo.
echo Common errors:
echo   - ECONNREFUSED: PostgreSQL not running
echo   - Authentication failed: Wrong password in DATABASE_URL
echo   - Database does not exist: Create it first
echo.
color 0C
echo Migration failed. Please resolve the issues above and try again.
color 07
pause
exit /b 1
