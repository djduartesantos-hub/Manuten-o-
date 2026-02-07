import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from '../config/database.js';
import { userPlants, workOrders } from '../db/schema.js';
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
}