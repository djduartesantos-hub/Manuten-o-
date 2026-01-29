@echo off
REM ============================================
REM Manuten-o CMMS - Database Setup Complete
REM Windows Edition with Migrations
REM ============================================

setlocal enabledelayedexpansion

REM Configuration
set DB_USER=%1
if "!DB_USER!"=="" set DB_USER=cmms_user

set DB_PASSWORD=%2
if "!DB_PASSWORD!"=="" set DB_PASSWORD=cmms_password

set DB_NAME=%3
if "!DB_NAME!"=="" set DB_NAME=cmms_enterprise

set DB_HOST=%4
if "!DB_HOST!"=="" set DB_HOST=localhost

set DB_PORT=%5
if "!DB_PORT!"=="" set DB_PORT=5432

cls

echo.
echo ========================================
echo   Manuten-o CMMS - Complete Setup
echo   Windows Edition with Migrations
echo ========================================
echo.
echo Configuration:
echo   Database: !DB_NAME!
echo   User: !DB_USER!
echo   Host: !DB_HOST!:!DB_PORT!
echo.

REM ============================================
REM STEP 1: Check PostgreSQL
REM ============================================
echo 1^) Checking PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] PostgreSQL not found
    echo Install from: https://www.postgresql.org/download/windows/
    color 07
    pause
    exit /b 1
)
color 0A
echo [OK] PostgreSQL found
color 07
echo.

REM ============================================
REM STEP 2: Create Database
REM ============================================
echo 2^) Creating database and user...

REM Create temp SQL
set TEMP_SQL=%TEMP%\cmms_setup_%RANDOM%.sql

(
    echo CREATE USER !DB_USER! WITH ENCRYPTED PASSWORD '!DB_PASSWORD!';
    echo ALTER USER !DB_USER! CREATEDB;
    echo ALTER ROLE !DB_USER! SET client_encoding TO 'utf8';
    echo CREATE DATABASE !DB_NAME! OWNER !DB_USER! ENCODING 'UTF8';
    echo GRANT ALL PRIVILEGES ON DATABASE !DB_NAME! TO !DB_USER!;
    echo SELECT 'Setup completed' AS status;
) > "!TEMP_SQL!"

psql -h !DB_HOST! -U postgres -p !DB_PORT! -f "!TEMP_SQL!" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo [OK] Database created
    color 07
) else (
    color 0E
    echo [WARNING] Database creation had issues
    color 07
)

del /Q "!TEMP_SQL!" >nul 2>&1
echo.

REM ============================================
REM STEP 3: Create .env
REM ============================================
echo 3^) Checking .env file...

if exist "backend\.env" (
    color 0E
    echo [WARNING] backend\.env already exists
    color 07
) else (
    if not exist "backend\" mkdir backend
    (
        echo # Database Configuration
        echo DATABASE_URL=postgresql://!DB_USER!:!DB_PASSWORD!@!DB_HOST!:!DB_PORT!/!DB_NAME!
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=dev-secret-key-change-in-production
        echo JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
        echo.
        echo # Environment
        echo NODE_ENV=development
        echo PORT=3000
        echo.
        echo # Application
        echo APP_NAME=Manuten-o CMMS
        echo APP_VERSION=1.2.1
    ) > "backend\.env"
    
    color 0A
    echo [OK] .env created
    color 07
)
echo.

REM ============================================
REM STEP 4: Install Dependencies
REM ============================================
echo 4^) Installing backend dependencies...

cd backend

if not exist "node_modules\" (
    echo Running npm install...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERROR] npm install failed
        color 07
        pause
        exit /b 1
    )
    color 0A
    echo [OK] Dependencies installed
    color 07
) else (
    color 0E
    echo [WARNING] Dependencies already installed
    color 07
)
echo.

REM ============================================
REM STEP 5: Run Migrations
REM ============================================
echo 5^) Running database migrations...

call npm run db:migrate
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo [OK] Migrations completed
    color 07
) else (
    color 0C
    echo [ERROR] Migrations failed
    echo Check .env DATABASE_URL
    color 07
    pause
    cd ..
    exit /b 1
)
echo.

REM ============================================
REM STEP 6: Seed Demo Data
REM ============================================
echo 6^) Seeding demo data...

call npm run db:seed
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo [OK] Demo data seeded
    color 07
) else (
    color 0E
    echo [WARNING] Seed script may need manual execution
    color 07
)

cd ..
echo.

REM ============================================
REM Summary
REM ============================================
color 0A
echo ========================================
echo   ^!SETUP COMPLETE!
echo ========================================
color 07
echo.
echo Next Steps:
echo.
echo 1. Start the backend:
echo    cd backend
echo    npm run dev
echo.
echo 2. In another terminal, start frontend:
echo    cd frontend
echo    npm install
echo    npm run dev
echo.
echo Demo Login:
echo   Email: admin@cmms.com
echo   Password: Admin@123456
echo.
pause
