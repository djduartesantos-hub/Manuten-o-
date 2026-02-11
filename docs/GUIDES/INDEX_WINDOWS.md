# 🗺️ Índice de Documentação Windows

## 🚀 Comece Aqui

Se está com problema no Windows, abra **um destes** dependendo do seu caso:

### 1️⃣ Muito Rápido (2 min) - Português
📄 **[WINDOWS_PT_QUICK.md](docs/GUIDES/WINDOWS_PT_QUICK.md)**
- ⚡ TL;DR (muito rápido)
- Erros mais comuns + soluções
- Tabela de referência
- Dicas práticas

### 2️⃣ Rápido (5 min) - Error Specific
📄 **[WINDOWS_QUICK_FIXES.md](docs/GUIDES/WINDOWS_QUICK_FIXES.md)**
- Checklist de erros comuns
- Solução imediata para cada um
- Tabela de status
- Setup do zero

### 3️⃣ Redis Específico (15 min)
📄 **[WINDOWS_REDIS_MIGRATION_FIX.md](docs/GUIDES/WINDOWS_REDIS_MIGRATION_FIX.md)**
- O que é Redis?
- Solução sem Redis (dev)
- Solução com Redis (WSL 2, Docker, etc)
- Configuração recomendada
- 900+ linhas de guia

### 4️⃣ Completo (30 min)
📄 **[WINDOWS_SETUP.md](docs/GUIDES/WINDOWS_SETUP.md)**
- Setup passo a passo
- Verificação de tudo
- Database setup
- Troubleshooting completo

### 5️⃣ Troubleshooting Geral
📄 **[WINDOWS_TROUBLESHOOTING.md](docs/GUIDES/WINDOWS_TROUBLESHOOTING.md)**
- 14+ problemas comuns
- Diagnóstico passo a passo
- Port management
- Permissões

### 6️⃣ Quick Start (3 min)
📄 **[QUICKSTART_WINDOWS.md](docs/GUIDES/QUICKSTART_WINDOWS.md)**
- Iniciar em 3 passos
- Mínimo de config
- Links para troubleshooting

---

## 📁 Arquivos de Referência

### Scripts Disponíveis

```
scripts/start/
├── start-smart.bat ⭐ NOVO - Recomendado
├── start-smart.ps1 ⭐ NOVO - PowerShell
├── start-all.bat    - Original
├── start-menu.bat   - Menu interativo
└── README.md        - Instruções

Uso recomendado:
scripts\start\start-smart.bat
```

### Configuração

```
backend/
├── .env.example ✅ ATUALIZADO - Tem Redis config
├── migrate-manual.bat ✅ MELHORADO - Valida deps
└── src/server.ts ✅ MELHORADO - Trata erro Redis
```

### Documentação

```
docs/
├── WINDOWS_SUPPORT_SUMMARY.md ✅ NOVO
├── GUIDES/
│   ├── WINDOWS_PT_QUICK.md ⭐ NOVO - Português
│   ├── WINDOWS_QUICK_FIXES.md ✅ NOVO
│   ├── WINDOWS_REDIS_MIGRATION_FIX.md ✅ NOVO
│   ├── WINDOWS_TROUBLESHOOTING.md
│   ├── WINDOWS_SETUP.md
│   ├── QUICKSTART_WINDOWS.md
│   └── README.md
└── DEPLOYMENT/
    └── WINDOWS_AUTOMATION_TECHNICAL.md

Raiz do projeto:
└── WINDOWS_FIXES_README.md ✅ NOVO
```

---

## 🎯 Por Tipo de Problema

### Redis Error ("ECONNREFUSED 6379")
1. **Rápido (2 min):** [WINDOWS_PT_QUICK.md](docs/GUIDES/WINDOWS_PT_QUICK.md) → Buscar "Redis"
2. **Completo:** [WINDOWS_REDIS_MIGRATION_FIX.md](docs/GUIDES/WINDOWS_REDIS_MIGRATION_FIX.md) → Solução Rápida
3. **Avançado:** Mesma doc → Solução Completa

### PostgreSQL Error ("ECONNREFUSED 5432")
1. **Rápido:** [WINDOWS_PT_QUICK.md](docs/GUIDES/WINDOWS_PT_QUICK.md) → Buscar "PostgreSQL"
2. **Completo:** [WINDOWS_QUICK_FIXES.md](docs/GUIDES/WINDOWS_QUICK_FIXES.md) → "ECONNREFUSED 5432"
3. **Detalhe:** [WINDOWS_TROUBLESHOOTING.md](docs/GUIDES/WINDOWS_TROUBLESHOOTING.md) → "PostgreSQL not found"

