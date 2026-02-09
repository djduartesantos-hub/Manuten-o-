import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { MaintenanceKitService } from '../services/maintenancekit.service.js';
import {
  createMaintenanceKitSchema,
  updateMaintenanceKitSchema,
  upsertMaintenanceKitItemsSchema,
} from '../schemas/maintenancekit.validation.js';

const service = new MaintenanceKitService();

export class MaintenanceKitController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { plan_id, category_id, is_active } = req.query;

      if (!tenantId) {
        res.status(400).json({ success: false, error: 'Tenant ID is required' });
        return;
      }

      const kits = await service.listKits(tenantId, {
        plan_id: plan_id as string | undefined,
        category_id: category_id as string | undefined,
        is_active: is_active === undefined ? undefined : String(is_active) === 'true',
      });

      res.json({ success: true, data: kits, total: kits.length });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list kits',
      });
    }
  }

  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { kitId } = req.params;

      if (!tenantId || !kitId) {
        res.status(400).json({ success: false, error: 'Kit ID is required' });
        return;
      }

      const kit = await service.getKitById(tenantId, kitId);
      res.json({ success: true, data: kit });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get kit';
      res.status(msg.includes('not found') ? 404 : 500).json({ success: false, error: msg });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validation = createMaintenanceKitSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors,
        });
        return;
      }

      const kit = await service.createKit(tenantId, userId, validation.data);
      res.status(201).json({ success: true, data: kit });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create kit',
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      const { kitId } = req.params;

      if (!tenantId || !userId || !kitId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validation = updateMaintenanceKitSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors,
        });
        return;
      }

      const kit = await service.updateKit(tenantId, userId, kitId, validation.data);
      res.json({ success: true, data: kit });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update kit';
      res.status(msg.includes('not found') ? 404 : 400).json({ success: false, error: msg });
    }
  }

  static async listItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { kitId } = req.params;

      if (!tenantId || !kitId) {
        res.status(400).json({ success: false, error: 'Kit ID is required' });
        return;
      }

      const items = await service.listKitItems(tenantId, kitId);
      res.json({ success: true, data: items, total: items.length });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to list kit items';
      res.status(msg.includes('not found') ? 404 : 500).json({ success: false, error: msg });
    }
  }

  static async upsertItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      const { kitId } = req.params;

      if (!tenantId || !userId || !kitId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validation = upsertMaintenanceKitItemsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors,
        });
        return;
      }

      const items = await service.upsertKitItems(tenantId, userId, kitId, validation.data);
      res.json({ success: true, data: items, total: items.length });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upsert kit items';
      res.status(msg.includes('not found') ? 404 : 400).json({ success: false, error: msg });
    }
  }
}
