import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import * as TenantController from '../controllers/tenant.controller.js';

const router = Router({ mergeParams: true });

// GET /api/tenants/plants - listar fábricas do utilizador
// Only requires authentication, NOT tenantMiddleware (no :tenantId in URL)
router.get('/plants', authMiddleware, TenantController.getUserPlants);

export default router;