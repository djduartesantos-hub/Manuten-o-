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
    echo Run: ..\setup-complete.bat
    color 07
    pause
    exit /b 1
)

echo [INFO] Found .env file
echo.

REM ============================================
REM Try Drizzle Migration
REM ============================================
echo [1] Trying Drizzle migrations...
echo.

call npm run db:migrate

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo [OK] Drizzle migrations completed
    color 07
    echo.
    
    echo [2] Seeding demo data...
    call npm run db:seed
    
    if %ERRORLEVEL% EQU 0 (
        color 0A
        echo [OK] Demo data seeded
        color 07
    ) else (
        color 0E
        echo [WARNING] Seed encountered issues
        echo           But tables should be created
        color 07
    )
    
    echo.
    color 0A
    echo ========================================
    echo   Migration Completed!
    echo ========================================
    color 07
    echo.
    echo Next: npm run dev
    echo.
    pause
    exit /b 0
)

REM ============================================
REM Fallback: Manual SQL
REM ============================================
echo.
color 0E
echo [WARNING] Drizzle migration failed
echo [INFO] Attempting manual SQL setup...
color 07
echo.

REM Check if psql is available
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] psql not found on system PATH
    color 07
    echo.
    echo Manual steps:
    echo   1. Open pgAdmin (comes with PostgreSQL)
    echo   2. Create database and user (check .env)
    echo   3. Tools ^> Query Tool
    echo   4. Open and execute setup-database.sql
    echo.
    pause
    exit /b 1
)

echo [OK] psql found
echo [INFO] Running setup-database.sql...
echo.

REM Get DATABASE_URL from .env
for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do (
    set "DB_URL=%%a"
)

if "!DB_URL!"=="" (
    color 0C
    echo [ERROR] DATABASE_URL not found in .env
    color 07
    pause
    exit /b 1
)

echo Database URL: !DB_URL!
echo.

REM Execute SQL (simplified approach)
echo [INFO] This approach may require manual steps
echo        If psql fails, use pgAdmin instead
echo.

REM Attempt to run SQL file
REM Note: This is complex in batch, so we recommend pgAdmin
color 0E
echo [WARNING] For Windows, using pgAdmin is recommended:
color 07
echo.
echo   1. Open pgAdmin from Start Menu
echo   2. Create new database: cmms_enterprise
echo   3. Create new user: cmms_user / cmms_password
echo   4. Use Query Tool to import setup-database.sql
echo.
pause
exit /b 1
