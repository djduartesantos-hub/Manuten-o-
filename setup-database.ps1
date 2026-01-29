# ============================================
# Manuten-o CMMS Database Setup Script - Windows
# ============================================
# This script helps you set up the PostgreSQL database on Windows

param(
    [string]$DbUser = "cmms_user",
    [string]$DbPassword = "cmms_password",
    [string]$DbName = "cmms_enterprise",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432"
)

# Colors for output
function Write-Success {
    Write-Host $args[0] -ForegroundColor Green
}

function Write-Info {
    Write-Host $args[0] -ForegroundColor Blue
}

function Write-Warning {
    Write-Host $args[0] -ForegroundColor Yellow
}

function Write-Error {
    Write-Host $args[0] -ForegroundColor Red
}

# ============================================
# HEADER
# ============================================
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Manuten-o CMMS Database Setup        ║" -ForegroundColor Cyan
Write-Host "║   Windows Edition                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Warning "Configuration:"
Write-Host "  Database Name: $DbName"
Write-Host "  Database User: $DbUser"
Write-Host "  Database Host: $DbHost"
Write-Host "  Database Port: $DbPort"
Write-Host ""

# ============================================
# STEP 1: Check PostgreSQL Installation
# ============================================
Write-Info "1️⃣ Checking PostgreSQL..."

$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($null -eq $psqlPath) {
    Write-Warning "PostgreSQL not found on system PATH"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  1. Install PostgreSQL from: https://www.postgresql.org/download/windows/"
    Write-Host "  2. Make sure to add PostgreSQL bin directory to PATH during installation"
    Write-Host "  3. Re-run this script after installation"
    Write-Host ""
    Write-Error "❌ PostgreSQL is required. Please install it first."
    exit 1
}

Write-Success "✅ PostgreSQL found"
$version = & psql --version
Write-Host "   Version: $version"
Write-Host ""

# ============================================
# STEP 2: Test PostgreSQL Service
# ============================================
Write-Info "2️⃣ Testing PostgreSQL connection..."

$testConnection = $null
try {
    $result = & psql -h $DbHost -U postgres -p $DbPort -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ PostgreSQL is running and accessible"
    } else {
        Write-Warning "⚠️ Could not connect with default postgres user"
        Write-Host "   Trying connection as $DbUser..."
    }
} catch {
    Write-Warning "⚠️ PostgreSQL connection test failed"
}

Write-Host ""

# ============================================
# STEP 3: Create Database and User
# ============================================
Write-Info "3️⃣ Creating database and user..."

# Create temporary SQL script
$sqlScript = @"
-- Create user
CREATE USER $DbUser WITH ENCRYPTED PASSWORD '$DbPassword';

-- Set permissions
ALTER USER $DbUser CREATEDB;
ALTER ROLE $DbUser SET client_encoding TO 'utf8';

-- Create database
CREATE DATABASE $DbName OWNER $DbUser ENCODING 'UTF8';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;

-- Confirm
SELECT 'User and Database created successfully' AS status;
"@

# Save to temp file
$tempSqlFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.sql'
Set-Content -Path $tempSqlFile -Value $sqlScript -Encoding UTF8

try {
    Write-Host "Creating user '$DbUser' and database '$DbName'..."
    $output = & psql -h $DbHost -U postgres -p $DbPort -f $tempSqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Database and user created successfully"
    } else {
        Write-Warning "⚠️ Some operations may have failed (user/database might already exist)"
        Write-Host $output
    }
} catch {
    Write-Error "❌ Error during database creation: $_"
    exit 1
} finally {
    # Clean up temp file
    Remove-Item -Path $tempSqlFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""

# ============================================
# STEP 4: Test Connection
# ============================================
Write-Info "4️⃣ Testing database connection..."

try {
    $env:PGPASSWORD = $DbPassword
    $result = & psql -h $DbHost -U $DbUser -d $DbName -p $DbPort -c "SELECT NOW();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Connection successful!"
    } else {
        Write-Error "❌ Connection failed"
        Write-Host "Error: $result"
        exit 1
    }
} catch {
    Write-Error "❌ Connection test failed: $_"
    exit 1
} finally {
    $env:PGPASSWORD = ""
}

Write-Host ""

# ============================================
# STEP 5: Create .env File
# ============================================
Write-Info "5️⃣ Creating .env file..."

$envPath = "backend\.env"

if (Test-Path $envPath) {
    Write-Warning "⚠️  backend\.env already exists"
} else {
    Write-Host "Creating backend\.env..."
    
    # Generate random JWT secrets
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $jwtRefreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    $envContent = @"
# Database Configuration
DATABASE_URL=postgresql://$DbUser`:$DbPassword@$DbHost`:$DbPort/$DbName

# JWT Configuration
JWT_SECRET=dev-secret-key-change-in-production-$jwtSecret
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-$jwtRefreshSecret

# Environment
NODE_ENV=development
PORT=3000

# Application
APP_NAME=Manuten-o CMMS
APP_VERSION=1.2.1
"@
    
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Success "✅ .env file created"
}

Write-Host ""

# ============================================
# STEP 6: Manual Database Setup Instructions
# ============================================
Write-Info "6️⃣ Manual Database Setup Options"
Write-Host ""
Write-Host "If you prefer to set up the database manually:"
Write-Host ""
Write-Warning "Option 1: Using SQL file directly"
Write-Host "  psql -h $DbHost -U postgres -p $DbPort -f setup-database.sql"
Write-Host ""
Write-Warning "Option 2: Interactive SQL shell"
Write-Host "  psql -h $DbHost -U postgres -p $DbPort"
Write-Host ""
Write-Warning "Option 3: Using pgAdmin (GUI)"
Write-Host "  1. Open pgAdmin (usually comes with PostgreSQL)"
Write-Host "  2. Create new database: $DbName"
Write-Host "  3. Create new user: $DbUser with password: $DbPassword"
Write-Host "  4. Import setup-database.sql"
Write-Host ""

# ============================================
# STEP 7: Summary
# ============================================
Write-Host ""
Write-Success "╔════════════════════════════════════════╗"
Write-Success "║   ✅ Database Setup Complete!          ║"
Write-Success "╚════════════════════════════════════════╝"
Write-Host ""

Write-Warning "Next Steps:"
Write-Host ""
Write-Host "1. Install backend dependencies:"
Write-Host "   cd backend"
Write-Host "   npm install"
Write-Host ""
Write-Host "2. Run database migrations (if using Drizzle):"
Write-Host "   npm run db:migrate"
Write-Host ""
Write-Host "3. Seed demo data:"
Write-Host "   npm run db:seed"
Write-Host ""
Write-Host "4. Start the backend:"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "5. In another terminal, install frontend dependencies:"
Write-Host "   cd frontend"
Write-Host "   npm install"
Write-Host "   npm run dev"
Write-Host ""

Write-Warning "Database Credentials:"
Write-Host "  Host:     $DbHost"
Write-Host "  Port:     $DbPort"
Write-Host "  Database: $DbName"
Write-Host "  User:     $DbUser"
Write-Host "  Password: $DbPassword"
Write-Host ""

Write-Warning "⚠️  IMPORTANT:"
Write-Host "  - Update these credentials in production!"
Write-Host "  - The .env file should never be committed to git"
Write-Host "  - Use strong passwords in production"
Write-Host "  - Store credentials in environment variables or secure vaults"
Write-Host ""
