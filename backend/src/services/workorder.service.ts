import { db } from '../config/database.js';
import {
  workOrders,
  workOrderTasks,
} from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CacheKeys, CacheTTL, RedisService } from './redis.service.js';
import { logger } from '../config/logger.js';
import { ElasticsearchService } from './elasticsearch.service.js';

export class WorkOrderService {
  private static normalizeWorkOrderStatus(status?: string | null): string {
    if (!status) return '';
    if (status === 'aprovada' || status === 'planeada' || status === 'atribuida') return 'em_analise';
    if (status === 'em_curso') return 'em_execucao';
    return status;
  }

  private static assertValidStatusTransition(currentRaw: string, nextRaw: string) {
    const current = this.normalizeWorkOrderStatus(currentRaw);
    const next = this.normalizeWorkOrderStatus(nextRaw);

    if (!current || !next || current === next) return;

    // Estados finais: não permitem transições.
    if (current === 'fechada' || current === 'cancelada') {
      throw new Error('Esta ordem já está finalizada e não pode mudar de estado');
    }

    // Cancelamento pode acontecer em qualquer estado não-final.
    if (next === 'cancelada') return;

    // Pausa é opcional e só pode ser aplicada em execução.
    if (next === 'em_pausa') {
      if (current !== 'em_execucao') {
        throw new Error('Só é possível pausar uma ordem em execução');
      }
      return;
    }

    // Voltar da pausa.
    if (current === 'em_pausa') {
      if (next !== 'em_execucao') {
        throw new Error('Uma ordem em pausa só pode voltar para Em Execução');
      }
      return;
    }

    // Sequência obrigatória (fase a fase): aberta -> em_analise -> em_execucao -> concluida -> fechada
    const allowedNextByStatus: Record<string, string[]> = {
      aberta: ['em_analise'],
      em_analise: ['em_execucao'],
      em_execucao: ['concluida', 'em_pausa'],
      concluida: ['fechada'],
    };

    const allowed = allowedNextByStatus[current] || [];
    if (!allowed.includes(next)) {
      throw new Error(`Transição de estado inválida: ${current} → ${next}`);
    }
  }

