import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import * as SuperAdminController from '../controllers/superadmin.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('superadmin'));

// Tenants (Empresas) - global list
router.get('/tenants', SuperAdminController.listTenants);

// Tenants (Empresas) - create/update
router.post('/tenants', SuperAdminController.createTenant);
router.patch('/tenants/:tenantId', SuperAdminController.updateTenant);

// Database (status)
router.get('/db/status', SuperAdminController.getDbStatus);

export default router;
