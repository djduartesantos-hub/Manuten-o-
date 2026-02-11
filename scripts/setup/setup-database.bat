@echo off
REM ============================================
REM Manuten-o CMMS Database Setup Script
REM Windows Batch Edition - Complete Setup
REM ============================================

setlocal enabledelayedexpansion

REM Configuration (can be overridden by command line arguments)
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
echo   Manuten-o CMMS Database Setup
echo   Windows Edition - Complete Setup
echo ========================================
echo.
echo Configuration:
echo   Database Name: !DB_NAME!
echo   Database User: !DB_USER!
echo   Database Host: !DB_HOST!
echo   Database Port: !DB_PORT!
echo.

REM ============================================
REM STEP 1: Check PostgreSQL Installation
REM ============================================
echo 1^) Checking PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] PostgreSQL not found on system PATH
    echo.
    echo To install PostgreSQL:
    echo   1. Download from: https://www.postgresql.org/download/windows/
    echo   2. Run the installer
    echo   3. During installation, check "Add PostgreSQL to PATH"
    echo   4. After installation, restart this script
    echo.
    color 07
    pause
    exit /b 1
)

color 0A
echo [OK] PostgreSQL found
psql --version
color 07
echo.

REM ============================================
REM STEP 2: Test PostgreSQL Connection
REM ============================================
echo 2^) Testing PostgreSQL connection...
psql -h !DB_HOST! -U postgres -p !DB_PORT! -c "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0E
    echo [WARNING] Could not connect with postgres user
    echo   Make sure PostgreSQL service is running
    color 07
    pause
    exit /b 1
) else (
    color 0A
    echo [OK] PostgreSQL is accessible
    color 07
)
echo.

REM ============================================
REM STEP 3: Create Database and User
REM ============================================
echo 3^) Creating database and user...

REM Create temporary SQL file
set TEMP_SQL=%TEMP%\cmms_setup_%RANDOM%.sql

echo -- Drop existing user if exists (CASCADE to drop owned objects) > "!TEMP_SQL!"
echo DROP USER IF EXISTS !DB_USER! CASCADE; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Create user >> "!TEMP_SQL!"
echo CREATE USER !DB_USER! WITH ENCRYPTED PASSWORD '!DB_PASSWORD!'; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Set permissions >> "!TEMP_SQL!"
echo ALTER USER !DB_USER! CREATEDB; >> "!TEMP_SQL!"
echo ALTER ROLE !DB_USER! SET client_encoding TO 'utf8'; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Drop database if exists >> "!TEMP_SQL!"
echo DROP DATABASE IF EXISTS !DB_NAME!; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Create database >> "!TEMP_SQL!"
echo CREATE DATABASE !DB_NAME! OWNER !DB_USER! ENCODING 'UTF8'; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Grant privileges >> "!TEMP_SQL!"
echo GRANT ALL PRIVILEGES ON DATABASE !DB_NAME! TO !DB_USER!; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo SELECT 'User and Database created successfully' AS status; >> "!TEMP_SQL!"

REM Execute SQL script
psql -h !DB_HOST! -U postgres -p !DB_PORT! -f "!TEMP_SQL!" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo [OK] Database and user created successfully
    color 07
) else (
    color 0C
    echo [ERROR] Failed to create database/user
    echo   Check PostgreSQL logs
    color 07
    del /Q "!TEMP_SQL!" >nul 2>&1
    pause
    exit /b 1
)

REM Clean up temp file
del /Q "!TEMP_SQL!" >nul 2>&1
echo.

REM ============================================
REM STEP 4: Test Connection
REM ============================================
echo 4^) Testing database connection...

set PGPASSWORD=!DB_PASSWORD!
psql -h !DB_HOST! -U !DB_USER! -d !DB_NAME! -p !DB_PORT! -c "SELECT NOW();" >nul 2>&1
set RESULT=%ERRORLEVEL%
set PGPASSWORD=

if %RESULT% EQU 0 (
    color 0A
    echo [OK] Connection successful!
    color 07
) else (
    color 0C
    echo [ERROR] Connection failed
    echo   Check credentials and try again
    color 07
    pause
    exit /b 1
)
echo.

REM ============================================
REM STEP 5: Create .env File
REM ============================================
echo 5^) Creating .env file...

if exist "backend\.env" (
    color 0E
    echo [WARNING] backend\.env already exists - skipping
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
        echo APP_VERSION=1.2.2
    ) > "backend\.env"
    
    color 0A
    echo [OK] .env file created
    color 07
)
echo.

REM ============================================
REM STEP 6: Install Backend Dependencies
REM ============================================
echo 6^) Installing backend dependencies...

if exist "backend\node_modules" (
    color 0E
    echo [INFO] node_modules already exists - skipping npm install
    color 07
) else (
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERROR] Failed to install dependencies
        color 07
        cd ..
        pause
        exit /b 1
    )
    cd ..
    
    color 0A
    echo [OK] Dependencies installed
    color 07
)
echo.

REM ============================================
REM STEP 7: Run Database Migrations
REM ============================================
echo 7^) Running database migrations...

cd backend
call npm run db:push
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Failed to run migrations
    echo   Check database configuration
    color 07
    cd ..
    pause
    exit /b 1
)
cd ..

color 0A
echo [OK] Database schema created
color 07
echo.

REM ============================================
REM STEP 8: Seed Demo Data
REM ============================================
echo 8^) Seeding demo data...

cd backend
call npm run db:seed
if %ERRORLEVEL% NEQ 0 (
    color 0E
    echo [WARNING] Failed to seed data
    echo   Database is ready but demo data not loaded
    echo   You can run "npm run db:seed" manually later
    color 07
) else (
    color 0A
    echo [OK] Demo data seeded successfully
    color 07
)
cd ..
echo.

REM ============================================
REM STEP 9: Summary
REM ============================================
echo.
color 0A
echo ========================================
echo   SETUP COMPLETED SUCCESSFULLY!
echo ========================================
color 07
echo.
echo Database is ready to use!
echo.
echo Next Steps:
echo.
echo 1. Start the backend server:
echo    cd backend
echo    npm run dev
echo.
echo 2. In another terminal, start frontend:
echo    cd frontend
echo    npm install
echo    npm run dev
echo.
echo 3. Open browser and navigate to:
echo    http://localhost:5173
echo.
echo Database Credentials:
echo   Host:     !DB_HOST!
echo   Port:     !DB_PORT!
echo   Database: !DB_NAME!
echo   User:     !DB_USER!
echo   Password: !DB_PASSWORD!
echo.
echo IMPORTANT:
echo   - Update credentials in production!
echo   - Never commit .env to git
echo   - Use strong passwords in production
echo   - Store credentials in environment variables
echo.
echo Troubleshooting:
echo   - If migrations fail: Check DATABASE_URL in backend/.env
echo   - If seed fails: Database is OK, seed data is optional
echo   - For manual migration: cd backend ^&^& npm run db:push
