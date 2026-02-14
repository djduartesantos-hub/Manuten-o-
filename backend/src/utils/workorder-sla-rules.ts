import { db } from '../config/database.js';

export type WorkOrderPriority = 'baixa' | 'media' | 'alta' | 'critica';

export async function getWorkOrderSlaHours(
  tenantId: string,
  priority: WorkOrderPriority,
): Promise<number> {
  const defaults: Record<WorkOrderPriority, number> = {
    baixa: 96,
    media: 72,
    alta: 24,
    critica: 8,
  };

  try {
    const row = await db.query.slaRules.findFirst({
      where: (fields: any, { and, eq }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.entity_type, 'work_order'),
          eq(fields.priority, priority as any),
          eq(fields.is_active, true),
        ),
    });

    if (row && Number.isFinite(row.resolution_time_hours)) {
      return Math.max(1, Number(row.resolution_time_hours));
    }
  } catch {
    // best-effort
  }

  return defaults[priority] || defaults.media;
}

export async function computeWorkOrderSlaDeadline(params: {
  tenantId: string;
  priority: WorkOrderPriority;
  baseDate?: Date;
}): Promise<Date> {
  const base = params.baseDate ? new Date(params.baseDate) : new Date();
  const hours = await getWorkOrderSlaHours(params.tenantId, params.priority);
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}
