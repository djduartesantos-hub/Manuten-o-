import { Router } from 'express';
import { MaintenanceKitController } from '../controllers/maintenancekit.controller.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Kits (tenant-scoped)
router.get(
  '/maintenance-kits',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  MaintenanceKitController.list,
);
router.post(
  '/maintenance-kits',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  MaintenanceKitController.create,
);
router.get(
  '/maintenance-kits/:kitId',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  MaintenanceKitController.get,
);
router.patch(
  '/maintenance-kits/:kitId',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  MaintenanceKitController.update,
);

// Items
router.get(
  '/maintenance-kits/:kitId/items',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  MaintenanceKitController.listItems,
);
router.put(
  '/maintenance-kits/:kitId/items',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  MaintenanceKitController.upsertItems,
);

export default router;
