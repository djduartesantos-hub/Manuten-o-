# 🚀 Quick Start - Manuten-o CMMS

Guia rápido para começar com a base de dados e o servidor.

## ⚡ Setup Completo em 3 Passos

### **Linux/macOS**

```bash
# 1. Dar permissão de execução
chmod +x setup-complete.sh

# 2. Executar setup (cria BD + migrações + seed)
./setup-complete.sh

# 3. Iniciar backend
cd backend && npm run dev
```

### **Windows**

```cmd
# 1. Executar setup (cria BD + migrações + seed)
setup-complete.bat

# 2. Iniciar backend
cd backend
npm run dev
```

---

## 📝 O que Faz o Setup Completo

O script `setup-complete.sh` (ou `.bat` no Windows) faz:

1. ✅ **Cria BD e Utilizador PostgreSQL**
   - Utilizador: `cmms_user`
   - BD: `cmms_enterprise`

2. ✅ **Configura .env**
   - DATABASE_URL com credenciais
   - JWT secrets
   - Variáveis de ambiente

3. ✅ **Instala Dependências**
   - `npm install` no backend

4. ✅ **Executa Migrações Drizzle**
   - Cria todas as 17 tabelas
   - Índices e constraints

5. ✅ **Popula Dados de Demo**
   - Admin user
   - Tenant, Plant, Assets

---

## 🔑 Credenciais Padrão

### **Database**
```
Host:     localhost
Port:     5432
Database: cmms_enterprise
User:     cmms_user
Password: cmms_password
```

### **Demo Login**
```
Email:    admin@cmms.com
Password: Admin@123456
Tenant:   cmms-demo
```

---

## 🌐 Próximos Passos

### **1. Backend Running**
```bash
cd backend
npm run dev
```
→ Roda em `http://localhost:3000`

### **2. Frontend Running (novo terminal)**
```bash
cd frontend
npm install
npm run dev
```
→ Roda em `http://localhost:5173`

### **3. Fazer Login**
- Abrir: http://localhost:5173
- Email: `admin@cmms.com`
- Password: `Admin@123456`

---

## ❌ Se Dar Erro "relation 'tenants' does not exist"

Significa que as migrações não foram executadas. **Solução:**

```bash
cd backend
npm run db:migrate
npm run db:seed
```

Depois, volte a fazer login.

---

## 🔧 Customizar Setup

### **Com Credenciais Diferentes**

**Linux/macOS:**
```bash
./setup-complete.sh meu_user minha_senha minha_bd localhost 5432
```

**Windows:**
```cmd
setup-complete.bat meu_user minha_senha minha_bd localhost 5432
```

---

## 📚 Alternativas

Se preferir fazer manualmente:

### **Opção 1: Só criar BD (sem migrações)**
```bash
./setup-database.sh
```

### **Opção 2: Só executar migrações (BD já existe)**
```bash
cd backend
npm run db:migrate
npm run db:seed
npm run dev
```

### **Opção 3: Importar SQL manual**
```bash
psql -U postgres -f setup-database.sql
```

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| "PostgreSQL not found" | Instalar PostgreSQL e reiniciar |
| "relation 'tenants' does not exist" | Executar `npm run db:migrate` |
| "Connection refused" | Verificar se PostgreSQL está a correr |
| "User already exists" | Usar credenciais diferentes ou `DROP USER` |

---

## 📁 Ficheiros Importantes

| Ficheiro | Propósito |
|----------|-----------|
| `setup-complete.sh` | Setup completo (Linux/macOS) |
| `setup-complete.bat` | Setup completo (Windows) |
| `setup-database.sh` | Só criar BD (Linux/macOS) |
| `setup-database.bat` | Só criar BD (Windows) |
| `setup-database.sql` | SQL manual |
| `backend/drizzle.config.ts` | Config do Drizzle |

---

## 🎯 Em Resumo

1. **Rodar**: `./setup-complete.sh` (ou `.bat` no Windows)
2. **Esperar** que termine (2-3 minutos)
3. **Iniciar**: `cd backend && npm run dev`
4. **Abrir**: http://localhost:5173
5. **Login**: admin@cmms.com / Admin@123456

**Pronto!** 🎉

---

**Versão:** 1.2.1  
**Atualizado:** 2026-01-29
