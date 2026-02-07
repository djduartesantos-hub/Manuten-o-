import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { spareParts, stockMovements, userPlants, workOrders } from '../db/schema.js';
import { RedisService } from './redis.service.js';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';

const MANAGER_ROLES = ['gestor_manutencao', 'admin_empresa', 'superadmin'];

export class NotificationService {
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
    assignedTo?: string | null;
    createdBy?: string | null;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    workOrderId: string;
  }) {
    const plantUserIds = await NotificationService.getPlantUserIds(data.plantId);
    const recipients = [
      ...plantUserIds,
      data.assignedTo,
      data.createdBy,
    ].filter(Boolean) as string[];

    NotificationService.emitNotification(
      data.tenantId,
      recipients,
      {
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        entity: 'work-order',
        entityId: data.workOrderId,
      },
      true,
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
    const plantUserIds = await NotificationService.getPlantUserIds(data.plantId);
    NotificationService.emitNotification(
      data.tenantId,
      plantUserIds,
      {
        title: 'Stock minimo',
        message: `Peca ${data.code} - ${data.name} abaixo do minimo (${data.quantity}/${data.minStock}).`,
        type: 'warning',
        entity: 'spare-part',
        entityId: data.sparePartId,
      },
      true,
    );
  }

  static async checkSlaOverdue(): Promise<void> {
    const now = new Date();
    const rows = await db.query.workOrders.findMany({
      where: (fields: any, { and, inArray, lt }: any) =>
        and(
          lt(fields.sla_deadline, now),
          inArray(fields.status, ['aberta', 'atribuida', 'em_curso']),
        ),
    });

    for (const order of rows) {
      const cacheKey = `sla-overdue:${order.id}`;
      const alreadyNotified = await RedisService.exists(cacheKey);
      if (alreadyNotified) continue;

      await RedisService.set(cacheKey, '1', 6 * 60 * 60);

      await NotificationService.notifyWorkOrderEvent({
        tenantId: order.tenant_id,
        plantId: order.plant_id,
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