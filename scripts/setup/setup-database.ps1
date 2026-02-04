# ============================================
# Manuten-o CMMS Database Setup Script - Windows
# PowerShell Edition - Complete Automation
# ============================================
# Usage: .\setup-database.ps1 [-DbUser cmms_user] [-DbPassword pass] [-DbName cmms_enterprise] [-DbHost localhost] [-DbPort 5432]

param(
    [string]$DbUser = "cmms_user",
    [string]$DbPassword = "cmms_password",
    [string]$DbName = "cmms_enterprise",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432"
)

# ============================================
# Helper Functions
# ============================================

function Write-Success {
    Write-Host $args[0] -ForegroundColor Green
}

function Write-Info {
    Write-Host $args[0] -ForegroundColor Cyan
}

function Write-Warn {
    Write-Host $args[0] -ForegroundColor Yellow
}

function Write-Err {
    Write-Host $args[0] -ForegroundColor Red
}

function Exit-Error {
    param([string]$Message)
    Write-Err "❌ $Message"
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================
# HEADER
# ============================================

Clear-Host
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Manuten-o CMMS - Complete Database Setup                ║" -ForegroundColor Cyan
Write-Host "║   Windows PowerShell Edition                              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Warn "Configuration:"
Write-Host "  Database Name: $DbName"
Write-Host "  Database User: $DbUser"
Write-Host "  Database Host: $DbHost"
Write-Host "  Database Port: $DbPort"
Write-Host ""

# ============================================
# STEP 1: Check PostgreSQL Installation
# ============================================

Write-Info "1️⃣ Checking PostgreSQL Installation..."

$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($null -eq $psqlPath) {
    Write-Host ""
    Write-Warn "PostgreSQL not found on system PATH"
    Write-Host ""
    Write-Host "To install PostgreSQL:"
    Write-Host "  1. Download from: https://www.postgresql.org/download/windows/"
    Write-Host "  2. Run the installer"
    Write-Host "  3. Check 'Add PostgreSQL to PATH' during installation"
    Write-Host "  4. Restart PowerShell and run this script again"
    Write-Host ""
    Exit-Error "PostgreSQL is required but not found"
}

Write-Success "✅ PostgreSQL found"
$version = & psql --version
Write-Host "   Version: $version"
Write-Host ""

# ============================================
# STEP 2: Test PostgreSQL Service
# ============================================

Write-Info "2️⃣ Testing PostgreSQL Connection..."

try {
    $result = & psql -h $DbHost -U postgres -p $DbPort -c "SELECT NOW();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ PostgreSQL is running and accessible"
    } else {
        Write-Warn "⚠️ Could not connect with postgres user"
        Write-Host "   Make sure PostgreSQL service is running"
        Read-Host "Press Enter to continue or Ctrl+C to cancel"
    }
} catch {
    Write-Err "Connection test error: $_"
    Read-Host "Press Enter to continue"
}

Write-Host ""

# ============================================
# STEP 3: Create Database and User
# ============================================

Write-Info "3️⃣ Creating Database and User..."

# Prepare SQL for database setup
$sqlScript = @"
-- Drop existing user if exists (to reset)
DROP USER IF EXISTS $DbUser CASCADE;

-- Create user
CREATE USER $DbUser WITH ENCRYPTED PASSWORD '$DbPassword';

-- Set permissions
ALTER USER $DbUser CREATEDB;
ALTER ROLE $DbUser SET client_encoding TO 'utf8';

-- Drop database if exists (to reset)
DROP DATABASE IF EXISTS $DbName;

-- Create database
CREATE DATABASE $DbName OWNER $DbUser ENCODING 'UTF8';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;

-- Verify
SELECT 'User and Database created successfully' AS status;
"@

# Save to temp file
$tempDir = [System.IO.Path]::GetTempPath()
$tempSqlFile = Join-Path $tempDir "cmms_setup_$([System.Guid]::NewGuid()).sql"
Set-Content -Path $tempSqlFile -Value $sqlScript -Encoding UTF8

try {
    Write-Host "Creating user '$DbUser' and database '$DbName'..."
    $output = & psql -h $DbHost -U postgres -p $DbPort -f $tempSqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Database and user created successfully"
    } else {
        Write-Err "❌ Failed to create database/user"
        Write-Host "Output: $output"
        Read-Host "Press Enter to continue"
    }
} catch {
    Write-Err "❌ Error during database creation: $_"
    Read-Host "Press Enter to continue"
} finally {
    Remove-Item -Path $tempSqlFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""

# ============================================
# STEP 4: Test Connection as User
# ============================================

Write-Info "4️⃣ Testing Connection as New User..."

try {
    $env:PGPASSWORD = $DbPassword
    $result = & psql -h $DbHost -U $DbUser -d $DbName -p $DbPort -c "SELECT NOW();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Connection successful as $DbUser"
    } else {
        Write-Err "❌ Connection failed as $DbUser"
        Write-Host "Error: $result"
    }
} catch {
    Write-Err "❌ Connection test failed: $_"
} finally {
    $env:PGPASSWORD = ""
}

