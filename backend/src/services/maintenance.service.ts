import { db } from '../db';
import { maintenancePlans, maintenanceTasks, workOrders, assets } from '../db/schema';
import { eq, and, desc, like } from 'drizzle-orm';

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

export class MaintenanceService {
  /**
   * Get all maintenance plans for a tenant with optional filters
   */
  async getMaintenancePlans(
    tenant_id: string,
    filters?: {
      asset_id?: string;
      type?: string;
      is_active?: boolean;
      search?: string;
    }
  ) {
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
      .leftJoin(assets, eq(maintenancePlans.asset_id, assets.id))
      .where(eq(maintenancePlans.tenant_id, tenant_id));

    // Apply filters
    if (filters?.asset_id) {
      query = query.andWhere(eq(maintenancePlans.asset_id, filters.asset_id));
    }

    if (filters?.type) {
      query = query.andWhere(eq(maintenancePlans.type, filters.type as any));
    }

    if (filters?.is_active !== undefined) {
      query = query.andWhere(eq(maintenancePlans.is_active, filters.is_active));
    }

    if (filters?.search) {
      query = query.andWhere(like(maintenancePlans.name, `%${filters.search}%`));
    }

    return await query.orderBy(desc(maintenancePlans.created_at));
  }

  /**
   * Get a single maintenance plan by ID
   */
  async getMaintenancePlanById(tenant_id: string, plan_id: string) {
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
      .where(
        and(
          eq(maintenancePlans.tenant_id, tenant_id),
          eq(maintenancePlans.id, plan_id)
        )
      )
      .limit(1);

    if (!plan.length) {
      throw new Error('Maintenance plan not found');
    }

    return plan[0];
  }

  /**
   * Create a new maintenance plan
   */
  async createMaintenancePlan(
    tenant_id: string,
    input: CreateMaintenancePlanInput
  ) {
    // Verify asset exists
    const assetExists = await db
      .select({ id: assets.id })
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

    return this.getMaintenancePlanById(tenant_id, plan.id);
  }

  /**
   * Update a maintenance plan
   */
  async updateMaintenancePlan(
    tenant_id: string,
    plan_id: string,
    input: UpdateMaintenancePlanInput
  ) {
    const plan = await this.getMaintenancePlanById(tenant_id, plan_id);

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

    return this.getMaintenancePlanById(tenant_id, plan_id);
  }

  /**
   * Delete a maintenance plan
   */
  async deleteMaintenancePlan(tenant_id: string, plan_id: string) {
    await this.getMaintenancePlanById(tenant_id, plan_id);

    await db
      .delete(maintenancePlans)
      .where(
        and(
          eq(maintenancePlans.tenant_id, tenant_id),
          eq(maintenancePlans.id, plan_id)
        )
      );

    return { success: true };
  }

  /**
   * Get maintenance plans due for an asset (based on frequency)
   */
  async getMaintenancePlansDue(
    tenant_id: string,
    asset_id: string
  ) {
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
              eq(workOrders.status, 'concluida')
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
    plan_id: string
  ) {
    // Verify plan exists
    await this.getMaintenancePlanById(tenant_id, plan_id);

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
    input: CreateMaintenanceTaskInput
  ) {
    // Verify plan exists
    await this.getMaintenancePlanById(tenant_id, input.plan_id);

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
  async deleteMaintenanceTask(tenant_id: string, task_id: string) {
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

    await db
      .delete(maintenanceTasks)
      .where(eq(maintenanceTasks.id, task_id));

    return { success: true };
  }
}
