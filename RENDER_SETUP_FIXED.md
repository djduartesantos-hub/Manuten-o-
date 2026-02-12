# 🚀 RENDER DEPLOYMENT - UPDATED SETUP GUIDE

## Problema Resolvido ✅

**Antes:** Página de setup estava hardcoded para `http://localhost:3000`  
**Agora:** Usa API relativa (funciona em qualquer servidor)

---

## 📋 Mudanças Feitas

### 1. **Frontend (`AdminSetupPage.tsx`)**
```typescript
// ❌ Antes:
fetch('http://localhost:3000/api/setup/status')

// ✅ Agora:
getSetupStatus() // Usa API_BASE_URL relativa (rota /api/t/:tenantSlug/setup)
```

### 2. **API Service (`api.ts`)**
```typescript
// Novas funções:
export async function getSetupStatus() { ... }
export async function seedDemoData() { ... }
export async function clearAllData() { ... }
```

### 3. **Backend Configuration (`database.ts`)**
```typescript
// Já usa variável de ambiente:
connectionString: process.env.DATABASE_URL
```

### 4. **Environment Files**
- ✅ `.gitignore` criado (ignora .env files)
- ✅ `.env.render` criado (template para Render)
- ✅ `backend/.env.render` criado (instruções detalhadas)

---

## 🔧 Setup no Render (Passo a Passo)

### 1. Conectar Database

**No Render Dashboard:**
1. Criar → PostgreSQL Database
2. Nomear: `cmms-enterprise-db`
3. Copiar **Internal Database URL**

Formato:
```
postgresql://cmms_user:senha@dpg-xxx.render.internal/cmms_enterprise
```

### 2. Configurar Environment Variables

**No Render Dashboard → Seu Serviço → Settings → Environment**

Adicione:
```
DATABASE_URL: (colar Internal Database URL da step anterior)
JWT_SECRET: (gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET: (gerar outro seguro)
CORS_ORIGIN: https://seu-app-name.onrender.com
NODE_ENV: production
ADMIN_EMAIL: superadmin@cmms.com
ADMIN_PASSWORD: SuperAdmin@123456
```

### 3. Deploy

1. Push para GitHub main branch
2. Render detecta automaticamente
3. Build inicia (Frontend + Backend)
4. Deploy completa

### 4. Inicializar Database

**Após Deploy:**

1. Aceder a: `https://seu-app-name.onrender.com/admin/setup`
2. Clicar "Verificar Status"
3. Se database vazia, clicar "Adicionar Dados Demo"
4. Confirmar quando terminar

---

## ✅ Testar após Deploy

```bash
# Health check
curl https://seu-app-name.onrender.com/health

# Login
curl -X POST https://seu-app-name.onrender.com/api/t/demo/auth/login \
  -H "Content-Type: application/json" \
   -d '{"email":"superadmin@cmms.com","password":"SuperAdmin@123456"}'

# Assets (com seu token JWT)
curl https://seu-app-name.onrender.com/api/t/demo/assets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 O que foi Corrigido

| Item | Problema | Solução |
|------|----------|---------|
| **Setup Page** | Hardcoded localhost | Usa API relativa |
| **Database URL** | Localmente em .env | Environment variable |
| **Frontend Calls** | URLs hardcoded | Funções reutilizáveis |
| **.gitignore** | Não existia | Criado (ignora .env) |
| **.env.render** | Não existia | Template criado |

---

## 🔐 Segurança

### Mudar em Produção:
- [ ] JWT_SECRET (gerar novo)
- [ ] JWT_REFRESH_SECRET (gerar novo)
- [ ] ADMIN_PASSWORD (criar nova senha)
- [ ] CORS_ORIGIN (seu domínio Render)

### Gerar Secrets Seguros:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📁 Ficheiros Atualizados

```
✅ frontend/src/services/api.ts
   - Novas funções: getSetupStatus, seedDemoData, clearAllData
   
✅ frontend/src/pages/AdminSetupPage.tsx
   - Remove hardcoded localhost
   - Usa novas funções do api.ts
   
✅ backend/.env.render
   - Template com instruções
   
✅ .gitignore
   - Newfile: ignora .env files
```

---

## 🚀 Deploy Render (Resumido)

1. **Database PostgreSQL criada** em Render
2. **Environment variables configuradas** (incluindo DATABASE_URL)
3. **Git push para main**
4. **Render inicia deploy automático**
5. **Aceder a /admin/setup** para inicializar dados

---

## 🧪 Checklist Render

- [ ] Repositório atualizado em main
- [ ] Render PostgreSQL criado
- [ ] Environment variables em Render:
  - [ ] DATABASE_URL
  - [ ] JWT_SECRET
  - [ ] JWT_REFRESH_SECRET
  - [ ] CORS_ORIGIN
  - [ ] NODE_ENV=production
- [ ] Dockerfile pode fazer build
- [ ] Deploy concluído
- [ ] Acessível em `https://seu-app.onrender.com`
- [ ] Página setup funcionando
- [ ] Login funciona
- [ ] Assets aparecem

---

## 🎯 URLs Importantes

| Serviço | URL |
|---------|-----|
| **App** | `https://seu-app.onrender.com` |
| **API** | `https://seu-app.onrender.com/api/t` |
| **Setup** | `https://seu-app.onrender.com/admin/setup` |
| **Health** | `https://seu-app.onrender.com/health` |

---

**Status:** ✅ Pronto para Render!

Última atualização: 2026-02-05
