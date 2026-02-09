import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { SetupController } from '../controllers/setup.controller.js';

const router = Router();

// POST /api/setup/initialize - Initialize DB with admin user (NO AUTH REQUIRED)
// This endpoint is only accessible when the database is empty
// Must be defined BEFORE authMiddleware
router.post('/initialize', SetupController.initialize);

// GET /api/setup/status - Check database status (requires auth)
router.get('/status', authMiddleware, requireRole('superadmin'), SetupController.checkStatus);

// POST /api/setup/seed - Seed demo data (requires auth)
router.post('/seed', authMiddleware, requireRole('superadmin'), SetupController.seedDemoData);

// POST /api/setup/migrate - Run SQL migrations (requires auth)
router.post('/migrate', authMiddleware, requireRole('superadmin'), SetupController.runMigrations);

// POST /api/setup/patch/work-orders - Add work_performed column if missing
router.post(
	'/patch/work-orders',
	authMiddleware,
	requireRole('superadmin'),
	SetupController.patchWorkOrders,
);

// POST /api/setup/patch/work-orders-downtime-rca - Add downtime_type/downtime_category/root_cause/corrective_action if missing
router.post(
  '/patch/work-orders-downtime-rca',
  authMiddleware,
  requireRole('superadmin'),
  SetupController.patchWorkOrdersDowntimeRca,
);

// POST /api/setup/patch/all - Apply all corrections and migrations
router.post(
  '/patch/all',
  authMiddleware,
  requireRole('superadmin'),
  SetupController.applyCorrections,
);

// POST /api/setup/patch/maintenance-plans-tolerance-mode - Add tolerance_mode if missing
router.post(
  '/patch/maintenance-plans-tolerance-mode',
  authMiddleware,
  requireRole('superadmin'),
  SetupController.patchMaintenancePlansToleranceMode,
);

// POST /api/setup/clear - Clear all data (dangerous!) (requires auth)
router.post('/clear', authMiddleware, requireRole('superadmin'), SetupController.clearData);

export default router;
