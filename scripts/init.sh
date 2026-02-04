#!/bin/bash

# CMMS Enterprise - Startup Script
# Este script inicializa tanto backend como frontend

set -e

echo "🚀 CMMS Enterprise - Inicialização"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "✓ Verificando Node.js..."
node --version || (echo -e "${RED}✗ Node.js não instalado${NC}"; exit 1)
npm --version || (echo -e "${RED}✗ npm não instalado${NC}"; exit 1)

# Backend Setup
echo -e "\n${YELLOW}=== BACKEND ===${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo "📝 Criando .env do backend..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Configure seu .env em backend/.env${NC}"
fi

echo "📦 Instalando dependências..."
npm install

echo -e "${GREEN}✓ Backend pronto!${NC}"

# Frontend Setup
echo -e "\n${YELLOW}=== FRONTEND ===${NC}"
cd ../frontend

echo "📦 Instalando dependências..."
npm install

echo -e "${GREEN}✓ Frontend pronto!${NC}"

echo -e "\n${GREEN}✅ Inicialização Completa!${NC}"
echo ""
echo "Para iniciar o projeto:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Acesse: http://localhost:5173"
echo ""
echo "Credenciais Demo:"
echo "  Empresa: cmms-demo"
echo "  Email: admin@cmms.com"
echo "  Senha: Admin@123456"
