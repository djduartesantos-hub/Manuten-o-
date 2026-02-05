# Inicialização do Banco de Dados no Render

## ⚠️ Problema: "Invalid credentials" no Login

Se você está recebendo o erro "Invalid credentials" ao tentar fazer login no Render, isso significa que o banco de dados não foi inicializado com o usuário admin.

## ✅ Solução: Endpoint de Inicialização

### Método 1: Inicialização Manual via API

Após o deploy no Render, faça uma requisição POST para o endpoint de inicialização:

```bash
curl -X POST https://SEU-APP.onrender.com/api/setup/initialize
```

**Substitua `SEU-APP` pelo nome do seu serviço no Render.**

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Database initialized successfully with admin user",
  "data": {
    "adminEmail": "admin@cmms.com",
    "plantId": "xxx-xxx-xxx",
    "note": "You can now login with the admin credentials"
  }
}
```

### Credenciais Padrão

Após a inicialização, você pode fazer login com:

- **Email:** `admin@cmms.com`
- **Senha:** `Admin@123456`

⚠️ **Importante:** Mude a senha após o primeiro login!

## 🔧 Método 2: Usando Variáveis de Ambiente (Recomendado)

Para maior segurança, defina as variáveis de ambiente no Render Dashboard:

1. Acesse o Dashboard do Render
2. Vá em **Environment**
3. Adicione ou atualize:
   - `ADMIN_EMAIL`: seu email de admin
   - `ADMIN_PASSWORD`: uma senha forte

4. Faça um novo deploy ou redeploy
5. Execute o endpoint de inicialização:

```bash
curl -X POST https://SEU-APP.onrender.com/api/setup/initialize
```

## 🛡️ Segurança

### O endpoint de inicialização:

✅ Só funciona se o banco de dados estiver **completamente vazio** (sem usuários)  
✅ Retorna erro 400 se já existirem usuários no banco  
✅ Não requer autenticação (porque não há usuários ainda)  
✅ Cria automaticamente:
   - Usuário admin (superadmin)
   - Planta padrão
   - Associação usuário-planta

### Erros Comuns

#### Banco já inicializado

```json
{
  "success": false,
  "error": "Database already initialized. Users exist.",
  "userCount": 1
}
```

**Solução:** O banco já tem usuários. Use as credenciais existentes ou entre em contato com o administrador.

#### Erro de conexão

```json
{
  "success": false,
  "error": "Failed to initialize database"
}
```

**Possíveis causas:**
- DATABASE_URL não configurado corretamente
- Banco de dados não acessível
- Tabelas não foram criadas (migration não rodada)

**Solução:**
1. Verifique os logs do Render
2. Confirme que DATABASE_URL está configurado
3. Verifique se as migrations rodaram no build

## 📋 Checklist de Deploy no Render

### Pré-Deploy

- [ ] DATABASE_URL configurado (automático pelo Render)
- [ ] JWT_SECRET gerado
- [ ] JWT_REFRESH_SECRET gerado
- [ ] ADMIN_EMAIL definido (opcional - padrão: admin@cmms.com)
- [ ] ADMIN_PASSWORD definido (opcional - padrão: Admin@123456)

### Pós-Deploy

- [ ] Aplicação está rodando (/health retorna 200)
- [ ] Executou POST /api/setup/initialize
- [ ] Login funciona com credenciais admin
- [ ] Mudou a senha padrão (se aplicável)

## 🔄 Script de Inicialização Automática

Você pode adicionar este script no seu processo de deploy:

```bash
#!/bin/bash

# Aguarda o serviço estar online
sleep 10

# Tenta inicializar o banco
RESPONSE=$(curl -s -X POST https://SEU-APP.onrender.com/api/setup/initialize)

echo "Inicialização: $RESPONSE"

if echo "$RESPONSE" | grep -q "success.*true"; then
  echo "✅ Banco de dados inicializado com sucesso!"
elif echo "$RESPONSE" | grep -q "already initialized"; then
  echo "ℹ️  Banco de dados já estava inicializado."
else
  echo "❌ Erro na inicialização do banco de dados."
  exit 1
fi
```

## 📚 Referências

- [Guia de Deploy no Render](./RENDER_GUIDE.md)
- [Configuração do Banco de Dados](./RENDER_DEPLOYMENT.md)
- [Documentação da API de Setup](../../backend/src/routes/setup.routes.ts)
