import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import * as CustomizationController from '../controllers/customization.controller.js';

const router = Router();

router.use(authMiddleware);

// Scheduled reports (email)
router.get('/reports', requirePermission('reports:read', 'tenant'), CustomizationController.getScheduledReports);
router.post('/reports', requirePermission('reports:read', 'tenant'), CustomizationController.createScheduledReport);
router.patch('/reports/:reportId', requirePermission('reports:read', 'tenant'), CustomizationController.updateScheduledReport);
router.delete('/reports/:reportId', requirePermission('reports:read', 'tenant'), CustomizationController.deleteScheduledReport);

export default router;