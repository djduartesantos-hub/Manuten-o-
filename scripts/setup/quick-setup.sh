#!/bin/bash

# ============================================
# CMMS Enterprise - Quick Setup Script
# ============================================
# This script sets up the database with initial superadmin user

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   CMMS Enterprise - Quick Setup        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Database configuration
DB_NAME="cmms_enterprise"
DB_USER="postgres"
SQL_FILE="scripts/database/setup-database.sql"

# Check if PostgreSQL is running
echo -e "${BLUE}🔍 Checking PostgreSQL status...${NC}"
if ! systemctl is-active --quiet postgresql 2>/dev/null && ! pgrep -x postgres >/dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not running. Attempting to start...${NC}"
    sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || {
        echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
        echo "Please start PostgreSQL manually and run this script again."
        exit 1
    }
    sleep 2
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ SQL file not found: $SQL_FILE${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Drop existing database if it exists (optional)
read -p "$(echo -e ${YELLOW}Do you want to drop existing database if it exists? [y/N]:${NC} )" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🗑️  Dropping existing database...${NC}"
    sudo -u $DB_USER psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
    echo -e "${GREEN}✅ Database dropped${NC}"
fi
echo ""

# Create database
echo -e "${BLUE}📦 Creating database: $DB_NAME${NC}"
sudo -u $DB_USER psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Database already exists or creation failed${NC}"
}
echo ""

# Apply schema
echo -e "${BLUE}🔧 Applying database schema...${NC}"
sudo -u $DB_USER psql -d $DB_NAME -f $SQL_FILE || {
    echo -e "${RED}❌ Failed to apply schema${NC}"
    exit 1
}
echo ""

# Verify setup
echo -e "${BLUE}🔍 Verifying setup...${NC}"
RESULT=$(sudo -u $DB_USER psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE role = 'superadmin';")
USER_COUNT=$(echo $RESULT | tr -d '[:space:]')

if [ "$USER_COUNT" -ge "1" ]; then
    echo -e "${GREEN}✅ Setup completed successfully!${NC}"
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║          Setup Complete! 🎉            ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}📋 Superadmin credentials:${NC}"
    echo "   Email:    admin@cmms.com"
    echo "   Password: Admin@123456"
    echo ""
    echo -e "${BLUE}🚀 Next steps:${NC}"
    echo "   1. Start backend:  cd backend && npm run dev"
    echo "   2. Start frontend: cd frontend && npm run dev"
    echo "   3. Login at:       http://localhost:5173"
    echo "   4. Go to '🔧 Setup BD' menu to add demo data"
    echo ""
else
    echo -e "${RED}❌ Setup verification failed${NC}"
    echo "Database was created but superadmin user was not found."
    exit 1
fi
