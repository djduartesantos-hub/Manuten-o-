// @ts-nocheck
import { Response } from 'express';
import { MaintenanceService } from '../services/maintenance.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import {
  createMaintenancePlanSchema,
  updateMaintenancePlanSchema,
  createMaintenanceTaskSchema,
  createPreventiveScheduleSchema,
  updatePreventiveScheduleSchema,
} from '../schemas/maintenance.validation.js';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';
import { db } from '../config/database.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolvePlantId = async (req: AuthenticatedRequest, tenantId?: string) => {
  const direct = (req.plantId as string) || (req.params?.plantId as string);
  if (direct && direct.trim() !== '') {
    if (UUID_REGEX.test(direct)) {
      return direct;
    }

    if (tenantId) {
      const byCode = await db.query.plants.findFirst({
        where: (fields: any, { eq, and }: any) =>
          and(eq(fields.tenant_id, tenantId), eq(fields.code, direct)),
      });
      if (byCode) {
        return byCode.id;
      }
    }

    return direct;
  }

  const fallback = req.user?.plantIds?.[0];
  if (fallback) {
    return fallback;
  }

  if (tenantId) {
    const firstPlant = await db.query.plants.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
    });
    return firstPlant?.id || null;
  }

  return null;
};

const maintenanceService = new MaintenanceService();

/**
 * Get all maintenance plans for tenant
 * GET /maintenance/plans
 */
export async function getMaintenancePlans(req: AuthenticatedRequest, res: Response) {
  try {
    const plantId = await resolvePlantId(req, req.tenantId as string);
    const { asset_id, type, is_active, search } = req.query;

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const plans = await maintenanceService.getMaintenancePlans(req.tenantId!, plantId, {
      asset_id: asset_id as string,
      type: type as string,
      is_active: is_active === 'true',
      search: search as string,
    });

    res.json({
      success: true,
      data: plans,
      total: plans.length,
    });
  } catch (error) {
    console.error('Error fetching maintenance plans:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch maintenance plans',
    });
  }
}

/**
 * Get a single maintenance plan
 * GET /maintenance/plans/:plan_id
 */
export async function getMaintenancePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { plan_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const plan = await maintenanceService.getMaintenancePlanById(req.tenantId!, plan_id, plantId);

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching maintenance plan:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch maintenance plan',
    });
  }
}

/**
 * Create a new maintenance plan
 * POST /maintenance/plans
 */
export async function createMaintenancePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const plantId = await resolvePlantId(req, req.tenantId as string);
    const validation = createMaintenancePlanSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const plan = await maintenanceService.createMaintenancePlan(
      req.tenantId!,
      plantId,
      validation.data
    );

    if (isSocketManagerReady()) {
      const socketManager = getSocketManager();
      socketManager.emitNotification(req.tenantId!, {
        type: 'success',
        entity: 'maintenance-plan',
        action: 'created',
        message: `Plano de manutenção criado: ${plan.name}`,
      });
    }

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Maintenance plan created successfully',
    });
  } catch (error) {
    console.error('Error creating maintenance plan:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create maintenance plan',
    });
  }
}

/**
 * Update a maintenance plan
 * PATCH /maintenance/plans/:plan_id
 */
export async function updateMaintenancePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { plan_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    const validation = updateMaintenancePlanSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const plan = await maintenanceService.updateMaintenancePlan(
      req.tenantId!,
      plantId,
      plan_id,
      validation.data
    );

    if (isSocketManagerReady()) {
      const socketManager = getSocketManager();
      socketManager.emitNotification(req.tenantId!, {
        type: 'info',
        entity: 'maintenance-plan',
        action: 'updated',
        message: `Plano de manutenção atualizado: ${plan.name}`,
      });
    }

    res.json({
      success: true,
      data: plan,
      message: 'Maintenance plan updated successfully',
    });
  } catch (error) {
    console.error('Error updating maintenance plan:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update maintenance plan',
    });
  }
}

/**
 * Delete a maintenance plan
 * DELETE /maintenance/plans/:plan_id
 */
export async function deleteMaintenancePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { plan_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    await maintenanceService.deleteMaintenancePlan(req.tenantId!, plantId, plan_id);

    if (isSocketManagerReady()) {
      const socketManager = getSocketManager();
      socketManager.emitNotification(req.tenantId!, {
        type: 'warning',
        entity: 'maintenance-plan',
        action: 'deleted',
        message: 'Plano de manutenção eliminado',
      });
    }

    res.json({
      success: true,
      message: 'Maintenance plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting maintenance plan:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete maintenance plan',
    });
  }
}

/**
 * Get maintenance plans due for an asset
 * GET /maintenance/plans/asset/:asset_id/due
 */
