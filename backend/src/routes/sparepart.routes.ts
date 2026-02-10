import { Router } from 'express';
import * as SparePartController from '../controllers/sparepart.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
router.use(authMiddleware);
router.use(plantMiddleware);

// Spare Parts
// GET /api/tenants/:plantId/spareparts - listar peças
router.get('/:plantId/spareparts', requirePermission('stock:read'), SparePartController.getSpareParts);

// GET /api/tenants/:plantId/spareparts/forecast - previsão simples de consumo
router.get(
  '/:plantId/spareparts/forecast',
  requirePermission('stock:read'),
  SparePartController.getSparePartsForecast,
);

// POST /api/tenants/:plantId/spareparts - criar peça
router.post(
  '/:plantId/spareparts',
  requirePermission('stock:write'),
  SparePartController.createSparePart
);

// GET /api/tenants/:plantId/spareparts/:spare_part_id - detalhe da peça
router.get(
  '/:plantId/spareparts/:spare_part_id',
  requirePermission('stock:read'),
  SparePartController.getSparePart,
);

// PATCH /api/tenants/:plantId/spareparts/:spare_part_id - atualizar peça
router.patch(
  '/:plantId/spareparts/:spare_part_id',
  requirePermission('stock:write'),
  SparePartController.updateSparePart
);

// DELETE /api/tenants/:plantId/spareparts/:spare_part_id - eliminar peça
router.delete(
  '/:plantId/spareparts/:spare_part_id',
  requirePermission('stock:write'),
  SparePartController.deleteSparePart
);

// Stock
// GET /api/tenants/:plantId/spareparts/:spare_part_id/stock/:plant_id - quantidade em stock
router.get(
  '/:plantId/spareparts/:spare_part_id/stock/:plant_id',
  requirePermission('stock:read'),
  SparePartController.getStockQuantity,
);

// GET /api/tenants/:plantId/spareparts/:spare_part_id/stock-summary - resumo de stock
router.get(
  '/:plantId/spareparts/:spare_part_id/stock-summary',
  requirePermission('stock:read'),
  SparePartController.getStockSummary,
);

// GET /api/tenants/:plantId/spareparts/:spare_part_id/movements - movimentos da peça
router.get(
  '/:plantId/spareparts/:spare_part_id/movements',
  requirePermission('stock:read'),
  SparePartController.getStockMovementsByPart,
);

// Stock Movements
// POST /api/tenants/:plantId/stock-movements - registar movimento
router.post(
  '/:plantId/stock-movements',
  requirePermission('stock:write'),
  SparePartController.createStockMovement
);

// GET /api/tenants/:plantId/stock-movements/plant/:plant_id - movimentos da instalação
router.get(
  '/:plantId/stock-movements/plant/:plant_id',
  requirePermission('stock:read'),
  SparePartController.getStockMovementsByPlant,
);

export default router;
