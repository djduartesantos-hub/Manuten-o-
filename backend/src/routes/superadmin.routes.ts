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

// Metrics / exports
router.get('/metrics/dashboard', SuperAdminController.getDashboardMetrics);
router.get('/metrics/tenants', SuperAdminController.listTenantMetrics);
router.get('/metrics/tenants/export', SuperAdminController.exportTenantMetrics);
router.get('/metrics/activity/tenants', SuperAdminController.getTenantsActivity);
router.get('/metrics/activity/tenants/export', SuperAdminController.exportTenantsActivity);
router.get('/metrics/plants', SuperAdminController.listPlantMetrics);
router.get('/metrics/plants/export', SuperAdminController.exportPlantMetrics);
router.get('/metrics/users/anomalies', SuperAdminController.getUserAnomalies);
router.get('/metrics/users/security', SuperAdminController.getUserSecurityInsights);
router.get('/metrics/users/security/export', SuperAdminController.exportUserSecurityInsights);
router.get('/metrics/rbac/drift', SuperAdminController.getRbacDrift);
router.get('/metrics/rbac/drift/export', SuperAdminController.exportRbacDrift);

// Database (status)
router.get('/db/status', SuperAdminController.getDbStatus);

// Health / diagnostics
router.get('/health', SuperAdminController.getHealth);
router.get('/diagnostics/tenants', SuperAdminController.getTenantDiagnostics);
router.get('/diagnostics/tenants/healthscore', SuperAdminController.getTenantsHealthScore);
router.get('/diagnostics/tenants/healthscore/export', SuperAdminController.exportTenantsHealthScore);
router.get('/diagnostics/bundle/export', SuperAdminController.exportDiagnosticsBundle);
router.get('/diagnostics/integrity', SuperAdminController.getIntegrityChecks);
router.get('/diagnostics/integrity/export', SuperAdminController.exportIntegrityChecks);

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