### Migration Falhou
1. **Rápido:** [WINDOWS_QUICK_FIXES.md](docs/GUIDES/WINDOWS_QUICK_FIXES.md) → "Drizzle migration failed"
2. **Completo:** [WINDOWS_SETUP.md](docs/GUIDES/WINDOWS_SETUP.md) → Database Setup section
3. **Troubleshooting:** [WINDOWS_TROUBLESHOOTING.md](docs/GUIDES/WINDOWS_TROUBLESHOOTING.md)

### Port já em uso
1. **Rápido:** [WINDOWS_PT_QUICK.md](docs/GUIDES/WINDOWS_PT_QUICK.md) → Buscar "Port"
2. **Referência:** [WINDOWS_QUICK_FIXES.md](docs/GUIDES/WINDOWS_QUICK_FIXES.md) → "Port already in use"

### Dependências Faltando
1. **Setup:** [WINDOWS_SETUP.md](docs/GUIDES/WINDOWS_SETUP.md) → Pre-requisites
2. **Quick:** [QUICKSTART_WINDOWS.md](docs/GUIDES/QUICKSTART_WINDOWS.md) → Requirements

---

## 🔍 Como Usar Este Índice

### Cenário 1: Estou com erro agora
```
1. Vá para: docs/GUIDES/WINDOWS_PT_QUICK.md
2. Procure seu erro na lista
3. Siga a solução
```

### Cenário 2: Estou fazendo setup do zero
```
1. Vá para: docs/GUIDES/QUICKSTART_WINDOWS.md
2. Siga os 3 passos
3. Se der erro, use cenário 1
```

### Cenário 3: Quero instalar Redis
```
1. Vá para: docs/GUIDES/WINDOWS_REDIS_MIGRATION_FIX.md
2. Vá para: "Solução Completa (Com Redis)"
3. Escolha WSL 2, Docker ou Memurai
```

### Cenário 4: Não achei meu problema
```
1. Vá para: docs/GUIDES/WINDOWS_TROUBLESHOOTING.md
2. Procure tema semelhante
3. Siga os passos de diagnóstico
```

---

## ✅ Checklist Rápida

Antes de procurar documentação, verificar:

```cmd
REM ✅ Node.js instalado?
node --version

REM ✅ npm instalado?
npm --version

REM ✅ PostgreSQL rodando?
netstat -ano | findstr :5432

REM ✅ Redis rodando? (opcional)
netstat -ano | findstr :6379

REM ✅ Backend/.env existe?
dir backend\.env
```

---

## 🚀 Comandos Rápidos

```cmd
REM Startup automático (recomendado)
scripts\start\start-smart.bat

REM Backend apenas
cd backend && npm run dev

REM Frontend apenas
cd frontend && npm run dev

REM Migrations
cd backend && npm run db:push && npm run db:seed

REM PostgreSQL iniciar (Windows)
net start PostgreSQL

REM Redis iniciar (WSL 2)
wsl redis-server

REM Redis iniciar (Docker)
docker run -d -p 6379:6379 redis:7-alpine
```

---

## 📊 Estatísticas

| Item | Quantidade |
|------|-----------|
| Scripts Windows | 5 |
| Guias Documentação | 9 |
| Novos Arquivos | 4 |
| Arquivos Atualizados | 3 |
| Problemas Cobertos | 20+ |
| Linhas de Documentação | 3000+ |

---

## 🎓 Exemplos de Solução

### Exemplo 1: Redis Error
```
❌ Erro: connect ECONNREFUSED 127.0.0.1:6379

📖 Abra: docs/GUIDES/WINDOWS_PT_QUICK.md
🔍 Procure: "ECONNREFUSED 6379 (Redis)"
✅ Solução: Ignorar (opcional) ou instalar Redis
```

### Exemplo 2: PostgreSQL Error
```
❌ Erro: connect ECONNREFUSED 127.0.0.1:5432

📖 Abra: docs/GUIDES/WINDOWS_PT_QUICK.md
🔍 Procure: "ECONNREFUSED 5432 (PostgreSQL)"
✅ Solução: net start PostgreSQL
```

### Exemplo 3: Setup do Zero
```
❌ Não sabe por onde começar

📖 Abra: docs/GUIDES/QUICKSTART_WINDOWS.md
✅ Siga os 3 passos
📖 Se der erro, use docs/GUIDES/WINDOWS_PT_QUICK.md
```

---

## 🎯 Resumo Final

| Situação | O que fazer |
|----------|------------|
| Primeiro setup | → QUICKSTART_WINDOWS.md |
| Erro imediato | → WINDOWS_PT_QUICK.md |
| Quer Redis | → WINDOWS_REDIS_MIGRATION_FIX.md |
| Troubleshooting | → WINDOWS_TROUBLESHOOTING.md |
| Setup completo | → WINDOWS_SETUP.md |
| Referência rápida | → WINDOWS_QUICK_FIXES.md |

---

**Última atualização:** 4 de Fevereiro de 2026
**Status:** ✅ Documentação Completa
**Navegação:** Use este índice para encontrar rápido
