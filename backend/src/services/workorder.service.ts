import { db } from '../config/database.js';
import {
  workOrders,
  workOrderTasks,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CacheKeys, CacheTTL, RedisService } from './redis.service.js';
import { logger } from '../config/logger.js';
import { ElasticsearchService } from './elasticsearch.service.js';

export class WorkOrderService {
  private static getStatusCacheKeys(tenantId: string, plantId: string) {
    const statuses = ['aberta', 'atribuida', 'em_curso', 'concluida', 'cancelada'];
    return [
      CacheKeys.workOrdersList(tenantId, plantId),
      ...statuses.map((status) => CacheKeys.workOrdersList(tenantId, plantId, status)),
    ];
  }

  private static async invalidateWorkOrderCache(
    tenantId: string,
    plantId: string,
    workOrderId?: string,
  ) {
    try {
      const keys = this.getStatusCacheKeys(tenantId, plantId);
      if (workOrderId) {
        keys.push(CacheKeys.workOrder(tenantId, workOrderId));
      }
      await RedisService.delMultiple(keys);
    } catch (cacheError) {
      logger.warn('Work order cache invalidation error:', cacheError);
    }
  }

  static async createWorkOrder(data: {
    tenant_id: string;
    plant_id: string;
    asset_id: string;
    created_by: string;
    title: string;
    description?: string;
    priority?: string;
    estimated_hours?: string;
    assigned_to?: string;
    scheduled_date?: Date | string;
    sla_deadline?: Date | string;
  }) {
    const priority = data.priority || 'media';
    const slaHoursMap: Record<string, number> = {
      baixa: 96,
      media: 72,
      alta: 24,
      critica: 8,
    };

    const slaHours = slaHoursMap[priority] || 72;
    const baseDate = data.scheduled_date
      ? new Date(data.scheduled_date)
      : new Date();

    const calculatedSla = new Date(baseDate.getTime() + slaHours * 60 * 60 * 1000);

    const [workOrder] = await db
      .insert(workOrders)
      .values({
        tenant_id: data.tenant_id,
        plant_id: data.plant_id,
        asset_id: data.asset_id,
        created_by: data.created_by,
        title: data.title,
        description: data.description,
        assigned_to: data.assigned_to,
        estimated_hours: data.estimated_hours,
        status: 'aberta' as any,
        priority: priority as any,
        scheduled_date: data.scheduled_date ? new Date(data.scheduled_date) : null,
        sla_deadline: data.sla_deadline ? new Date(data.sla_deadline) : calculatedSla,
      })
      .returning();

    // Invalidate cache lists
    await this.invalidateWorkOrderCache(data.tenant_id, data.plant_id, workOrder.id);

    // Index into Elasticsearch (best-effort)
    try {
      await ElasticsearchService.index('orders_v1', workOrder.id, {
        id: workOrder.id,
        tenant_id: data.tenant_id,
        plant_id: data.plant_id,
        asset_id: workOrder.asset_id,
        title: workOrder.title,
        description: workOrder.description,
        status: workOrder.status,
        priority: workOrder.priority,
        sla: workOrder.sla_deadline,
        created_at: workOrder.created_at,
        updated_at: workOrder.updated_at,
      });
    } catch (error) {
      logger.warn('Elasticsearch index error for work order:', error);
    }

    return workOrder;
  }