  private static getStatusCacheKeys(tenantId: string, plantId: string) {
    const statuses = [
      'aberta',
      'em_analise',
      'em_execucao',
      'em_pausa',
      'concluida',
      'fechada',
      'cancelada',
    ];
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

    const runQuery = async (includeExtras: boolean) => {
      const withRelations: Record<string, any> = {
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
      };

      if (includeExtras) {
        withRelations.tasks = true;
        withRelations.attachments = true;
      }

      return db.query.workOrders.findFirst({
        where: (fields: any, { eq, and }: any) => {
          const conditions = [eq(fields.tenant_id, tenantId), eq(fields.id, workOrderId)];

          if (plantId) {
            conditions.push(eq(fields.plant_id, plantId));
          }

          return and(...conditions);
        },
        with: withRelations,
      });
    };

    let workOrder: any | null = null;

    try {
      workOrder = await runQuery(true);
    } catch (error) {
      logger.warn('Work order relation load failed, retrying without extras:', error);
      workOrder = await runQuery(false);
    }

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

    if (Object.prototype.hasOwnProperty.call(normalized, 'analysis_started_at')) {
      normalized.analysis_started_at = normalized.analysis_started_at
        ? new Date(normalized.analysis_started_at)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'paused_at')) {
      normalized.paused_at = normalized.paused_at ? new Date(normalized.paused_at) : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'cancelled_at')) {
      normalized.cancelled_at = normalized.cancelled_at
        ? new Date(normalized.cancelled_at)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'downtime_started_at')) {
      normalized.downtime_started_at = normalized.downtime_started_at
        ? new Date(normalized.downtime_started_at)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'downtime_ended_at')) {
      normalized.downtime_ended_at = normalized.downtime_ended_at
        ? new Date(normalized.downtime_ended_at)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'closed_at')) {
      normalized.closed_at = normalized.closed_at
        ? new Date(normalized.closed_at)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'actual_hours')) {
      normalized.actual_hours = normalized.actual_hours || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'notes')) {
      normalized.notes = normalized.notes || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'work_performed')) {
      normalized.work_performed = normalized.work_performed || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'downtime_type')) {
      normalized.downtime_type = normalized.downtime_type || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'downtime_category')) {
      normalized.downtime_category = normalized.downtime_category || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'root_cause')) {
      normalized.root_cause = normalized.root_cause || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'corrective_action')) {
      normalized.corrective_action = normalized.corrective_action || null;
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

    if (
      Object.prototype.hasOwnProperty.call(normalized, 'status') &&
      normalized.status !== undefined &&
      normalized.status !== null
    ) {
      WorkOrderService.assertValidStatusTransition(String(existing.status), String(normalized.status));

      // SLA pause accounting (only when the work order has the option enabled)
      const prevStatus = WorkOrderService.normalizeWorkOrderStatus(String(existing.status));
      const nextStatus = WorkOrderService.normalizeWorkOrderStatus(String(normalized.status));
      const excludePause = (existing as any).sla_exclude_pause !== false;
      const now = new Date();

      if (excludePause) {
        if (prevStatus !== 'em_pausa' && nextStatus === 'em_pausa') {
          // Start pause clock if not already set
          if (!(existing as any).sla_pause_started_at && !Object.prototype.hasOwnProperty.call(normalized, 'sla_pause_started_at')) {
            normalized.sla_pause_started_at = now;
          }
        }

        if (prevStatus === 'em_pausa' && nextStatus === 'em_execucao') {
          const startedAt = (existing as any).sla_pause_started_at
            ? new Date((existing as any).sla_pause_started_at)
            : null;
          const startedMs = startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt.getTime() : null;
          if (startedMs !== null) {
            const delta = Math.max(0, now.getTime() - startedMs);
            const prevPausedMs = Number((existing as any).sla_paused_ms ?? 0);
            normalized.sla_paused_ms = Math.max(0, prevPausedMs + delta);
          }

          // Clear active pause marker
          normalized.sla_pause_started_at = null;
        }
      }
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
        createdByUser: {
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

  static async getTasks(workOrderId: string) {
    return db
      .select()
      .from(workOrderTasks)
      .where(eq(workOrderTasks.work_order_id, workOrderId));
  }

  static async setTaskCompletion(taskId: string, isCompleted: boolean) {
    const [task] = await db
      .update(workOrderTasks)
      .set({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null,
      })
      .where(eq(workOrderTasks.id, taskId))
      .returning();

    try {
      const workOrder = await db.query.workOrders.findFirst({
        where: (fields: any, { eq }: any) => eq(fields.id, task.work_order_id),
      });
      if (workOrder) {
        await RedisService.del(CacheKeys.workOrder(workOrder.tenant_id, task.work_order_id));
      }
    } catch (cacheError) {
      logger.warn('Work order cache invalidation error:', cacheError);
    }

    return task;
  }

  static async deleteTask(taskId: string) {
    const [task] = await db
      .delete(workOrderTasks)
      .where(eq(workOrderTasks.id, taskId))
      .returning();

    if (!task) return null;

    try {
      const workOrder = await db.query.workOrders.findFirst({
        where: (fields: any, { eq }: any) => eq(fields.id, task.work_order_id),
      });
      if (workOrder) {
        await RedisService.del(CacheKeys.workOrder(workOrder.tenant_id, task.work_order_id));
      }
    } catch (cacheError) {
      logger.warn('Work order cache invalidation error:', cacheError);
    }

    return task;
  }

  static async hasIncompleteTasks(workOrderId: string): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM work_order_tasks
      WHERE work_order_id = ${workOrderId}
        AND is_completed = false
    `);
    const count = Number(result.rows?.[0]?.count ?? 0);
    return count > 0;
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
