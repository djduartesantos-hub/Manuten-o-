#!/bin/bash
# ============================================================================
# FIX USER PLANTS - Script automatizado
# ============================================================================
# Executa o fix-user-plants.sql e garante que todos os usuários tenham plantas
# ============================================================================

set -e

echo "============================================================================"
echo "🔧 FIX USER PLANTS - Corrigindo acesso de usuários às plantas"
echo "============================================================================"
echo ""

# Verificar se o arquivo SQL existe
if [ ! -f "fix-user-plants.sql" ]; then
  echo "❌ Erro: fix-user-plants.sql não encontrado"
  echo "   Execute este script do diretório scripts/database/"
  exit 1
fi

# Pegar credenciais do ambiente ou usar defaults
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-cmms_enterprise}"
DB_USER="${DATABASE_USER:-cmms_user}"

echo "📊 Configuração do banco de dados:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Executar o script SQL
echo "🔄 Executando fix-user-plants.sql..."
echo ""

PGPASSWORD="${DATABASE_PASSWORD:-cmms_password}" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f fix-user-plants.sql

echo ""
echo "============================================================================"
echo "✅ CORREÇÃO CONCLUÍDA!"
echo "============================================================================"
echo ""
echo "⚠️  IMPORTANTE: Todos os usuários precisam fazer LOGOUT e LOGIN novamente"
echo "   para que o novo token JWT seja gerado com os plantIds."
echo ""
echo "🔑 Credenciais demo:"
echo "   Admin: admin@cmms.com / Admin@123456"
echo "   Técnico: tech@cmms.com / Tech@123456"
echo ""
echo "============================================================================"
