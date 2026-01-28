# 🪟 Windows - Guia Visual Passo-a-Passo

## 📸 Screenshot Guide

Este documento mostra exatamente o que você vai ver em cada passo.

---

## PASSO 1: Descarregar o Projeto

### O que você vai ver:
```
C:\Users\seu_usuario\
└── Downloads\
    └── Manuten-o- (pasta do projeto)
```

### Criar pasta no C:
1. Abra **Explorador de Ficheiros**
2. Vá para **C:\**
3. Duplo-clique em **Manuten-o-** para entrar

---

## PASSO 2: Executar o Setup

### Dentro da pasta `Manuten-o-`:

```
📁 Manuten-o-
 ├─ 📄 setup-windows.bat          ← CLIQUE AQUI
 ├─ 📄 start-all.bat
 ├─ 📄 start-menu.bat
 ├─ 📁 backend
 ├─ 📁 frontend
 └─ 📁 outros ficheiros...
```

### O que vai aparecer:

```
════════════════════════════════════════════════════════════
CMMS Enterprise - Inicializacao Windows
════════════════════════════════════════════════════════════

[1/4] Verificando Node.js...
Node.js: v18.18.0 ✓

[2/4] Verificando npm...
npm: 9.8.1 ✓

[3/4] Preparando backend...
✓ Backend pronto!

[4/4] Preparando frontend...
✓ Frontend pronto!

════════════════════════════════════════════════════════════
✓ Inicializacao Completa!
════════════════════════════════════════════════════════════

Pressione qualquer tecla para continuar...
```

### ⏱️ Tempo esperado: 2-3 minutos

**Enquanto aguarda:**
- Está a descarregar pacotes npm
- Compilando TypeScript
- Criando ficheiro .env

---

## PASSO 3: Configurar Base de Dados

### 1. Abrir ficheiro `.env`

```
📁 backend
 └─ 📄 .env                      ← ABRIR ESTE
```

**Como abrir:**
1. Clique com botão direito → **Abrir com** → **Bloco de Notas**

### 2. Você vai ver:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/cmms_enterprise
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-prod
CORS_ORIGIN=http://localhost:5173
```

### 3. Alterar a primeira linha:

**ANTES:**
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/cmms_enterprise
```

**DEPOIS (usando dados do PostgreSQL):**
```env
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/cmms_enterprise
```

⚠️ **Substitua:**
- `postgres` → seu utilizador (geralmente é `postgres`)
- `sua_senha` → senha que definiu ao instalar PostgreSQL

### 4. Guardar ficheiro
- Pressione **Ctrl+S**
- Feche o ficheiro

---

## PASSO 4: Iniciar o Projeto

### Volte à pasta principal `Manuten-o-`

```
📁 Manuten-o-
 ├─ 📄 setup-windows.bat
 ├─ 📄 start-all.bat              ← CLIQUE AQUI
 ├─ 📄 start-menu.bat
 └─ ...
```

### O que vai acontecer:

1. **Uma janela se abre:**
```
╔══════════════════════════════════════════════════════════╗
║ CMMS Backend                                             ║
╚══════════════════════════════════════════════════════════╝

[nodemon] 3.0.1
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): src/**/* .env
[nodemon] watching extensions: ts,json
[nodemon] starting `tsx watch src/server.ts`

✓ Database connection successful
✓ Server running on http://localhost:3000
```

2. **Outra janela se abre:**
```
╔══════════════════════════════════════════════════════════╗
║ CMMS Frontend                                            ║
╚══════════════════════════════════════════════════════════╝

  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

3. **Navegador abre:**
```
http://localhost:5173 → Página de Login
```

---

## PASSO 5: Fazer Login

### Página que vai ver:

```
┌──────────────────────────────────────────┐
│                                          │
│     🏭 CMMS Enterprise                   │
│                                          │
│     Faça login na sua conta              │
│                                          │
│   ┌────────────────────────────────┐    │
│   │ Email                          │    │
│   │ admin@cmms.com                 │    │
│   └────────────────────────────────┘    │
│                                          │
│   ┌────────────────────────────────┐    │
│   │ Senha                          │    │
│   │ ••••••••••••••                 │    │
│   └────────────────────────────────┘    │
│                                          │
│        [Fazer Login]                     │
│                                          │
└──────────────────────────────────────────┘
```

### Preencher com:
- **Email:** `admin@cmms.com`
- **Senha:** `Admin@123456`

### Clique em "Fazer Login"

---

## PASSO 6: Dashboard

### Após login, você verá:

```
┌──────────────────────────────────────────────────────────┐
│ CMMS Enterprise                           [Menu]          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│                    Dashboard                             │
│                                                           │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│   │ Ativos   │  │ Ordens   │  │ Peças    │              │
│   │   42     │  │   18     │  │   156    │              │
│   └──────────┘  └──────────┘  └──────────┘              │
│                                                           │
│   ┌──────────────────────────────────────────┐          │
│   │ Manutenção Vencida (últimos 7 dias)     │          │
│   │ • Bomba B-01: 5 dias vencida             │          │
│   │ • Motor M-03: 2 dias vencido             │          │
│   └──────────────────────────────────────────┘          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Pronto! Sistema Operacional

