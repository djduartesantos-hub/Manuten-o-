# 🔧 Setup & Configuration - Manuten-o CMMS

Documentação detalhada para configuração inicial, banco de dados e ambiente.

## 📋 Índice

### Configuração Local
- **[SETUP_LOCAL.md](./SETUP_LOCAL.md)** - Setup passo-a-passo (Linux/Mac)
- **[WINDOWS_SETUP.md](./WINDOWS_SETUP.md)** - Setup passo-a-passo (Windows)

### Database
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - PostgreSQL setup e migrations
- **[WINDOWS_DATABASE_SETUP.md](./WINDOWS_DATABASE_SETUP.md)** - PostgreSQL setup (Windows)
- **[setup-database.sql](./setup-database.sql)** - SQL inicial (referência)

---

## 🚀 Começar

1. Vê o guia rápido: [`/docs/GUIDES`](../GUIDES/)
2. Depois segue o setup completo aqui
3. Se houver problemas: [`/docs/GUIDES/TROUBLESHOOTING.md`](../GUIDES/TROUBLESHOOTING.md)

---

## 📦 Pré-requisitos

- **Node.js 18+**
- **PostgreSQL 14+**
- **Git**
- **npm ou yarn**

---

## 🤖 Automatizado

Para setup totalmente automatizado:
```bash
cd scripts/setup
./setup-local.sh      # Linux/Mac
setup-local.bat       # Windows
```

Vê [`/scripts`](../../scripts/) para mais detalhes.
