# 🗄️ Configuração da Base de Dados - Manuten-o CMMS

## 🚀 Opções de Setup

Existem 3 formas de criar a base de dados:

### **Opção 1: Script Automático (Recomendado)** ⭐

```bash
chmod +x setup-database.sh
./setup-database.sh
```

**Parâmetros opcionais:**
```bash
./setup-database.sh [DB_USER] [DB_PASSWORD] [DB_NAME] [DB_HOST] [DB_PORT]

# Exemplo com customização
./setup-database.sh meu_user minhasenha minha_bd localhost 5432
```

**O que faz:**
- ✅ Instala PostgreSQL (se necessário)
- ✅ Inicia o serviço PostgreSQL
- ✅ Cria o utilizador e base de dados
- ✅ Configura ficheiro `.env`
- ✅ Testa a ligação à BD
- ✅ Mostra próximos passos

---

### **Opção 2: Script SQL Manual**

Use este método se preferir controlo total ou estiver usando uma BD remota.

#### **Passo 1: Preparar ligação** 

```bash
# Conectar-se ao PostgreSQL como admin
psql -h localhost -U postgres

# Ou, se estiver num Docker/container
docker exec -it postgres_container psql -U postgres
```

#### **Passo 2: Executar o SQL**

```bash
# Dentro do psql:
\i setup-database.sql

# Ou, desde a linha de comando:
psql -h localhost -U postgres -f setup-database.sql

# Ou, usando um utilizador existente:
psql -h localhost -U cmms_user -d cmms_enterprise -f setup-database.sql
```

#### **Passo 3: Verificar criação**

```sql
-- Ver todas as tabelas criadas
\dt

-- Contar registos em cada tabela
SELECT 'tenants' AS table_name, COUNT(*) FROM tenants
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'plants', COUNT(*) FROM plants
UNION ALL
SELECT 'assets', COUNT(*) FROM assets;
```

---

### **Opção 3: Comandos SQL Individuais**

Se o ficheiro SQL não funcionar, execute passo a passo:

```bash
# Ligação ao PostgreSQL
psql -h localhost -U postgres

# Criar utilizador
CREATE USER cmms_user WITH ENCRYPTED PASSWORD 'cmms_password';

# Criar base de dados
CREATE DATABASE cmms_enterprise OWNER cmms_user;

# Sair
\q
```

---

## 📋 Credenciais Padrão

| Parâmetro | Padrão | Personalizável |
|-----------|--------|-----------------|
| **DB_USER** | `cmms_user` | Sim |
| **DB_PASSWORD** | `cmms_password` | Sim |
| **DB_NAME** | `cmms_enterprise` | Sim |
| **DB_HOST** | `localhost` | Sim |
| **DB_PORT** | `5432` | Sim |

---

## 🔧 Configuração do `.env`

Após criar a BD, o ficheiro `backend/.env` deve conter:

```env
# Database Configuration
DATABASE_URL=postgresql://cmms_user:cmms_password@localhost:5432/cmms_enterprise

# JWT Configuration
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production

# Environment
NODE_ENV=development
PORT=3000

# Application
APP_NAME=Manuten-o CMMS
APP_VERSION=1.2.1
```

---

## 📊 Estrutura da Base de Dados

A BD contém as seguintes tabelas principais:

### **Dados Mestres**
- `tenants` - Empresas/Clientes
- `plants` - Unidades fabris
- `users` - Utilizadores do sistema
- `asset_categories` - Categorias de equipamentos
- `assets` - Equipamentos

### **Manutenção**
- `maintenance_plans` - Planos de manutenção
- `maintenance_tasks` - Tarefas de manutenção
- `work_orders` - Ordens de trabalho
- `work_order_tasks` - Tarefas das ordens

### **Inventário**
- `suppliers` - Fornecedores
- `spare_parts` - Peças de reposição
- `stock_movements` - Movimentos de stock

### **Operacional**
- `meter_readings` - Leituras de contadores
- `attachments` - Ficheiros anexados
- `audit_logs` - Logs de auditoria
- `sla_rules` - Regras de SLA

---

## 🧪 Dados de Demo

O script SQL insere automaticamente dados de demonstração:

### **Admin Default**
- **Email:** `admin@cmms.com`
- **Password:** `Admin@123456`
- **Role:** `superadmin`

### **Tenant Demo**
- **Nome:** CMMS Enterprise Demo
- **Slug:** cmms-demo
- **Plano:** enterprise

### **Planta Demo**
- **Nome:** Fábrica Principal
- **Código:** PLANT-001
- **Localização:** Lisboa, Portugal

### **Equipamentos Demo**
- 3 equipamentos pré-criados
- Categorias pré-configuradas
- Prontos para testar

---

## 🐛 Troubleshooting

### ❌ "Connection refused"

**Solução:**
```bash
# Verificar se PostgreSQL está a correr
sudo systemctl status postgresql

# Iniciar se estiver parado
sudo systemctl start postgresql

# Verificar porta (padrão: 5432)
sudo lsof -i :5432
```

### ❌ "Database already exists"

**Solução:**
```bash
# Opção 1: Usar a BD existente (recomendado)
# Continuar com a configuração

# Opção 2: Apagar e recriar
psql -U postgres -c "DROP DATABASE IF EXISTS cmms_enterprise;"
./setup-database.sh
```

### ❌ "User already exists"

**Solução:**
```bash
# O script vai pedir confirmação
# Responder "y" para recriar o utilizador

# Ou manualmente:
psql -U postgres -c "DROP USER IF EXISTS cmms_user;"
./setup-database.sh
```

### ❌ "Authentication failed for user"

**Solução:**
```bash
# Verificar password no .env
cat backend/.env | grep DATABASE_URL

# Resetar password do utilizador
psql -U postgres -c "ALTER USER cmms_user WITH PASSWORD 'nova_senha';"
```

---

## 🚀 Próximos Passos

Após criar a BD com sucesso:

### **1. Instalar dependências do backend**
```bash
cd backend
npm install
```

### **2. Executar migrações (se usar Drizzle)**
```bash
npm run db:migrate
```

### **3. Popular dados de demo**
```bash
npm run db:seed
```

### **4. Iniciar o servidor**
```bash
npm run dev
```

### **5. Instalar dependências do frontend**
```bash
cd ../frontend
npm install
npm run dev
```

---

## ⚠️ Notas Importantes

### **Segurança**
- ❌ **NÃO** comitar `.env` para git
- ❌ **NÃO** usar `admin@cmms.com` em produção
- ✅ Mudar credenciais padrão em produção
- ✅ Usar senhas fortes (>15 carateres)

### **Backup & Restore**

```bash
# Fazer backup da BD
pg_dump -h localhost -U cmms_user -d cmms_enterprise > backup.sql

# Restaurar de um backup
psql -h localhost -U cmms_user -d cmms_enterprise < backup.sql
```

### **Locale (Português)**

O script tenta usar locale português (`pt_PT.UTF-8`). Se não estiver disponível:

```bash
# Verificar locales disponíveis
locale -a

# Se necessário, usar UTF-8 padrão (o script faz isso automaticamente)
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `sudo journalctl -u postgresql`
2. Teste a conexão: `psql -h localhost -U cmms_user -d cmms_enterprise`
3. Verifique as credenciais no `.env`
4. Consulte o ficheiro [backend/README.md](./backend/README.md)

---

**Versão:** 1.2.1  
**Atualizado:** 2026-01-29
