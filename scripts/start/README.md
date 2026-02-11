# 🚀 Start Scripts - Manuten-o CMMS

Scripts para iniciar a aplicação (backend + frontend) de forma fácil no Windows.

## ✅ Recomendado (Novo)

### Smart Startup (Com verificação de dependências)

**Batch:**
```cmd
start-smart.bat
```

**PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File start-smart.ps1
```

**Faz:**
- ✅ Verifica Node.js
- ✅ Verifica PostgreSQL
- ✅ Avisa se Redis não está rodando
- ✅ Cria `.env` se não existir
- ✅ Inicia backend em nova janela
- ✅ Inicia frontend em nova janela
- ✅ Abre navegador automaticamente

---

## 📋 Outras Opções

### Windows - Menu Interativo
```batch
start-menu.bat
```

Menu com opções:
- Setup
- Start Backend
- Start Frontend
- Start Both
- View Logs
- etc.

---

### Start Both (Original)
```batch
start-all.bat
```

Inicia simultaneamente:
- Backend (port 3000)
- Frontend (port 5173)

---

## 🔧 Uso Manual

### Start Backend Only
```cmd
cd backend
npm run dev
```

### Start Frontend Only
```cmd
cd frontend
npm run dev
```

---

## 📍 Ports Padrão

| Serviço | Port |
|---------|------|
| Backend | 3000 |
| Frontend | 5173 |
| PostgreSQL | 5432 |
| Redis | 6379 (opcional) |

---

## ❌ Troubleshooting

### PostgreSQL não está rodando

```cmd
# Abrir Windows Services
services.msc

# Procurar "PostgreSQL" > Start
```

### Redis não está rodando (aviso)

Redis é **opcional**. Projeto funciona sem ele em desenvolvimento.

Para usar Redis:
- **WSL 2:** `wsl && sudo apt install redis-server`
- **Docker:** `docker run -d -p 6379:6379 redis:7-alpine`

### Backend não inicia

```cmd
cd backend
npm install
npm run db:push
npm run dev
```

---

## 📚 Mais Informações

- [WINDOWS_REDIS_MIGRATION_FIX.md](../GUIDES/WINDOWS_REDIS_MIGRATION_FIX.md) - Guia completo de Redis e migrações
- [QUICKSTART_WINDOWS.md](../GUIDES/QUICKSTART_WINDOWS.md) - Começar rápido
- [WINDOWS_TROUBLESHOOTING.md](../GUIDES/WINDOWS_TROUBLESHOOTING.md) - Resolver problemas

## 📊 URLs

- **Backend API:** http://localhost:3001
- **Frontend:** http://localhost:5173

---

## 🐛 Troubleshooting

Se houver erros:

1. Vê [`/docs/GUIDES/TROUBLESHOOTING.md`](../../docs/GUIDES/TROUBLESHOOTING.md)
2. Verifica `/scripts/database/` se problema é database
3. Verifica `.env` files

---

## 📝 Logs

- Backend: `backend/logs/` (se configured)
- Frontend: Console do browser
- Menu script mostra logs em tempo real
