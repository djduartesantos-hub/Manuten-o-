🪟 # CMMS Enterprise - Windows Quick Start

**Guia rápido para rodar o projeto em Windows**

---

## ⚡ 3 Passos Rápidos

### 1️⃣ Pré-requisitos
- [ ] Node.js 18+ → https://nodejs.org/
- [ ] PostgreSQL 12+ → https://postgresql.org/download/windows/
- [ ] Git (opcional) → https://git-scm.com/download/win

### 2️⃣ Executar Setup
Duplo-clique em: **`setup-windows.bat`**

_Isto vai instalar todas as dependências automaticamente._

### 3️⃣ Configurar Banco de Dados
1. Abra `backend\.env` em um editor
2. Altere `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/cmms_enterprise
   ```
   *(Use a senha que definiu no PostgreSQL)*

---

## 🚀 Rodar o Projeto

### Opção A: Automático (Recomendado)
Duplo-clique em: **`start-all.bat`**

- Abre 2 terminais automáticamente
- Abre o navegador em http://localhost:5173/t/demo/login
- Acesso (username ou email): **`admin`** ou **`admin@cmms.com`** / **`Admin@123456`** (URL: `/t/demo/login`)
- Técnico (demo): **`tech`** ou **`tech@cmms.com`** / **`Tech@123456`**

### Opção B: Manual
Abra **2 terminais** separados:

**Terminal 1 - Backend:**
```cmd
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```cmd
cd frontend
npm run dev
```

Depois acesse: http://localhost:5173/t/demo/login

---

## 🔧 Próximas Ações

✅ **Projeto está rodando!**

Agora você pode:
- [ ] Fazer login com as credenciais demo
- [ ] Explorar o sistema
- [ ] Consultar [DEVELOPMENT.md](./DEVELOPMENT.md) para mais detalhes
- [ ] Ler [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md) se tiver problemas

---

## 📍 URLs Importantes

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Frontend | http://localhost:5173 | Aplicação React |
| Backend | http://localhost:3000 | API Express |
| Database | localhost:5432 | PostgreSQL |

---

## 🆘 Problemas?

Consulte: [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md)

Problemas comuns:
- ❌ "Node.js not found" → Reinstale Node.js
- ❌ "PostgreSQL not found" → Reinstale PostgreSQL e adicione ao PATH
- ❌ "Port already in use" → Feche outro processo na mesma porta
- ❌ "Cannot connect to database" → Verifique DATABASE_URL em .env

---

## 📚 Documentação Completa

- [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) - Setup detalhado
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Desenvolvimento
- [README.md](./README.md) - Visão geral do projeto

---

**Pronto! Comece a desenvolver! 🎉**