Write-Host ""

# ============================================
# STEP 5: Create .env File
# ============================================

Write-Info "5️⃣ Creating .env File..."

$envPath = "backend\.env"

if (Test-Path $envPath) {
    Write-Warn "⚠️ backend\.env already exists - skipping"
} else {
    if (-not (Test-Path "backend")) {
        New-Item -ItemType Directory -Path "backend" -Force | Out-Null
    }
    
    # Generate random JWT secrets
    $jwtSecret = ([char[]]((65..90) + (97..122) + (48..57) | Get-Random -Count 32) -join '')
    $jwtRefreshSecret = ([char[]]((65..90) + (97..122) + (48..57) | Get-Random -Count 32) -join '')
    
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
APP_VERSION=1.2.2
"@
    
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Success "✅ .env file created"
}

Write-Host ""

# ============================================
# STEP 6: Check Node.js and npm
# ============================================

Write-Info "6️⃣ Checking Node.js and npm..."

$nodePath = Get-Command node -ErrorAction SilentlyContinue
$npmPath = Get-Command npm -ErrorAction SilentlyContinue

if ($null -eq $nodePath -or $null -eq $npmPath) {
    Write-Warn "⚠️ Node.js or npm not found on PATH"
    Write-Host "   Download from: https://nodejs.org"
    Write-Host "   Install and add to PATH, then rerun this script"
    Read-Host "Press Enter to continue"
} else {
    $nodeVersion = & node --version
    $npmVersion = & npm --version
    Write-Success "✅ Node.js and npm found"
    Write-Host "   Node: $nodeVersion"
    Write-Host "   npm: $npmVersion"
}

Write-Host ""

# ============================================
# STEP 7: Install Backend Dependencies
# ============================================

Write-Info "7️⃣ Installing Backend Dependencies..."

if (Test-Path "backend\node_modules") {
    Write-Warn "⚠️ node_modules already exists - skipping npm install"
} else {
    Push-Location backend
    Write-Host "Running: npm install"
    & npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Dependencies installed"
    } else {
        Write-Warn "⚠️ npm install had issues - continuing anyway"
    }
    Pop-Location
}

Write-Host ""

# ============================================
# STEP 8: Run Database Migrations
# ============================================

Write-Info "8️⃣ Running Database Migrations..."

Push-Location backend

Write-Host "Running: npm run db:migrate"
& npm run db:migrate

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ Database schema created"
} else {
    Write-Err "❌ Migration failed"
    Write-Host "   Check backend/.env DATABASE_URL"
}

Write-Host ""

# ============================================
# STEP 9: Seed Demo Data
# ============================================

Write-Info "9️⃣ Seeding Demo Data..."

Write-Host "Running: npm run db:seed"
& npm run db:seed

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ Demo data seeded"
} else {
    Write-Warn "⚠️ Seed failed or no seed data"
    Write-Host "   Database is still usable"
}

Pop-Location
Write-Host ""

# ============================================
# STEP 10: Summary
# ============================================

Write-Host ""
Write-Success "╔════════════════════════════════════════════════════════════╗"
Write-Success "║   ✅ SETUP COMPLETED SUCCESSFULLY!                        ║"
Write-Success "╚════════════════════════════════════════════════════════════╝"
Write-Host ""

Write-Host "Database is ready to use!"
Write-Host ""

Write-Warn "📋 Next Steps:"
Write-Host ""
Write-Host "1️⃣ Start the backend server:"
Write-Host "   cd backend"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "2️⃣ In another PowerShell terminal, start frontend:"
Write-Host "   cd frontend"
Write-Host "   npm install"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "3️⃣ Open browser:"
Write-Host "   http://localhost:5173"
Write-Host ""

Write-Warn "Database Credentials:"
Write-Host "  Host:     $DbHost"
Write-Host "  Port:     $DbPort"
Write-Host "  Database: $DbName"
Write-Host "  User:     $DbUser"
Write-Host "  Password: $DbPassword"
Write-Host ""

Write-Warn "🔒 IMPORTANT SECURITY NOTES:"
Write-Host "  ⚠️ Update these credentials in production!"
Write-Host "  ⚠️ The .env file should NEVER be committed to git"
Write-Host "  ⚠️ Use strong, unique passwords in production"
Write-Host "  ⚠️ Store credentials in environment variables or vaults"
Write-Host "  ⚠️ Change default JWT_SECRET in production"
Write-Host ""

Write-Warn "❓ Troubleshooting:"
Write-Host "  - If migrations fail: Check DATABASE_URL in backend/.env"
Write-Host "  - If seed fails: Database is OK, seeds are optional"
Write-Host "  - To manually run migrations: cd backend && npm run db:migrate"
Write-Host "  - For database issues: Check PostgreSQL logs"
Write-Host ""

Write-Host "For more help, check: WINDOWS_DATABASE_SETUP.md"
Write-Host ""

Read-Host "Press Enter to close this window"
