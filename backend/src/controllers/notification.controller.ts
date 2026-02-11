import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { notificationRules, notifications } from '../db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import { CacheKeys, RedisService } from '../services/redis.service.js';
import { NotificationService } from '../services/notification.service.js';

const ALLOWED_EVENTS = [
  'work_order_status_changed',
  'work_order_assigned',
  'sla_overdue',
  'stock_low',
  'preventive_overdue',
  'asset_critical',
];

function toNotificationDto(row: any) {
  return {
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    message: row.message,
    level: row.level,
    entity: row.entity,
    entityId: row.entity_id,
    meta: row.meta,
    read: Boolean(row.is_read),
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

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

export async function getNotificationsInbox(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const limitRaw = Number(req.query?.limit ?? 50);
    const offsetRaw = Number(req.query?.offset ?? 0);
    const unreadOnly = String(req.query?.unreadOnly ?? 'false') === 'true';

    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

    const whereBase = and(eq(notifications.tenant_id, tenantId), eq(notifications.user_id, userId));

    const items = await db.query.notifications.findMany({
      where: (fields: any, { and, eq }: any) => {
        const base = and(eq(fields.tenant_id, tenantId), eq(fields.user_id, userId));
        return unreadOnly ? and(base, eq(fields.is_read, false)) : base;
      },
      orderBy: (fields: any, { desc }: any) => [desc(fields.created_at)],
      limit,
      offset,
    });

    const unreadCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(whereBase, eq(notifications.is_read, false)));
    const unreadCount = Number(unreadCountRows?.[0]?.count ?? 0);

    res.json({
      success: true,
      data: {
        items: items.map(toNotificationDto),
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch inbox',
    });
  }
}

export async function markNotificationsReadAll(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const now = new Date();
    const result = await db
      .update(notifications)
      .set({
        is_read: true,
        read_at: now,
      })
      .where(and(eq(notifications.tenant_id, tenantId), eq(notifications.user_id, userId), eq(notifications.is_read, false)));

    res.json({ success: true, data: { updated: result.rowCount ?? 0 } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notifications read',
    });
  }
}

export async function clearNotificationsInbox(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.tenant_id, tenantId), eq(notifications.user_id, userId)));

    res.json({ success: true, data: { deleted: result.rowCount ?? 0 } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear inbox',
    });
  }
}