  static async getWorkOrderById(
    tenantId: string,
    workOrderId: string,
    plantId?: string,
  ): Promise<any | null> {
    try {
      const cacheKey = CacheKeys.workOrder(tenantId, workOrderId);
      const cached = await RedisService.getJSON<any>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for work order: ${cacheKey}`);
        return cached;
      }
    } catch (cacheError) {
      logger.warn('Cache read error, continuing with DB query:', cacheError);
    }

    const workOrder = await db.query.workOrders.findFirst({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [eq(fields.tenant_id, tenantId), eq(fields.id, workOrderId)];

        if (plantId) {
          conditions.push(eq(fields.plant_id, plantId));
        }

        return and(...conditions);
      },
      with: {
        asset: {
          with: {
            category: true,
          },
        },
        assignedUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        createdByUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        tasks: true,
        attachments: true,
      },
    });

    if (workOrder) {
      try {
        await RedisService.setJSON(
          CacheKeys.workOrder(tenantId, workOrderId),
          workOrder,
          CacheTTL.WORK_ORDERS,
        );
      } catch (cacheError) {
        logger.warn('Cache write error:', cacheError);
      }
    }

    return workOrder;
  }

  static async updateWorkOrder(
    tenantId: string,
    workOrderId: string,
    data: Partial<any>,
    plantId?: string,
  ) {
    const normalized: Record<string, any> = { ...data };

    if (Object.prototype.hasOwnProperty.call(normalized, 'scheduled_date')) {
      normalized.scheduled_date = normalized.scheduled_date
        ? new Date(normalized.scheduled_date)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'completed_at')) {
      normalized.completed_at = normalized.completed_at
        ? new Date(normalized.completed_at)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'started_at')) {
      normalized.started_at = normalized.started_at
        ? new Date(normalized.started_at)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'actual_hours')) {
      normalized.actual_hours = normalized.actual_hours || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'notes')) {
      normalized.notes = normalized.notes || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'previous_status')) {
      delete normalized.previous_status;
    }
    const existing = await db.query.workOrders.findFirst({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [eq(fields.tenant_id, tenantId), eq(fields.id, workOrderId)];

        if (plantId) {
          conditions.push(eq(fields.plant_id, plantId));
        }

        return and(...conditions);
      },
    });

    if (!existing) {
      throw new Error('Work order not found');
    }

    const [updated] = await db
      .update(workOrders)
      .set({
        ...normalized,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(workOrders.tenant_id, tenantId),
          eq(workOrders.id, workOrderId),
          ...(plantId ? [eq(workOrders.plant_id, plantId)] : []),
        ),
      )
      .returning();

    // Invalidate cache lists
    await this.invalidateWorkOrderCache(tenantId, updated.plant_id, workOrderId);

    // Index into Elasticsearch (best-effort)
    try {
      await ElasticsearchService.index('orders_v1', updated.id, {
        id: updated.id,
        tenant_id: tenantId,
        plant_id: updated.plant_id,
        asset_id: updated.asset_id,
        title: updated.title,
        description: updated.description,
        status: updated.status,
        priority: updated.priority,
        sla: updated.sla_deadline,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      });
    } catch (error) {
      logger.warn('Elasticsearch index error for work order:', error);
    }

    return updated;
  }

  static async deleteWorkOrder(tenantId: string, workOrderId: string, plantId?: string) {
    const existing = await db.query.workOrders.findFirst({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [eq(fields.tenant_id, tenantId), eq(fields.id, workOrderId)];

        if (plantId) {
          conditions.push(eq(fields.plant_id, plantId));
        }

        return and(...conditions);
      },
    });

    if (!existing) {
      throw new Error('Work order not found');
    }

    await db
      .delete(workOrders)
      .where(
        and(
          eq(workOrders.tenant_id, tenantId),
          eq(workOrders.id, workOrderId),
          ...(plantId ? [eq(workOrders.plant_id, plantId)] : []),
        ),
      );

    await this.invalidateWorkOrderCache(tenantId, existing.plant_id, workOrderId);
  }

  static async getPlantWorkOrders(
    tenantId: string,
    plantId: string,
    status?: string,
  ) {
    try {
      const cacheKey = CacheKeys.workOrdersList(tenantId, plantId, status);
      const cached = await RedisService.getJSON(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for work orders list: ${cacheKey}`);
        return cached;
      }
    } catch (cacheError) {
      logger.warn('Cache read error, continuing with DB query:', cacheError);
    }

    const workOrders = await db.query.workOrders.findMany({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [
          eq(fields.tenant_id, tenantId),
          eq(fields.plant_id, plantId),
        ];

        if (status) {
          conditions.push(eq(fields.status, status));
        }

        return and(...conditions);
      },
      with: {
        asset: true,
        assignedUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: (fields: any) => [desc(fields.created_at)],
      limit: 100,
    });

    try {
      const cacheKey = CacheKeys.workOrdersList(tenantId, plantId, status);
      await RedisService.setJSON(cacheKey, workOrders, CacheTTL.WORK_ORDERS);
    } catch (cacheError) {
      logger.warn('Cache write error:', cacheError);
    }

    return workOrders;
  }

  static async addTask(workOrderId: string, taskDescription: string) {
    const [task] = await db
      .insert(workOrderTasks)
      .values({
        id: uuidv4(),
        work_order_id: workOrderId,
        description: taskDescription,
        is_completed: false,
      })
      .returning();

    try {
      const workOrder = await db.query.workOrders.findFirst({
        where: (fields: any, { eq }: any) => eq(fields.id, workOrderId),
      });
      if (workOrder) {
        await RedisService.del(CacheKeys.workOrder(workOrder.tenant_id, workOrderId));
      }
    } catch (cacheError) {
      logger.warn('Work order cache invalidation error:', cacheError);
    }

    return task;
  }

  static async completeTask(taskId: string) {
    const [task] = await db
      .update(workOrderTasks)
      .set({
        is_completed: true,
        completed_at: new Date(),
      })
      .where(eq(workOrderTasks.id, taskId))
      .returning();

    try {
      const workOrder = await db.query.workOrders.findFirst({
        where: (fields: any, { eq }: any) => eq(fields.id, task.work_order_id),
      });
      if (workOrder) {
        await RedisService.del(
          CacheKeys.workOrder(workOrder.tenant_id, task.work_order_id),
        );
      }
    } catch (cacheError) {
      logger.warn('Work order cache invalidation error:', cacheError);
    }

    return task;
  }
}
