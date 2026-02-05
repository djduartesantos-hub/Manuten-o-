#!/bin/bash

# Script para inicializar o banco de dados no Render
# Uso: ./init-render.sh https://seu-app.onrender.com

if [ -z "$1" ]; then
  echo "❌ Erro: URL da aplicação é obrigatória"
  echo ""
  echo "Uso: $0 <URL_DA_APP>"
  echo "Exemplo: $0 https://seu-app.onrender.com"
  exit 1
fi

APP_URL=$1

# Remove trailing slash if present
APP_URL=${APP_URL%/}

echo "🚀 Inicializando banco de dados no Render..."
echo "📍 URL: $APP_URL"
echo ""

# Testa se a aplicação está online
echo "1️⃣  Verificando se a aplicação está online..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health")

if [ "$HEALTH_CHECK" != "200" ]; then
  echo "❌ Aplicação não está acessível (HTTP $HEALTH_CHECK)"
  echo "   Verifique se o deploy foi bem sucedido no Render Dashboard"
  exit 1
fi

echo "✅ Aplicação está online!"
echo ""

# Executa inicialização
echo "2️⃣  Executando inicialização do banco de dados..."
RESPONSE=$(curl -s -X POST "$APP_URL/api/setup/initialize" -w "\n%{http_code}")

# Separa response body e status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "Status HTTP: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Banco de dados inicializado com sucesso!"
  echo ""
  echo "📋 Resposta:"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo "🎉 Pode agora fazer login com:"
  echo "   Email: admin@cmms.com"
  echo "   Senha: Admin@123456"
  echo ""
  echo "⚠️  Recomendação: Mude a senha após o primeiro login!"
  
elif [ "$HTTP_CODE" = "400" ]; then
  echo "ℹ️  Banco de dados já estava inicializado"
  echo ""
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo "Use as credenciais existentes para fazer login."
  
else
  echo "❌ Erro na inicialização"
  echo ""
  echo "📋 Resposta:"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo "Possíveis causas:"
  echo "  • DATABASE_URL não configurado"
  echo "  • Banco de dados inacessível"
  echo "  • Migrations não executadas"
  echo ""
  echo "Verifique os logs no Render Dashboard"
  exit 1
fi
