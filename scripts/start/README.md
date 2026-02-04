# 🚀 Start Scripts - Manuten-o CMMS

Scripts para iniciar a aplicação (backend + frontend).

## 📋 Opções

### Windows - Menu Interativo (RECOMENDADO ⭐)
```batch
start-menu.bat
```

Menu com opções:
- Start Backend
- Start Frontend
- Start Both
- View Logs
- etc.

---

### Start Both
```batch
# Windows
start-all.bat

# Linux/Mac (coming soon)
./start-all.sh
```

Inicia simultaneamente:
- Backend (port 3001)
- Frontend (port 5173)

---

### Start Backend Only
```batch
cd backend
npm run dev
```

---

### Start Frontend Only
```batch
cd frontend
npm run dev
```

---

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
