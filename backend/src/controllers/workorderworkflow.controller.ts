import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { WorkOrderWorkflowService, WorkflowConfig } from '../services/workorderworkflow.service.js';

const workflowService = new WorkOrderWorkflowService();

export class WorkOrderWorkflowController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      if (!req.tenantId) {
        res.status(400).json({ success: false, error: 'Tenant ID is required' });
        return;
      }

      const rows = await workflowService.listWorkflows(req.tenantId, plantId || undefined);
      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list workflows',
      });
    }
  }

  static async getActive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      if (!req.tenantId || !plantId) {
        res.status(400).json({ success: false, error: 'Plant ID is required' });
        return;
      }

      const row = await workflowService.getActiveWorkflow(req.tenantId, plantId);
      const config = workflowService.getConfigOrDefault(row);

      res.json({
        success: true,
        data: {
          workflow: row,
          config,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workflow',
      });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      if (!req.tenantId) {
        res.status(400).json({ success: false, error: 'Tenant ID is required' });
        return;
      }

      const config = req.body?.config as WorkflowConfig | undefined;
      if (!config || !Array.isArray(config.transitions)) {
        res.status(400).json({ success: false, error: 'Config invalido' });
        return;
      }

      const name = String(req.body?.name || '').trim() || 'Workflow OT';
      const isDefault = Boolean(req.body?.is_default);

      const row = await workflowService.createWorkflow({
        tenantId: req.tenantId,
        plantId: plantId || null,
        name,
        isDefault,
        config,
        userId: req.user?.userId ? String(req.user.userId) : null,
      });

      res.status(201).json({ success: true, data: row });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workflow',
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId, workflowId } = req.params;
      if (!req.tenantId || !workflowId) {
        res.status(400).json({ success: false, error: 'Workflow ID is required' });
        return;
      }

      const config = req.body?.config as WorkflowConfig | undefined;
      if (config && !Array.isArray(config.transitions)) {
        res.status(400).json({ success: false, error: 'Config invalido' });
        return;
      }

      const row = await workflowService.updateWorkflow({
        workflowId,
        tenantId: req.tenantId,
        plantId: plantId || null,
        name: req.body?.name ? String(req.body.name).trim() : undefined,
        isDefault: req.body?.is_default === undefined ? undefined : Boolean(req.body.is_default),
        config,
        userId: req.user?.userId ? String(req.user.userId) : null,
      });

      if (!row) {
        res.status(404).json({ success: false, error: 'Workflow not found' });
        return;
      }

      res.json({ success: true, data: row });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update workflow',
      });
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      if (!req.tenantId || !workflowId) {
        res.status(400).json({ success: false, error: 'Workflow ID is required' });
        return;
      }

      const row = await workflowService.deleteWorkflow(req.tenantId, workflowId);
      if (!row) {
        res.status(404).json({ success: false, error: 'Workflow not found' });
        return;
      }

      res.json({ success: true, data: { id: workflowId } });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
      });
    }
  }
}
