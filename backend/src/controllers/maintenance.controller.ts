// @ts-nocheck
import { Response } from 'express';
import { MaintenanceService } from '../services/maintenance.service';
import { AuthenticatedRequest } from '../types';
import {
  createMaintenancePlanSchema,
  updateMaintenancePlanSchema,
  createMaintenanceTaskSchema,
} from '../schemas/maintenance.validation';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance';

const maintenanceService = new MaintenanceService();

/**
 * Get all maintenance plans for tenant
 * GET /maintenance/plans
 */
export async function getMaintenancePlans(req: AuthenticatedRequest, res: Response) {
  try {
    const { asset_id, type, is_active, search } = req.query;

    const plans = await maintenanceService.getMaintenancePlans(req.tenantId!, {
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

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    const plan = await maintenanceService.getMaintenancePlanById(req.tenantId!, plan_id);

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
    const validation = createMaintenancePlanSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    const plan = await maintenanceService.createMaintenancePlan(
      req.tenantId!,
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

    const plan = await maintenanceService.updateMaintenancePlan(
      req.tenantId!,
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

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    await maintenanceService.deleteMaintenancePlan(req.tenantId!, plan_id);

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

    if (!asset_id) {
      res.status(400).json({
        success: false,
        error: 'Asset ID is required',
      });
      return;
    }

    const plans = await maintenanceService.getMaintenancePlansDue(req.tenantId!, asset_id);

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

    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
      return;
    }

    const tasks = await maintenanceService.getMaintenanceTasksByPlan(req.tenantId!, plan_id);

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

    const task = await maintenanceService.createMaintenanceTask(req.tenantId!, validation.data);

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

    if (!task_id) {
      res.status(400).json({
        success: false,
        error: 'Task ID is required',
      });
      return;
    }

    await maintenanceService.deleteMaintenanceTask(req.tenantId!, task_id);

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
