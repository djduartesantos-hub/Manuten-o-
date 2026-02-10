# 🚀 Setup Local - Manuten-o CMMS

Scripts de setup automático para configurar o projeto localmente.

## 📋 Por Sistema Operativo

### 🐧 Linux / macOS
```bash
chmod +x setup-local.sh
./setup-local.sh
```

### 🪟 Windows
```cmd
setup-local.bat
```

## ✅ O que o script faz

1. ✅ Verifica/instala PostgreSQL
2. ✅ Inicia o serviço PostgreSQL
3. ✅ Cria base de dados e utilizador
4. ✅ Configura `backend/.env` com credenciais
5. ✅ Instala dependências do backend
6. ✅ Executa migrations (`npm run db:migrate`)
7. ✅ Popula dados demo (`npm run db:seed`)
8. ✅ Instala dependências do frontend

## 🎯 Após o setup

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

Será iniciado em: **http://localhost:3000**
API base: **http://localhost:3000/api/t**

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Será iniciado em: **http://localhost:5173**

## 🔐 Credenciais Demo

| Campo | Valor |
|-------|-------|
| **Tenant** | `demo` |
| **Login (username ou email)** | `admin` ou `admin@cmms.com` |
| **Password** | `Admin@123456` |
| **Técnico (demo)** | `tech` ou `tech@cmms.com` |
| **Password (técnico)** | `Tech@123456` |

## 💾 Base de Dados

| Propriedade | Valor |
|------------|-------|
| **Utilizador** | `cmms_user` |
| **Senha** | `cmms_password` |
| **Base de dados** | `cmms_enterprise` |
| **Host** | `localhost` |
| **Porta** | `5432` |

> **Nota**: Pode editar estas credenciais no script antes de executar.

## 🐛 Troubleshooting

### PostgreSQL não inicia
**Linux:**
```bash
sudo service postgresql start
# ou
sudo systemctl start postgresql
```

**macOS:**
```bash
brew services start postgresql
```

**Windows:**
```cmd
net start postgresql-x64-16
```

### Erro de conexão à base de dados
Verifique o `backend/.env`:
```bash
cat backend/.env
```

Certifique-se de que o `DATABASE_URL` está correto.

### Porta 5432 em uso
Altere a porta em `backend/.env` e execute novamente as migrations:
```bash
DATABASE_URL=postgresql://cmms_user:cmms_password@localhost:5433/cmms_enterprise
npm run db:migrate
```

### Permissões negadas (Linux)
Se receber erro de permissões:
```bash
sudo chmod +x setup-local.sh
sudo ./setup-local.sh
```

## 🔄 Reiniciar do zero

Se precisar limpar tudo:

**Linux/macOS:**
```bash
sudo -u postgres dropdb cmms_enterprise
sudo -u postgres dropuser cmms_user
./setup-local.sh
```

**Windows:**
```cmd
psql -U postgres -c "DROP DATABASE cmms_enterprise;"
psql -U postgres -c "DROP USER cmms_user;"
setup-local.bat
```

## 📖 Próximos passos

1. Abra **http://localhost:5173** no navegador
2. Faça login com as credenciais demo acima
3. Explore o dashboard

Para mais informações, veja [README.md](./README.md) e [DOCUMENTATION.md](./DOCUMENTATION.md).
