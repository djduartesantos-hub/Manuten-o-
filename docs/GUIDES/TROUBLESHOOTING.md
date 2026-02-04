# 🔧 Troubleshooting - Database & Migrations

Soluções para os problemas mais comuns ao configurar a base de dados.

## ❌ "relation 'tenants' does not exist"

**Causa:** As migrações Drizzle não foram executadas (as tabelas não existem).

### **Solução Rápida:**

```bash
cd backend
npm run db:migrate
npm run db:seed
npm run dev
```

### **Se Continuar a Falhar:**

```bash
# Option 1: Executar migrações manualmente
cd backend
./migrate-manual.sh        # Linux/macOS
migrate-manual.bat         # Windows

# Option 2: Usar SQL direto
psql -U cmms_user -d cmms_enterprise -f ../setup-database.sql
```

---

## ❌ "no config path provided, using default 'drizzle.config.ts'"

**Causa:** Drizzle-kit não encontra o arquivo de configuração.

### **Solução:**

Já foi corrigido! Atualize o repositório:

```bash
git pull origin main
```

Agora o projeto usa `drizzle.config.mjs` que é mais compatível.

---

## ❌ "Connection refused"

**Causa:** PostgreSQL não está a correr.

### **Solução Linux/macOS:**

```bash
# Verificar status
sudo systemctl status postgresql

# Iniciar se parado
sudo systemctl start postgresql

# macOS com Homebrew
brew services start postgresql
```

### **Solução Windows:**

```cmd
# Abrir Services (Win+R > services.msc)
# Procurar: postgresql-x64-XX
# Clicar direito > Start

# Ou via Command Prompt
net start postgresql-x64-15
```

**Substituir `15` pela sua versão do PostgreSQL.**

---

## ❌ "FATAL: password authentication failed"

**Causa:** Password incorreta no `.env` ou no PostgreSQL.

### **Solução:**

1. **Verificar .env:**
   ```bash
   cat backend/.env | grep DATABASE_URL
   ```

2. **Resetar password do utilizador:**
   ```bash
   psql -U postgres -c "ALTER USER cmms_user WITH PASSWORD 'cmms_password';"
   ```

3. **Atualizar .env com nova password**

---

## ❌ "Database 'cmms_enterprise' already exists"

**Causa:** Database foi criada anteriormente.

### **Solução Opção 1 (Recomendado):**
Use a database existente, continue com migrações:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

### **Solução Opção 2 (Limpar tudo):**

```bash
# ⚠️  CUIDADO: Isto apaga dados!
psql -U postgres -c "DROP DATABASE cmms_enterprise;"
psql -U postgres -c "DROP USER cmms_user;"

# Depois rodar setup novamente
cd ..
./setup-complete.sh
```

---

## ❌ "User 'cmms_user' already exists"

**Causa:** Utilizador foi criado anteriormente.

### **Solução Opção 1 (Recomendado):**
Continue com a BD existente.

### **Solução Opção 2 (Usar credenciais diferentes):**

```bash
./setup-complete.sh novo_user nova_senha
```

### **Solução Opção 3 (Limpar):**

```bash
psql -U postgres -c "DROP USER cmms_user;"
./setup-complete.sh
```

---

## ❌ "npm run db:migrate: command not found"

**Causa:** Dependências npm não instaladas.

### **Solução:**

```bash
cd backend
npm install
npm run db:migrate
```

---

## ❌ "drizzle-kit not found"

**Causa:** drizzle-kit não está instalado como dev dependency.

### **Solução:**

```bash
cd backend
npm install --save-dev drizzle-kit
npm run db:migrate
```

---

## ❌ "Seed script failed"

**Causa:** Erro ao inserir dados de demo.

### **Solução:**

1. **Verificar se as tabelas existem:**
   ```bash
   psql -U cmms_user -d cmms_enterprise
   \dt
   \q
   ```

2. **Se as tabelas existem, limpar dados:**
   ```bash
   psql -U cmms_user -d cmms_enterprise -c "DELETE FROM tenants;"
   npm run db:seed
   ```

3. **Se as tabelas não existem, rodar migrações:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

---

## ❌ Login com "Cannot find tenant"

**Causa:** Dados de demo não foram inseridos.

### **Solução:**

```bash
cd backend
npm run db:seed
```

Depois tente fazer login novamente.

---

## ❌ ".env file not found"

**Causa:** Arquivo .env não foi criado.

### **Solução:**

Criar manualmente em `backend/.env`:

```env
DATABASE_URL=postgresql://cmms_user:cmms_password@localhost:5432/cmms_enterprise
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
NODE_ENV=development
PORT=3000
```

Ou rodar setup novamente:

```bash
./setup-complete.sh
```

---

## ✅ Verificação de Saúde

Para confirmar que tudo está a funcionar:

### **1. PostgreSQL está a correr?**
```bash
psql -U cmms_user -d cmms_enterprise -c "SELECT NOW();"
```
Deve mostrar a hora atual.

### **2. Tabelas existem?**
```bash
psql -U cmms_user -d cmms_enterprise -c "\dt"
```
Deve listar ~17 tabelas.

### **3. Dados de demo existem?**
```bash
psql -U cmms_user -d cmms_enterprise -c "SELECT COUNT(*) FROM tenants;"
```
Deve retornar 1.

### **4. Backend consegue conectar?**
```bash
cd backend && npm run dev
```
Deve ver: `✅ Database connected successfully`

### **5. Consegue fazer login?**
- Abrir http://localhost:5173
- Email: admin@cmms.com
- Password: Admin@123456

---

## 🆘 Se Nada Funcionar

### **Opção 1: Reset Completo**

```bash
# Linux/macOS
chmod +x *.sh
sudo -u postgres psql -c "DROP DATABASE IF EXISTS cmms_enterprise;"
sudo -u postgres psql -c "DROP USER IF EXISTS cmms_user;"
./setup-complete.sh

# Windows
REM Abrir Services (Win+R > services.msc)
REM Parar PostgreSQL
net stop postgresql-x64-15

REM Deletar dados (Optional)
REM rmdir "C:\Program Files\PostgreSQL\15\data\cmms_enterprise"

REM Iniciar PostgreSQL
net start postgresql-x64-15
setup-complete.bat
```

### **Opção 2: Usar pgAdmin (GUI)**

1. Abrir pgAdmin
2. Criar database `cmms_enterprise`
3. Criar user `cmms_user` / `cmms_password`
4. Executar SQL de `setup-database.sql`
5. Rodar: `cd backend && npm run db:seed`

### **Opção 3: Docker (Alternativa)**

Se tem Docker instalado:

```bash
# Criar container PostgreSQL
docker run --name cmms-postgres \
  -e POSTGRES_USER=cmms_user \
  -e POSTGRES_PASSWORD=cmms_password \
  -e POSTGRES_DB=cmms_enterprise \
  -p 5432:5432 \
  -d postgres:15

# Depois rodar setup
./setup-complete.sh
```

---

## 📞 Ainda Precisa Ajuda?

1. Verificar logs:
   - Backend: `npm run dev` (mostra erros)
   - PostgreSQL: `sudo journalctl -u postgresql -n 50`

2. Testar conexão direta:
   ```bash
   psql -h localhost -U cmms_user -d cmms_enterprise -p 5432
   ```

3. Consultar:
   - [DATABASE_SETUP.md](./DATABASE_SETUP.md)
   - [QUICKSTART.md](./QUICKSTART.md)
   - [backend/README.md](./backend/README.md)

---

**Versão:** 1.2.1  
**Atualizado:** 2026-01-29
