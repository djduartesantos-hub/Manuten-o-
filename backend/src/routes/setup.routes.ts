import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth';
import * as SetupController from '../controllers/setup.controller';

const router = Router();

// All setup routes require authentication and superadmin role
router.use(authMiddleware);
router.use(requireRole('superadmin'));

// GET /api/setup/status - Check database status
router.get('/status', SetupController.checkStatus);

// POST /api/setup/seed - Seed demo data
router.post('/seed', SetupController.seedDemoData);

// POST /api/setup/clear - Clear all data (dangerous!)
router.post('/clear', SetupController.clearData);

export default router;
