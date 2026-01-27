import { Router } from 'express';
import * as SparePartController from '../controllers/sparepart.controller';
import { authMiddleware, tenantMiddleware, requireRole } from '../middlewares/auth';

const router = Router({ mergeParams: true });

// Apply middlewares
router.use(authMiddleware);
router.use(tenantMiddleware);

// Spare Parts
// GET /api/spareparts - listar peças
router.get('/', SparePartController.getSpareParts);

// POST /api/spareparts - criar peça
router.post(
  '/',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  SparePartController.createSparePart
);

// GET /api/spareparts/:spare_part_id - detalhe da peça
router.get('/:spare_part_id', SparePartController.getSparePart);

// PATCH /api/spareparts/:spare_part_id - atualizar peça
router.patch(
  '/:spare_part_id',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  SparePartController.updateSparePart
);

// DELETE /api/spareparts/:spare_part_id - eliminar peça
router.delete(
  '/:spare_part_id',
  requireRole('supervisor', 'maintenance_manager', 'admin'),
  SparePartController.deleteSparePart
);

// Stock
// GET /api/spareparts/:spare_part_id/stock/:plant_id - quantidade em stock
router.get('/:spare_part_id/stock/:plant_id', SparePartController.getStockQuantity);

// GET /api/spareparts/:spare_part_id/stock-summary - resumo de stock
router.get('/:spare_part_id/stock-summary', SparePartController.getStockSummary);

// GET /api/spareparts/:spare_part_id/movements - movimentos da peça
router.get('/:spare_part_id/movements', SparePartController.getStockMovementsByPart);

// Stock Movements
// POST /api/stock-movements - registar movimento
router.post(
  '/movements',
  requireRole('technician', 'supervisor', 'maintenance_manager', 'admin'),
  SparePartController.createStockMovement
);

// GET /api/stock-movements/plant/:plant_id - movimentos da instalação
router.get('/movements/plant/:plant_id', SparePartController.getStockMovementsByPlant);

export default router;
