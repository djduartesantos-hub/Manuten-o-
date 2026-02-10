import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
// plantMiddleware handles authorization checking
router.use(authMiddleware);
router.use(plantMiddleware);

// GET /api/tenants/:plantId/assets - listar
router.get('/:plantId/assets', requirePermission('assets:read'), AssetController.list);

// GET /api/tenants/:plantId/assets/maintenance/due - manutenção
router.get(
  '/:plantId/assets/maintenance/due',
  requirePermission('assets:read'),
  AssetController.getDueForMaintenance,
);

// GET /api/tenants/:plantId/assets/:id - detalhe
router.get('/:plantId/assets/:id', requirePermission('assets:read'), AssetController.get);

// POST /api/tenants/:plantId/assets - criar (Planner+)
router.post(
  '/:plantId/assets',
  requirePermission('assets:write'),
  AssetController.create
);

// PUT /api/tenants/:plantId/assets/:id - atualizar (Planner+)
router.put(
  '/:plantId/assets/:id',
  requirePermission('assets:write'),
  AssetController.update
);

// DELETE /api/tenants/:plantId/assets/:id - eliminar (Admin+)
router.delete(
  '/:plantId/assets/:id',
  requirePermission('assets:write'),
  AssetController.delete
);

export default router;
