import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { SetupController } from '../controllers/setup.controller.js';

const router = Router();

// POST /api/setup/initialize - Initialize DB with admin user (NO AUTH REQUIRED)
// This endpoint is only accessible when the database is empty
// Must be defined BEFORE authMiddleware
router.post('/initialize', SetupController.initialize);

// GET /api/setup/status - Check database status (requires auth)
router.get(
  '/status',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.checkStatus,
);

// POST /api/setup/seed - Seed demo data (requires auth)
router.post(
  '/seed',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.seedDemoData,
);

// POST /api/setup/migrate - Run SQL migrations (requires auth)
router.post(
  '/migrate',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.runMigrations,
);

// POST /api/setup/patch/work-orders - Add work_performed column if missing
router.post(
	'/patch/work-orders',
	authMiddleware,
  requirePermission('setup:run', 'tenant'),
	SetupController.patchWorkOrders,
);

// POST /api/setup/patch/all - Apply all corrections and migrations
router.post(
  '/patch/all',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.applyCorrections,
);

// POST /api/setup/clear - Clear all data (dangerous!) (requires auth)
router.post(
  '/clear',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.clearData,
);

export default router;
