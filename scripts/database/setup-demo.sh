#!/bin/bash

# ============================================================================
# SETUP COMPLETO DA DATABASE COM DADOS DE DEMONSTRAÇÃO
# ============================================================================
# Este script automatiza todo o processo de setup da database:
# 1. Cria a database, user, schema e tabelas (create-admin-user.sql)
# 2. Carrega dados de demonstração (demo-data.sql)
# 3. Verifica se tudo funcionou (diagnose.sql)
#
# Uso:
#   ./scripts/database/setup-demo.sh
#   ou
#   bash scripts/database/setup-demo.sh
#
# Requisitos:
#   - PostgreSQL instalado e running
#   - psql disponível no PATH
#   - Permissões para criar users e databases
#
# ============================================================================

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Configuração
DB_USER="postgres"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  DATABASE SETUP - MANUTEN-O CMMS         ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ============================================================================
# STEP 1: Conectar e criar database
# ============================================================================
echo -e "${YELLOW}[1/3] A criar database e schema...${NC}"

# Verificar se psql está disponível
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Erro: psql não encontrado. Instale PostgreSQL.${NC}"
    exit 1
fi

# Executar o script de criação
if psql -U "$DB_USER" -d postgres -f "$SCRIPTS_DIR/create-admin-user.sql" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database e schema criados com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao criar database${NC}"
    exit 1
fi

echo ""

# ============================================================================
# STEP 2: Carregar dados de demonstração
# ============================================================================
echo -e "${YELLOW}[2/3] A carregar dados de demonstração...${NC}"

# Executar o script de dados demo
if psql -U cmms_user -d cmms_enterprise -h localhost -f "$SCRIPTS_DIR/demo-data.sql" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dados de demonstração carregados com sucesso${NC}"
else
    # Tenta sem -h localhost (caso de socket local)
    if psql -U cmms_user -d cmms_enterprise -f "$SCRIPTS_DIR/demo-data.sql" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Dados de demonstração carregados com sucesso (via socket)${NC}"
    else
        echo -e "${RED}❌ Erro ao carregar dados de demonstração${NC}"
        exit 1
    fi
fi

echo ""

# ============================================================================
# STEP 3: Verificar dados
# ============================================================================
echo -e "${YELLOW}[3/3] A verificar dados carregados...${NC}"

# Executar diagnóstico
RESULT=$(psql -U cmms_user -d cmms_enterprise -h localhost -t -A -f "$SCRIPTS_DIR/diagnose.sql" 2>/dev/null | tail -1 || psql -U cmms_user -d cmms_enterprise -t -A -f "$SCRIPTS_DIR/diagnose.sql" 2>/dev/null | tail -1)

if [ -z "$RESULT" ]; then
    # Contar registos manualmente
    CATEGORIAS=$(psql -U cmms_user -d cmms_enterprise -h localhost -t -c "SELECT COUNT(*) FROM asset_categories WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';" 2>/dev/null || psql -U cmms_user -d cmms_enterprise -t -c "SELECT COUNT(*) FROM asset_categories WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';" 2>/dev/null)
    EQUIPAMENTOS=$(psql -U cmms_user -d cmms_enterprise -h localhost -t -c "SELECT COUNT(*) FROM assets WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';" 2>/dev/null || psql -U cmms_user -d cmms_enterprise -t -c "SELECT COUNT(*) FROM assets WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';" 2>/dev/null)
    PLANOS=$(psql -U cmms_user -d cmms_enterprise -h localhost -t -c "SELECT COUNT(*) FROM maintenance_plans WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';" 2>/dev/null || psql -U cmms_user -d cmms_enterprise -t -c "SELECT COUNT(*) FROM maintenance_plans WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';" 2>/dev/null)
else
    CATEGORIAS=$(echo "$RESULT" | cut -d'|' -f1)
    EQUIPAMENTOS=$(echo "$RESULT" | cut -d'|' -f2)
    PLANOS=$(echo "$RESULT" | cut -d'|' -f3)
fi

echo -e "${GREEN}✓ Dados verificados:${NC}"
echo -e "  ${BLUE}→ Categorias: ${CATEGORIAS}${NC}"
echo -e "  ${BLUE}→ Equipamentos: ${EQUIPAMENTOS}${NC}"
echo -e "  ${BLUE}→ Planos de Manutenção: ${PLANOS}${NC}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ SETUP CONCLUÍDO COM SUCESSO!          ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# ============================================================================
# INSTRUÇÕES FINAIS
# ============================================================================
echo -e "${BLUE}📋 CREDENCIAIS PADRÃO:${NC}"
echo -e "  ${YELLOW}Email:${NC} admin@cmms.com"
echo -e "  ${YELLOW}Senha:${NC} Admin@123456"
echo -e "  ${YELLOW}Papel:${NC} superadmin"
echo ""

echo -e "${BLUE}🚀 PRÓXIMOS PASSOS:${NC}"
echo -e "  ${YELLOW}1.${NC} Iniciar o backend:    ${GREEN}cd backend && npm run dev${NC}"
echo -e "  ${YELLOW}2.${NC} Iniciar o frontend:   ${GREEN}cd frontend && npm run dev${NC}"
echo -e "  ${YELLOW}3.${NC} Aceder a:             ${GREEN}http://localhost:5173${NC}"
echo -e "  ${YELLOW}4.${NC} Login e testar:       ${GREEN}Verificar Equipamentos e Planos${NC}"
echo ""

echo -e "${BLUE}📊 DATABASE INFO:${NC}"
echo -e "  ${YELLOW}Utilizador:${NC} cmms_user"
echo -e "  ${YELLOW}Base dados:${NC} cmms_enterprise"
echo -e "  ${YELLOW}Host:${NC} localhost"
echo ""

echo -e "${BLUE}🔍 VERIFICAR DATABASE MANUALMENTE:${NC}"
echo -e "  ${GREEN}psql -U cmms_user -d cmms_enterprise${NC}"
echo ""

exit 0
