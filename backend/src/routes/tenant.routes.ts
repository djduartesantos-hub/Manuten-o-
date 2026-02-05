import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../middlewares/auth.js';
import * as TenantController from '../controllers/tenant.controller.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/tenants/plants - listar fábricas do utilizador
router.get('/plants', TenantController.getUserPlants);

export default router;