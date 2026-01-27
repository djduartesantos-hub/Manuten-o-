import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { WorkOrderService } from '../services/workorder.service';
import { logger } from '../config/logger';

export class WorkOrderController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const { status } = req.query;
      const tenantId = req.tenantId;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Plant ID is required',
        });
        return;
      }

      const workOrders = await WorkOrderService.getPlantWorkOrders(
        tenantId,
        plantId,
        status as string,
      );

      res.json({
        success: true,
        data: workOrders,
      });
    } catch (error) {
      logger.error('List work orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch work orders',
      });
    }
  }

  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId || !workOrderId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID and plant ID are required',
        });
        return;
      }

      const workOrder = await WorkOrderService.getWorkOrderById(tenantId, workOrderId);

      if (!workOrder) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      res.json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      logger.error('Get work order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch work order',
      });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const tenantId = req.tenantId;
      const { asset_id, title, description, priority, estimated_hours } = req.body;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID and plant ID are required',
        });
        return;
      }

      const workOrder = await WorkOrderService.createWorkOrder({
        tenant_id: tenantId,
        plant_id: plantId,
        asset_id,
        created_by: req.user?.userId || '',
        title,
        description,
        priority,
        estimated_hours,
      });

      res.status(201).json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      logger.error('Create work order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create work order',
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId } = req.params;
      const tenantId = req.tenantId;
      const updates = req.body;

      if (!tenantId || !workOrderId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID is required',
        });
        return;
      }

      const workOrder = await WorkOrderService.updateWorkOrder(
        tenantId,
        workOrderId,
        updates,
      );

      res.json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      logger.error('Update work order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update work order',
      });
    }
  }
}
