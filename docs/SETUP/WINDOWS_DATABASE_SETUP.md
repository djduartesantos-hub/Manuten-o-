# 🪟 Setup de Base de Dados - Windows

Guia rápido para configurar a base de dados no Windows.

## ⚡ Opção Mais Fácil (Recomendado)

### **Usando PowerShell**

```powershell
# Permitir execução de scripts (apenas primeira vez)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Executar o script
.\setup-database.ps1
```

### **Usando Command Prompt (CMD)**

```cmd
setup-database.bat
```

---

## 📋 Pré-requisitos

### **1. PostgreSQL Instalado**

Se não tem PostgreSQL:
1. Download: https://www.postgresql.org/download/windows/
2. Execute o installer
3. **Importante:** Marque a opção "Add PostgreSQL to PATH" durante a instalação
4. Anote a password do utilizador `postgres`

**Verificar instalação:**
```cmd
psql --version
```

### **2. Node.js Instalado**

Download: https://nodejs.org/

**Verificar instalação:**
```cmd
node --version
npm --version
```

---

## 🔧 Passos de Instalação

### **Passo 1: Preparar Repositório**

```cmd
# Abrir Command Prompt na pasta do projeto
cd C:\Users\SeuNome\Documentos\Manuten-o-
```

### **Passo 2: Executar Script de Setup**

**Opção A - PowerShell (Recomendado):**
```powershell
# Se for primeira vez, permitir scripts
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Executar script
.\setup-database.ps1
```

**Opção B - Command Prompt:**
```cmd
setup-database.bat
```

**Opção C - Customizar Credenciais:**
```powershell
# PowerShell com parâmetros
.\setup-database.ps1 -DbUser "meu_user" -DbPassword "minha_senha"

# CMD com parâmetros
setup-database.bat meu_user minha_senha
```

### **Passo 3: Seguir Instruções na Tela**

O script vai:
1. ✅ Verificar PostgreSQL
2. ✅ Criar utilizador `cmms_user`
3. ✅ Criar base de dados `cmms_enterprise`
4. ✅ Gerar ficheiro `.env`
5. ✅ Testar conexão

Se tudo correr bem, verá: **✅ Database Setup Complete!**

---

## 📊 Credenciais Padrão

| Item | Valor |
|------|-------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `cmms_enterprise` |
| **User** | `cmms_user` |
| **Password** | `cmms_password` |

---

## 🚀 Próximos Passos

Após o setup da BD:

### **1. Instalar dependências do Backend**

```cmd
cd backend
npm install
```

### **2. Executar Migrações**

```cmd
npm run db:push
```

### **3. Popular com Dados de Demo**

```cmd
npm run db:seed
```

### **4. Iniciar o Backend**

```cmd
npm run dev
```

O backend rodará em: http://localhost:3000

### **5. Em Outro Terminal, Iniciar o Frontend**

```cmd
cd frontend
npm install
npm run dev
```

O frontend rodará em: http://localhost:5173

---

## 🔐 Credenciais de Demo

Após rodar o seed, pode fazer login com:

- **Login (username ou email):** superadmin ou superadmin@cmms.com
- **Password:** SuperAdmin@123456
- **Técnico (demo):** tecnico ou tecnico@cmms.com
- **Password (técnico):** Tecnico@123456
- **Tenant:** demo

---

## 🐛 Troubleshooting

### ❌ "PostgreSQL não encontrado"

**Solução:**
1. Instalar PostgreSQL: https://www.postgresql.org/download/windows/
2. **Importante:** Marque "Add to PATH" durante instalação
3. Reiniciar o Command Prompt
4. Tentar novamente

### ❌ "Connection refused"

**Solução:**
```cmd
# Verificar se PostgreSQL está a correr
# Windows Services (Win+R > services.msc)
# Procurar por "postgresql-x64-XX"

# Ou reiniciar:
net stop postgresql-x64-XX
net start postgresql-x64-XX

# Substituir XX pela versão (ex: postgresql-x64-15)
```

### ❌ "Access denied for user postgres"

**Solução:**
1. Abrir pgAdmin (deve ter vindo com PostgreSQL)
2. Na barra de ferramentas, clicar em "Tools" → "Query Tool"
3. Copiar e colar os comandos SQL de `setup-database.sql`

### ❌ "Cannot execute script"

**Solução (PowerShell):**
```powershell
# Permitir execução de scripts
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Depois executar
.\setup-database.ps1
```

---

## 🛠️ Alternativas Manual

Se o script não funcionar, pode criar a BD manualmente:

### **Opção 1: Usando pgAdmin (GUI)**

1. Abrir pgAdmin (vem com PostgreSQL)
2. Conectar ao servidor padrão
3. Clique direito em "Databases" → "Create" → "Database"
   - **Name:** `cmms_enterprise`
4. Ir para "Tools" → "Query Tool"
5. Copiar conteúdo de `setup-database.sql`
6. Colar e executar (F5)

### **Opção 2: Usando Command Prompt**

```cmd
# Conectar ao PostgreSQL
psql -h localhost -U postgres

-- No prompt SQL:
-- Criar utilizador
CREATE USER cmms_user WITH ENCRYPTED PASSWORD 'cmms_password';

-- Criar base de dados
CREATE DATABASE cmms_enterprise OWNER cmms_user;

-- Sair
\q
```

### **Opção 3: Importar SQL diretamente**

```cmd
psql -h localhost -U postgres -f setup-database.sql
```

---

## 📁 Ficheiros Importantes

| Ficheiro | Propósito |
|----------|-----------|
| `setup-database.bat` | Script Batch para Windows |
| `setup-database.ps1` | Script PowerShell para Windows |
| `setup-database.sh` | Script Bash para Linux/macOS |
| `setup-database.sql` | SQL manual (qualquer SO) |
| `backend/.env` | Credenciais (criado automaticamente) |

---

## ⚠️ Notas de Segurança

- ❌ **NÃO** comitar `backend/.env` para git
- ✅ Mudar credenciais padrão em produção
- ✅ Usar senhas fortes (>12 carateres)
- ✅ Proteger ficheiro `.env` com permissões

---

## 📞 Ajuda

Se encontrar problemas:

1. Verificar logs do PostgreSQL:
   ```cmd
   # Windows Event Viewer
   eventvwr.msc
   # Procurar por PostgreSQL
   ```

2. Testar conexão manual:
   ```cmd
   psql -h localhost -U cmms_user -d cmms_enterprise
   ```

3. Consultar documentação completa:
   - Ficheiro: `DATABASE_SETUP.md`
   - Backend: `backend/README.md`

---

**Versão:** 1.2.1  
**Atualizado:** 2026-01-29  
**Windows:** Compatible com Windows 10/11 e Server 2016+
