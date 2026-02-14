# Roadmap por Fases — Finalização (não final)

> Roadmap visual por funções (derivado das ideias, com checklist):
> - [planning/ROADMAP_FUNCOES_VISUAL.md](planning/ROADMAP_FUNCOES_VISUAL.md)

Objetivo: transformar o projeto num produto **vendável/profissional** com previsibilidade (hardening + features), sem perder o foco no que já existe.

## Como usar este roadmap
- **Fases** = blocos de 1 sprint (1–2 semanas) ou 2 sprints, consoante equipa.
- **Must / Should / Could** por fase.
- **Dependências** indicam onde mexe: **BD** (migrations/schema), **API** (backend), **UI** (frontend), **Ops** (deploy/monitorização).
- **DoD (Definition of Done)**: critérios práticos para considerar fechado.

---

## Fase 0 — “Release readiness” (Hardening mínimo)

**O que é**
- Hardening e estabilização para produção: segurança básica, observabilidade, erros consistentes e capacidade de recuperar.

**Para que serve**
- Garantir que o produto é **operável** (suporte consegue diagnosticar) e **seguro** (não vaza segredos, não cai com abuso), antes de adicionar mais features.

**Must**
- Autenticação/Autorização consistente em todas as rotas (incl. tenant scope) e auditoria dos caminhos críticos.
- Logs estruturados + request id (mínimo em produção).
- Rate limit nos endpoints sensíveis (auth, reset password, exports grandes).
- Erros padronizados (não vazar stack/segredos).
- Backups e recuperação (runbook simples).

**Should**
- Healthchecks completos (db/redis/jobs) e página de status no SuperAdmin.
- Política de retenção de audit logs (config).

**Could**
- “Read-only mode” por tenant (quarentena) para suporte.

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

**O que é**
- Formalizar o modelo de permissões (RBAC) e reforçar segurança/gestão de sessão para um uso “de empresa”.

**Para que serve**
- Evitar “Permissões insuficientes” inesperadas, permitir auditoria/controlo e suportar equipas com roles diferentes sem risco de acesso indevido.

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

**O que é**
- Evoluir as Ordens de Trabalho (OT) para um ciclo de vida completo: workflow, evidências e histórico.

**Para que serve**
- Transformar OTs em registos confiáveis (para equipa e cliente), com rastreabilidade, prova de execução e medição de SLA.

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

**O que é**
- Planeamento robusto de manutenção preventiva (recorrência) com calendário unificado e alertas.

**Para que serve**
- Reduzir falhas por falta de planeamento e dar visibilidade (semanal/mensal) do que vem a seguir, do que está atrasado e do impacto operacional.

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

**O que é**
- Gestão de stock e consumo por OT (inventário, movimentos, mínimos) com base industrial.

**Para que serve**
- Evitar ruturas de peças, controlar custos por manutenção e suportar processos de compra/receção com rastreabilidade.

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

**O que é**
- Pacote de relatórios e exports consistentes focados em métricas “de compra”: SLA, custos, backlog, preventivas.

**Para que serve**
- Tornar o produto mais “vendável”: responder rapidamente a perguntas de gestão e permitir extração de dados sem trabalho manual.

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

## Fase 6 — Suporte e Operações (SuperAdmin) + Tickets

**O que é**
- Consola de operações/suporte para gerir saúde, diagnósticos, exportações e ações de reparação com auditoria.

**Para que serve**
- Reduzir tempo de resolução de incidentes e dar ferramentas seguras de suporte sem mexer diretamente na BD.

**Must**
- Consola de suporte completa (já existe base): bundles, integridade, drift, exports.
- Ferramentas seguras (com auditoria) para reset/repair e ações de suporte.
- Sistema de Tickets (implementado): fluxo **fábrica → empresa → superadmin** (com exceção “problema geral” direto ao SuperAdmin), comentários e gestão de estado.

**Should**
- “Health score” por tenant e alertas.
- Modo quarentena/readonly.
- Auditoria/timeline por ticket (eventos) + notificação in-app dos eventos.
- Filtros/paginação básicos na listagem (q/status + limit/offset).
- RBAC por permissão para tickets (ex.: `tickets:read`, `tickets:write`, `tickets:forward`).

**Could**
- Melhorias incrementais de tickets (ver planning/ROADMAP_SUPERADMIN_TICKETS.md)

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

