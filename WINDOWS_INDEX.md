# 🪟 Windows Setup - Índice de Ficheiros

## 🎯 Comece aqui!

### Para Novos Utilizadores
👉 **[QUICKSTART_WINDOWS.md](./QUICKSTART_WINDOWS.md)** - 3 passos em 2 minutos

### Para Entender Tudo
📖 **[WINDOWS_COMPLETE_GUIDE.md](./WINDOWS_COMPLETE_GUIDE.md)** - Resumo completo

---

## 📜 Documentação (por ordem de leitura)

### 1️⃣ Rápido
| Nome | Tempo | Descrição |
|------|-------|-----------|
| [QUICKSTART_WINDOWS.md](./QUICKSTART_WINDOWS.md) | 2-3 min | Só os 3 passos essenciais |

### 2️⃣ Visual (Com Exemplos)
| Nome | Tempo | Descrição |
|------|-------|-----------|
| [WINDOWS_VISUAL_GUIDE.md](./WINDOWS_VISUAL_GUIDE.md) | 10-15 min | Passo-a-passo com screenshots mentais |

### 3️⃣ Completo
| Nome | Tempo | Descrição |
|------|-------|-----------|
| [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) | 15-20 min | Guia detalhado com toda a informação |

### 4️⃣ Troubleshooting
| Nome | Descrição |
|------|-----------|
| [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md) | 14+ problemas comuns com soluções |

### 5️⃣ Referência
| Nome | Descrição |
|------|-----------|
| [WINDOWS_AUTOMATION_SUMMARY.md](./WINDOWS_AUTOMATION_SUMMARY.md) | Resumo do que foi criado |
| [WINDOWS_AUTOMATION_TECHNICAL.md](./WINDOWS_AUTOMATION_TECHNICAL.md) | Detalhes técnicos da implementação |
| [WINDOWS_COMPLETE_GUIDE.md](./WINDOWS_COMPLETE_GUIDE.md) | Guia completo do setup |

---

## 🚀 Scripts (Executáveis)

### Setup (Executar 1ª vez)
```bash
setup-windows.bat      # Instala tudo automaticamente
```
ou
```bash
setup-windows.ps1      # Versão PowerShell (mais detalhada)
```

### Inicializar (Todos os dias)
```bash
start-all.bat          # ⭐ RECOMENDADO - Inicia tudo
start-menu.bat         # Menu interativo
start-windows.bat      # Alternativa simples
```

---

## 🔧 Configuração

### .env.example
- Template de variáveis de ambiente
- Use como referência
- Depois configure `backend\.env`

---

## 📊 Quadro Resumido

```
┌─────────────────────────────────────────┐
│  WINDOWS - Guia de Ficheiros           │
├─────────────────────────────────────────┤
│                                         │
│  1️⃣ NOVOS UTILIZADORES                │
│  └─ QUICKSTART_WINDOWS.md (2 min)    │
│                                         │
│  2️⃣ EXECUTAR SETUP                    │
│  └─ setup-windows.bat                 │
│                                         │
│  3️⃣ INICIAR PROJETO                   │
│  └─ start-all.bat                     │
│                                         │
│  4️⃣ PROBLEMAS?                         │
│  └─ WINDOWS_TROUBLESHOOTING.md        │
│                                         │
│  5️⃣ MAIS INFORMAÇÃO                   │
│  └─ WINDOWS_SETUP.md                  │
│     ou WINDOWS_VISUAL_GUIDE.md        │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📁 Estrutura de Ficheiros

```
Manuten-o-/
│
├─ 🚀 SCRIPTS
│  ├─ setup-windows.bat          (setup inicial)
│  ├─ start-all.bat              (iniciar projeto) ⭐
│  ├─ start-menu.bat             (menu interativo)
│  ├─ setup-windows.ps1          (setup PowerShell)
│  └─ start-windows.bat          (legacy)
│
├─ 📖 DOCUMENTAÇÃO WINDOWS
│  ├─ QUICKSTART_WINDOWS.md      (⭐ COMECE AQUI)
│  ├─ WINDOWS_VISUAL_GUIDE.md    (com exemplos)
│  ├─ WINDOWS_SETUP.md           (completo)
│  ├─ WINDOWS_TROUBLESHOOTING.md (14+ soluções)
│  ├─ WINDOWS_AUTOMATION_SUMMARY.md
│  ├─ WINDOWS_AUTOMATION_TECHNICAL.md
│  └─ WINDOWS_COMPLETE_GUIDE.md
│
├─ 🔧 CONFIGURAÇÃO
│  └─ .env.example
│
├─ 📚 DOCUMENTAÇÃO GERAL
│  ├─ README.md                  (principal)
│  ├─ DEVELOPMENT.md             (desenvolvimento)
│  └─ ... (outros ficheiros)
│
├─ 📁 backend/
│  ├─ src/
│  ├─ node_modules/             (criado após setup)
│  ├─ .env                       (criado após setup)
│  └─ package.json
│
└─ 📁 frontend/
   ├─ src/
   ├─ node_modules/             (criado após setup)
   └─ package.json
```

---

## ⏱️ Tempo Estimado

| Ação | Tempo |
|------|-------|
| Ler QUICKSTART_WINDOWS.md | 2-3 min |
| Executar setup-windows.bat | 2-3 min |
| Editar .env | 1 min |
| Executar start-all.bat | 10 seg |
| **Total** | **~6 min** |

---

## ✅ Verificação

Após todo o processo, você deve ter:

- ✅ Ficheiro `backend\.env` configurado
- ✅ Ficheiro `backend\node_modules` criado
- ✅ Ficheiro `frontend\node_modules` criado
- ✅ Backend rodando em http://localhost:3000
- ✅ Frontend rodando em http://localhost:5173
- ✅ Navegador aberto no login

---

## 🆘 Precisa de Ajuda?

1. **Problema comum?**
   - Veja: [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md)

2. **Quer entender melhor?**
   - Leia: [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)

3. **Quer um resumo?**
   - Consulte: [WINDOWS_COMPLETE_GUIDE.md](./WINDOWS_COMPLETE_GUIDE.md)

4. **Quer ver passo-a-passo?**
   - Veja: [WINDOWS_VISUAL_GUIDE.md](./WINDOWS_VISUAL_GUIDE.md)

---

## 🎯 Próximas Ações

1. Abra: **[QUICKSTART_WINDOWS.md](./QUICKSTART_WINDOWS.md)**
2. Siga os 3 passos
3. Pronto! Sistema a rodar 🎉

---

**Versão:** 1.0  
**Criado:** Janeiro 2026  
**Compatibilidade:** Windows 7+  
**Status:** ✅ Pronto para usar
