# ⚡ INSTRUÇÕES RÁPIDAS - Database Setup com Dados Demo

## 🚀 Execução Automática (Recomendado)

### Linux / Mac
```bash
cd /workspaces/Manuten-o-
chmod +x scripts/database/setup-demo.sh
./scripts/database/setup-demo.sh
```

### Windows
```bash
cd /workspaces/Manuten-o-
scripts\database\setup-demo.bat
```

---

## ✅ O que o script faz

1. **Cria database completa** com schema (create-admin-user.sql)
2. **Carrega dados realistas** (demo-data.sql)
3. **Verifica dados** e mostra quantidade

> Importante: para garantir que a BD fica com o **schema mais recente do código** (ex: tabela `notifications` para a caixa de entrada),
> execute também (uma vez) no backend:

```bash
cd backend
npm install
npm run db:push
```

**Resultado esperado:**
```
Categorias: 8
Equipamentos: 12
Planos de Manutenção: 15
```

---

## 🔐 Credenciais de Teste

```
Email: admin@cmms.com
Senha: Admin@123456
```

---

## ✨ Dados Carregados

### Equipamentos (12 total):
- 2 Bombas (PUMP-001, PUMP-002)
- 2 Motores (MOTOR-001, MOTOR-002)
- 2 Compressores (COMP-001, COMP-002)
- 1 Conversor (VFD-001)
- 1 Válvula (VALVE-001)
- 2 Sensores (TEMP-001, PRESS-001)
- 1 Transformador (TRANS-001)
- 1 Ventilador (FAN-001)

### Planos de Manutenção (15 total):
- Manutenção preventiva para cada equipamento
- Frequências variadas: diárias, semanais, mensais, trimestrais, semestrais, anuais
- Alguns com medição em horas

---

## 🧪 Testar após setup

### 1. Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### 2. Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### 3. Navegador
```
http://localhost:5173
Login → admin@cmms.com / Admin@123456
```

### 4. Verificar Equipamentos
Menu → "Equipamentos" → Devem aparecer 12 items

### 5. Verificar Planos de Manutenção
Menu → "Planos de Manutenção" → Devem aparecer 15 items

---

## 🐛 Se algo der erro

### "Plant ID is required"
```bash
# Confirmar dados carregados:
psql -U cmms_user -d cmms_enterprise -c "SELECT COUNT(*) FROM assets;"
# Deve retornar: 12

# Se 0, executar demo-data.sql novamente
psql -U cmms_user -d cmms_enterprise -f scripts/database/demo-data.sql
```

### "Assets não aparecem"
```bash
# Logout do browser
# Limpar cache (Ctrl+Shift+Delete)
# Login novamente
```

### "Database does not exist"
```bash
# Executar setup script novamente
./scripts/database/setup-demo.sh
```

---

## 📂 Ficheiros Criados

- `demo-data.sql` - Dados realísticos
- `setup-demo.sh` - Script Linux/Mac
- `setup-demo.bat` - Script Windows
- `SETUP_DEMO.md` - Documentação completa

---

## ✔️ Checklist

- [ ] Executar script de setup
- [ ] Confirmar: 8 categorias, 12 equipamentos, 15 planos
- [ ] Backend running em http://localhost:3000
- [ ] Frontend running em http://localhost:5173
- [ ] Login com admin@cmms.com
- [ ] Ver equipamentos (devem ser 12)
- [ ] Ver planos de manutenção (devem ser 15)
- [ ] Criar novo plano de manutenção
- [ ] Criar nova ordem de trabalho

---

**Tudo pronto para testar!** 🎉