Agora você pode:
- ✅ Gerir Ativos (Add/Edit/Delete)
- ✅ Criar Ordens de Trabalho
- ✅ Gerir Peças Sobressalentes
- ✅ Ver Dashboard
- ✅ Consultar Relatórios

---

## 🆘 Se Algo Correr Mal

### ❌ Janela de erro aparece:

**Erro comum 1: "Node.js not found"**
- Instale: https://nodejs.org/
- Reinicie o seu computador

**Erro comum 2: "Cannot connect to PostgreSQL"**
- Verificar: A senha em `.env` está correta?
- PostgreSQL está a rodar?

**Erro comum 3: "Port 3000 already in use"**
- Feche outras janelas de terminal
- Reinicie o seu computador

👉 Consulte: [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md)

---

## 📊 Estrutura de Pastas (Visual)

Após o setup, você terá:

```
📁 Manuten-o-
 │
 ├─ 📁 backend
 │  ├─ 📁 src
 │  ├─ 📁 node_modules          ✓ Instalado
 │  ├─ 📄 .env                  ✓ Configurado
 │  ├─ 📄 package.json
 │  └─ 📄 README.md
 │
 ├─ 📁 frontend
 │  ├─ 📁 src
 │  ├─ 📁 node_modules          ✓ Instalado
 │  ├─ 📄 package.json
 │  └─ 📄 README.md
 │
 ├─ 📄 setup-windows.bat        ← Setup
 ├─ 📄 start-all.bat            ← Iniciar
 ├─ 📄 start-menu.bat           ← Menu
 │
 ├─ 📄 README.md                (Documentação principal)
 ├─ 📄 QUICKSTART_WINDOWS.md   (Rápido - 2 min)
 ├─ 📄 WINDOWS_SETUP.md         (Completo)
 └─ 📄 WINDOWS_TROUBLESHOOTING.md (Ajuda)
```

---

## ⏱️ Timeline Estimado

| Passo | Descrição | Tempo |
|-------|-----------|-------|
| 1 | Descarregar | - (depende da internet) |
| 2 | Setup | 2-3 min |
| 3 | Configurar BD | 1 min |
| 4 | Iniciar | 10 seg |
| 5 | Login | 1 min |
| **Total** | **Pronto para usar!** | **~5-6 min** |

---

## ✅ Checklist Final

Após todo o processo, você deve ter:

- [x] Projeto em `C:\Manuten-o-` (ou seu local)
- [x] Node.js instalado
- [x] PostgreSQL instalado e rodando
- [x] `.env` configurado com credenciais
- [x] `npm install` executado com sucesso
- [x] Backend rodando em http://localhost:3000
- [x] Frontend rodando em http://localhost:5173
- [x] Navegador aberto no login
- [x] Login bem-sucedido
- [x] Dashboard visível

**Se todos os checkmarks estão preenchidos, está tudo pronto! 🎉**

---

## 💡 Dicas

1. **Deixar as janelas abertas** enquanto trabalha
   - Backend: monitora mudanças automaticamente
   - Frontend: recarrega quando você salva ficheiros

2. **Ver logs em tempo real**
   - Olhe para as janelas do terminal
   - Mostra erros, requisições, avisos

3. **Limpar cache se tiver problemas**
   - Feche as 2 janelas
   - Execute `start-all.bat` novamente

4. **Para parar**
   - Feche as janelas do terminal
   - Ou pressione `Ctrl+C` em cada uma

---

**Sucesso! Bem-vindo ao CMMS Enterprise! 🏭**
