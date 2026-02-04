# 🪟 Windows - Guia Rápido em Português

## ⚡ TL;DR (Muito Rápido)

```cmd
# 1. Clone/extraia o projeto
cd Manuten-o-

# 2. Rode o startup inteligente
scripts\start\start-smart.bat

# 3. Pronto!
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

Se der erro, veja abaixo.

---

## ❌ "ECONNREFUSED 6379" (Redis)

Redis não está rodando. **Não é obrigatório em desenvolvimento.**

**Solução rápida (recomendada):**
- Ignore o erro, continua funcionando normalmente

**Se quiser usar Redis:**

WSL 2:
```bash
wsl
sudo apt install redis-server
redis-server
```

Docker:
```cmd
docker run -d -p 6379:6379 redis:7-alpine
```

---

## ❌ "ECONNREFUSED 5432" (PostgreSQL)

PostgreSQL não está rodando. **Isso SIM é obrigatório.**

**Solução:**
```cmd
# 1. Abrir "Serviços" do Windows
services.msc

# 2. Procurar por "PostgreSQL"

# 3. Se estiver parado:
#    Right-click > Iniciar

# 4. Ou pelo comando:
net start PostgreSQL
```

---

## ❌ "Database does not exist"

Banco de dados ainda não foi criado.

**Solução via pgAdmin (mais fácil):**
1. Procure pgAdmin no Menu Iniciar
2. Right-click em "Databases"
3. Click "Create" > "Database"
4. Nome: `cmms_enterprise`
5. Click "Save"

**Ou pelo comando:**
```cmd
psql -U postgres -h localhost
CREATE DATABASE cmms_enterprise;
\q
```

---

## ❌ "Migration failed"

Migração do banco de dados falhou.

**Solução:**
```cmd
cd backend

# 1. Garantir que PostgreSQL está rodando
net start PostgreSQL

# 2. Garantir que banco existe (criar se necessário)
psql -U postgres -h localhost -c "CREATE DATABASE cmms_enterprise;"

# 3. Tentar novamente
npm run db:migrate
npm run db:seed

# 4. Se ainda falhar:
npm run dev
# Backend vai mostrar o erro específico
```

---

## ❌ "Port 3000 already in use"

Outra aplicação está usando a porta 3000.

**Solução:**
```cmd
# 1. Encontrar qual processo
netstat -ano | findstr :3000

# 2. Matar o processo (substituir XXXX pelo número da coluna PID)
taskkill /PID XXXX /F

# 3. Ou mudar porta em backend\.env
notepad backend\.env
# Mude: PORT=3000 para PORT=3001
```

---

## ✅ Pré-requisitos

Verificar que tem instalado:

```cmd
# Node.js (v18 ou superior)
node --version

# npm
npm --version

# PostgreSQL
psql --version
```

Se falta algum:
- Node.js: https://nodejs.org/ (LTS)
- PostgreSQL: https://www.postgresql.org/download/windows/

---

## 🚀 Setup Completo do Zero

```cmd
REM 1. Clonar ou extrair projeto
REM    (você já fez isso)

REM 2. Ir para diretório principal
cd Manuten-o-

REM 3. Backend
cd backend
npm install
copy .env.example .env
notepad .env
REM Editar DATABASE_URL se necessário

REM 4. Garantir PostgreSQL
net start PostgreSQL

REM 5. Migrations
npm run db:migrate
npm run db:seed

REM 6. Frontend
cd ..\frontend
npm install

REM 7. Voltar ao root e rodar startup inteligente
cd ..
scripts\start\start-smart.bat
```

---

## 🔍 Verificar Status

```cmd
REM Tudo funcionando?

REM 1. Node.js
node -v

REM 2. PostgreSQL rodando
netstat -ano | findstr :5432

REM 3. Redis (opcional, pode não aparecer)
netstat -ano | findstr :6379

REM 4. Se tudo aparecer = OK!
```

---

## 📖 Guias Completos

Se os passos acima não resolvem:

1. **Referência Rápida:** `docs/GUIDES/WINDOWS_QUICK_FIXES.md`
2. **Redis Completo:** `docs/GUIDES/WINDOWS_REDIS_MIGRATION_FIX.md`
3. **Troubleshooting:** `docs/GUIDES/WINDOWS_TROUBLESHOOTING.md`
4. **Setup Passo a Passo:** `docs/GUIDES/WINDOWS_SETUP.md`
5. **Quick Start:** `docs/GUIDES/QUICKSTART_WINDOWS.md`

---

## 🎯 Resumo

| Problema | Solução |
|----------|---------|
| Redis error | Ignore (opcional) |
| PostgreSQL error | Iniciar serviço PostgreSQL |
| Database not found | Criar em pgAdmin ou psql |
| Migration failed | Rodar novamente após DB criada |
| Port in use | Matar processo ou mudar porta |
| Dependencies missing | `npm install` |

---

## 💡 Dicas

1. **Deixe as 3 janelas abertas:**
   - Windows Services (PostgreSQL)
   - Command Prompt (Backend)
   - Command Prompt (Frontend)

2. **Ctrl+C para parar:**
   - Backend ou Frontend
   - Digitar `Ctrl+C` no terminal

3. **Reiniciar tudo:**
   - Fechar todas as janelas
   - Rodar `scripts\start\start-smart.bat` novamente

4. **Logs:**
   - Backend mostra erros em sua janela
   - Frontend mostra erros em sua janela
   - Copiar erro completo para guias

---

**Última atualização:** 4 de Fevereiro de 2026
**Compatível com:** Windows 10/11, Node.js 18+, PostgreSQL 12+
