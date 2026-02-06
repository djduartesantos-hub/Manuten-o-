import { Router } from 'express';
import { SetupController } from '../controllers/setup.controller.js';

const router = Router();

// POST /api/setup/bootstrap - Run migrations + seed demo (no auth, only empty DB)
router.post('/bootstrap', SetupController.bootstrapAll);

export default router;
