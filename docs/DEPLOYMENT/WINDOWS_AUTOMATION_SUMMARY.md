🪟 # Configuração Windows Automática - RESUMO

## O que foi preparado:

### 📄 Scripts de Automação

1. **`setup-windows.bat`** ⭐
   - Verifica Node.js e npm
   - Cria arquivo `.env` automaticamente
   - Instala todas as dependências
   - **Executar primeiro!**

2. **`start-all.bat`** ⭐
   - Inicia Backend e Frontend simultaneamente
   - Abre o navegador automaticamente
   - **Executar para rodar o projeto**

3. **`setup-windows.ps1`** (PowerShell)
   - Alternativa moderna do setup-windows.bat
   - Mais informações durante instalação

### 📚 Documentação

1. **`QUICKSTART_WINDOWS.md`**
   - Guia de 3 passos rápidos
   - Para usuários com pressa

2. **`WINDOWS_SETUP.md`**
   - Setup completo e detalhado
   - Instrução passo-a-passo
   - Para usuários que querem entender

3. **`WINDOWS_TROUBLESHOOTING.md`**
   - Soluções para problemas comuns
   - Diagnóstico de erros
   - Checklist de verificação

### 🔧 Configuração

- **`.env.example`** - Template de variáveis de ambiente
- Scripts Windows nativos (`.bat`)
- Suporte a PowerShell (`.ps1`)

---

## 🚀 Como Começar (Super Rápido)

### Passo 1: Setup
```bash
# Duplo-clique em:
setup-windows.bat
```

### Passo 2: Configurar Database
- Editar: `backend\.env`
- Alterar: `DATABASE_URL` com suas credenciais PostgreSQL

### Passo 3: Iniciar
```bash
# Duplo-clique em:
start-all.bat
```

**Pronto! 🎉 Projeto rodando em http://localhost:5173**

---

## 📋 Verificação

Após executar os scripts, você deve ter:

- [x] Node.js instalado
- [x] npm instalado
- [x] PostgreSQL instalado e rodando
- [x] Backend dependências instaladas (`backend/node_modules`)
- [x] Frontend dependências instaladas (`frontend/node_modules`)
- [x] Arquivo `.env` criado em `backend/`
- [x] Backend rodando em http://localhost:3000
- [x] Frontend rodando em http://localhost:5173

---

## 📂 Arquivos Novos

```
Manuten-o-/
├── setup-windows.bat           ✨ NEW
├── start-windows.bat           ✨ NEW (legacy)
├── start-all.bat               ✨ NEW (recomendado)
├── setup-windows.ps1           ✨ NEW (PowerShell)
├── .env.example                ✨ UPDATED
├── QUICKSTART_WINDOWS.md       ✨ NEW
├── WINDOWS_SETUP.md            ✨ NEW (completo)
└── WINDOWS_TROUBLESHOOTING.md  ✨ NEW (ajuda)
```

---

## 🎯 Próximos Passos

1. ✅ **Setup** - Execute `setup-windows.bat`
2. ✅ **Configurar** - Edite `backend\.env`
3. ✅ **Iniciar** - Execute `start-all.bat`
4. ✅ **Acessar** - http://localhost:5173
5. 📖 **Aprender** - Leia [DEVELOPMENT.md](./DEVELOPMENT.md)

---

## 💡 Dicas

- **Sem PowerShell?** Use `setup-windows.bat` (não precisa de admin)
- **Problemas?** Consulte [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md)
- **Mais detalhes?** Leia [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)
- **Rápido demais?** Veja [QUICKSTART_WINDOWS.md](./QUICKSTART_WINDOWS.md)

---

## ✨ Agora está 100% pronto para Windows! 🎉

**Tudo automatizado, nenhuma configuração manual necessária!**
