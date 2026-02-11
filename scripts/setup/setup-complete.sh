#!/bin/bash

# ============================================
# Manuten-o CMMS - Database Migration Script
# ============================================
# Executa as migrações do Drizzle após criar a BD

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Manuten-o CMMS - Database Setup      ║"
echo "║   Complete with Migrations             ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get parameters
DB_USER="${1:-cmms_user}"
DB_PASSWORD="${2:-cmms_password}"
DB_NAME="${3:-cmms_enterprise}"
DB_HOST="${4:-localhost}"
DB_PORT="${5:-5432}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST:$DB_PORT"
echo ""

# ============================================
# STEP 1: Create Database
# ============================================
echo -e "${BLUE}1️⃣ Creating database and user...${NC}"

# Test connection
if ! sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to PostgreSQL${NC}"
    exit 1
fi

# Check if user exists
if ! sudo -u postgres psql -t -c "SELECT 1 FROM pg_user WHERE usename='$DB_USER'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null
    sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null
fi

# Create database
if ! sudo -u postgres psql -l | grep -q $DB_NAME; then
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
fi

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

echo -e "${GREEN}✅ Database created${NC}"
echo ""

# ============================================
# STEP 2: Create .env if doesn't exist
# ============================================
echo -e "${BLUE}2️⃣ Checking .env file...${NC}"

if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env..."
    cat > backend/.env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
NODE_ENV=development
PORT=3000
APP_NAME=Manuten-o CMMS
APP_VERSION=1.2.1
EOF
    echo -e "${GREEN}✅ .env created${NC}"
else
    echo -e "${YELLOW}⚠️  .env already exists${NC}"
fi
echo ""

# ============================================
# STEP 3: Install Dependencies
# ============================================
echo -e "${BLUE}3️⃣ Installing backend dependencies...${NC}"

cd backend

if [ ! -d "node_modules" ]; then
    echo "Running npm install..."
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencies already installed${NC}"
fi
echo ""

# ============================================
# STEP 4: Run Migrations
# ============================================
echo -e "${BLUE}4️⃣ Running database migrations...${NC}"

if npm run db:push; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check .env DATABASE_URL is correct"
    echo "  2. Verify PostgreSQL is running"
    echo "  3. Try running SQL manually: psql -f ../setup-database.sql"
    exit 1
fi
echo ""

# ============================================
# STEP 5: Seed Demo Data
# ============================================
echo -e "${BLUE}5️⃣ Seeding demo data...${NC}"

if npm run db:seed; then
    echo -e "${GREEN}✅ Demo data seeded${NC}"
else
    echo -e "${YELLOW}⚠️  Seed may need manual execution${NC}"
    echo "   Run: npm run db:seed"
fi

cd ..
echo ""

# ============================================
# Summary
# ============================================
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Setup Complete!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Start the backend:"
echo "   cd backend && npm run dev"
echo ""
echo "2. In another terminal, start frontend:"
echo "   cd frontend && npm install && npm run dev"
echo ""
echo -e "${YELLOW}Demo Login:${NC}"
echo "   Email: admin@cmms.com"
echo "   Password: Admin@123456"
echo ""
