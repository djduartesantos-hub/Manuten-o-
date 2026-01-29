#!/bin/bash

# Setup script for Manuten-o CMMS - Linux/macOS
# This script sets up PostgreSQL, creates the database, and initializes the application

set -e

echo "🚀 Manuten-o CMMS - Local Setup Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_USER="cmms_user"
DB_PASSWORD="cmms_password"
DB_NAME="cmms_enterprise"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}1️⃣ Checking PostgreSQL...${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install postgresql
    fi
    
    echo -e "${GREEN}✅ PostgreSQL installed${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL found${NC}"
fi

# Start PostgreSQL service
echo -e "${BLUE}2️⃣ Starting PostgreSQL service...${NC}"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo service postgresql start || sudo systemctl start postgresql
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql
fi
echo -e "${GREEN}✅ PostgreSQL started${NC}"

# Create database and user
echo -e "${BLUE}3️⃣ Creating database and user...${NC}"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database already exists"
echo -e "${GREEN}✅ Database created${NC}"

# Configure backend .env
echo -e "${BLUE}4️⃣ Configuring backend environment...${NC}"
cat > backend/.env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
NODE_ENV=development
PORT=3000
EOF
echo -e "${GREEN}✅ .env configured${NC}"

# Install backend dependencies
echo -e "${BLUE}5️⃣ Installing backend dependencies...${NC}"
cd backend
npm install
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Run migrations
echo -e "${BLUE}6️⃣ Running database migrations...${NC}"
npm run db:migrate
echo -e "${GREEN}✅ Migrations completed${NC}"

# Seed database
echo -e "${BLUE}7️⃣ Seeding database with demo data...${NC}"
npm run db:seed
echo -e "${GREEN}✅ Database seeded${NC}"

cd ..

# Install frontend dependencies
echo -e "${BLUE}8️⃣ Installing frontend dependencies...${NC}"
cd frontend
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
cd ..

echo ""
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo ""
echo "1. Open Terminal 1 and run:"
echo -e "   ${YELLOW}cd backend && npm run dev${NC}"
echo ""
echo "2. Open Terminal 2 and run:"
echo -e "   ${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo "   Tenant (slug): cmms-demo"
echo "   Email: admin@cmms.com"
echo "   Password: Admin@123456"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo "   Backend API: http://localhost:3000/api"
echo "   Frontend: http://localhost:5173"
echo ""
