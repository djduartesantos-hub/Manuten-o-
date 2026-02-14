import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { z } from 'zod';
import { StocktakeService } from '../services/stocktake.service.js';

const stocktakeService = new StocktakeService();

const createSchema = z.object({
  notes: z.string().max(1000).optional(),
});

const updateItemSchema = z.object({
  counted_qty: z.number().int().min(0, 'Quantidade deve ser >= 0'),
});

const closeSchema = z.object({
  applyAdjustments: z.boolean().default(true),
  closeNotes: z.string().max(1000).optional(),
});

export class StocktakeController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { plantId } = req.params;
      const status = req.query?.status ? String(req.query.status) : undefined;

      if (!tenantId || !plantId) {
        res.status(400).json({ success: false, error: 'Plant ID is required' });
        return;
      }

      const rows = await stocktakeService.list(tenantId, plantId, status);
      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list stocktakes',
      });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      const { plantId } = req.params;

      if (!tenantId || !userId || !plantId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const validation = createSchema.safeParse(req.body ?? {});
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const result = await stocktakeService.create(tenantId, plantId, userId, validation.data.notes);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create stocktake',
      });
    }
  }

  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { stocktakeId } = req.params;

      if (!tenantId || !stocktakeId) {
        res.status(400).json({ success: false, error: 'Stocktake ID is required' });
        return;
      }

      const result = await stocktakeService.getById(tenantId, stocktakeId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Stocktake not found',
      });
    }
  }

  static async updateItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { stocktakeId, itemId } = req.params;

      if (!tenantId || !stocktakeId || !itemId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const validation = updateItemSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const updated = await stocktakeService.updateItemCountedQty(
        tenantId,
        stocktakeId,
        itemId,
        validation.data.counted_qty,
      );

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item',
      });
    }
  }

  static async close(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      const { plantId, stocktakeId } = req.params;

      if (!tenantId || !userId || !plantId || !stocktakeId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const validation = closeSchema.safeParse(req.body ?? {});
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const result = await stocktakeService.close(tenantId, plantId, stocktakeId, userId, {
        applyAdjustments: validation.data.applyAdjustments,
        closeNotes: validation.data.closeNotes,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close stocktake',
      });
    }
  }

  static async exportCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { stocktakeId } = req.params;
      if (!tenantId || !stocktakeId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const result = await stocktakeService.getById(tenantId, stocktakeId);
      const csv = stocktakeService.toCsv({ stocktakeId, items: (result as any)?.items || [] });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="stocktake-${stocktakeId}.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export',
      });
    }
  }
}
