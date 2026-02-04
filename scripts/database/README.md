# 📊 Database Scripts - Manuten-o CMMS

Files e documentação para setup e management de database.

## 📋 Conteúdo

- **setup-database.sql** - Schema inicial (referência)
  - Tabelas base
  - Relações
  - Constraints

---

## 🔧 Database Setup

### Automático (RECOMENDADO)
```bash
# Linux/Mac
../setup/setup-database.sh

# Windows
..\setup\setup-database.bat
```

### Manual
Vê [`/docs/SETUP/DATABASE_SETUP.md`](../../docs/SETUP/DATABASE_SETUP.md)

---

## 📚 Migrations

Com Drizzle ORM (no backend):
```bash
cd backend
npm run db:migrate
npm run db:seed
```

---

## 🐛 Troubleshooting

Vê [`/docs/GUIDES/TROUBLESHOOTING.md`](../../docs/GUIDES/TROUBLESHOOTING.md)

---

## 📖 Documentação

- **DATABASE_SETUP.md:** [`/docs/SETUP/DATABASE_SETUP.md`](../../docs/SETUP/DATABASE_SETUP.md)
- **PROJECT_STRUCTURE.md:** [`/docs/ARCHITECTURE/PROJECT_STRUCTURE.md`](../../docs/ARCHITECTURE/PROJECT_STRUCTURE.md)
