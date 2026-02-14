import { Response } from 'express';
import { and, eq, gte, lt, gt, asc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { logger } from '../config/logger.js';
import {
  assets,
  maintenancePlans,
  plannedDowntimes,
  preventiveMaintenanceSchedules,
  workOrders,
} from '../db/schema.js';
import { AuthenticatedRequest } from '../types/index.js';

const ALLOWED_DOWNTIME_TYPES = new Set(['total', 'parcial']);
const ALLOWED_DOWNTIME_CATEGORIES = new Set(['producao', 'seguranca', 'energia', 'pecas', 'outras']);

function parseDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function defaultRange(): { start: Date; end: Date } {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { start, end };
}

export class PlannerController {
  static async listPlanner(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const plantId = String(req.params?.plantId || '').trim();

      if (!tenantId || !plantId) {
        res.status(400).json({ success: false, error: 'Plant ID is required' });
        return;
      }

      const startParam = parseDateOrNull(req.query?.start);
      const endParam = parseDateOrNull(req.query?.end);
      const { start: startDefault, end: endDefault } = defaultRange();
      const start = startParam ?? startDefault;
      const end = endParam ?? endDefault;

      if (end.getTime() <= start.getTime()) {
        res.status(400).json({ success: false, error: 'Intervalo inválido (end deve ser depois de start)' });
        return;
      }

      const [scheduleRows, workOrderRows, downtimeRows] = await Promise.all([
        db
          .select({
            id: preventiveMaintenanceSchedules.id,
            scheduled_for: preventiveMaintenanceSchedules.scheduled_for,
            status: preventiveMaintenanceSchedules.status,
            plan_id: preventiveMaintenanceSchedules.plan_id,
            asset_id: preventiveMaintenanceSchedules.asset_id,
            plan_name: maintenancePlans.name,
            asset_code: assets.code,
            asset_name: assets.name,
          })
          .from(preventiveMaintenanceSchedules)
          .leftJoin(maintenancePlans, eq(preventiveMaintenanceSchedules.plan_id, maintenancePlans.id))
          .leftJoin(assets, eq(preventiveMaintenanceSchedules.asset_id, assets.id))
          .where(
            and(
              eq(preventiveMaintenanceSchedules.tenant_id, tenantId),
              eq(preventiveMaintenanceSchedules.plant_id, plantId),
              gte(preventiveMaintenanceSchedules.scheduled_for, start),
              lt(preventiveMaintenanceSchedules.scheduled_for, end),
            ),
          )
          .orderBy(asc(preventiveMaintenanceSchedules.scheduled_for)),

        db
          .select({
            id: workOrders.id,
            title: workOrders.title,
            status: workOrders.status,
            priority: workOrders.priority,
            scheduled_date: workOrders.scheduled_date,
            estimated_hours: workOrders.estimated_hours,
            asset_id: workOrders.asset_id,
            asset_code: assets.code,
            asset_name: assets.name,
          })
          .from(workOrders)
          .leftJoin(assets, eq(workOrders.asset_id, assets.id))
          .where(
            and(
              eq(workOrders.tenant_id, tenantId),
              eq(workOrders.plant_id, plantId),
              gte(workOrders.scheduled_date, start),
              lt(workOrders.scheduled_date, end),
            ),
          )
          .orderBy(asc(workOrders.scheduled_date)),

        db
          .select({
            id: plannedDowntimes.id,
            title: plannedDowntimes.title,
            description: plannedDowntimes.description,
            start_at: plannedDowntimes.start_at,
            end_at: plannedDowntimes.end_at,
            downtime_type: plannedDowntimes.downtime_type,
            downtime_category: plannedDowntimes.downtime_category,
            created_by: plannedDowntimes.created_by,
            created_at: plannedDowntimes.created_at,
          })
          .from(plannedDowntimes)
          .where(
            and(
              eq(plannedDowntimes.tenant_id, tenantId),
              eq(plannedDowntimes.plant_id, plantId),
              lt(plannedDowntimes.start_at, end),
              gt(plannedDowntimes.end_at, start),
            ),
          )
          .orderBy(asc(plannedDowntimes.start_at)),
      ]);

      const safeSchedules = (scheduleRows || []).map((r: any) => {
        const startAt = r.scheduled_for as Date;
        // Preventivas: não temos duração explícita → 1h por defeito (visual)
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
        const assetLabel = r.asset_code ? `${String(r.asset_code)}${r.asset_name ? ` — ${String(r.asset_name)}` : ''}` : null;
        const planLabel = r.plan_name ? String(r.plan_name) : 'Preventiva';
        return {
          kind: 'preventive' as const,
          id: String(r.id),
          title: assetLabel ? `${planLabel} (${assetLabel})` : planLabel,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          status: String(r.status),
          planId: r.plan_id ? String(r.plan_id) : null,
          assetId: r.asset_id ? String(r.asset_id) : null,
        };
      });

      const safeWorkOrders = (workOrderRows || [])
        .filter((r: any) => !!r.scheduled_date)
        .map((r: any) => {
          const startAt = r.scheduled_date as Date;
          const estimatedHours = r.estimated_hours ? Number(r.estimated_hours) : 1;
          const durationMs = Number.isFinite(estimatedHours) && estimatedHours > 0 ? estimatedHours * 60 * 60 * 1000 : 60 * 60 * 1000;
          const endAt = new Date(startAt.getTime() + durationMs);
          const assetLabel = r.asset_code ? `${String(r.asset_code)}${r.asset_name ? ` — ${String(r.asset_name)}` : ''}` : null;
          const baseTitle = String(r.title || 'Ordem');
          return {
            kind: 'work_order' as const,
            id: String(r.id),
            title: assetLabel ? `${baseTitle} (${assetLabel})` : baseTitle,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            status: String(r.status),
            priority: String(r.priority),
            assetId: r.asset_id ? String(r.asset_id) : null,
          };
        });

      const safeDowntimes = (downtimeRows || []).map((r: any) => {
        const startAt = r.start_at as Date;
        const endAt = r.end_at as Date;
        return {
          kind: 'downtime' as const,
          id: String(r.id),
          title: String(r.title || 'Paragem planeada'),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          downtimeType: String(r.downtime_type),
          downtimeCategory: String(r.downtime_category),
          description: r.description ? String(r.description) : null,
        };
      });

      const combined = [...safeDowntimes, ...safeSchedules, ...safeWorkOrders].sort(
        (a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      );

      res.json({
        success: true,
        data: combined,
        range: { start: start.toISOString(), end: end.toISOString() },
        totals: {
          total: combined.length,
          downtimes: safeDowntimes.length,
          schedules: safeSchedules.length,
          workOrders: safeWorkOrders.length,
        },
      });
    } catch (error) {
      logger.error('Planner list error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch planner data' });
    }
  }

  static async listPlannedDowntimes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const plantId = String(req.params?.plantId || '').trim();

      if (!tenantId || !plantId) {
        res.status(400).json({ success: false, error: 'Plant ID is required' });
        return;
      }

      const startParam = parseDateOrNull(req.query?.start);
      const endParam = parseDateOrNull(req.query?.end);
      const { start: startDefault, end: endDefault } = defaultRange();
      const start = startParam ?? startDefault;
      const end = endParam ?? endDefault;

      const rows = await db
        .select({
          id: plannedDowntimes.id,
          title: plannedDowntimes.title,
          description: plannedDowntimes.description,
          start_at: plannedDowntimes.start_at,
          end_at: plannedDowntimes.end_at,
          downtime_type: plannedDowntimes.downtime_type,
          downtime_category: plannedDowntimes.downtime_category,
          created_by: plannedDowntimes.created_by,
          created_at: plannedDowntimes.created_at,
          updated_at: plannedDowntimes.updated_at,
        })
        .from(plannedDowntimes)
        .where(
          and(
            eq(plannedDowntimes.tenant_id, tenantId),
            eq(plannedDowntimes.plant_id, plantId),
            lt(plannedDowntimes.start_at, end),
            gt(plannedDowntimes.end_at, start),
          ),
        )
        .orderBy(asc(plannedDowntimes.start_at));

      res.json({
        success: true,
        data: (rows || []).map((r: any) => ({
          id: String(r.id),
          title: String(r.title),
          description: r.description ? String(r.description) : null,
          start_at: (r.start_at as Date).toISOString(),
          end_at: (r.end_at as Date).toISOString(),
          downtime_type: String(r.downtime_type),
          downtime_category: String(r.downtime_category),
          created_by: r.created_by ? String(r.created_by) : null,
          created_at: r.created_at ? (r.created_at as Date).toISOString() : null,
          updated_at: r.updated_at ? (r.updated_at as Date).toISOString() : null,
        })),
      });
    } catch (error) {
      logger.error('List planned downtimes error:', error);
      res.status(500).json({ success: false, error: 'Failed to list planned downtimes' });
    }
  }

  static async createPlannedDowntime(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const plantId = String(req.params?.plantId || '').trim();
      const userId = req.user?.userId ? String(req.user.userId) : null;

      if (!tenantId || !plantId) {
        res.status(400).json({ success: false, error: 'Plant ID is required' });
        return;
      }

      const title = String(req.body?.title || 'Paragem planeada').trim();
      const description = req.body?.description ? String(req.body.description).trim() : null;
      const startAt = parseDateOrNull(req.body?.start_at || req.body?.startAt);
      const endAt = parseDateOrNull(req.body?.end_at || req.body?.endAt);
      const downtimeType = String(req.body?.downtime_type || req.body?.downtimeType || '').trim();
      const downtimeCategory = String(req.body?.downtime_category || req.body?.downtimeCategory || '').trim();

      if (title.length < 2) {
        res.status(400).json({ success: false, error: 'Título é obrigatório' });
        return;
      }

      if (!startAt || !endAt) {
        res.status(400).json({ success: false, error: 'Indique start_at e end_at' });
        return;
      }

      if (endAt.getTime() <= startAt.getTime()) {
        res.status(400).json({ success: false, error: 'Datas inválidas (fim deve ser depois do início)' });
        return;
      }

      if (!ALLOWED_DOWNTIME_TYPES.has(downtimeType)) {
        res.status(400).json({ success: false, error: 'Paragem: tipo inválido (use total ou parcial)' });
        return;
      }

      if (!ALLOWED_DOWNTIME_CATEGORIES.has(downtimeCategory)) {
        res.status(400).json({ success: false, error: 'Paragem: categoria inválida' });
        return;
      }

      const [created] = await db
        .insert(plannedDowntimes)
        .values({
          tenant_id: tenantId,
          plant_id: plantId,
          title,
          description,
          start_at: startAt,
          end_at: endAt,
          downtime_type: downtimeType,
          downtime_category: downtimeCategory,
          created_by: userId,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          id: String((created as any).id),
          title: String((created as any).title),
          description: (created as any).description ? String((created as any).description) : null,
          start_at: ((created as any).start_at as Date).toISOString(),
          end_at: ((created as any).end_at as Date).toISOString(),
          downtime_type: String((created as any).downtime_type),
          downtime_category: String((created as any).downtime_category),
          created_by: (created as any).created_by ? String((created as any).created_by) : null,
          created_at: (created as any).created_at ? ((created as any).created_at as Date).toISOString() : null,
          updated_at: (created as any).updated_at ? ((created as any).updated_at as Date).toISOString() : null,
        },
        message: 'Paragem planeada criada',
      });
    } catch (error) {
      logger.error('Create planned downtime error:', error);
      res.status(500).json({ success: false, error: 'Failed to create planned downtime' });
    }
  }

  static async updatePlannedDowntime(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const plantId = String(req.params?.plantId || '').trim();
      const downtimeId = String(req.params?.downtimeId || '').trim();

      if (!tenantId || !plantId || !downtimeId) {
        res.status(400).json({ success: false, error: 'Downtime ID is required' });
        return;
      }

      const existing = await db.query.plannedDowntimes.findFirst({
        where: (fields: any, { and, eq }: any) =>
          and(eq(fields.tenant_id, tenantId), eq(fields.plant_id, plantId), eq(fields.id, downtimeId)),
      });

      if (!existing) {
        res.status(404).json({ success: false, error: 'Paragem não encontrada' });
        return;
      }

      const title = req.body?.title !== undefined ? String(req.body.title || '').trim() : null;
      const description = req.body?.description !== undefined ? String(req.body.description || '').trim() : null;
      const startAt = req.body?.start_at !== undefined || req.body?.startAt !== undefined ? parseDateOrNull(req.body?.start_at || req.body?.startAt) : null;
      const endAt = req.body?.end_at !== undefined || req.body?.endAt !== undefined ? parseDateOrNull(req.body?.end_at || req.body?.endAt) : null;
      const downtimeType =
        req.body?.downtime_type !== undefined || req.body?.downtimeType !== undefined
          ? String(req.body?.downtime_type || req.body?.downtimeType || '').trim()
          : null;
      const downtimeCategory =
        req.body?.downtime_category !== undefined || req.body?.downtimeCategory !== undefined
          ? String(req.body?.downtime_category || req.body?.downtimeCategory || '').trim()
          : null;

      const nextStart = startAt ?? (existing as any).start_at;
      const nextEnd = endAt ?? (existing as any).end_at;
      if (nextEnd && nextStart && new Date(nextEnd).getTime() <= new Date(nextStart).getTime()) {
        res.status(400).json({ success: false, error: 'Datas inválidas (fim deve ser depois do início)' });
        return;
      }

      if (downtimeType !== null && !ALLOWED_DOWNTIME_TYPES.has(downtimeType)) {
        res.status(400).json({ success: false, error: 'Paragem: tipo inválido (use total ou parcial)' });
        return;
      }

      if (downtimeCategory !== null && !ALLOWED_DOWNTIME_CATEGORIES.has(downtimeCategory)) {
        res.status(400).json({ success: false, error: 'Paragem: categoria inválida' });
        return;
      }

      const [updated] = await db
        .update(plannedDowntimes)
        .set({
          ...(title !== null ? { title } : {}),
          ...(description !== null ? { description: description || null } : {}),
          ...(startAt !== null ? { start_at: startAt } : {}),
          ...(endAt !== null ? { end_at: endAt } : {}),
          ...(downtimeType !== null ? { downtime_type: downtimeType } : {}),
          ...(downtimeCategory !== null ? { downtime_category: downtimeCategory } : {}),
          updated_at: new Date(),
        })
        .where(and(eq(plannedDowntimes.tenant_id, tenantId), eq(plannedDowntimes.plant_id, plantId), eq(plannedDowntimes.id, downtimeId)))
        .returning();

      res.json({
        success: true,
        data: {
          id: String((updated as any).id),
          title: String((updated as any).title),
          description: (updated as any).description ? String((updated as any).description) : null,
          start_at: ((updated as any).start_at as Date).toISOString(),
          end_at: ((updated as any).end_at as Date).toISOString(),
          downtime_type: String((updated as any).downtime_type),
          downtime_category: String((updated as any).downtime_category),
          created_by: (updated as any).created_by ? String((updated as any).created_by) : null,
          created_at: (updated as any).created_at ? ((updated as any).created_at as Date).toISOString() : null,
          updated_at: (updated as any).updated_at ? ((updated as any).updated_at as Date).toISOString() : null,
        },
        message: 'Paragem planeada atualizada',
      });
    } catch (error) {
      logger.error('Update planned downtime error:', error);
      res.status(500).json({ success: false, error: 'Failed to update planned downtime' });
    }
  }

  static async deletePlannedDowntime(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const plantId = String(req.params?.plantId || '').trim();
      const downtimeId = String(req.params?.downtimeId || '').trim();

      if (!tenantId || !plantId || !downtimeId) {
        res.status(400).json({ success: false, error: 'Downtime ID is required' });
        return;
      }

      const [deleted] = await db
        .delete(plannedDowntimes)
        .where(and(eq(plannedDowntimes.tenant_id, tenantId), eq(plannedDowntimes.plant_id, plantId), eq(plannedDowntimes.id, downtimeId)))
        .returning({ id: plannedDowntimes.id });

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Paragem não encontrada' });
        return;
      }

      res.json({ success: true, message: 'Paragem planeada removida' });
    } catch (error) {
      logger.error('Delete planned downtime error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete planned downtime' });
    }
  }
}
