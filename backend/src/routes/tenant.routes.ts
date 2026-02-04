import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../middlewares/auth';
import * as TenantController from '../controllers/tenant.controller';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/tenants/plants - listar fábricas do utilizador
router.get('/plants', TenantController.getUserPlants);

export default router;