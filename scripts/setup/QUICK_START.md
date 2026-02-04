# ⚡ Setup & Start - Quick Reference

## TL;DR (Very Quick)

```cmd
REM Copie e cole isto no CMD na pasta raiz:
scripts\setup\setup-and-start.bat
```

**Resultado:**
✅ Instala tudo  
✅ Configura base de dados  
✅ Inicia backend (3000)  
✅ Inicia frontend (5173)  
✅ Abre navegador

---

## O que o Script Faz

| Passo | Ação | Status |
|-------|------|--------|
| 1 | Verifica estrutura | ✅ Automático |
| 2 | Verifica Node.js/npm | ✅ Automático |
| 3 | `npm install` backend | ✅ Automático |
| 4 | `npm install` frontend | ✅ Automático |
| 5 | Migrations DB | ✅ Automático |
| 6 | Seed de dados | ✅ Automático |
| 7 | Inicia backend | ✅ Nova janela |
| 8 | Inicia frontend | ✅ Nova janela |
| 9 | Abre navegador | ✅ Automático |

---

## Requisitos

- Node.js instalado
- PostgreSQL instalado
- PostgreSQL **rodando** (muito importante!)

---

## Comandos Alternativos

```cmd
REM PowerShell (mais moderno)
powershell -ExecutionPolicy Bypass -File scripts\setup\setup-and-start.ps1

REM Apenas setup (sem start)
scripts\setup\setup-complete.bat

REM Apenas iniciar (se já tem tudo instalado)
scripts\start\start-smart.bat
```

---

## Se Der Erro

### PostgreSQL Error
```cmd
net start PostgreSQL
REM Então rodar o script novamente
```

### npm Error
```cmd
npm cache clean --force
REM Deletar node_modules
rmdir /s /q backend\node_modules
rmdir /s /q frontend\node_modules
REM Rodar script novamente
```

### Outros
Veja: `docs/GUIDES/WINDOWS_PT_QUICK.md`

---

## Verificar se Funcionou

```cmd
Abrir navegador: http://localhost:5173

Deve aparecer: Sistema CMMS funcionando

Se erro:
- Verificar logs na janela do backend
- Verificar logs na janela do frontend
```

---

**Tempo esperado:** 5-10 minutos
**Dificuldade:** Muito fácil (só executar o script)
