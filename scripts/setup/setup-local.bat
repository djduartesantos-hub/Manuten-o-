@echo off
REM Setup script for Manuten-o CMMS - Windows
REM This script sets up PostgreSQL, creates the database, and initializes the application

setlocal enabledelayedexpansion

echo.
echo 🚀 Manuten-o CMMS - Local Setup Script (Windows)
echo ================================================
echo.

REM Configuration
set DB_USER=cmms_user
set DB_PASSWORD=cmms_password
set DB_NAME=cmms_enterprise
set DB_HOST=localhost
set DB_PORT=5432

echo 1️⃣  Checking PostgreSQL...

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo PostgreSQL not found. Installing via winget...
    winget install -e --id PostgreSQL.PostgreSQL
    echo ✅ PostgreSQL installed
) else (
    echo ✅ PostgreSQL found
)

echo.
echo 2️⃣  Starting PostgreSQL service...
net start postgresql-x64-16 >nul 2>nul || net start postgresql-x64-15 >nul 2>nul || (
    echo Note: PostgreSQL service might already be running
)
echo ✅ PostgreSQL started
echo.

echo 3️⃣  Creating database and user...
REM Create user and database using psql
psql -U postgres -h %DB_HOST% -p %DB_PORT% -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';" 2>nul || echo User might already exist
psql -U postgres -h %DB_HOST% -p %DB_PORT% -c "ALTER USER %DB_USER% CREATEDB;" 2>nul || echo User alteration skipped
psql -U postgres -h %DB_HOST% -p %DB_PORT% -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" 2>nul || echo Database might already exist
echo ✅ Database created
echo.

echo 4️⃣  Configuring backend environment...
(
    echo DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%
    echo JWT_SECRET=dev-secret-key-change-in-production
    echo JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
    echo NODE_ENV=development
    echo PORT=3000
) > backend\.env
echo ✅ .env configured
echo.

echo 5️⃣  Installing backend dependencies...
cd backend
call npm install
echo ✅ Backend dependencies installed
echo.

echo 6️⃣  Running database migrations...
call npm run db:migrate
echo ✅ Migrations completed
echo.

echo 7️⃣  Seeding database with demo data...
call npm run db:seed
echo ✅ Database seeded
cd ..
echo.

echo 8️⃣  Installing frontend dependencies...
cd frontend
call npm install
echo ✅ Frontend dependencies installed
cd ..
echo.

echo ✅ Setup completed successfully!
echo.
echo 📝 Next steps:
echo.
echo 1. Open Command Prompt/PowerShell 1 and run:
echo    cd backend ^&^& npm run dev
echo.
echo 2. Open Command Prompt/PowerShell 2 and run:
echo    cd frontend ^&^& npm run dev
echo.
echo 🔐 Login Credentials:
echo    Tenant (slug): cmms-demo
echo    Email: admin@cmms.com
echo    Password: Admin@123456
echo.
echo 🌐 URLs:
echo    Backend API: http://localhost:3000/api
echo    Frontend: http://localhost:5173
echo.
pause
