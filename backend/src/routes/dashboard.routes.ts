import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
router.use(authMiddleware);
router.use(plantMiddleware);

// Routes
router.get('/:plantId/metrics', requirePermission('dashboard:read'), DashboardController.getMetrics);
router.get('/:plantId/kpis', requirePermission('dashboard:read'), DashboardController.getKPIs);

export default router;
