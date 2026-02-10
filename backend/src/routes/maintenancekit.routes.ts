import { Router } from 'express';
import { MaintenanceKitController } from '../controllers/maintenancekit.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Kits (tenant-scoped)
router.get(
  '/maintenance-kits',
  requirePermission('kits:read', 'tenant'),
  MaintenanceKitController.list,
);
router.post(
  '/maintenance-kits',
  requirePermission('kits:write', 'tenant'),
  MaintenanceKitController.create,
);
router.get(
  '/maintenance-kits/:kitId',
  requirePermission('kits:read', 'tenant'),
  MaintenanceKitController.get,
);
router.patch(
  '/maintenance-kits/:kitId',
  requirePermission('kits:write', 'tenant'),
  MaintenanceKitController.update,
);

// Items
router.get(
  '/maintenance-kits/:kitId/items',
  requirePermission('kits:read', 'tenant'),
  MaintenanceKitController.listItems,
);
router.put(
  '/maintenance-kits/:kitId/items',
  requirePermission('kits:write', 'tenant'),
  MaintenanceKitController.upsertItems,
);

export default router;
