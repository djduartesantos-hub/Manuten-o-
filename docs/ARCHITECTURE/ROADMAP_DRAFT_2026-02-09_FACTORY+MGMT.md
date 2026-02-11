# Roadmap Draft — Factory + Management (2026-02-09)

Este ficheiro é um **ROADMAP novo (draft)** para consolidar as próximas melhorias (fábrica + gestão), sem mexer já no [docs/ARCHITECTURE/ROADMAP_2026.md](docs/ARCHITECTURE/ROADMAP_2026.md).

**Objetivo:** escolher prioridades, identificar alterações de BD/API necessárias e preparar uma atualização “limpa” do README/ROADMAP oficial.

---

## Princípios

- **Operação primeiro:** nada deve travar o chão de fábrica sem alternativa (soft-first).
- **Governança sem fricção:** regras claras, UX direta, validações coerentes.
- **Dados reutilizáveis:** downtime, motivos e SLAs devem alimentar KPIs e alertas.
- **Compatibilidade:** alterações de validação devem vir acompanhadas de UI.

> Nota (2026-02-11): há um track paralelo de **Multi-fábrica + Perfil + Home por Role + Login** que vive no roadmap geral:
> - ver [ROADMAP_2026.md](./ROADMAP_2026.md) (Phase 3D)
>
> Este draft mantém foco em **operação de fábrica** (ordens, preventivas, stock, SLA), mas algumas entregas assumem que o scoping por fábrica está bem definido.

---

## Fase 0 — Quick Wins (1-2 semanas)

**Selecionado (vamos começar por aqui)**
1) Ordens: CTA dedicado **Cancelar** com motivo no próprio fluxo
2) Ordens: CTA dedicado **Pausar** com motivo no próprio fluxo (sem depender do dropdown)
3) Preventivas: ação explícita **Adiar/Skip ciclo** com motivo

**Ordens**
- CTA “Cancelar” com motivo obrigatório no próprio botão.
- CTA “Pausar” com motivo (já existe) consistente em todos os fluxos.

**Preventivas**
- “Adiar/Skip ciclo” com motivo.
- Melhorias de preview e clareza de geração do próximo schedule.

**Relatórios**
- Export simples de downtime (por ativo e por período).

**DB/API**
- Preferência por **sem migrações**; se necessário, introduzir apenas campos opcionais.

**Dependência (quando multi-fábrica estiver ativa)**
- Garantir que toda a leitura/escrita aqui está corretamente scoped por `plant_id`/`factory_id`.

**Aceitação (Fase 0)**
- Operador consegue pausar/cancelar sem depender do dropdown de estado.
- Motivo é obrigatório e validado (frontend + backend) antes de submeter.
- Não há migração de BD nesta fase.

---

## Fase 1 — Ordens: timeline + requisitos de fecho (2-3 semanas)

**Entrega**
- Timeline legível (eventos chave) + consistência entre audit logs e UI.
- Downtime com:
  - tipo: total/parcial
  - categoria: produção/segurança/energia/peças/outras
- Fecho com recomendação (ou regra por role) de causa raiz e ação corretiva.

**DB/API (provável)**
- `work_orders`
  - `root_cause` (text)
  - `corrective_action` (text)
  - `downtime_type` (text/enum)
  - `downtime_category` (text/enum)
- Alternativa (mais robusta): tabela `work_order_events` (timeline própria).

**Decisão (por agora)**
- Timeline começa por ser **derivada de audit logs** (mais simples/rápido).
- `work_order_events` só entra se precisarmos de: eventos manuais, performance, ou relatórios por evento muito específicos.

**Aceitação**
- Ao fechar, sistema garante que o operador não perde informação (campos visíveis no modal).
- Timeline mostra pelo menos: transições de estado, motivos de pausa/cancel, downtime e conclusão.

---

## Fase 2 — Preventivas: tolerância (soft/hard) + âncora (3-4 semanas)

**Entrega**
- Tolerância com modos:
  - soft: aviso
  - hard: exige **justificação** fora da janela (sem bloquear por defeito)
- Âncora de agendamento:
  - fixo (ex.: sempre 2ª às 08:00)
  - intervalo (baseado em completion/scheduled)
- Anti-duplicados inteligente (1 ativo por janela).

**DB/API (provável)**
- `maintenance_plans`
  - `tolerance_mode` (soft|hard)
  - `schedule_anchor` (fixed|interval)
  - (opcional) `fixed_weekday`, `fixed_time`

**Aceitação**
- Operador consegue executar sem bloqueios inesperados (soft por defeito).
- Hard mode só aplicado quando explicitamente ativado por plano.

---

## Fase 3 — Stock/Peças: reserva + kits + previsão (3-5 semanas)

**Entrega**
- Reserva de peças por ordem.
- Kits por plano/categoria de ativo.
- Previsão simples: consumo planeado vs stock.

**DB/API (provável)**
- `stock_reservations`
- `maintenance_kits`, `maintenance_kit_items`

**Aceitação**
- Stock disponível = stock total - reservas ativas.
- Cancelar/fechar liberta reservas automaticamente.

---

## Fase 4 — Alertas/SLA: aging por fase + excluir pausa (2-3 semanas)

**Entrega**
- SLA com opção: “tempo em pausa não conta”.
- Alertas por aging em fase (análise/execução).
- Notificações ao retomar de pausa.

**DB/API (provável)**
- Config SLA: `exclude_paused_time`.
- (Opcional) job de agregação para métricas por fase.

**Multi-fábrica (nota)**
- Thresholds e notificações devem ser configuráveis **por fábrica** (evita ruído e configurações globais inadequadas).

---

## Fase 5 — Relatórios/KPIs: downtime e execução (2-4 semanas)

**Entrega**
- Pareto downtime: top causas e top ativos.
- KPIs por fase: tempo médio em análise/execução, taxa de pausas, compliance com tolerância.

**DB/API**
- Pode ser derivado, mas pode justificar materialized views ou jobs periódicos.

---

## Decisões (estado)

- **Fase 0 (itens):** fechada (lista acima).
- **Timeline:** começa por ser **derivada de audit logs**; `work_order_events` só entra se houver necessidade real (eventos manuais, performance, relatórios por evento).
- **Tolerância hard:** é por **justificação** (sem bloqueio por defeito).
