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

// Health / diagnostics
router.get('/health', SuperAdminController.getHealth);
router.get('/diagnostics/tenants', SuperAdminController.getTenantDiagnostics);

// SuperAdmin audit logs
router.get('/audit', SuperAdminController.listSuperadminAudit);
router.get('/audit/export', SuperAdminController.exportSuperadminAudit);
router.post('/audit/purge', SuperAdminController.purgeSuperadminAudit);

// Support tools
router.get('/users/search', SuperAdminController.searchUsers);
router.post('/users/:userId/reset-password', SuperAdminController.resetUserPassword);

// Setup runs export (tenant-scoped)
router.get('/db/runs/export', SuperAdminController.exportSetupRuns);

export default router;
