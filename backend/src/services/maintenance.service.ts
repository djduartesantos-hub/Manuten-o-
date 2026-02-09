// @ts-nocheck
import { db } from '../config/database.js';
import {
  maintenancePlans,
  maintenanceTasks,
  workOrders,
  assets,
  preventiveMaintenanceSchedules,
} from '../db/schema.js';
import { eq, and, desc, like, inArray, asc, gte } from 'drizzle-orm';
import { CacheKeys, CacheTTL, RedisService } from './redis.service.js';
import { logger } from '../config/logger.js';

export interface CreateMaintenancePlanInput {
  asset_id: string;
  name: string;
  description?: string;
  type: 'preventiva' | 'corretiva';
  frequency_type: string;
  frequency_value: number;
  meter_threshold?: string;
  is_active?: boolean;
}

export interface UpdateMaintenancePlanInput {
  name?: string;
  description?: string;
  type?: 'preventiva' | 'corretiva';
  frequency_type?: string;
  frequency_value?: number;
  meter_threshold?: string;
  is_active?: boolean;
}

export interface CreateMaintenanceTaskInput {
  plan_id: string;
  description: string;
  sequence?: number;
}

export interface CreatePreventiveScheduleInput {
  plan_id: string;
  scheduled_for: string;
  status?:
    | 'agendada'
    | 'em_execucao'
    | 'concluida'
    | 'fechada'
    | 'reagendada';
  notes?: string;
}

export interface UpdatePreventiveScheduleInput {
  scheduled_for?: string;
  status?:
    | 'agendada'
    | 'em_execucao'
    | 'concluida'
    | 'fechada'
    | 'reagendada';
  notes?: string;
}

function normalizePreventiveStatus(status?: string | null): string {
  if (!status) return '';
  return status === 'planeada' || status === 'confirmada' ? 'agendada' : status;
}

export class MaintenanceService {
  /**
   * Get all maintenance plans for a tenant with optional filters
   */
  async getMaintenancePlans(
    tenant_id: string,
    plant_id: string,
    filters?: {
      asset_id?: string;
      type?: string;
      is_active?: boolean;
      search?: string;
    }
  ) {
    const hasFilters =
      !!filters?.asset_id ||
      !!filters?.type ||
      filters?.is_active !== undefined ||
      !!filters?.search;

    if (!hasFilters) {
      try {
        const cacheKey = CacheKeys.maintenancePlans(tenant_id, plant_id);
        const cached = await RedisService.getJSON(cacheKey);
        if (Array.isArray(cached)) {
          if (cached.length > 0) {
            logger.debug(`Cache hit for maintenance plans: ${cacheKey}`);
            return cached;
          }
        } else if (cached) {
          logger.debug(`Cache hit for maintenance plans: ${cacheKey}`);
          return cached;
        }
      } catch (cacheError) {
        logger.warn('Cache read error, continuing with DB query:', cacheError);
      }
    }

    let query = db
      .select({
        id: maintenancePlans.id,
        tenant_id: maintenancePlans.tenant_id,
        asset_id: maintenancePlans.asset_id,
        name: maintenancePlans.name,
        description: maintenancePlans.description,
        type: maintenancePlans.type,
        frequency_type: maintenancePlans.frequency_type,
        frequency_value: maintenancePlans.frequency_value,
        meter_threshold: maintenancePlans.meter_threshold,
        is_active: maintenancePlans.is_active,
        asset_name: assets.name,
        created_at: maintenancePlans.created_at,
        updated_at: maintenancePlans.updated_at,
      })
      .from(maintenancePlans)
      .leftJoin(assets, eq(maintenancePlans.asset_id, assets.id));

    // Build conditions array
    const conditions = [eq(maintenancePlans.tenant_id, tenant_id), eq(assets.plant_id, plant_id)];

    if (filters?.asset_id) {
      conditions.push(eq(maintenancePlans.asset_id, filters.asset_id));
    }

    if (filters?.type) {
      conditions.push(eq(maintenancePlans.type, filters.type as any));
    }

    if (filters?.is_active !== undefined) {
      conditions.push(eq(maintenancePlans.is_active, filters.is_active));
    }

    if (filters?.search) {
      conditions.push(like(maintenancePlans.name, `%${filters.search}%`));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    } else {
      query = query.where(conditions[0]);
    }

    let plans = await query.orderBy(desc(maintenancePlans.created_at));

    if (plans.length === 0) {
      const fallbackQuery = db
        .select({
          id: maintenancePlans.id,
          tenant_id: maintenancePlans.tenant_id,
          asset_id: maintenancePlans.asset_id,
          name: maintenancePlans.name,
          description: maintenancePlans.description,
          type: maintenancePlans.type,
          frequency_type: maintenancePlans.frequency_type,
          frequency_value: maintenancePlans.frequency_value,
          meter_threshold: maintenancePlans.meter_threshold,
          is_active: maintenancePlans.is_active,
          asset_name: assets.name,
          created_at: maintenancePlans.created_at,
          updated_at: maintenancePlans.updated_at,
        })
        .from(maintenancePlans)
        .leftJoin(assets, eq(maintenancePlans.asset_id, assets.id))
        .where(eq(maintenancePlans.tenant_id, tenant_id));

      plans = await fallbackQuery.orderBy(desc(maintenancePlans.created_at));
    }

    if (!hasFilters && plans.length > 0) {
      try {
        const cacheKey = CacheKeys.maintenancePlans(tenant_id, plant_id);
        await RedisService.setJSON(cacheKey, plans, CacheTTL.PLANS);
      } catch (cacheError) {
        logger.warn('Cache write error:', cacheError);
      }
    }

    return plans;
  }

