# 🚀 Setup Scripts - Complete Setup & Start

Scripts para setup completo do projeto com instalação de dependências e inicialização dos serviços.

## 📋 Scripts Disponíveis

### 🌐 **init-render.sh** (RENDER DEPLOYMENT)

Script para inicializar o banco de dados após deploy no Render.

```bash
./scripts/setup/init-render.sh https://seu-app.onrender.com
```

**O que faz:**
1. ✅ Verifica se a aplicação está online
2. ✅ Executa endpoint de inicialização
3. ✅ Cria usuário admin inicial
4. ✅ Mostra credenciais de login

**Quando usar:**
- Após primeiro deploy no Render
- Quando receber erro "Invalid credentials" no login
- Para resetar banco de dados vazio

**Saída esperada:**
```
🚀 Inicializando banco de dados no Render...
✅ Aplicação está online!
✅ Banco de dados inicializado com sucesso!

🎉 Pode agora fazer login com:
   Email: superadmin@cmms.com
   Senha: SuperAdmin@123456
```

📖 **Ver também:** [RENDER_INITIALIZATION.md](../../docs/DEPLOYMENT/RENDER_INITIALIZATION.md)

---

### ⭐ **setup-and-start.bat** (RECOMENDADO)

Script completo all-in-one que faz tudo:

```cmd
setup-and-start.bat
```

**O que faz (em sequência):**
1. ✅ Verifica estrutura do projeto
2. ✅ Verifica Node.js e npm
3. ✅ Instala dependências do backend
4. ✅ Instala dependências do frontend
5. ✅ Configura base de dados (migrations + seed)
6. ✅ Inicia backend em nova janela
7. ✅ Inicia frontend em nova janela
8. ✅ Abre navegador automaticamente

**Requisitos:**
- Node.js instalado
- PostgreSQL instalado e rodando
- Estar no diretório raiz do projeto

**Tempo:**
~5-10 minutos (dependendo do tamanho das dependências)

---

### ⭐ **setup-and-start.ps1** (PowerShell)

Versão PowerShell do script acima.

```powershell
powershell -ExecutionPolicy Bypass -File setup-and-start.ps1
```

**Mesma funcionalidade:**
- Instalação completa
- Setup de base de dados
- Inicialização de serviços

---

### setup-complete.bat

Script original para setup (sem automática de start).

```cmd
setup-complete.bat
```

---

### setup-database.bat / setup-database.ps1

Scripts específicos para setup da base de dados apenas.

```cmd
setup-database.bat
REM ou
powershell -ExecutionPolicy Bypass -File setup-database.ps1
```

---

### setup-local.bat / setup-local.sh

Scripts para setup local com configuração manual.

---

### setup-windows.bat / setup-windows.ps1

Scripts generalizados para Windows.

---

## 🎯 Como Usar

### Primeiro Setup (Recomendado)

**Windows (CMD):**
```cmd
# Ir ao diretório raiz
cd C:\Caminho\Para\Manuten-o-

# Rodar o script completo
scripts\setup\setup-and-start.bat
```

**Windows (PowerShell):**
```powershell
# Ir ao diretório raiz
cd C:\Caminho\Para\Manuten-o-

# Rodar o script completo
powershell -ExecutionPolicy Bypass -File scripts\setup\setup-and-start.ps1
```

### Passo a Passo do Script

O script executa estes passos automaticamente:

```
[STEP 1/6] Verifying project structure
   ↓
[STEP 2/6] Checking Node.js and npm
   ↓
[STEP 3/6] Setting up backend
   - Cria .env se não existir
   - npm install
   ↓
[STEP 4/6] Setting up frontend
   - npm install
   ↓
[STEP 5/6] Setting up database
   - Verifica PostgreSQL
   - npm run db:push
   - npm run db:seed
   ↓
[STEP 6/6] Starting services
   - Backend (localhost:3000)
   - Frontend (localhost:5173)
   - Abre navegador
```

---

## ⚙️ Configuração

### .env Automático

O script cria `.env` automaticamente:

**Opção 1:** Se `.env.example` existe
```cmd
Copia .env.example → .env
```

**Opção 2:** Se não existe
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cmms_enterprise
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-prod
```

⚠️ **Edite o .env se as credenciais PostgreSQL forem diferentes!**

### PostgreSQL Requerido

O script verifica se PostgreSQL está rodando:

```cmd
REM Se não estiver rodando, o script pede para iniciar:
Windows Services > PostgreSQL > Start

REM Ou manualmente:
net start PostgreSQL
```

### Redis (Opcional)

Script avisa se Redis não estiver disponível, mas continua normalmente.

---

## ❌ Troubleshooting

### Erro: "Not in project root directory"

```cmd
Certifique-se que está no diretório raiz (onde estão backend e frontend)
cd C:\Caminho\Para\Manuten-o-
```

### Erro: "Node.js not found"

```cmd
Instale Node.js: https://nodejs.org/
Reinicie o terminal
Verifique: node --version
```

### Erro: "npm not found"

```cmd
Reinstale Node.js (npm vem junto)
Ou adicione ao PATH manualmente
```

### Erro: "PostgreSQL not detected"

```cmd
Abra Windows Services (services.msc)
Procure "PostgreSQL"
Se parado: Right-click > Start

Ou manualmente:
net start PostgreSQL
```

### Erro: "Migration failed"

```cmd
1. Verificar se PostgreSQL está rodando
   netstat -ano | findstr :5432

2. Verificar DATABASE_URL em backend\.env

3. Criar banco manualmente se necessário:
   psql -U postgres -h localhost
   CREATE DATABASE cmms_enterprise;
   \q
```

### Erro: "npm install failed"

```cmd
1. Limpar cache npm
   npm cache clean --force

2. Deletar node_modules
   rmdir /s /q node_modules
   del package-lock.json

3. Tentar novamente
   npm install
```

---

## ✅ Verificação

Após o script completar, verificar:

```cmd
REM Backend rodando?
netstat -ano | findstr :3000
REM Deve aparecer: LISTENING

REM Frontend rodando?
netstat -ano | findstr :5173
REM Deve aparecer: LISTENING

REM Abrir navegador:
http://localhost:5173
```

---

## 🔄 Uso Repetido

Se já tiver tudo instalado e apenas quer reiniciar:

```cmd
REM Mais rápido - sem reinstalar deps:
scripts\start\start-smart.bat

REM Ou apenas:
cd backend && npm run dev
cd frontend && npm run dev (em outro terminal)
```

---

## 📚 Outros Scripts

Para outros casos:

| Script | Uso |
|--------|-----|
| setup-and-start | ⭐ Completo (setup + start) |
| start-smart | Setup feito, apenas start |
| setup-complete | Só setup (sem start) |
| setup-database | Só base de dados |
| start-all | Apenas iniciar serviços |

---

## 💡 Dicas

1. **Deixe as janelas abertas:**
   - Backend rodando
   - Frontend rodando
   - Editor (VS Code)

2. **Para parar:** Ctrl+C em cada terminal

3. **Para limpar tudo e recomeçar:**
   ```cmd
   rmdir /s /q backend\node_modules
   rmdir /s /q frontend\node_modules
   del backend\package-lock.json
   del frontend\package-lock.json
   setup-and-start.bat
   ```

4. **Verificar logs:**
   - Backend mostra logs na sua janela
   - Frontend mostra logs na sua janela

---

**Última atualização:** 4 de Fevereiro de 2026
**Status:** ✅ Pronto para usar
