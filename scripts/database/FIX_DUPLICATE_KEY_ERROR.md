# 🔧 Solução: Erro "duplicate key violates unique constraint 'plants_tenant_code_idx'"

## 📋 O que era o problema?

Ao executar o script `demo-data.sql` múltiplas vezes, o seguinte erro ocorria:
```
ERROR: duplicate key value violates unique constraint "plants_tenant_code_idx"
```

## 🐛 Causa raiz

1. **Typo no tenant_id**: Uma linha do script tinha um UUID incorreto para tenant_id
   - Linha do asset "Válvula de Controlo Principal" usava: `550e8400-0000-0000-0000-000000000001`
   - Deveria usar: `550e8400-e29b-41d4-a716-446655440000`

2. **Restrição única**: A tabela `plants` tem uma constraint única em `(tenant_id, code)` para evitar duplicatas de códigos de planta dentro do mesmo tenant

## ✅ Solução implementada

### 1. **Corrigido o typo** 
- Arquivo: [scripts/database/demo-data.sql](demo-data.sql)
- Linha 78: Corrigido tenant_id para o valor correto

### 2. **Novo script de reset seguro**
- Arquivo: [scripts/database/reset-demo-data.sql](reset-demo-data.sql)
- Purpose: Limpar dados demo antigos antes de recarregar
- Safe: Deleta apenas dados demo (IDs padrão como 20000000-*, etc.)
- Preserva: Admin user e plants principais

### 3. **Melhorado o demo-data.sql**
- Agora é **idempotente** (pode executar múltiplas vezes)
- Usa `ON CONFLICT DO NOTHING` em todos os INSERTs
- Comentários de limpeza opcional

## 🚀 Como usar agora?

### Opção A: Primeira vez (sem dados antigos)
```bash
# Apenas executar
psql -U cmms_user -d cmms_enterprise -h localhost -f scripts/database/demo-data.sql
```

### Opção B: Recarregar dados (já tem demo-data antigo)
```bash
# 1. Limpar dados antigos
psql -U cmms_user -d cmms_enterprise -h localhost -f scripts/database/reset-demo-data.sql

# 2. Recarregar dados novos
psql -U cmms_user -d cmms_enterprise -h localhost -f scripts/database/demo-data.sql
```

### Opção C: No DBeaver ou GUI SQL
```
1. Abrir: reset-demo-data.sql
2. Executar (opcional, apenas se já tem dados demo antigos)
3. Abrir: demo-data.sql
4. Executar
```

## 📊 Verificar resultado esperado

Após executar os scripts, deverá ver:
```
 categorias | equipamentos | planos_manutencao
 -----------+--------------+-------------------
          8 |           12 |                15
```

## 🔍 Se ainda tiver problema?

### Verificar dados existentes:
```sql
-- Ver quantos assets tem para each tenant
SELECT tenant_id, COUNT(*) as total_assets FROM assets GROUP BY tenant_id;

-- Ver especificamente os dados demo
SELECT COUNT(*) FROM assets WHERE id LIKE '20000000-%';
```

### Forçar limpeza (cuidado!):
```sql
-- Deletar TODOS os assets/categories/planos (não recomendado)
DELETE FROM maintenance_plans WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
DELETE FROM assets WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
DELETE FROM asset_categories WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Depois: Reexecutar demo-data.sql
```

## 📚 Relacionados

- [README.md](README.md) - Overview de todos os scripts
- [SETUP_DEMO.md](SETUP_DEMO.md) - Setup completo com dados demo
- [/docs/GUIDES/TROUBLESHOOTING.md](/docs/GUIDES/TROUBLESHOOTING.md) - Troubleshooting geral

---

**Commit**: `a19451f` - Fix duplicate key error in demo-data.sql  
**Data**: 2026-02-05
