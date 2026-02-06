import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();

// GET /api/auth/tenants?email=...
router.get('/tenants', AuthController.listTenants);

export default router;
