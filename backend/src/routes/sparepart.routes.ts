import { Router } from 'express';
import * as SparePartController from '../controllers/sparepart.controller.js';
import { authMiddleware, plantMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
router.use(authMiddleware);
router.use(plantMiddleware);

// Spare Parts
// GET /api/tenants/:plantId/spareparts - listar peças
router.get('/:plantId/spareparts', SparePartController.getSpareParts);

// POST /api/tenants/:plantId/spareparts - criar peça
router.post(
  '/:plantId/spareparts',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  SparePartController.createSparePart
);

// GET /api/tenants/:plantId/spareparts/:spare_part_id - detalhe da peça
router.get('/:plantId/spareparts/:spare_part_id', SparePartController.getSparePart);

// PATCH /api/tenants/:plantId/spareparts/:spare_part_id - atualizar peça
router.patch(
  '/:plantId/spareparts/:spare_part_id',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  SparePartController.updateSparePart
);

// DELETE /api/tenants/:plantId/spareparts/:spare_part_id - eliminar peça
router.delete(
  '/:plantId/spareparts/:spare_part_id',
  requireRole('supervisor', 'maintenance_manager', 'admin'),
  SparePartController.deleteSparePart
);

// Stock
// GET /api/tenants/:plantId/spareparts/:spare_part_id/stock/:plant_id - quantidade em stock
router.get('/:plantId/spareparts/:spare_part_id/stock/:plant_id', SparePartController.getStockQuantity);

// GET /api/tenants/:plantId/spareparts/:spare_part_id/stock-summary - resumo de stock
router.get('/:plantId/spareparts/:spare_part_id/stock-summary', SparePartController.getStockSummary);

// GET /api/tenants/:plantId/spareparts/:spare_part_id/movements - movimentos da peça
router.get('/:plantId/spareparts/:spare_part_id/movements', SparePartController.getStockMovementsByPart);

// Stock Movements
// POST /api/tenants/:plantId/stock-movements - registar movimento
router.post(
  '/:plantId/stock-movements',
  requireRole('technician', 'supervisor', 'maintenance_manager', 'admin'),
  SparePartController.createStockMovement
);

// GET /api/tenants/:plantId/stock-movements/plant/:plant_id - movimentos da instalação
router.get('/:plantId/stock-movements/plant/:plant_id', SparePartController.getStockMovementsByPlant);

export default router;
