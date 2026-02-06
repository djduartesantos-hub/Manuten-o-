# 🪟 Guia de Instalação e Execução no Windows

## 📋 Pré-requisitos

Antes de começar, você precisa de:

### 1. **Node.js 18+** 
- Baixar em: https://nodejs.org/ (escolha a versão LTS)
- Verificar instalação:
  ```cmd
  node --version
  npm --version
  ```

### 2. **PostgreSQL 12+**
- Baixar em: https://www.postgresql.org/download/windows/
- Durante a instalação, defina uma senha para o usuário `postgres`
- Criar a database:
  ```cmd
  psql -U postgres
  CREATE DATABASE cmms_enterprise;
  \q
  ```

### 3. **Git** (recomendado)
- Baixar em: https://git-scm.com/download/win

---

## 🚀 Instalação Rápida (Recomendado)

### Passo 1: Executar Setup
1. Navegue até a pasta do projeto
2. Duplo-clique em `setup-windows.bat`
3. Aguarde a conclusão

Este script vai:
- ✅ Verificar Node.js e npm
- ✅ Criar arquivo `.env` no backend
- ✅ Instalar todas as dependências

### Passo 2: Configurar Banco de Dados
1. Abra o arquivo `backend\.env` em um editor de texto
2. Atualize a linha:
   ```env
   DATABASE_URL=postgresql://usuario:senha@localhost:5432/cmms_enterprise
   ```
   Substitua `usuario` e `senha` pelos dados do PostgreSQL

3. (Opcional) Se quiser, altere outras variáveis:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=dev-secret-key-change-in-prod
   CORS_ORIGIN=http://localhost:5173
   ```

### Passo 3: Iniciar o Projeto
Duplo-clique em `start-windows.bat`

Abrirão duas janelas:
- **CMMS Backend** - Backend rodando em http://localhost:3000
- **CMMS Frontend** - Frontend rodando em http://localhost:5173

---

## 🔧 Instalação Manual (Alternativa)

Se preferir fazer manualmente:

### Backend
```cmd
cd backend
npm install
npm run dev
```

### Frontend (em outro terminal)
```cmd
cd frontend
npm install
npm run dev
```

---

## 🗄️ Setup do Banco de Dados

### Criar Database
```cmd
psql -U postgres
CREATE DATABASE cmms_enterprise;
\q
```

### Seedar Dados Demo (opcional)
```cmd
cd backend
npm run db:seed
```

---

## 📝 Credenciais Demo

| Campo | Valor |
|-------|-------|
| Empresa | `demo` |
| Email | `admin@cmms.com` |
| Senha | `Admin@123456` |

---

## 🐛 Troubleshooting

### "Node.js not found"
- Reinstale Node.js
- Reinicie o CMD/PowerShell
- Verifique o PATH do Windows

### "Cannot find module..."
```cmd
cd backend (ou frontend)
rm -r node_modules package-lock.json
npm install
```

### Erro de conexão com PostgreSQL
- Verifique se PostgreSQL está rodando
- Confira o DATABASE_URL em `.env`
- Teste a conexão:
  ```cmd
  psql -U postgres -h localhost -d cmms_enterprise
  ```

### Porta 3000 ou 5173 já em uso
```cmd
REM Encontrar o processo
netstat -ano | findstr :3000
REM Matar o processo (substitua PID)
taskkill /PID <PID> /F
```

### Erro ao instalar bcrypt
Pode ser necessário instalar ferramentas de build:
- Instale: **Visual Studio Build Tools** ou **Visual Studio Community**
- Ou use: **Windows Build Tools** (`npm install --global windows-build-tools`)

---

## 📊 Verificar Instalação

Abra o navegador e acesse:

1. **Frontend**: http://localhost:5173
   - Deve mostrar página de login

2. **Backend API**: http://localhost:3000/health
   - Deve retornar informações do servidor

---

## 🎯 Scripts Disponíveis

### Backend
```cmd
npm run dev           # Desenvolviment com hot-reload
npm run build         # Compilar TypeScript
npm start             # Iniciar em produção
npm run db:migrate    # Rodar migrações
npm run db:seed       # Popular com dados demo
npm run lint          # Verificar código
```

### Frontend
```cmd
npm run dev           # Desenvolvimento com hot-reload
npm run build         # Build para produção
npm run preview       # Testar build local
npm run type-check    # Verificar tipos TypeScript
npm run lint          # Verificar código
```

---

## 🚢 Deployment (Depois)

Para fazer deploy em produção:
- Veja: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

---

## 📞 Suporte

Se tiver problemas:
1. Verifique [DEVELOPMENT.md](./DEVELOPMENT.md) para mais detalhes
2. Confirme que todas as versões estão corretas
3. Leia os logs de erro com atenção

---

## ✅ Checklist Final

- [ ] Node.js 18+ instalado
- [ ] PostgreSQL instalado e rodando
- [ ] `setup-windows.bat` executado com sucesso
- [ ] `.env` configurado com DATABASE_URL correto
- [ ] Ambos terminais (backend e frontend) iniciados
- [ ] Frontend acessível em http://localhost:5173
- [ ] Backend respondendo em http://localhost:3000

**Pronto! 🎉 Você está tudo configurado para desenvolver!**
