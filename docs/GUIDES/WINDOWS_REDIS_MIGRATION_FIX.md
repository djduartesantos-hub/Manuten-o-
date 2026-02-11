# 🪟 Windows: Corrigindo Erros de Migração e Redis

## Problemas Comuns e Soluções

Esse guia resolve os erros mais frequentes ao rodar o projeto no Windows:
- ❌ Erros na migração (Drizzle)
- ❌ Erros ao iniciar serviços com ioredis
- ❌ Redis connection refused

---

## 1️⃣ Entender o que é o Redis

**Redis** é um serviço de cache/fila que o projeto usa para:
- 📨 Fila de envio de emails
- 📊 Geração de relatórios
- 💾 Cache de dados
- 🔄 Jobs em background

**No Windows:** Redis é opcional para desenvolvimento básico.

---

## 2️⃣ Solução Rápida (Recomendado)

Se você não quer instalar Redis agora, siga estes passos:

### A. Atualizar `.env` no backend

Abra `backend/.env` e adicione estas linhas (se não existirem):

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Se Redis não está rodando:** O projeto vai mostrar um aviso ⚠️ mas vai funcionar!

### B. Rodar as migrações

```cmd
cd backend
npm run db:push
npm run db:seed
```

Se der erro de PostgreSQL:
- Verifique se PostgreSQL está rodando (Windows Services)
- Verifique se o DATABASE_URL está correto em `.env`

### C. Iniciar o projeto

```cmd
cd backend
npm run dev
```

```cmd
cd frontend
npm run dev
```

---

## 3️⃣ Solução Completa (Com Redis)

Se quer usar Redis completamente:

### Opção A: Redis Windows (Native)

**❌ Redis não tem versão official para Windows**

Alternativas:
1. **WSL 2** (Windows Subsystem for Linux) - Recomendado
2. **Docker** 
3. **Memurai** (fork mantido do Redis para Windows)

### Opção B: WSL 2 + Redis (Recomendado)

Instruções completas em: [QUICKSTART_WINDOWS.md](QUICKSTART_WINDOWS.md#redis-setup)

**Passos rápidos:**

```powershell
# 1. Instalar WSL 2 (se não tiver)
wsl --install
```

```bash
# 2. No terminal WSL, instalar Redis
sudo apt update
sudo apt install redis-server -y

# 3. Iniciar Redis
redis-server

# 4. Em outro terminal WSL, testar
redis-cli ping
# Resposta esperada: PONG
```

### Opção C: Docker

```cmd
# 1. Instalar Docker Desktop: https://www.docker.com/products/docker-desktop

# 2. Abrir PowerShell e rodar:
docker run -d -p 6379:6379 --name cmms-redis redis:7-alpine

# 3. Testar
docker ps
```

### Opção D: Memurai (Fork Windows)

```cmd
# Baixar em: https://github.com/microsoftarchive/redis/releases
# Instalador Windows direto
```

---

## 4️⃣ Erros Específicos e Soluções

### Erro: "connect ECONNREFUSED 127.0.0.1:6379"

**Causa:** Redis não está rodando

**Solução:**
```cmd
# Verificar se Redis está rodando
netstat -ano | findstr :6379

# Se não aparecer nada, Redis não está rodando

# Se quer rodar sem Redis (desenvolvimento):
# Apenas ignore o erro, o sistema vai funcionar com cache desabilitado
```

### Erro: "Database connection failed"

**Causa:** PostgreSQL não está rodando ou DATABASE_URL está errado

**Solução:**
```cmd
# 1. Verificar PostgreSQL
sc query PostgreSQL

# Se status = RUNNING, está OK
# Se não estiver, iniciar:
net start PostgreSQL

# 2. Verificar DATABASE_URL em backend\.env
# Deve ser algo como:
# DATABASE_URL=postgresql://postgres:senha@localhost:5432/cmms_enterprise
```

### Erro: "Migration failed"

**Causa:** PostgreSQL não tem banco de dados

**Solução:**
```cmd
# 1. Abrir pgAdmin (instalado com PostgreSQL)
# 2. Right-click em "Databases" > Create > Database
# 3. Nome: cmms_enterprise
# 4. Rodar novamente:
cd backend
npm run db:push
npm run db:seed
```

### Erro: "npm run db:push: command not found"

**Causa:** Dependências não instaladas

**Solução:**
```cmd
cd backend
npm install
npm run db:push
```

---

## 5️⃣ Configuração Recomendada por Tipo

### Desenvolvimento Local (Sem Redis)

```env
# backend\.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cmms_enterprise
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
PORT=3000
NODE_ENV=development
```

**Scripts:**
```cmd
cd backend && npm run dev
cd frontend && npm run dev
```

### Desenvolvimento Com Redis (WSL 2)

```env
# backend\.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cmms_enterprise
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
PORT=3000
NODE_ENV=development
```

**Scripts (3 terminais):**
```bash
# Terminal 1: Redis em WSL
wsl redis-server

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Desenvolvimento Com Docker

```env
# backend\.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cmms_enterprise
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
REDIS_PASSWORD=
PORT=3000
NODE_ENV=development
```

---

## 6️⃣ Verificação de Status

### Checar tudo está funcionando

```cmd
REM 1. Verificar Node.js
node --version
npm --version

REM 2. Verificar PostgreSQL
netstat -ano | findstr :5432
REM Deve aparecer: LISTENING

REM 3. Verificar Redis (opcional)
netstat -ano | findstr :6379
REM Se não aparecer, Redis não está rodando (OK para desenvolvimento)

REM 4. Fazer um teste de conexão
cd backend
npm run dev
REM Deve aparecer:
REM ✅ Database connected successfully
REM ✅ Socket.io initialized
REM 🚀 Server running on http://localhost:3000
```

---

## 7️⃣ Scripts de Ajuda

### Iniciar Tudo (recomendado)

No diretório raiz do projeto:
```cmd
scripts\start\start-all.bat
```

Isso inicia:
- Backend (localhost:3000)
- Frontend (localhost:5173)
- Abre automaticamente no navegador

### Migração Manual

```cmd
cd backend
node migrate-manual.bat
```

---

## 8️⃣ Resumo de Solução Rápida

```cmd
REM 1. Atualizar backend\.env com Redis config
REM (ver template em backend\.env.example)

REM 2. Garantir que PostgreSQL está rodando
sc query PostgreSQL

REM 3. Se PostgreSQL não está rodando:
net start PostgreSQL

REM 4. Rodar migrações
cd backend
npm install
npm run db:push
npm run db:seed

REM 5. Iniciar backend
npm run dev

REM Em outro terminal:
REM 6. Iniciar frontend
cd frontend
npm run dev
```

---

## 📞 Ainda com problemas?

Veja os guias completos:
- [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md)
- [WINDOWS_SETUP.md](WINDOWS_SETUP.md)
- [QUICKSTART_WINDOWS.md](QUICKSTART_WINDOWS.md)

Ou abra uma issue no repositório com:
- Screenshot do erro
- Conteúdo de `backend\.env` (remova senhas)
- Versão do Windows (`winver`)
- Versão do Node.js (`node --version`)
