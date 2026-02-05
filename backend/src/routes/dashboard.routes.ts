import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authMiddleware, tenantMiddleware, plantMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(plantMiddleware);

// Routes
router.get('/:plantId/metrics', DashboardController.getMetrics);
router.get('/:plantId/kpis', DashboardController.getKPIs);

export default router;
