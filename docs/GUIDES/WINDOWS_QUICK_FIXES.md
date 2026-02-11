# 🪟 Windows: Checklist Rápida de Problemas

## Erro: "ECONNREFUSED 127.0.0.1:6379" (Redis)

```
❌ Problem: connect ECONNREFUSED 127.0.0.1:6379
✅ Solution: Redis é opcional em desenvolvimento
```

**Opção 1: Ignorar (Recomendado para dev)**
```cmd
# Continuar normalmente, Redis vai ser ignorado
npm run dev
```

**Opção 2: Instalar Redis**
```cmd
# WSL 2 (Melhor)
wsl
sudo apt install redis-server
redis-server

# Ou Docker
docker run -d -p 6379:6379 redis:7-alpine
```

**Opção 3: Customizar conexão**
```env
# backend\.env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## Erro: "connect ECONNREFUSED 127.0.0.1:5432" (PostgreSQL)

```
❌ Problem: Database connection failed
✅ Solution: PostgreSQL não está rodando
```

```cmd
# 1. Verificar se está rodando
netstat -ano | findstr :5432

# 2. Se não aparecer, iniciar:
# Windows Services > PostgreSQL > Start
services.msc

# 3. Ou iniciar via comando
net start PostgreSQL

# 4. Testar conexão
psql -U postgres -h localhost
```

---

## Erro: "Database does not exist"

```
❌ Problem: database "cmms_enterprise" does not exist
✅ Solution: Criar banco de dados
```

**Opção 1: pgAdmin (GUI)**
```
1. Abrir pgAdmin
2. Right-click "Databases"
3. Create > Database
4. Nome: cmms_enterprise
5. Click Save
```

**Opção 2: psql (Command line)**
```cmd
psql -U postgres -h localhost
CREATE DATABASE cmms_enterprise;
\q
```

**Opção 3: Environment setup**
```cmd
# Verificar DATABASE_URL
cat backend\.env | findstr DATABASE_URL

# Deve ser algo como:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/cmms_enterprise
```

---

## Erro: "Drizzle migration failed"

```
❌ Problem: Migrations failed to run
✅ Solution: Garantir que PostgreSQL tem banco de dados criado
```

```cmd
cd backend

# 1. Verificar .env
type .env | findstr DATABASE_URL

# 2. Criar banco de dados (se necessário)
psql -U postgres -h localhost -c "CREATE DATABASE cmms_enterprise;"

# 3. Rodar migrações novamente
npm run db:push

# 4. Se ainda falhar, verificar permissões
# ou usar pgAdmin para criar manualmente
```

---

## Erro: "Cannot find module" ou "npm: command not found"

```
❌ Problem: npm ou module não encontrado
✅ Solution: Reinstalar ou atualizar PATH
```

```cmd
# 1. Verificar se npm está instalado
npm --version
node --version

# 2. Se não aparecer, reinstalar Node.js
# https://nodejs.org/ (LTS)

# 3. Fechar e reabrir terminal

# 4. Instalar dependências novamente
cd backend
npm install
```

---

## Erro: "Port 3000 already in use"

```
❌ Problem: EADDRINUSE: address already in use :::3000
✅ Solution: Matar processo que está usando a porta
```

```cmd
# 1. Encontrar processo
netstat -ano | findstr :3000

# 2. Ver PID (número na última coluna)
# 3. Matar processo
taskkill /PID <NUMERO> /F

# 4. Ou mudar porta em backend\.env
PORT=3001
```

---

## Setup Rápido do Zero

```cmd
REM 1. Clonar/extrair projeto
REM 2. Abrir Command Prompt

REM 3. Garantir que Node.js está instalado
node --version
npm --version

REM 4. Ir para backend
cd backend

REM 5. Instalar dependências
npm install

REM 6. Criar .env a partir do template
copy .env.example .env

REM 7. Editar .env com suas credenciais PostgreSQL
notepad .env

REM 8. Garantir que PostgreSQL está rodando
net start PostgreSQL

REM 9. Rodar migrações
npm run db:push
npm run db:seed

REM 10. Iniciar backend
npm run dev

REM Em outro terminal:
REM 11. Ir para frontend
cd frontend
npm install
npm run dev

REM 12. Acessar http://localhost:5173
```

---

## Verificação de Status

```cmd
REM Tudo ok?

REM 1. Node.js
node --version
npm --version

REM 2. PostgreSQL
netstat -ano | findstr :5432
REM Deve aparecer LISTENING

REM 3. Redis (opcional)
netstat -ano | findstr :6379
REM Pode aparecer ou não (ok se não estiver)

REM 4. Backend rodando
netstat -ano | findstr :3000
REM Deve aparecer LISTENING

REM 5. Frontend rodando
netstat -ano | findstr :5173
REM Deve aparecer LISTENING
```

---

## Resumo de Passos

| # | Ação | Comando |
|---|------|---------|
| 1 | Verificar Node | `node -v` |
| 2 | Instalar deps backend | `cd backend && npm install` |
| 3 | Criar .env | `copy .env.example .env` |
| 4 | Editar .env | `notepad .env` |
| 5 | Garantir PostgreSQL | `net start PostgreSQL` |
| 6 | Rodar migrations | `npm run db:push` |
| 7 | Seed dados | `npm run db:seed` |
| 8 | Instalar deps frontend | `cd ../frontend && npm install` |
| 9 | Iniciar tudo | `start-smart.bat` (no root) |

---

## Guias Completos

- 📖 [WINDOWS_REDIS_MIGRATION_FIX.md](WINDOWS_REDIS_MIGRATION_FIX.md)
- 📖 [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md)
- 📖 [QUICKSTART_WINDOWS.md](QUICKSTART_WINDOWS.md)
- 📖 [WINDOWS_SETUP.md](WINDOWS_SETUP.md)
