import { db } from '../config/database.js';
import { slaRules } from '../db/schema.js';

export type TicketPriority = 'baixa' | 'media' | 'alta' | 'critica';

export async function getTicketSlaHours(tenantId: string, priority: TicketPriority): Promise<{
  responseHours: number;
  resolutionHours: number;
}> {
  // Default fallback (same order of magnitude as work orders)
  const defaults: Record<TicketPriority, { responseHours: number; resolutionHours: number }> = {
    baixa: { responseHours: 24, resolutionHours: 96 },
    media: { responseHours: 12, resolutionHours: 72 },
    alta: { responseHours: 4, resolutionHours: 24 },
    critica: { responseHours: 1, resolutionHours: 8 },
  };

  try {
    const row = await db.query.slaRules.findFirst({
      where: (fields: any, { and, eq }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.entity_type, 'ticket'),
          eq(fields.priority, priority as any),
          eq(fields.is_active, true),
        ),
    });

    if (row && Number.isFinite(row.response_time_hours) && Number.isFinite(row.resolution_time_hours)) {
      return {
        responseHours: Math.max(1, Number(row.response_time_hours)),
        resolutionHours: Math.max(1, Number(row.resolution_time_hours)),
      };
    }
  } catch {
    // best-effort
  }

  return defaults[priority] || defaults.media;
}

export async function computeTicketSlaDeadlines(params: {
  tenantId: string;
  priority: TicketPriority;
  baseDate?: Date;
}): Promise<{ slaResponseDeadline: Date; slaResolutionDeadline: Date }> {
  const base = params.baseDate ? new Date(params.baseDate) : new Date();
  const { responseHours, resolutionHours } = await getTicketSlaHours(params.tenantId, params.priority);

  return {
    slaResponseDeadline: new Date(base.getTime() + responseHours * 60 * 60 * 1000),
    slaResolutionDeadline: new Date(base.getTime() + resolutionHours * 60 * 60 * 1000),
  };
}
