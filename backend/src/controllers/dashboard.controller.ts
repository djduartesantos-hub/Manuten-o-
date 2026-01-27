import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { TenantService } from '../services/tenant.service';
import { logger } from '../config/logger';

export class DashboardController {
  static async getMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Plant ID is required',
        });
        return;
      }

      const workOrders = await TenantService.getPlantWorkOrders(tenantId, plantId);

      const metrics = {
        total_orders: workOrders.length,
        open_orders: workOrders.filter((wo: any) => wo.status === 'aberta').length,
        assigned_orders: workOrders.filter((wo: any) => wo.status === 'atribuida').length,
        in_progress: workOrders.filter((wo: any) => wo.status === 'em_curso').length,
        completed: workOrders.filter((wo: any) => wo.status === 'concluida').length,
        cancelled: workOrders.filter((wo: any) => wo.status === 'cancelada').length,
      };

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Dashboard metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
      });
    }
  }

  static async getKPIs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Plant ID is required',
        });
        return;
      }

      const workOrders = await TenantService.getPlantWorkOrders(tenantId, plantId);

      // Calculate basic KPIs
      const completedOrders = workOrders.filter((wo: any) => wo.status === 'concluida');
      const totalHours = completedOrders.reduce(
        (sum: any, wo: any) => sum + (parseFloat(wo.actual_hours as any) || 0),
        0,
      );

      const kpis = {
        mttr: completedOrders.length > 0 ? (totalHours / completedOrders.length).toFixed(2) : 0,
        mtbf: 'N/A',
        availability: '95%',
        backlog: workOrders.filter((wo: any) => wo.status !== 'concluida').length,
      };

      res.json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      logger.error('KPI calculation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch KPIs',
      });
    }
  }
}
