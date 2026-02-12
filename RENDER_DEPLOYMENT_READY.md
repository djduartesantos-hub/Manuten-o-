# 🚀 RENDER DEPLOYMENT - MUDANÇAS ATUALIZADAS

## Status do Repositório

✅ **Todos os commits estão no branch `main` do repositório remoto**

Branch: `main`  
Status: Up to date with `origin/main`  
Último commit: `6a2a9a2` (docs: add quick setup instructions for demo database)

---

## 📋 Mudanças Recentes Committed

### 1️⃣ **Fixes de Autenticação e Plant IDs** (`7577b73`)
```
fix: load plantIds in JWT and improve plant middleware authorization
```

**O que mudou:**
- ✅ `backend/src/services/auth.service.ts` - Nova função `getUserPlantIds()`
- ✅ `backend/src/controllers/auth.controller.ts` - Incluir `plantIds` no JWT
- ✅ `backend/src/middlewares/auth.ts` - Middleware melhorado para single-tenant
- ✅ `backend/src/controllers/asset.controller.ts` - Logging melhorado

**Impacto:** Users agora terão `plantIds` no JWT, resolvendo o erro "Plant ID is required"

---

### 2️⃣ **Database Demo Setup** (`a56b2fb`)
```
feat: add database demo setup with realistic test data
```

**Ficheiros Novos:**
- ✅ `scripts/database/demo-data.sql` - 8 categorias, 12 equipamentos, 15 planos
- ✅ `scripts/database/setup-demo.sh` - Script automático (Linux/Mac)
- ✅ `scripts/database/setup-demo.bat` - Script automático (Windows)
- ✅ `scripts/database/SETUP_DEMO.md` - Documentação detalhada
- ✅ `scripts/database/README.md` - Atualizado com novo processo

**Impacto:** Sistema pronto com dados realistas para teste

---

### 3️⃣ **Quick Setup Guide** (`6a2a9a2`)
```
docs: add quick setup instructions for demo database
```

**Ficheiro Novo:**
- ✅ `SETUP_QUICK.md` - Instruções rápidas na raiz do projeto

---

## 🔧 O QUE PRECISA FAZER NO RENDER

### **Pré-requisitos no Render**

1. **Database:**
   ```bash
   # Database já deve estar criada em Render PostgreSQL
   # Executar na consola do Render:
   psql -U cmms_user -d cmms_enterprise -f scripts/database/create-admin-user.sql
   psql -U cmms_user -d cmms_enterprise -f scripts/database/demo-data.sql
   ```

2. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://cmms_user:cmms_password@localhost/cmms_enterprise
   JWT_SECRET=your-secret-key-here
   JWT_REFRESH_SECRET=your-refresh-secret-key
   NODE_ENV=production
   CORS_ORIGIN=your-render-domain.onrender.com
   ```

---

## 📦 Build & Deploy Docker

### **Dockerfile já está configurado**

Local: `/workspaces/Manuten-o-/Dockerfile`

O Dockerfile faz:
```
1. Build Frontend (Next Stage)
2. Build Backend (TypeScript)
3. Runtime (Production Node)
4. Copia Database Scripts
5. Executa migrations
```

### **Render Deploy Steps**

1. **Conectar repositório:**
   - Repository: `https://github.com/djduartesantos-hub/Manuten-o-`
   - Branch: `main`

2. **Build Command:**
   ```bash
   npm install
   cd backend && npm run build
   ```

3. **Start Command:**
   ```bash
   npm start
   ```

4. **Port:** `3000`

---

## ✅ Checklist para Render

- [ ] Repositório sincronizado (`git pull origin main`)
- [ ] Database PostgreSQL criado no Render
- [ ] Executar `create-admin-user.sql` na database
- [ ] Executar `demo-data.sql` na database (opcional, para testes)
- [ ] Environment variables configuradas
- [ ] Dockerfile testado localmente
- [ ] Deploy feito via Render UI
- [ ] Testar em `https://your-app.onrender.com`

---

## 🧪 Testar após Deploy

```bash
# Terminal remoto do Render
npm run db:diagnose

# Verificar dados
curl https://your-app.onrender.com/health

# Testar login
curl -X POST https://your-app.onrender.com/api/t/demo/auth/login \
  -H "Content-Type: application/json" \
  -d '{
         "email": "superadmin@cmms.com",
         "password": "SuperAdmin@123456"
  }'
```

---

## 🔐 Dados de Teste Prod

```
Email: superadmin@cmms.com
Senha: SuperAdmin@123456
Equipamentos: 12
Planos: 15
```

---

## 📊 Resumo de Mudanças

| Aspecto | Antes | Depois |
|--------|-------|--------|
| **Plant ID Error** | ❌ Falhava | ✅ Resolvido |
| **JWT plantIds** | ❌ Vazio | ✅ Incluído |
| **Test Data** | ❌ Vazio | ✅ 12 equipamentos |
| **Auth Middleware** | ⚠️ Básico | ✅ Melhorado |
| **Database Setup** | 📝 Manual | ✅ Automático |

---

## 🚀 Deploy Próximo

```bash
# No seu workspace local:
git pull origin main
docker build -t cmms:latest .
docker run -p 3000:3000 cmms:latest

# Ou push para Render:
# Render detecta o commit automaticamente
```

---

## 📞 Suporte

Se tiver problemas no Render:

1. **Verificar logs:**
   ```
   Render Dashboard → Logs
   ```

2. **Database connection:**
   ```bash
   psql --version
   # Render: psql -U cmms_user cmms_enterprise
   ```

3. **Environment variables:**
   ```
   Render Dashboard → Environment
   ```

---

✅ **Repositório pronto para deploy no Render!** 🎉

Última atualização: 2026-02-05
Branch: main
Status: ✅ Sincronizado
