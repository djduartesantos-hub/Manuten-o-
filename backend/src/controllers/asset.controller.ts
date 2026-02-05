import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AssetService } from '../services/asset.service.js';
import { CreateAssetSchema, UpdateAssetSchema } from '../schemas/validation.js';
import { logger } from '../config/logger.js';
import { ZodError } from 'zod';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';

export class AssetController {
  /**
   * GET /api/tenants/{plantId}/assets
   * Listar equipamentos de uma planta
   */
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const plantId = req.plantId as string;
      const tenantId = req.tenantId as string;
      const { search, category } = req.query;

      logger.info('AssetController.list:', {
        plantId,
        tenantId,
        paramsPlantId: req.params.plantId,
        userTenantId: req.user?.tenantId,
        userRole: req.user?.role,
      });

      if (!tenantId || !plantId) {
        logger.warn('Missing tenantId or plantId:', { tenantId, plantId });
        res.status(400).json({
          success: false,
          error: 'Plant ID is required',
        });
        return;
      }

      let assets;

      if (search && typeof search === 'string') {
        assets = await AssetService.searchAssets(tenantId, plantId, search);
      } else if (category && typeof category === 'string') {
        assets = await AssetService.getAssetsByCategory(tenantId, plantId, category);
      } else {
        assets = await AssetService.getPlantAssets(tenantId, plantId);
      }

      res.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      logger.error('List assets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assets',
      });
    }
  }

  /**
   * GET /api/tenants/{plantId}/assets/:id
   * Obter detalhes de um equipamento
   */
  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plantId = req.plantId as string;
      const tenantId = req.tenantId as string;

      if (!tenantId || !plantId || !id) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
        return;
      }

      const asset = await AssetService.getAssetById(tenantId, id);

      if (!asset) {
        res.status(404).json({
          success: false,
          error: 'Asset not found',
        });
        return;
      }

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      logger.error('Get asset error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset',
      });
    }
  }

  /**
   * POST /api/tenants/{plantId}/assets
   * Criar novo equipamento
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const plantId = req.plantId as string;
      const tenantId = req.tenantId as string;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Plant ID is required',
        });
        return;
      }

      // Validar payload com Zod
      const validatedData = CreateAssetSchema.parse(req.body);

      const asset = await AssetService.createAsset(tenantId, plantId, validatedData);

      // Emit real-time notification
      if (isSocketManagerReady()) {
        const socketManager = getSocketManager();
        socketManager.emitNotification(tenantId, {
          type: 'success',
          entity: 'asset',
          action: 'created',
          message: `Equipamento "${asset.name}" criado com sucesso`,
          data: {
            id: asset.id,
            name: asset.name,
            code: asset.code,
          },
        });
      }

      res.status(201).json({
        success: true,
        data: asset,
      });
    } catch (error) {
      logger.error('Create asset error:', error);

      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('não encontrada')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create asset',
      });
    }
  }

  /**
   * PUT /api/tenants/{plantId}/assets/:id
   * Atualizar equipamento
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plantId = req.plantId as string;
      const tenantId = req.tenantId as string;

      if (!tenantId || !plantId || !id) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
        return;
      }

      // Validar payload com Zod
      const validatedData = UpdateAssetSchema.parse(req.body);

      const asset = await AssetService.updateAsset(tenantId, id, validatedData);

      // Emit real-time notification
      if (isSocketManagerReady()) {
        const socketManager = getSocketManager();
        socketManager.emitNotification(tenantId, {
          type: 'info',
          entity: 'asset',
          action: 'updated',
          message: `Equipamento "${asset.name}" foi atualizado`,
          data: {
            id: asset.id,
            name: asset.name,
            updated_at: asset.updated_at,
          },
        });
      }

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      logger.error('Update asset error:', error);

      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('não encontrado')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update asset',
      });
    }
  }

  /**
   * DELETE /api/tenants/{plantId}/assets/:id
   * Eliminar equipamento (soft delete)
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plantId = req.plantId as string;
      const tenantId = req.tenantId as string;

      if (!tenantId || !plantId || !id) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
        return;
      }

      await AssetService.deleteAsset(tenantId, id);

      res.json({
        success: true,
        message: 'Asset deleted successfully',
      });
    } catch (error) {
      logger.error('Delete asset error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete asset',
      });
    }
  }

  /**
   * GET /api/tenants/{plantId}/assets/maintenance/due
   * Obter equipamentos que precisam de manutenção
   */
  static async getDueForMaintenance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const plantId = req.plantId as string;
      const tenantId = req.tenantId as string;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Plant ID is required',
        });
        return;
      }

      const assets = await AssetService.getAssetsDueForMaintenance(tenantId, plantId);

      res.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      logger.error('Get due maintenance assets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assets due for maintenance',
      });
    }
  }
}
