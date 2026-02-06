import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller.js';
import { authMiddleware, plantMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
// plantMiddleware handles authorization checking
router.use(authMiddleware);
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
  requireRole('tecnico', 'supervisor', 'gestor_manutencao', 'admin_empresa', 'superadmin'),
  AssetController.create
);

// PUT /api/tenants/:plantId/assets/:id - atualizar (Planner+)
router.put(
  '/:plantId/assets/:id',
  requireRole('tecnico', 'supervisor', 'gestor_manutencao', 'admin_empresa', 'superadmin'),
  AssetController.update
);

// DELETE /api/tenants/:plantId/assets/:id - eliminar (Admin+)
router.delete(
  '/:plantId/assets/:id',
  requireRole('supervisor', 'gestor_manutencao', 'admin_empresa', 'superadmin'),
  AssetController.delete
);

export default router;
