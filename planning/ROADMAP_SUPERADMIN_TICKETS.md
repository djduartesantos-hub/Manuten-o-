# Roadmap (Futuro) — Tickets no SuperAdmin

Objetivo: adicionar um sistema de **tickets de suporte/operacionais** para facilitar o acompanhamento de problemas/ações em **Empresa** e **Fábrica**, sem depender de ferramentas externas.

## Problema que resolve
- Hoje, diagnósticos/auditoria/exportações existem, mas falta um “fio condutor” para:
  - registar um incidente (ex.: falhas recorrentes, integridade, RBAC drift);
  - atribuir responsáveis;
  - acompanhar estado (aberto → em progresso → resolvido);
  - deixar histórico de decisões/ações.

## Escopo proposto (MVP)
- **Criar ticket** a partir de contextos:
  - página Empresa (tenant)
  - página Fábrica (plant)
  - página Suporte (SuperAdmin)
- Campos:
  - `title`, `description`
  - `scope`: `global` | `tenant` | `plant`
  - `tenantId?`, `plantId?`
  - `severity`: `low` | `medium` | `high` | `critical`
  - `status`: `open` | `in_progress` | `blocked` | `resolved` | `closed`
  - `assigneeUserId?`
  - `tags[]`
- Timeline:
  - comentários/eventos (status change, assign, note)
  - ligação a eventos do audit log (opcional)

## Integrações desejadas
- **Auto-criação sugerida** (não automática no MVP) quando:
  - Integrity checks > 0 em checks críticos
  - RBAC drift relevante (roles sem permissões, permissões não usadas)
  - picos de resets/password ou outras anomalias
- “Anexar bundle diagnóstico” (JSON/ZIP) como referência:
  - guardar URL/metadata do export ou checksum

## UX (simples, inline)
- Listagem: filtros básicos por `status`, `severity`, `scope`.
- Detalhe do ticket: painel com descrição + timeline.
- Ações rápidas: alterar estado, atribuir, adicionar nota.

## Back-end (estrutura sugerida)
- Tabelas:
  - `superadmin_tickets`
  - `superadmin_ticket_events`
- Endpoints (exemplos):
  - `GET /api/superadmin/tickets?status=&severity=&tenantId=&plantId=`
  - `POST /api/superadmin/tickets`
  - `GET /api/superadmin/tickets/:id`
  - `POST /api/superadmin/tickets/:id/events`
  - `PATCH /api/superadmin/tickets/:id` (status/assignee)
- Regras multi-tenant:
  - tickets podem ser globais, por tenant, ou por fábrica
  - o SuperAdmin deve ver tudo; outros papéis apenas o seu âmbito (se necessário futuramente)

## Observações
- Manter compatibilidade com o modelo atual de “Global por default” no SuperAdmin.
- Priorizar consistência de exportações/auditoria (tickets também devem gerar audit logs).
