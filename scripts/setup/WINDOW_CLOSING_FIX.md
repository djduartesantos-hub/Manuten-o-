# 🔧 Scripts Windows - Corrigidos (Sem fechar automaticamente)

## O Problema
Os scripts estavam fechando automaticamente logo após iniciar, impedindo ver erros.

## A Solução
✅ Todos os scripts foram corrigidos para:
- **Manter as janelas abertas** mesmo com erros
- **Mostrar mensagens de erro** antes de fechar
- **Pedir para pressionar uma tecla** antes de fechar a janela

---

## 📋 Scripts Corrigidos

### 1️⃣ **setup-and-start.bat** (Recomendado)
One-click setup completo. Se der erro, a janela fica aberta para ver o erro.

```cmd
scripts\setup\setup-and-start.bat
```

**Novidade:** Janelas NÃO fecham automaticamente

### 2️⃣ **setup-and-start-improved.bat** (Versão Melhorada)
Versão aprimorada com melhor tratamento de erros e mensagens mais claras.

```cmd
scripts\setup\setup-and-start-improved.bat
```

**Melhorias:**
- Títulos coloridos nas janelas dos serviços
- Melhor controle de paths
- Mensagens de sucesso/erro mais claras

### 3️⃣ **start-smart.bat** (Startup Rápido)
Inicia os serviços (sem setup completo). Janelas agora não fecham.

```cmd
scripts\start\start-smart.bat
```

---

## 🔄 Como Funcionam Agora

### Cenário 1: Tudo OK
```
[Executar script]
   ↓
[Instalar/Iniciar]
   ↓
[Abrir navegador http://localhost:5173]
   ↓
[Janelas do backend e frontend rodando]
   ↓
[Você pode desenvolver!]
```

### Cenário 2: Com Erro
```
[Executar script]
   ↓
[Erro ocorre]
   ↓
[Mensagem de erro aparece]
   ↓
[❌ Backend/Frontend error occurred]
   ↓
[Press any key to close this window...]
   ↓
[Você vê o erro antes da janela fechar]
```

---

## ✅ Novidades

### Tratamento de Erros
Cada janela (Backend/Frontend) agora:
- ✅ Mostra se iniciou com sucesso
- ❌ Mostra mensagens de erro se falhar
- ⏸️ Pede para pressionar uma tecla antes de fechar

### Exemplo de Mensagem de Erro
```
❌ Backend error occurred
Press any key to close this window...
```

### Exemplo de Mensagem de Sucesso
```
✅ Backend running successfully

(Janela continua aberta, pronta para Ctrl+C se needed)
```

---

## 🚀 Uso Rápido

### Primeira Vez (Setup Completo)
```cmd
scripts\setup\setup-and-start.bat
```

**Faz:**
1. Instala dependências
2. Cria .env
3. Setup base de dados
4. Inicia backend e frontend
5. Abre navegador

### Próximas Vezes (Apenas Startup)
```cmd
scripts\start\start-smart.bat
```

**Faz:**
1. Inicia backend
2. Inicia frontend
3. Abre navegador

---

## ❓ Se Ainda Tiver Problema

### Janela fecha muito rápido

**Solução:**
1. Abra Command Prompt (CMD)
2. Navigate para o diretório do projeto
3. Digite um dos comandos acima
4. Deixe a janela aberta enquanto ele executa

### Vejo erro de npm not found

**Solução:**
```cmd
REM 1. Instale Node.js: https://nodejs.org/
REM 2. Reinicie Command Prompt
REM 3. Verifique:
node --version
npm --version

REM 4. Tente novamente
scripts\setup\setup-and-start.bat
```

### PostgreSQL error

**Solução:**
```cmd
REM 1. Abra Windows Services (services.msc)
REM 2. Procure "PostgreSQL"
REM 3. Se parado: Right-click > Start
REM 4. Tente novamente o script
```

### Porta 3000 ou 5173 já em uso

**Solução:**
```cmd
REM Encontrar processo que usa porta
netstat -ano | findstr :3000

REM Matar o processo (trocar XXXX pelo PID)
taskkill /PID XXXX /F

REM Tente novamente
scripts\setup\setup-and-start.bat
```

---

## 📚 Documentação Completa

Para mais informações:
- [WINDOWS_PT_QUICK.md](../docs/GUIDES/WINDOWS_PT_QUICK.md)
- [WINDOWS_QUICK_FIXES.md](../docs/GUIDES/WINDOWS_QUICK_FIXES.md)
- [WINDOWS_TROUBLESHOOTING.md](../docs/GUIDES/WINDOWS_TROUBLESHOOTING.md)

---

## ✅ Checklist

Antes de reportar problema:

- [ ] Tenho Node.js instalado? (`node --version`)
- [ ] Tenho npm instalado? (`npm --version`)
- [ ] Tenho PostgreSQL rodando? (`netstat -ano | findstr :5432`)
- [ ] Estou no diretório correto? (vejo `backend` e `frontend`)
- [ ] Rodei um dos scripts acima?
- [ ] Vi uma mensagem de erro? (salve ela)

---

**Status:** ✅ Fixado - Scripts agora não fecham automaticamente
**Data:** 4 de Fevereiro de 2026
