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

// POST /api/setup/patch/work-orders-downtime-rca - Add downtime_type/downtime_category/root_cause/corrective_action if missing
router.post(
  '/patch/work-orders-downtime-rca',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.patchWorkOrdersDowntimeRca,
);

// POST /api/setup/patch/work-orders-sla-pause - Add sla_exclude_pause/sla_paused_ms/sla_pause_started_at if missing
router.post(
  '/patch/work-orders-sla-pause',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.patchWorkOrdersSlaPause,
);

// POST /api/setup/patch/all - Apply all corrections and migrations
router.post(
  '/patch/all',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.applyCorrections,
);

// POST /api/setup/patch/maintenance-plans-tolerance-mode - Add tolerance_mode if missing
router.post(
  '/patch/maintenance-plans-tolerance-mode',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.patchMaintenancePlansToleranceMode,
);

// POST /api/setup/patch/maintenance-plans-schedule-anchor-mode - Add schedule_anchor_mode if missing
router.post(
  '/patch/maintenance-plans-schedule-anchor-mode',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.patchMaintenancePlansScheduleAnchorMode,
);

// POST /api/setup/patch/stock-reservations - Create stock_reservations table if missing
router.post(
  '/patch/stock-reservations',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.patchStockReservations,
);

// POST /api/setup/patch/maintenance-kits - Create maintenance_kits + maintenance_kit_items tables if missing
router.post(
  '/patch/maintenance-kits',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.patchMaintenanceKits,
);

// POST /api/setup/clear - Clear all data (dangerous!) (requires auth)
router.post(
  '/clear',
  authMiddleware,
  requirePermission('setup:run', 'tenant'),
  SetupController.clearData,
);

export default router;
