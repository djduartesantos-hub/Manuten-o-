import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { SetupController } from '../controllers/setup.controller.js';

const router = Router();

// POST /api/setup/initialize - Initialize DB with admin user (NO AUTH REQUIRED)
// This endpoint is only accessible when the database is empty
router.post('/initialize', SetupController.initialize);

// All other setup routes require authentication and superadmin role
router.use(authMiddleware);
router.use(requireRole('superadmin'));

// GET /api/setup/status - Check database status
router.get('/status', SetupController.checkStatus);

// POST /api/setup/seed - Seed demo data
router.post('/seed', SetupController.seedDemoData);

// POST /api/setup/clear - Clear all data (dangerous!)
router.post('/clear', SetupController.clearData);

export default router;
