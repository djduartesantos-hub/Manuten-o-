# Roadmap por Fases — Finalização (não final)

Objetivo: transformar o projeto num produto **vendável/profissional** com previsibilidade (hardening + features), sem perder o foco no que já existe.

## Como usar este roadmap
- **Fases** = blocos de 1 sprint (1–2 semanas) ou 2 sprints, consoante equipa.
- **Must / Should / Could** por fase.
- **Dependências** indicam onde mexe: **BD** (migrations/schema), **API** (backend), **UI** (frontend), **Ops** (deploy/monitorização).
- **DoD (Definition of Done)**: critérios práticos para considerar fechado.

---

## Fase 0 — “Release readiness” (Hardening mínimo)

**Must**
- Autenticação/Autorização consistente em todas as rotas (incl. tenant scope) e auditoria dos caminhos críticos.
- ✅ Logs estruturados + request id (mínimo em produção).
- ✅ Rate limit nos endpoints sensíveis (auth, reset password, exports grandes).
- Erros padronizados (não vazar stack/segredos).
- Backups e recuperação (runbook simples).

**Should**
- Healthchecks completos (db/redis/jobs) e página de status no SuperAdmin.
- Política de retenção de audit logs (config).

**Could**
- ✅ “Read-only mode” por tenant (quarentena) para suporte.

**Dependências**
- BD: opcional (tabelas de config/retention, se necessário)
- API: sim
- UI: mínimo (indicadores, mensagens)
- Ops: sim

**DoD**
- Checklist de segurança básica + testes manuais guiados (login, troca tenant, exports, suporte)
- Deploy sem warnings críticos e com logs úteis

---

## Fase 1 — RBAC e Segurança “comercial”

**Must**
- RBAC completo por tenant e fábrica (consistência entre backend e UI).
- Auditoria de mudanças RBAC (quem alterou o quê).
- Gestão de sessões: revogar token/sessões ativas.

**Should**
- Políticas de password por tenant (comprimento, expiração opcional, lockout básico).
- Alertas de drift (RBAC drift + integridade) com export.

**Could**
- MFA (TOTP) por tenant.

**Dependências**
- BD: provável (sessões/refresh tokens, audit diffs)
- API: sim
- UI: sim

**DoD**
- Matriz RBAC completa (com paginação) + export
- Alterações RBAC geram audit log

---

## Fase 2 — Work Orders “profissional” (fluxos + evidências)

**Must**
- Workflow de OT consistente: estados, transições e permissões.
- Evidências: anexos/fotos antes/depois, comentários, histórico.
- SLA por prioridade (pelo menos cálculo e reporting básico).

**Should**
- Templates de OT por tipo de manutenção.
- Reabertura com motivo.

**Could**
- Assinatura (simples) e relatório PDF.

**Dependências**
- BD: provável (anexos, timeline, SLA)
- API: sim
- UI: sim

**DoD**
- OT tem timeline completa e auditoria
- Regras de transição testadas (manual + unit quando existir)

---

## Fase 3 — Preventivas e Planeamento (calendário)

**Must**
- Calendário unificado (preventivas + OTs + paragens planeadas).
- Regras de recorrência/planeamento robustas.
- Alertas de atraso e próximos eventos.

**Should**
- Checklists dinâmicas por tipo de ativo/plano.
- Métricas MTBF/MTTR por ativo (mínimo).

**Could**
- Aprovação de planos por gestor.

**Dependências**
- BD: provável
- API/UI: sim

**DoD**
- Planeamento por fábrica com visão semanal/mensal
- Export de indicadores por fábrica

---

## Fase 4 — Stock/Peças + Compras (core industrial)

**Must**
- Stock mínimo, movimentos (entrada/saída), consumo por OT.
- Inventário por fábrica.

**Should**
- Requisições internas e receção.
- Lotes/validade (se necessário ao mercado).

**Could**
- Integração com ERP (export/import).

**Dependências**
- BD: sim
- API/UI: sim

**DoD**
- Inventário fecha com auditoria e export
- OTs registam consumo de peças com custo

---

## Fase 5 — Reports/BI e Exportações “vendáveis”

**Must**
- Relatórios essenciais: backlog aging, preventivas, custos, SLA.
- Export CSV/JSON em tudo o que for operacional.

**Should**
- Relatórios agendados (email).
- Dashboards por persona.

**Could**
- PDF “bonito” para cliente.

**Dependências**
- API/UI: sim
- Ops: email provider/queue

**DoD**
- 5–10 relatórios que respondem a perguntas comerciais reais
- Export consistente e sem timeouts

---

## Fase 6 — Suporte e Operações (SuperAdmin) + Tickets (futuro)

**Must**
- Consola de suporte completa (já existe base): bundles, integridade, drift, exports.
- Ferramentas seguras (com auditoria) para reset/repair e ações de suporte.

**Should**
- “Health score” por tenant e alertas.
- ✅ Modo quarentena/readonly.

**Could**
- Sistema de Tickets (ver docs/ROADMAP_SUPERADMIN_TICKETS.md)

**Dependências**
- BD/API/UI: sim

**DoD**
- Qualquer incidente consegue ser diagnosticado com 1 bundle + 1 export

---

## Priorização sugerida (para fechar rápido)
- Se o objetivo é **venda rápida**: Fase 0 → 1 → 2 → 3 → 5 → 4 → 6.
- Se o objetivo é **industrial/logística**: Fase 0 → 1 → 3 → 4 → 2 → 5 → 6.

---

## Backlog transversal (sempre)
- Performance: paginação, índices, limites em exports.
- Segurança: redaction de logs, secrets, CORS/headers, auditoria.
- UX: consistência de formulários, erros, loading, empty-states.
- Qualidade: scripts de build/check, lint, e testes (onde houver estrutura).