export async function getMaintenancePlansDue(req: AuthenticatedRequest, res: Response) {
  try {
    const { asset_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!asset_id) {
      res.status(400).json({
        success: false,
        error: 'Asset ID is required',
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const plans = await maintenanceService.getMaintenancePlansDue(req.tenantId!, plantId, asset_id);

    res.json({
      success: true,
      data: plans,
      total: plans.length,
    });
  } catch (error) {
    console.error('Error fetching due maintenance plans:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch due maintenance plans',
    });
  }
}

/**
 * Get all tasks for a maintenance plan
 * GET /maintenance/plans/:plan_id/tasks
 */
export async function getMaintenanceTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const { plan_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const tasks = await maintenanceService.getMaintenanceTasksByPlan(req.tenantId!, plantId, plan_id);

    res.json({
      success: true,
      data: tasks,
      total: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch maintenance tasks',
    });
  }
}

/**
 * Create a task for a maintenance plan
 * POST /maintenance/plans/:plan_id/tasks
 */
export async function createMaintenanceTask(req: AuthenticatedRequest, res: Response) {
  try {
    const { plan_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    const validation = createMaintenanceTaskSchema.safeParse({
      plan_id,
      ...req.body,
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const task = await maintenanceService.createMaintenanceTask(
      req.tenantId!,
      plantId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: task,
      message: 'Maintenance task created successfully',
    });
  } catch (error) {
    console.error('Error creating maintenance task:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create maintenance task',
    });
  }
}

/**
 * Delete a maintenance task
 * DELETE /maintenance/tasks/:task_id
 */
export async function deleteMaintenanceTask(req: AuthenticatedRequest, res: Response) {
  try {
    const { task_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!task_id) {
      res.status(400).json({
        success: false,
        error: 'Task ID is required',
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    await maintenanceService.deleteMaintenanceTask(req.tenantId!, plantId, task_id);

    res.json({
      success: true,
      message: 'Maintenance task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting maintenance task:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete maintenance task',
    });
  }
}

/**
 * List preventive maintenance schedules
 * GET /api/tenants/:plantId/preventive-schedules
 */
export async function getPreventiveSchedules(req: AuthenticatedRequest, res: Response) {
  try {
    const plantId = await resolvePlantId(req, req.tenantId as string);
    const { asset_id, plan_id, status } = req.query;

    if (!req.tenantId || !plantId) {
      res.status(400).json({ success: false, error: 'Plant ID is required' });
      return;
    }

    const data = await maintenanceService.getPreventiveSchedules(req.tenantId!, plantId, {
      asset_id: asset_id as string,
      plan_id: plan_id as string,
      status: status as string,
    });

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error('Error fetching preventive schedules:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch preventive schedules',
    });
  }
}

/**
 * Get upcoming preventive schedules (dashboard)
 * GET /api/tenants/:plantId/preventive-schedules/upcoming
 */
export async function getUpcomingPreventiveSchedules(req: AuthenticatedRequest, res: Response) {
  try {
    const plantId = await resolvePlantId(req, req.tenantId as string);
    const limit = req.query?.limit ? Number(req.query.limit) : 5;

    if (!req.tenantId || !plantId) {
      res.status(400).json({ success: false, error: 'Plant ID is required' });
      return;
    }

    const data = await maintenanceService.getUpcomingPreventiveSchedules(
      req.tenantId!,
      plantId,
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 20) : 5,
    );

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error('Error fetching upcoming preventive schedules:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch upcoming preventive schedules',
    });
  }
}

/**
 * Create a preventive schedule
 * POST /api/tenants/:plantId/preventive-schedules
 */
export async function createPreventiveSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const plantId = await resolvePlantId(req, req.tenantId as string);
    const validation = createPreventiveScheduleSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({ success: false, error: 'Plant ID is required' });
      return;
    }

    const created = await maintenanceService.createPreventiveSchedule(
      req.tenantId!,
      plantId,
      validation.data,
      req.user?.id,
    );

    if (isSocketManagerReady()) {
      const socketManager = getSocketManager();
      socketManager.emitNotification(req.tenantId!, {
        type: 'success',
        entity: 'preventive-schedule',
        action: 'created',
        message: 'Agendamento preventivo criado',
      });
    }

    res.status(201).json({ success: true, data: created, message: 'Preventive schedule created' });
  } catch (error) {
    console.error('Error creating preventive schedule:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create preventive schedule',
    });
  }
}

/**
 * Update a preventive schedule
 * PATCH /api/tenants/:plantId/preventive-schedules/:schedule_id
 */
export async function updatePreventiveSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const { schedule_id } = req.params;
    const plantId = await resolvePlantId(req, req.tenantId as string);

    if (!schedule_id) {
      res.status(400).json({ success: false, error: 'Schedule ID is required' });
      return;
    }

    const validation = updatePreventiveScheduleSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    if (!req.tenantId || !plantId) {
      res.status(400).json({ success: false, error: 'Plant ID is required' });
      return;
    }

    const updated = await maintenanceService.updatePreventiveSchedule(
      req.tenantId!,
      plantId,
      schedule_id,
      validation.data,
      req.user?.id,
    );

    if (isSocketManagerReady()) {
      const socketManager = getSocketManager();
      socketManager.emitNotification(req.tenantId!, {
        type: 'info',
        entity: 'preventive-schedule',
        action: 'updated',
        message: 'Agendamento preventivo atualizado',
      });
    }

    res.json({ success: true, data: updated, message: 'Preventive schedule updated' });
  } catch (error) {
    console.error('Error updating preventive schedule:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preventive schedule',
    });
  }
}
