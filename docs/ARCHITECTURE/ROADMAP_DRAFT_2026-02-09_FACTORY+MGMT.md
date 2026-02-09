# Roadmap Draft — Factory + Management (2026-02-09)

Este ficheiro é um **ROADMAP novo (draft)** para consolidar as próximas melhorias (fábrica + gestão), sem mexer já no [docs/ARCHITECTURE/ROADMAP_2026.md](docs/ARCHITECTURE/ROADMAP_2026.md).

**Objetivo:** escolher prioridades, identificar alterações de BD/API necessárias e preparar uma atualização “limpa” do README/ROADMAP oficial.

---

## Princípios

- **Operação primeiro:** nada deve travar o chão de fábrica sem alternativa (soft-first).
- **Governança sem fricção:** regras claras, UX direta, validações coerentes.
- **Dados reutilizáveis:** downtime, motivos e SLAs devem alimentar KPIs e alertas.
- **Compatibilidade:** alterações de validação devem vir acompanhadas de UI.

---

## Fase 0 — Quick Wins (1-2 semanas)

**Ordens**
- CTA “Cancelar” com motivo obrigatório no próprio botão.
- CTA “Pausar” com motivo (já existe) consistente em todos os fluxos.
- Campos recomendados no fecho: causa raiz + ação corretiva (começar como opcional).

**Preventivas**
- “Adiar/Skip ciclo” com motivo.
- Melhorias de preview e clareza de geração do próximo schedule.

**Relatórios**
- Export simples de downtime (por ativo e por período).

**DB/API**
- Preferência por **sem migrações**; se necessário, introduzir apenas campos opcionais.

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

**Aceitação**
- Ao fechar, sistema garante que o operador não perde informação (campos visíveis no modal).
- Timeline mostra pelo menos: transições de estado, motivos de pausa/cancel, downtime e conclusão.

---

## Fase 2 — Preventivas: tolerância (soft/hard) + âncora (3-4 semanas)

**Entrega**
- Tolerância com modos:
  - soft: aviso
  - hard: exige justificação (ou bloqueia) fora da janela
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

---

## Fase 5 — Relatórios/KPIs: downtime e execução (2-4 semanas)

**Entrega**
- Pareto downtime: top causas e top ativos.
- KPIs por fase: tempo médio em análise/execução, taxa de pausas, compliance com tolerância.

**DB/API**
- Pode ser derivado, mas pode justificar materialized views ou jobs periódicos.

---

## Próxima decisão (para fechar o draft)

Escolher:
1) Quais 3 itens entram na Fase 0 agora
2) Se a timeline vai ser derivada de audit logs ou se criamos `work_order_events`
3) Se tolerância hard é por “justificação” ou “bloqueio”
