import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { notificationRules, spareParts, stockMovements, userPlants, workOrders } from '../db/schema.js';
import { CacheKeys, CacheTTL, RedisService } from './redis.service.js';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';

const MANAGER_ROLES = ['gestor_manutencao', 'admin_empresa', 'superadmin'];
const DEFAULT_RULES = [
  {
    event_type: 'work_order_status_changed',
    channels: ['in_app', 'socket'],
    recipients: ['assigned', 'creator', 'managers', 'plant_users'],
    is_active: true,
  },
  {
    event_type: 'work_order_assigned',
    channels: ['in_app', 'socket'],
    recipients: ['assigned', 'creator', 'managers'],
    is_active: true,
  },
  {
    event_type: 'sla_overdue',
    channels: ['in_app', 'socket'],
    recipients: ['assigned', 'creator', 'managers', 'plant_users'],
    is_active: true,
  },
  {
    event_type: 'stock_low',
    channels: ['in_app', 'socket'],
    recipients: ['managers', 'plant_users'],
    is_active: true,
  },
];

type NotificationRule = {
  id?: string;
  event_type: string;
  channels: string[];
  recipients: string[];
  is_active: boolean;
};

export class NotificationService {
  static async getRules(tenantId: string): Promise<NotificationRule[]> {
    try {
      const cacheKey = CacheKeys.notificationRules(tenantId);
      const cached = await RedisService.getJSON<NotificationRule[]>(cacheKey);
      if (cached) return cached;
    } catch {
      // ignore cache errors
    }

    const existing = await db.query.notificationRules.findMany({
      where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
    });

    if (existing.length === 0) {
      const now = new Date();
      const inserted = await db
        .insert(notificationRules)
        .values(
          DEFAULT_RULES.map((rule) => ({
            tenant_id: tenantId,
            event_type: rule.event_type,
            channels: rule.channels,
            recipients: rule.recipients,
            is_active: rule.is_active,
            created_at: now,
            updated_at: now,
          })),
        )
        .returning();
      try {
        await RedisService.setJSON(CacheKeys.notificationRules(tenantId), inserted, CacheTTL.NOTIFICATIONS);
      } catch {
        // ignore cache errors
      }
      return inserted as NotificationRule[];
    }

    try {
      await RedisService.setJSON(CacheKeys.notificationRules(tenantId), existing, CacheTTL.NOTIFICATIONS);
    } catch {
      // ignore cache errors
    }
    return existing as NotificationRule[];
  }

  static async getRule(tenantId: string, eventType: string): Promise<NotificationRule | null> {
    const rules = await NotificationService.getRules(tenantId);
    return rules.find((rule) => rule.event_type === eventType) || null;
  }

  static shouldSend(rule: NotificationRule | null) {
    if (!rule || !rule.is_active) return false;
    return rule.channels?.includes('in_app') || rule.channels?.includes('socket') || false;
  }

  static getRecipients(rule: NotificationRule | null, data: {
    plantId: string;
    assignedTo?: string | null;
    createdBy?: string | null;
  }) {
    const recipients = rule?.recipients || [];
    const result: { userIds: string[]; includeManagers: boolean } = {
      userIds: [],
      includeManagers: false,
    };

    if (recipients.includes('assigned') && data.assignedTo) {
      result.userIds.push(data.assignedTo);
    }

    if (recipients.includes('creator') && data.createdBy) {
      result.userIds.push(data.createdBy);
    }

    if (recipients.includes('plant_users')) {
      result.userIds.push('__plant_users__');
    }

    if (recipients.includes('managers')) {
      result.includeManagers = true;
    }

    return result;
  }
  static async getPlantUserIds(plantId: string): Promise<string[]> {
    const rows = await db.query.userPlants.findMany({
      where: (fields: any, { eq }: any) => eq(fields.plant_id, plantId),
    });
    const ids = rows.map((row) => row.user_id).filter(Boolean);
    return Array.from(new Set(ids));
  }

  static emitNotification(
    tenantId: string,
    userIds: string[],
    payload: {
      title: string;
      message: string;
      type?: 'info' | 'success' | 'warning' | 'error';
      entity?: string;
      entityId?: string;
    },
    includeManagers = true,
  ) {
    if (!isSocketManagerReady()) return;
    const socketManager = getSocketManager();
    const uniqueUsers = Array.from(new Set(userIds));

    uniqueUsers.forEach((userId) => {
      socketManager.broadcastToUser(tenantId, userId, 'notification', payload);
    });

    if (includeManagers) {
      MANAGER_ROLES.forEach((role) => {
        socketManager.broadcastToRole(tenantId, role, 'notification', payload);
      });
    }
  }

  static async notifyWorkOrderEvent(data: {
    tenantId: string;
    plantId: string;
    eventType: string;
    assignedTo?: string | null;
    createdBy?: string | null;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    workOrderId: string;
  }) {
    const rule = await NotificationService.getRule(data.tenantId, data.eventType);
    if (!NotificationService.shouldSend(rule)) return;

    const recipients = NotificationService.getRecipients(rule, data);
    const plantUserIds = recipients.userIds.includes('__plant_users__')
      ? await NotificationService.getPlantUserIds(data.plantId)
      : [];

    const userIds = recipients.userIds
      .filter((value) => value !== '__plant_users__')
      .concat(plantUserIds);

    NotificationService.emitNotification(
      data.tenantId,
      userIds,
      {
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        entity: 'work-order',
        entityId: data.workOrderId,
      },
      recipients.includeManagers,
    );
  }

