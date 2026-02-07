import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { notificationRules } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { CacheKeys, RedisService } from '../services/redis.service.js';
import { NotificationService } from '../services/notification.service.js';

const ALLOWED_EVENTS = [
  'work_order_status_changed',
  'work_order_assigned',
  'sla_overdue',
  'stock_low',
];

export async function getNotificationRules(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const rules = await NotificationService.getRules(tenantId);
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rules',
    });
  }
}

export async function updateNotificationRules(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const rules = req.body?.rules;

    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    if (!Array.isArray(rules)) {
      res.status(400).json({ success: false, error: 'Rules must be an array' });
      return;
    }

    const now = new Date();
    const updated: any[] = [];

    for (const rule of rules) {
      const eventType = String(rule.event_type || '').trim();
      if (!ALLOWED_EVENTS.includes(eventType)) {
        res.status(400).json({ success: false, error: `Evento invalido: ${eventType}` });
        return;
      }

      const channels = Array.isArray(rule.channels)
        ? rule.channels.filter((value: any) => typeof value === 'string')
        : [];
      const recipients = Array.isArray(rule.recipients)
        ? rule.recipients.filter((value: any) => typeof value === 'string')
        : [];
      const isActive = rule.is_active !== false;

      const existing = await db.query.notificationRules.findFirst({
        where: (fields: any, { and, eq }: any) =>
          and(eq(fields.tenant_id, tenantId), eq(fields.event_type, eventType)),
      });

      if (existing) {
        const [row] = await db
          .update(notificationRules)
          .set({
            channels,
            recipients,
            is_active: isActive,
            updated_at: now,
          })
          .where(and(eq(notificationRules.id, existing.id), eq(notificationRules.tenant_id, tenantId)))
          .returning();
        updated.push(row);
      } else {
        const [row] = await db
          .insert(notificationRules)
          .values({
            tenant_id: tenantId,
            event_type: eventType,
            channels,
            recipients,
            is_active: isActive,
            created_at: now,
            updated_at: now,
          })
          .returning();
        updated.push(row);
      }
    }

    await RedisService.del(CacheKeys.notificationRules(tenantId));

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update rules',
    });
  }
}
