@echo off
REM ============================================
REM Manuten-o CMMS Database Setup Script
REM Windows Batch Edition
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
echo   Windows Edition
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

echo -- Create user > "!TEMP_SQL!"
echo CREATE USER !DB_USER! WITH ENCRYPTED PASSWORD '!DB_PASSWORD!'; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Set permissions >> "!TEMP_SQL!"
echo ALTER USER !DB_USER! CREATEDB; >> "!TEMP_SQL!"
echo ALTER ROLE !DB_USER! SET client_encoding TO 'utf8'; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Create database >> "!TEMP_SQL!"
echo CREATE DATABASE !DB_NAME! OWNER !DB_USER! ENCODING 'UTF8'; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo -- Grant privileges >> "!TEMP_SQL!"
echo GRANT ALL PRIVILEGES ON DATABASE !DB_NAME! TO !DB_USER!; >> "!TEMP_SQL!"
echo. >> "!TEMP_SQL!"
echo SELECT 'Setup completed' AS status; >> "!TEMP_SQL!"

REM Execute SQL script
psql -h !DB_HOST! -U postgres -p !DB_PORT! -f "!TEMP_SQL!" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo [OK] Database and user created successfully
    color 07
) else (
    color 0E
    echo [WARNING] Some operations may have failed
    echo   User or database might already exist
    color 07
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
    echo [OK] .env file created
    color 07
)
echo.

REM ============================================
REM STEP 6: Summary
REM ============================================
echo.
color 0A
echo ========================================
echo   ^!SETUP COMPLETED!
echo ========================================
color 07
echo.
echo Next Steps:
echo.
echo 1. Install backend dependencies:
echo    cd backend
echo    npm install
echo.
echo 2. Run database migrations:
echo    npm run db:migrate
echo.
echo 3. Seed demo data:
echo    npm run db:seed
echo.
echo 4. Start the backend:
echo    npm run dev
echo.
echo 5. In another terminal, start frontend:
echo    cd frontend
echo    npm install
echo    npm run dev
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
echo.

pause
