#!/bin/bash

# ============================================
# Manuten-o CMMS Database Setup Script
# ============================================
# This script helps you set up the PostgreSQL database manually or automatically

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DB_USER="${1:-cmms_user}"
DB_PASSWORD="${2:-cmms_password}"
DB_NAME="${3:-cmms_enterprise}"
DB_HOST="${4:-localhost}"
DB_PORT="${5:-5432}"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║   Manuten-o CMMS Database Setup        ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Database Host: $DB_HOST"
echo "  Database Port: $DB_PORT"
echo ""

# ============================================
# STEP 1: Check PostgreSQL Installation
# ============================================
echo -e "${BLUE}1️⃣ Checking PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Installing PostgreSQL on Linux..."
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Installing PostgreSQL on macOS..."
        brew install postgresql
    else
        echo -e "${RED}❌ Unsupported OS. Please install PostgreSQL manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ PostgreSQL installed${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL found${NC}"
    psql --version
fi

echo ""

# ============================================
# STEP 2: Start PostgreSQL Service
# ============================================
echo -e "${BLUE}2️⃣ Starting PostgreSQL service...${NC}"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✅ PostgreSQL is already running${NC}"
    else
        echo "Starting PostgreSQL..."
        sudo systemctl start postgresql
        echo -e "${GREEN}✅ PostgreSQL started${NC}"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    if ! brew services list | grep postgresql | grep -q started; then
        brew services start postgresql
    fi
    echo -e "${GREEN}✅ PostgreSQL running${NC}"
fi

echo ""

# ============================================
# STEP 3: Create Database and User
# ============================================
echo -e "${BLUE}3️⃣ Creating database and user...${NC}"

# Test connection to PostgreSQL
if ! sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to PostgreSQL as postgres user${NC}"
    echo "Try running with sudo or adjust PostgreSQL access configuration"
    exit 1
fi

# Check if user already exists
if sudo -u postgres psql -t -c "SELECT 1 FROM pg_user WHERE usename='$DB_USER'" | grep -q 1; then
    echo -e "${YELLOW}⚠️  User '$DB_USER' already exists${NC}"
    echo "Do you want to drop and recreate it? (y/n)"
    read -r response
    if [[ "$response" == "y" ]] || [[ "$response" == "Y" ]]; then
        echo "Dropping existing user and database..."
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
        sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
        echo -e "${GREEN}✅ Dropped existing database and user${NC}"
    else
        echo -e "${YELLOW}Skipping user creation${NC}"
    fi
fi

# Create user if it doesn't exist
if ! sudo -u postgres psql -t -c "SELECT 1 FROM pg_user WHERE usename='$DB_USER'" | grep -q 1; then
    echo "Creating database user '$DB_USER'..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null && \
    echo -e "${GREEN}✅ User created${NC}" || \
    echo -e "${YELLOW}⚠️  Failed to create user${NC}"
fi

# Set user permissions
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET client_encoding TO 'utf8';" 2>/dev/null || true

# Create database if it doesn't exist
if ! sudo -u postgres psql -l | grep -q $DB_NAME; then
    echo "Creating database '$DB_NAME'..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8' LOCALE 'pt_PT.UTF-8';" 2>/dev/null || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null && \
    echo -e "${GREEN}✅ Database created${NC}" || \
    echo -e "${RED}❌ Failed to create database${NC}"
else
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
fi

# Grant privileges
echo "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

echo -e "${GREEN}✅ Database setup complete${NC}"

echo ""

# ============================================
# STEP 4: Test Connection
# ============================================
echo -e "${BLUE}4️⃣ Testing database connection...${NC}"

if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT NOW();" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    echo "Troubleshooting:"
    echo "  1. Check if PostgreSQL is running: sudo systemctl status postgresql"
    echo "  2. Check user password: sudo -u postgres psql"
    echo "  3. Check database exists: sudo -u postgres psql -l"
    exit 1
fi

echo ""

# ============================================
# STEP 5: Create .env File
# ============================================
echo -e "${BLUE}5️⃣ Creating .env file...${NC}"

if [ -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env already exists${NC}"
else
    echo "Creating backend/.env..."
    mkdir -p backend
    cat > backend/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# JWT Configuration
JWT_SECRET=dev-secret-key-change-in-production-$(openssl rand -hex 16)
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-$(openssl rand -hex 16)

# Environment
NODE_ENV=development
PORT=3000

# Application
APP_NAME=Manuten-o CMMS
APP_VERSION=1.2.1
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
fi

echo ""

# ============================================
# STEP 6: Display Manual SQL Option
# ============================================
echo -e "${BLUE}6️⃣ Manual Database Setup${NC}"
echo ""
echo "If you prefer to set up the database manually or import an existing script:"
echo ""
echo -e "${YELLOW}Option 1: Using SQL file directly${NC}"
echo "  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f setup-database.sql"
echo ""
echo -e "${YELLOW}Option 2: Interactive SQL shell${NC}"
echo "  psql -h $DB_HOST -U $DB_USER -d $DB_NAME"
echo ""

echo ""

# ============================================
# STEP 7: Summary
# ============================================
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Database Setup Complete!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Install backend dependencies:"
echo "   cd backend && npm install"
echo ""
echo "2. Run database migrations (if using Drizzle):"
echo "   npm run db:migrate"
echo ""
echo "3. Seed demo data:"
echo "   npm run db:seed"
echo ""
echo "4. Start the backend:"
echo "   npm run dev"
echo ""
echo -e "${YELLOW}Database Credentials:${NC}"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "  - Update these credentials in production!"
echo "  - The .env file should never be committed to git"
echo "  - Use strong passwords in production"
echo ""
