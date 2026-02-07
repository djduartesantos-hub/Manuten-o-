import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { TenantService } from '../services/tenant.service.js';
import { logger } from '../config/logger.js';

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

      // Calculate KPIs
      const completedOrders = workOrders.filter(
        (wo: any) => wo.status === 'concluida' && wo.completed_at,
      );

      const mttrHoursList = completedOrders
        .map((wo: any) => {
          if (!wo.started_at || !wo.completed_at) return null;
          const start = new Date(wo.started_at).getTime();
          const end = new Date(wo.completed_at).getTime();
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
          return (end - start) / (1000 * 60 * 60);
        })
        .filter((value: number | null): value is number => value !== null);

      const mttr =
        mttrHoursList.length > 0
          ? Number((mttrHoursList.reduce((sum, value) => sum + value, 0) / mttrHoursList.length).toFixed(2))
          : 0;

      const byAsset = new Map<string, Date[]>();
      completedOrders.forEach((wo: any) => {
        if (!wo.asset_id || !wo.completed_at) return;
        const completedAt = new Date(wo.completed_at);
        if (!Number.isFinite(completedAt.getTime())) return;
        const list = byAsset.get(wo.asset_id) || [];
        list.push(completedAt);
        byAsset.set(wo.asset_id, list);
      });

      const mtbfDiffs: number[] = [];
      byAsset.forEach((dates) => {
        if (dates.length < 2) return;
        dates.sort((a, b) => a.getTime() - b.getTime());
        for (let i = 1; i < dates.length; i += 1) {
          const diffHours = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60);
          if (Number.isFinite(diffHours) && diffHours > 0) {
            mtbfDiffs.push(diffHours);
          }
        }
      });

      const mtbf =
        mtbfDiffs.length > 0
          ? Number((mtbfDiffs.reduce((sum, value) => sum + value, 0) / mtbfDiffs.length).toFixed(2))
          : 0;

      const slaCandidates = completedOrders.filter((wo: any) => wo.sla_deadline && wo.completed_at);
      const slaMet = slaCandidates.filter(
        (wo: any) => new Date(wo.completed_at).getTime() <= new Date(wo.sla_deadline).getTime(),
      );
      const slaCompliance =
        slaCandidates.length > 0
          ? Number(((slaMet.length / slaCandidates.length) * 100).toFixed(1))
          : 0;

      const kpis = {
        mttr,
        mtbf,
        sla_compliance: slaCompliance,
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
