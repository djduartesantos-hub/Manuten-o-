# 🚀 Quick Start - Setup Inicial

Este guia mostra como configurar a base de dados do zero e fazer o primeiro login.

## 📋 Pré-requisitos

- PostgreSQL instalado e em execução
- Node.js v18+ instalado

## 🔧 Passo 1: Criar Base de Dados

### Opção A: Usando psql (Recomendado)

```bash
# 1. Aceder ao PostgreSQL
sudo -u postgres psql

# 2. Criar base de dados
CREATE DATABASE cmms_enterprise;

# 3. Sair
\q

# 4. Aplicar schema
psql -d cmms_enterprise -f scripts/database/setup-database.sql
```

### Opção B: linha de comando direta

```bash
sudo -u postgres psql -d postgres -c "CREATE DATABASE cmms_enterprise;"
sudo -u postgres psql -d cmms_enterprise -f scripts/database/setup-database.sql
```

## ✅ Passo 2: Verificar Setup

Após executar o script SQL, você deve ver:

```
 table_name | row_count
------------+-----------
 Plants     |         1
 Users      |         1
```

✅ **Superadmin criado automaticamente!**

## 🔐 Credenciais de Acesso

> Nota: o campo de login aceita **username ou email**.

```
Empresa:  demo
Login:    admin ou admin@cmms.com
Password: Admin@123456
Role:     superadmin
URL:      http://localhost:5173/t/demo/login

Técnico:  tech ou tech@cmms.com
Password: Tech@123456
```

## 🚀 Passo 3: Iniciar Aplicação

### Backend

```bash
cd backend
npm install
npm run dev
```

O backend estará em: http://localhost:3000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará em: http://localhost:5173
Login via slug: http://localhost:5173/t/demo/login

## 📊 Passo 4: Adicionar Dados Demonstrativos (Opcional)

1. Acesse http://localhost:5173/t/demo/login
2. Faça login com as credenciais acima
3. No menu superior, clique em **🔧 Setup BD**
4. Clique em **Adicionar Dados**

Isto irá criar:
- ✅ 2 utilizadores (Admin + Técnico)
- ✅ 1 fábrica
- ✅ 5 equipamentos
- ✅ 3 planos de manutenção
- ✅ 5 peças sobressalentes

## 🔄 Reset Completo (Opcional)

Se precisar recomeçar do zero:

```bash
# Apagar e recriar base de dados
sudo -u postgres psql -c "DROP DATABASE IF EXISTS cmms_enterprise;"
sudo -u postgres psql -c "CREATE DATABASE cmms_enterprise;"
sudo -u postgres psql -d cmms_enterprise -f scripts/database/setup-database.sql
```

Ou use a página **🔧 Setup BD** > **Limpar Tudo** (dentro da aplicação)

## 🆘 Problemas Comuns

### PostgreSQL não está a correr

```bash
# Linux
sudo systemctl start postgresql

# macOS
brew services start postgresql

# Windows
net start postgresql-x64-16
```

### Erro de autenticação PostgreSQL

Certifique-se que o `DATABASE_URL` no arquivo `backend/.env` está correto:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/cmms_enterprise
```

### Porta já em uso

- Backend (3000): Pare outros serviços na porta 3000
- Frontend (5173): Pare outros serviços na porta 5173

## 📚 Próximos Passos

- [Guia de Utilizador](../GUIDES/QUICKSTART.md)
- [Documentação Completa](../ARCHITECTURE/README.md)
- [Troubleshooting](../GUIDES/TROUBLESHOOTING.md)
