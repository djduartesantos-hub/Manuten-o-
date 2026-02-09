export function getWorkOrderPauseMs(order: any, now: Date = new Date()): number {
  const accumulated = Number(order?.sla_paused_ms ?? 0);
  const startedAt = order?.sla_pause_started_at ? new Date(order.sla_pause_started_at) : null;
  if (!startedAt || Number.isNaN(startedAt.getTime())) return Math.max(0, accumulated);

  const delta = now.getTime() - startedAt.getTime();
  return Math.max(0, accumulated + Math.max(0, delta));
}

export function getEffectiveSlaDeadline(order: any, now: Date = new Date()): Date | null {
  if (!order?.sla_deadline) return null;
  const base = new Date(order.sla_deadline);
  if (Number.isNaN(base.getTime())) return null;

  const excludePause = order?.sla_exclude_pause !== false;
  if (!excludePause) return base;

  const pauseMs = getWorkOrderPauseMs(order, now);
  return new Date(base.getTime() + pauseMs);
}

export function isSlaOverdue(order: any, now: Date = new Date()): boolean {
  const effective = getEffectiveSlaDeadline(order, now);
  if (!effective) return false;
  return effective.getTime() < now.getTime();
}

export function shouldSuppressSlaAlertsWhilePaused(order: any): boolean {
  const excludePause = order?.sla_exclude_pause !== false;
  const status = String(order?.status ?? '');
  return excludePause && status === 'em_pausa';
}

export function getWorkOrderStatusAgingMs(order: any, now: Date = new Date()): number | null {
  const status = String(order?.status ?? '');

  const safeDate = (value: any): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const createdAt = safeDate(order?.created_at);
  const analysisStartedAt = safeDate(order?.analysis_started_at);
  const startedAt = safeDate(order?.started_at);
  const pausedAt = safeDate(order?.paused_at);
  const pauseStartedAt = safeDate(order?.sla_pause_started_at);

  const diff = (from: Date | null) => (from ? Math.max(0, now.getTime() - from.getTime()) : null);

  if (status === 'aberta') {
    return diff(createdAt);
  }

  if (status === 'em_analise') {
    return diff(analysisStartedAt || createdAt);
  }

  if (status === 'em_execucao') {
    if (!startedAt && !analysisStartedAt && !createdAt) return null;
    const base = diff(startedAt || analysisStartedAt || createdAt);
    if (base === null) return null;
    const pauseMs = getWorkOrderPauseMs(order, now);
    return Math.max(0, base - pauseMs);
  }

  if (status === 'em_pausa') {
    return diff(pauseStartedAt || pausedAt || startedAt || analysisStartedAt || createdAt);
  }

  // For final states we don't compute live aging
  return null;
}