  static async notifyLowStock(data: {
    tenantId: string;
    plantId: string;
    sparePartId: string;
    code: string;
    name: string;
    quantity: number;
    minStock: number;
  }) {
    const rule = await NotificationService.getRule(data.tenantId, 'stock_low');
    if (!NotificationService.shouldSend(rule)) return;

    const recipients = NotificationService.getRecipients(rule, {
      plantId: data.plantId,
    });
    const plantUserIds = recipients.userIds.includes('__plant_users__')
      ? await NotificationService.getPlantUserIds(data.plantId)
      : [];
    const userIds = recipients.userIds
      .filter((value) => value !== '__plant_users__')
      .concat(plantUserIds);

    NotificationService.emitNotification(
      data.tenantId,
      userIds,
      {
        title: 'Stock minimo',
        message: `Peca ${data.code} - ${data.name} abaixo do minimo (${data.quantity}/${data.minStock}).`,
        type: 'warning',
        entity: 'spare-part',
        entityId: data.sparePartId,
      },
      recipients.includeManagers,
    );
  }

  static async checkSlaOverdue(): Promise<void> {
    const now = new Date();
    const rows = await db.query.workOrders.findMany({
      where: (fields: any, { and, lt, notInArray }: any) =>
        and(
          lt(fields.sla_deadline, now),
          notInArray(fields.status, ['concluida', 'fechada', 'cancelada']),
        ),
    });

    for (const order of rows) {
      const rule = await NotificationService.getRule(order.tenant_id, 'sla_overdue');
      if (!NotificationService.shouldSend(rule)) continue;
      const cacheKey = `sla-overdue:${order.id}`;
      const alreadyNotified = await RedisService.exists(cacheKey);
      if (alreadyNotified) continue;

      await RedisService.set(cacheKey, '1', 6 * 60 * 60);

      await NotificationService.notifyWorkOrderEvent({
        tenantId: order.tenant_id,
        plantId: order.plant_id,
        eventType: 'sla_overdue',
        assignedTo: order.assigned_to,
        createdBy: order.created_by,
        title: 'SLA em atraso',
        message: `Ordem ${order.title} passou o SLA e precisa de atencao.`,
        type: 'warning',
        workOrderId: order.id,
      });
    }
  }

  static async checkLowStockForPart(tenantId: string, plantId: string, sparePartId: string) {
    const part = await db.query.spareParts.findFirst({
      where: (fields: any, { and, eq }: any) =>
        and(eq(fields.id, sparePartId), eq(fields.tenant_id, tenantId)),
    });

    if (!part || !part.min_stock || part.min_stock <= 0) {
      return;
    }

    const result = await db.execute(sql`
      SELECT SUM(CASE WHEN type = 'entrada' OR type = 'ajuste' THEN quantity ELSE -quantity END)::int AS quantity
      FROM stock_movements
      WHERE tenant_id = ${tenantId}
        AND plant_id = ${plantId}
        AND spare_part_id = ${sparePartId}
    `);

    const quantity = Number(result.rows?.[0]?.quantity ?? 0);
    const cacheKey = `stock-low:${plantId}:${sparePartId}`;

    if (quantity < part.min_stock) {
      const alreadyNotified = await RedisService.exists(cacheKey);
      if (!alreadyNotified) {
        await RedisService.set(cacheKey, '1', 6 * 60 * 60);
        await NotificationService.notifyLowStock({
          tenantId,
          plantId,
          sparePartId,
          code: part.code,
          name: part.name,
          quantity,
          minStock: part.min_stock,
        });
      }
    } else {
      await RedisService.del(cacheKey);
    }
  }

  static async checkLowStockAll(): Promise<void> {
    const rows = await db.execute(sql`
      SELECT
        sp.id AS spare_part_id,
        sp.tenant_id,
        sp.code,
        sp.name,
        sp.min_stock,
        sm.plant_id,
        SUM(CASE WHEN sm.type = 'entrada' OR sm.type = 'ajuste' THEN sm.quantity ELSE -sm.quantity END)::int AS quantity
      FROM spare_parts sp
      JOIN stock_movements sm ON sm.spare_part_id = sp.id AND sm.tenant_id = sp.tenant_id
      WHERE sp.min_stock IS NOT NULL AND sp.min_stock > 0
      GROUP BY sp.id, sp.tenant_id, sp.code, sp.name, sp.min_stock, sm.plant_id
    `);

    for (const row of rows.rows || []) {
      const plantId = row.plant_id as string | undefined;
      if (!plantId) continue;
      const quantity = Number(row.quantity ?? 0);
      const minStock = Number(row.min_stock ?? 0);
      if (minStock <= 0) continue;

      const cacheKey = `stock-low:${plantId}:${row.spare_part_id}`;
      if (quantity < minStock) {
        const alreadyNotified = await RedisService.exists(cacheKey);
        if (alreadyNotified) continue;
        await RedisService.set(cacheKey, '1', 6 * 60 * 60);

        await NotificationService.notifyLowStock({
          tenantId: row.tenant_id,
          plantId,
          sparePartId: row.spare_part_id,
          code: row.code,
          name: row.name,
          quantity,
          minStock,
        });
      } else {
        await RedisService.del(cacheKey);
      }
    }
  }
}