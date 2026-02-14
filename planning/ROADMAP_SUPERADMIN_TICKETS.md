# Roadmap — Tickets (implementado) + próximos passos

Objetivo: ter um sistema de **tickets de suporte/operacionais** para acompanhar problemas/ações em **Fábrica → Empresa → SuperAdmin**, sem depender de ferramentas externas.

## Problema que resolve
- Hoje, diagnósticos/auditoria/exportações existem, mas falta um “fio condutor” para:
  - registar um incidente (ex.: falhas recorrentes, integridade, RBAC drift);
  - atribuir responsáveis;
  - acompanhar estado (aberto → em progresso → resolvido);
  - deixar histórico de decisões/ações.

## Estado atual (implementado)
- Fluxo hierárquico: **fábrica → empresa → superadmin**
  - Apenas **gestor de fábrica** reencaminha para empresa.
  - Apenas **admin/gestor de empresa** reencaminha para superadmin.
  - Exceção: **“problema geral”** cria já no nível **superadmin**.
- Campos/estado (atuais): `title`, `description`, `status` + `level` (`fabrica|empresa|superadmin`) + `plant_id` (quando aplicável) + `is_general`.
- Comentários: `ticket_comments` (com autor e timestamps).
- Timeline/auditoria: `ticket_events` (eventos como create/comment/status change/forward).
- Notificações: eventos de ticket geram notificações in-app (regras por tenant).
- Paginação/filtros: `q`/`status` e `limit/offset` nas listagens.
- RBAC: permissões `tickets:read`, `tickets:write`, `tickets:forward` aplicadas às rotas.

## Integrações desejadas (backlog)
- **Auto-criação sugerida** (não automática no MVP) quando:
  - Integrity checks > 0 em checks críticos
  - RBAC drift relevante (roles sem permissões, permissões não usadas)
  - picos de resets/password ou outras anomalias
- “Anexar bundle diagnóstico” (JSON/ZIP) como referência:
  - guardar URL/metadata do export ou checksum

## UX (simples, inline)
- Listagem: filtros básicos por `status` e pesquisa (`q`) + paginação.
- Detalhe do ticket: painel com descrição + comentários + timeline.
- Ações rápidas: alterar estado, reencaminhar (quando aplicável), adicionar comentário.

## Back-end (implementado)
- Tabelas:
  - `tickets`
  - `ticket_comments`
  - `ticket_events`
- Endpoints (alto nível):
  - Fábrica (plant-scoped): listar/criar/detalhe/comentar/alterar estado/reencaminhar.
  - Empresa (tenant-scoped): listar/detalhe/comentar/alterar estado/reencaminhar.
  - SuperAdmin: listar/detalhe/atualizar/comentar.

## Próximos passos sugeridos (não incluídos no MVP atual)
- `severity`, `assignee`, `tags`.
- Anexos (imagens/ficheiros) por ticket e por comentário.
- Regras de auto-sugestão/auto-criação (integridade/drift/anomalias).
- SLA e métricas (ex.: aging por estado, tempo até 1ª resposta, tempo até resolução).
