import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller.js';
import { authMiddleware, tenantMiddleware, plantMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(plantMiddleware);

// GET /api/tenants/:plantId/assets - listar
router.get('/:plantId/assets', AssetController.list);

// GET /api/tenants/:plantId/assets/maintenance/due - manutenção
router.get('/:plantId/assets/maintenance/due', AssetController.getDueForMaintenance);

// GET /api/tenants/:plantId/assets/:id - detalhe
router.get('/:plantId/assets/:id', AssetController.get);

// POST /api/tenants/:plantId/assets - criar (Planner+)
router.post(
  '/:plantId/assets',
  requireRole('planner', 'technician', 'supervisor', 'maintenance_manager', 'admin'),
  AssetController.create
);

// PUT /api/tenants/:plantId/assets/:id - atualizar (Planner+)
router.put(
  '/:plantId/assets/:id',
  requireRole('planner', 'technician', 'supervisor', 'maintenance_manager', 'admin'),
  AssetController.update
);

// DELETE /api/tenants/:plantId/assets/:id - eliminar (Admin+)
router.delete(
  '/:plantId/assets/:id',
  requireRole('supervisor', 'maintenance_manager', 'admin'),
  AssetController.delete
);

export default router;
