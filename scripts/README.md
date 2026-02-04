# 🤖 Scripts - Manuten-o CMMS

Automação para setup, start, e database management.

## 📋 Índice

### Setup (Instalação)
**Pasta:** [`./setup/`](./setup/)

Automação completa de instalação (Node.js, npm, dependências, database).

```bash
# Linux/Mac
./setup/setup-local.sh

# Windows
setup\setup-local.bat         # ou
setup\setup-windows.bat
```

**Scripts inclusos:**
- `setup-local.sh` / `setup-local.bat` - Setup + dependencies
- `setup-windows.bat` / `setup-windows.ps1` - Setup Windows (instala Node.js se needed)
- `setup-database.sh` / `setup-database.bat` / `setup-database.ps1` - Só database
- `setup-complete.sh` / `setup-complete.bat` - Verificação final

---

### Start (Executar)
**Pasta:** [`./start/`](./start/)

Inicia backend + frontend.

```bash
# Windows (recomendado - menu interativo)
start\start-menu.bat

# Todos os plataformas
start\start-all.bat
```

---

### Database
**Pasta:** [`./database/`](./database/)

Files de database (SQL, migrations).

- `setup-database.sql` - Schema inicial (referência)

---

## ⚡ Quick Start

### Windows (Recomendado)
```batch
scripts\setup\setup-windows.bat
scripts\start\start-menu.bat
```

### Linux/Mac
```bash
chmod +x scripts/setup/setup-local.sh
./scripts/setup/setup-local.sh
./scripts/start/start-all.bat
```

---

## 📚 Documentação Adicional

- **Setup Guides:** [`/docs/GUIDES/`](../docs/GUIDES/)
- **Setup Detalhado:** [`/docs/SETUP/`](../docs/SETUP/)
- **Troubleshooting:** [`/docs/GUIDES/TROUBLESHOOTING.md`](../docs/GUIDES/TROUBLESHOOTING.md)

---

## 🔧 Environment Variables

Cria `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/manuten_o
NODE_ENV=development
JWT_SECRET=seu-secret-aqui
PORT=3001
```

Cria `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```
