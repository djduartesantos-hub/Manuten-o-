# Runbook (Operação) — Backup & Recuperação

Este runbook é intencionalmente simples: serve para **suporte/ops** conseguir diagnosticar e recuperar o serviço com passos repetíveis.

## 1) Pré-requisitos

- Acesso ao ambiente (Docker/Render/Railway/VM)
- Variáveis de ambiente:
  - `DATABASE_URL` (Postgres)
  - (Opcional) `REDIS_URL`
- Acesso ao repo (para usar scripts em `scripts/`)

## 2) Health checks

- Backend:
  - `GET /health`
  - `GET /api/superadmin/health` (melhor esforço: Redis/Elasticsearch/queues)

Se a API responder mas houver erros funcionais, exportar um bundle:
- `GET /api/superadmin/diagnostics/bundle/export`

## 3) Backup da base de dados (Postgres)

Recomendado:
- Backups automáticos diários + retenção mínima (ex.: 7–30 dias)
- Backup antes de migrações/atualizações

Exemplo (pg_dump) — ajuste para o teu ambiente:
- `pg_dump --format=custom --file backup.dump "$DATABASE_URL"`

Validação rápida do ficheiro:
- `pg_restore --list backup.dump | head`

## 4) Recuperação (restore)

Atenção: restore pode sobrescrever dados.

Exemplo (pg_restore):
- Criar uma base de dados vazia (ou schema alvo)
- `pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" backup.dump`

Depois:
- Reiniciar o serviço
- Validar `GET /health` e fluxos críticos (login, escolher tenant/planta, listagens)

## 5) Migrações

O projeto usa Drizzle. No backend existem scripts de migração manual:
- `backend/migrate-manual.sh`

Antes de migrar:
- fazer backup
- validar `DATABASE_URL`

Após migrar:
- validar endpoints principais
- se houver erro de RBAC/permissões, correr o setup/repair em `/api/setup/*` ou usar SuperAdmin diagnostics.

## 6) Incidentes comuns

### 6.1) Erros de permissões após deploy

- Confirmar se as tabelas RBAC existem e estão seeded.
- Se necessário, exportar drift/integridade:
  - `GET /api/superadmin/metrics/rbac/drift`
  - `GET /api/superadmin/diagnostics/integrity`

### 6.2) Timeouts em exports

- Preferir exports paginados quando existirem.
- Validar rate limits e logs com `x-request-id`.

## 7) Observabilidade

- Todas as respostas incluem `x-request-id`.
- Em caso de erro 5xx, recolher o `requestId` do cliente e correlacionar com logs.