  /**
   * List preventive maintenance schedules for a plant
   */
  async getPreventiveSchedules(
    tenant_id: string,
    plant_id: string,
    filters?: {
      asset_id?: string;
      plan_id?: string;
      status?: string;
    },
  ) {
    let query = db
      .select({
        id: preventiveMaintenanceSchedules.id,
        tenant_id: preventiveMaintenanceSchedules.tenant_id,
        plant_id: preventiveMaintenanceSchedules.plant_id,
        plan_id: preventiveMaintenanceSchedules.plan_id,
        asset_id: preventiveMaintenanceSchedules.asset_id,
        scheduled_for: preventiveMaintenanceSchedules.scheduled_for,
        status: preventiveMaintenanceSchedules.status,
        notes: preventiveMaintenanceSchedules.notes,
        created_by: preventiveMaintenanceSchedules.created_by,
        confirmed_by: preventiveMaintenanceSchedules.confirmed_by,
        confirmed_at: preventiveMaintenanceSchedules.confirmed_at,
        started_at: preventiveMaintenanceSchedules.started_at,
        completed_at: preventiveMaintenanceSchedules.completed_at,
        closed_at: preventiveMaintenanceSchedules.closed_at,
        closed_by: preventiveMaintenanceSchedules.closed_by,
        rescheduled_at: preventiveMaintenanceSchedules.rescheduled_at,
        rescheduled_from: preventiveMaintenanceSchedules.rescheduled_from,
        created_at: preventiveMaintenanceSchedules.created_at,
        updated_at: preventiveMaintenanceSchedules.updated_at,
        plan_name: maintenancePlans.name,
        asset_name: assets.name,
        asset_code: assets.code,
      })
      .from(preventiveMaintenanceSchedules)
      .leftJoin(maintenancePlans, eq(preventiveMaintenanceSchedules.plan_id, maintenancePlans.id))
      .leftJoin(assets, eq(preventiveMaintenanceSchedules.asset_id, assets.id));

    const conditions = [
      eq(preventiveMaintenanceSchedules.tenant_id, tenant_id),
      eq(preventiveMaintenanceSchedules.plant_id, plant_id),
    ];

    if (filters?.asset_id) {
      conditions.push(eq(preventiveMaintenanceSchedules.asset_id, filters.asset_id));
    }
    if (filters?.plan_id) {
      conditions.push(eq(preventiveMaintenanceSchedules.plan_id, filters.plan_id));
    }
    if (filters?.status) {
      conditions.push(eq(preventiveMaintenanceSchedules.status, filters.status as any));
    }

    query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(preventiveMaintenanceSchedules.scheduled_for));
    return rows.map((row: any) => ({
      ...row,
      status: normalizePreventiveStatus(row.status),
    }));
  }

  /**
   * Get upcoming preventive schedules (next N) for dashboard
   */
  async getUpcomingPreventiveSchedules(tenant_id: string, plant_id: string, limit = 5) {
    const now = new Date();
    const rows = await db
      .select({
        id: preventiveMaintenanceSchedules.id,
        plan_id: preventiveMaintenanceSchedules.plan_id,
        asset_id: preventiveMaintenanceSchedules.asset_id,
        scheduled_for: preventiveMaintenanceSchedules.scheduled_for,
        status: preventiveMaintenanceSchedules.status,
        plan_name: maintenancePlans.name,
        asset_name: assets.name,
        asset_code: assets.code,
      })
      .from(preventiveMaintenanceSchedules)
      .leftJoin(maintenancePlans, eq(preventiveMaintenanceSchedules.plan_id, maintenancePlans.id))
      .leftJoin(assets, eq(preventiveMaintenanceSchedules.asset_id, assets.id))
      .where(
        and(
          eq(preventiveMaintenanceSchedules.tenant_id, tenant_id),
          eq(preventiveMaintenanceSchedules.plant_id, plant_id),
          inArray(preventiveMaintenanceSchedules.status, [
            'agendada',
            'reagendada',
          ] as any),
          gte(preventiveMaintenanceSchedules.scheduled_for, now),
        ),
      )
      .orderBy(asc(preventiveMaintenanceSchedules.scheduled_for))
      .limit(limit);

    return rows.map((row: any) => ({
      ...row,
      status: normalizePreventiveStatus(row.status),
    }));
  }

  /**
   * Create a preventive schedule from an existing maintenance plan
   */
  async createPreventiveSchedule(
    tenant_id: string,
    plant_id: string,
    input: CreatePreventiveScheduleInput,
    created_by?: string,
  ) {
    if (!created_by) {
      throw new Error('Utilizador não autenticado');
    }

    const scheduledForDate = new Date(input.scheduled_for);
    if (Number.isNaN(scheduledForDate.getTime())) {
      throw new Error('scheduled_for inválido');
    }

    const plan = await db
      .select({
        id: maintenancePlans.id,
        name: maintenancePlans.name,
        asset_id: maintenancePlans.asset_id,
        asset_plant_id: assets.plant_id,
      })
      .from(maintenancePlans)
      .leftJoin(assets, eq(maintenancePlans.asset_id, assets.id))
      .where(and(eq(maintenancePlans.id, input.plan_id), eq(maintenancePlans.tenant_id, tenant_id)))
      .limit(1);

    const planRow = plan?.[0];
    if (!planRow) {
      throw new Error('Maintenance plan not found');
    }
    if (planRow.asset_plant_id && planRow.asset_plant_id !== plant_id) {
      throw new Error('Plano não pertence à planta selecionada');
    }

    const normalizedStatus = normalizePreventiveStatus(input.status) || 'agendada';

    const inserted = await db
      .insert(preventiveMaintenanceSchedules)
      .values({
        tenant_id,
        plant_id,
        plan_id: input.plan_id,
        asset_id: planRow.asset_id,
        scheduled_for: scheduledForDate,
        status: normalizedStatus as any,
        notes: input.notes,
        created_by,
      })
      .returning();

    return inserted?.[0];
  }

  /**
   * Update a preventive schedule (status/reschedule/notes)
   */
  async updatePreventiveSchedule(
    tenant_id: string,
    plant_id: string,
    schedule_id: string,
    patch: UpdatePreventiveScheduleInput,
    user_id?: string,
  ) {
    const existing = await db
      .select({
        id: preventiveMaintenanceSchedules.id,
        status: preventiveMaintenanceSchedules.status,
        scheduled_for: preventiveMaintenanceSchedules.scheduled_for,
        confirmed_at: preventiveMaintenanceSchedules.confirmed_at,
        started_at: preventiveMaintenanceSchedules.started_at,
        completed_at: preventiveMaintenanceSchedules.completed_at,
        closed_at: preventiveMaintenanceSchedules.closed_at,
      })
      .from(preventiveMaintenanceSchedules)
      .where(
        and(
          eq(preventiveMaintenanceSchedules.id, schedule_id),
          eq(preventiveMaintenanceSchedules.tenant_id, tenant_id),
          eq(preventiveMaintenanceSchedules.plant_id, plant_id),
        ),
      )
      .limit(1);

    const row = existing?.[0];
    if (!row) {
      throw new Error('Preventive schedule not found');
    }

    const previousStatus = row.status as string;

    const updates: any = {};

    if (patch.notes !== undefined) {
      updates.notes = patch.notes;
    }

    let newScheduledFor: Date | undefined;
    if (patch.scheduled_for) {
      const parsed = new Date(patch.scheduled_for);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error('scheduled_for inválido');
      }
      newScheduledFor = parsed;
      updates.scheduled_for = parsed;
    }

    if (patch.status) {
      updates.status = normalizePreventiveStatus(patch.status) as any;

      if (patch.status === 'em_execucao' && !row.started_at) {
        updates.started_at = new Date();
      }

      if (patch.status === 'concluida' && !row.completed_at) {
        updates.completed_at = new Date();
      }

      if (patch.status === 'fechada' && !row.closed_at) {
        updates.closed_at = new Date();
        updates.closed_by = user_id || null;
      }

      if (patch.status === 'reagendada') {
        if (!newScheduledFor) {
          throw new Error('Para reagendar, envie scheduled_for');
        }
        updates.rescheduled_at = new Date();
        updates.rescheduled_from = row.scheduled_for;
      }
    }

    updates.updated_at = new Date();

    const updated = await db
      .update(preventiveMaintenanceSchedules)
      .set(updates)
      .where(
        and(
          eq(preventiveMaintenanceSchedules.id, schedule_id),
          eq(preventiveMaintenanceSchedules.tenant_id, tenant_id),
          eq(preventiveMaintenanceSchedules.plant_id, plant_id),
        ),
      )
      .returning();

    const schedule = updated?.[0];
    const newStatus = normalizePreventiveStatus((schedule?.status ?? previousStatus) as string);

    return {
      schedule,
      previousStatus: normalizePreventiveStatus(previousStatus),
      newStatus,
    };
  }

  /**
   * Get a single maintenance plan by ID
   */
  async getMaintenancePlanById(tenant_id: string, plan_id: string, plant_id?: string) {
    try {
      const cacheKey = CacheKeys.maintenancePlan(tenant_id, plan_id);
      const cached = await RedisService.getJSON(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for maintenance plan: ${cacheKey}`);
        return cached;
      }
    } catch (cacheError) {
      logger.warn('Cache read error, continuing with DB query:', cacheError);
    }

    const plan = await db
      .select({
        id: maintenancePlans.id,
        tenant_id: maintenancePlans.tenant_id,
        asset_id: maintenancePlans.asset_id,
        name: maintenancePlans.name,
        description: maintenancePlans.description,
        type: maintenancePlans.type,
        frequency_type: maintenancePlans.frequency_type,
        frequency_value: maintenancePlans.frequency_value,
        meter_threshold: maintenancePlans.meter_threshold,
        is_active: maintenancePlans.is_active,
        asset_name: assets.name,
        created_at: maintenancePlans.created_at,
        updated_at: maintenancePlans.updated_at,
      })
      .from(maintenancePlans)
      .leftJoin(assets, eq(maintenancePlans.asset_id, assets.id))
      .where(() => {
        const conditions = [
          eq(maintenancePlans.tenant_id, tenant_id),
          eq(maintenancePlans.id, plan_id),
        ];

        if (plant_id) {
          conditions.push(eq(assets.plant_id, plant_id));
        }

        return and(...conditions);
      })
      .limit(1);

    if (!plan.length) {
      throw new Error('Maintenance plan not found');
    }

    try {
      const cacheKey = CacheKeys.maintenancePlan(tenant_id, plan_id);
      await RedisService.setJSON(cacheKey, plan[0], CacheTTL.PLANS);
    } catch (cacheError) {
      logger.warn('Cache write error:', cacheError);
    }

    return plan[0];
  }

  /**
   * Create a new maintenance plan
   */
  async createMaintenancePlan(
    tenant_id: string,
    plant_id: string,
    input: CreateMaintenancePlanInput
  ) {
    // Verify asset exists and belongs to plant
    const assetExists = await db
      .select({ id: assets.id, plant_id: assets.plant_id })
      .from(assets)
      .where(
        and(
          eq(assets.tenant_id, tenant_id),
          eq(assets.id, input.asset_id)
        )
      )
      .limit(1);

    if (!assetExists.length) {
      throw new Error('Asset not found');
    }

    if (assetExists[0].plant_id !== plant_id) {
      throw new Error('Asset does not belong to this plant');
    }

    const [plan] = await db
      .insert(maintenancePlans)
      .values({
        tenant_id,
        asset_id: input.asset_id,
        name: input.name,
        description: input.description,
        type: input.type,
        frequency_type: input.frequency_type,
        frequency_value: input.frequency_value,
        meter_threshold: input.meter_threshold
          ? parseFloat(input.meter_threshold).toString()
          : undefined,
        is_active: input.is_active ?? true,
      })
      .returning();

    // Invalidate cache
    try {
      await RedisService.delMultiple([
        CacheKeys.maintenancePlans(tenant_id, plant_id),
        CacheKeys.maintenancePlan(tenant_id, plan.id),
      ]);
    } catch (cacheError) {
      logger.warn('Maintenance cache invalidation error:', cacheError);
    }

    return this.getMaintenancePlanById(tenant_id, plan.id, plant_id);
  }

  /**
   * Update a maintenance plan
   */
  async updateMaintenancePlan(
    tenant_id: string,
    plant_id: string,
    plan_id: string,
    input: UpdateMaintenancePlanInput
  ) {
    const plan = await this.getMaintenancePlanById(tenant_id, plan_id, plant_id);

    await db
      .update(maintenancePlans)
      .set({
        name: input.name ?? plan.name,
        description: input.description ?? plan.description,
        type: input.type ?? plan.type,
        frequency_type: input.frequency_type ?? plan.frequency_type,
        frequency_value: input.frequency_value ?? plan.frequency_value,
        meter_threshold:
          input.meter_threshold !== undefined
            ? parseFloat(input.meter_threshold).toString()
            : plan.meter_threshold,
        is_active: input.is_active ?? plan.is_active,
        updated_at: new Date(),
      })
      .where(eq(maintenancePlans.id, plan_id));

    // Invalidate cache
    try {
      await RedisService.delMultiple([
        CacheKeys.maintenancePlans(tenant_id, plant_id),
        CacheKeys.maintenancePlan(tenant_id, plan_id),
      ]);
    } catch (cacheError) {
      logger.warn('Maintenance cache invalidation error:', cacheError);
    }

    return this.getMaintenancePlanById(tenant_id, plan_id, plant_id);
  }

  /**
   * Delete a maintenance plan
   */
  async deleteMaintenancePlan(tenant_id: string, plant_id: string, plan_id: string) {
    await this.getMaintenancePlanById(tenant_id, plan_id, plant_id);

    await db
      .delete(maintenancePlans)
      .where(
        and(
          eq(maintenancePlans.tenant_id, tenant_id),
          eq(maintenancePlans.id, plan_id)
        )
      );

      // Invalidate cache
      try {
        await RedisService.delMultiple([
          CacheKeys.maintenancePlans(tenant_id, plant_id),
          CacheKeys.maintenancePlan(tenant_id, plan_id),
        ]);
      } catch (cacheError) {
        logger.warn('Maintenance cache invalidation error:', cacheError);
      }

    return { success: true };
  }

  /**
   * Get maintenance plans due for an asset (based on frequency)
   */
  async getMaintenancePlansDue(
    tenant_id: string,
    plant_id: string,
    asset_id: string
  ) {
    const asset = await db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          eq(assets.tenant_id, tenant_id),
          eq(assets.id, asset_id),
          eq(assets.plant_id, plant_id),
        )
      )
      .limit(1);

    if (!asset.length) {
      throw new Error('Asset not found');
    }

    const activePlans = await db
      .select()
      .from(maintenancePlans)
      .where(
        and(
          eq(maintenancePlans.tenant_id, tenant_id),
          eq(maintenancePlans.asset_id, asset_id),
          eq(maintenancePlans.is_active, true)
        )
      );

    // Get last work order for each plan to determine if due
    const plansWithStatus = await Promise.all(
      activePlans.map(async (plan: any) => {
        const lastWorkOrder = await db
          .select()
          .from(workOrders)
          .where(
            and(
              eq(workOrders.plan_id, plan.id),
                  inArray(workOrders.status, ['concluida', 'fechada'] as any)
            )
          )
          .orderBy(desc(workOrders.completed_at))
          .limit(1);

        const lastCompleted = lastWorkOrder[0]?.completed_at ?? plan.created_at;
        const daysAgo = Math.floor(
          (Date.now() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
        );

        let isDue = false;
        if (plan.frequency_type === 'days') {
          isDue = daysAgo >= plan.frequency_value;
        }

        return {
          ...plan,
          last_maintenance: lastCompleted,
          days_since_maintenance: daysAgo,
          is_due: isDue,
        };
      })
    );

    return plansWithStatus.filter((p: any) => p.is_due);
  }

  /**
   * Get all maintenance tasks for a plan
   */
  async getMaintenanceTasksByPlan(
    tenant_id: string,
    plant_id: string,
    plan_id: string
  ) {
    // Verify plan exists
    await this.getMaintenancePlanById(tenant_id, plan_id, plant_id);

    return await db
      .select()
      .from(maintenanceTasks)
      .where(
        and(
          eq(maintenanceTasks.tenant_id, tenant_id),
          eq(maintenanceTasks.plan_id, plan_id)
        )
      )
      .orderBy(maintenanceTasks.sequence);
  }

  /**
   * Add a task to a maintenance plan
   */
  async createMaintenanceTask(
    tenant_id: string,
    plant_id: string,
    input: CreateMaintenanceTaskInput
  ) {
    // Verify plan exists
    await this.getMaintenancePlanById(tenant_id, input.plan_id, plant_id);

    const [task] = await db
      .insert(maintenanceTasks)
      .values({
        tenant_id,
        plan_id: input.plan_id,
        description: input.description,
        sequence: input.sequence ?? 0,
      })
      .returning();

    return task;
  }

  /**
   * Delete a maintenance task
   */
  async deleteMaintenanceTask(tenant_id: string, plant_id: string, task_id: string) {
    const task = await db
      .select()
      .from(maintenanceTasks)
      .where(
        and(
          eq(maintenanceTasks.tenant_id, tenant_id),
          eq(maintenanceTasks.id, task_id)
        )
      )
      .limit(1);

    if (!task.length) {
      throw new Error('Maintenance task not found');
    }

    const plan = await this.getMaintenancePlanById(tenant_id, task[0].plan_id, plant_id);

    if (!plan) {
      throw new Error('Maintenance plan not found');
    }

    await db
      .delete(maintenanceTasks)
      .where(eq(maintenanceTasks.id, task_id));

    return { success: true };
  }
}
