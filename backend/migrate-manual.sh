#!/bin/bash

# ============================================
# Manuten-o CMMS - Manual Migration Script
# ============================================
# If automatic migrations fail, use this script

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Manuten-o CMMS - Manual Migration    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found in backend directory${NC}"
    echo "Please run: ../setup-complete.sh"
    exit 1
fi

# Source .env
export $(cat .env | grep -v '^#' | xargs)

echo -e "${YELLOW}Configuration:${NC}"
echo "  DATABASE_URL: ${DATABASE_URL:0:50}..."
echo ""

# ============================================
# OPTION 1: Try Drizzle Migrations
# ============================================
echo -e "${BLUE}Option 1: Trying Drizzle migrations...${NC}"
echo ""

if npm run db:migrate 2>/dev/null; then
    echo -e "${GREEN}✅ Migrations completed successfully${NC}"
    
    echo ""
    echo -e "${BLUE}Seeding demo data...${NC}"
    if npm run db:seed 2>/dev/null; then
        echo -e "${GREEN}✅ Demo data seeded${NC}"
    else
        echo -e "${YELLOW}⚠️  Seed script encountered issues${NC}"
        echo "    But tables should be created"
    fi
    
    exit 0
fi

# ============================================
# OPTION 2: Manual SQL Migration
# ============================================
echo -e "${YELLOW}⚠️  Drizzle migration failed. Using manual SQL...${NC}"
echo ""
echo -e "${BLUE}Running manual SQL migration...${NC}"

# Extract DB credentials from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL=${DATABASE_URL}

if command -v psql &> /dev/null; then
    # Use psql to execute SQL file
    if PGPASSWORD=${DATABASE_URL#*:} psql -c "SELECT 1;" >/dev/null 2>&1; then
        echo "Using manual SQL setup..."
        psql "${DATABASE_URL}" -f ../setup-database.sql >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Manual migration completed${NC}"
        else
            echo -e "${YELLOW}⚠️  Manual migration encountered issues${NC}"
            echo "    Check database connection"
        fi
    else
        echo -e "${RED}❌ Cannot connect to database${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check DATABASE_URL in .env is correct"
        echo "  2. Verify PostgreSQL is running"
        echo "  3. Check username and password"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql not found in PATH${NC}"
    echo ""
    echo "Manual steps:"
    echo "  1. psql -U <user> -d <database>"
    echo "  2. Copy-paste setup-database.sql"
    echo "  3. Run: \\i setup-database.sql"
    exit 1
fi

echo ""
echo -e "${BLUE}Attempting to seed data...${NC}"

# Try to seed
npm run db:seed 2>/dev/null || echo -e "${YELLOW}⚠️  Seed may need manual review${NC}"

echo ""
echo -e "${GREEN}✅ Migration completed${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  npm run dev"
echo ""
