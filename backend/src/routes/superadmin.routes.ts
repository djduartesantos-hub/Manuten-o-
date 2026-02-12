import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import * as SuperAdminController from '../controllers/superadmin.controller.js';

const router = Router();

function jsonRateLimit(options: { windowMs: number; limit: number; error: string }) {
	return rateLimit({
		windowMs: options.windowMs,
		limit: options.limit,
		standardHeaders: true,
		legacyHeaders: false,
		handler: (_req: Request, res: Response) => {
			return res.status(429).json({ success: false, error: options.error });
		},
	});
}

const superadminExportLimiter = jsonRateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 60,
	error: 'Too many export requests. Please try again later.',
});

const superadminSupportToolLimiter = jsonRateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 30,
	error: 'Too many support tool requests. Please try again later.',
});

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
router.get('/metrics/tenants/export', superadminExportLimiter, SuperAdminController.exportTenantMetrics);
router.get('/metrics/activity/tenants', SuperAdminController.getTenantsActivity);
router.get('/metrics/activity/tenants/export', superadminExportLimiter, SuperAdminController.exportTenantsActivity);
router.get('/metrics/plants', SuperAdminController.listPlantMetrics);
router.get('/metrics/plants/export', superadminExportLimiter, SuperAdminController.exportPlantMetrics);
router.get('/metrics/users/anomalies', SuperAdminController.getUserAnomalies);
router.get('/metrics/users/security', SuperAdminController.getUserSecurityInsights);
router.get('/metrics/users/security/export', superadminExportLimiter, SuperAdminController.exportUserSecurityInsights);
router.get('/metrics/rbac/drift', SuperAdminController.getRbacDrift);
router.get('/metrics/rbac/drift/export', superadminExportLimiter, SuperAdminController.exportRbacDrift);

// Database (status)
router.get('/db/status', SuperAdminController.getDbStatus);

// Health / diagnostics
router.get('/health', SuperAdminController.getHealth);
router.get('/diagnostics/tenants', SuperAdminController.getTenantDiagnostics);
router.get('/diagnostics/bundle/export', superadminExportLimiter, SuperAdminController.exportDiagnosticsBundle);
router.get('/diagnostics/integrity', SuperAdminController.getIntegrityChecks);
router.get('/diagnostics/integrity/export', superadminExportLimiter, SuperAdminController.exportIntegrityChecks);

// SuperAdmin audit logs
router.get('/audit', SuperAdminController.listSuperadminAudit);
router.get('/audit/export', superadminExportLimiter, SuperAdminController.exportSuperadminAudit);
router.post('/audit/purge', superadminSupportToolLimiter, SuperAdminController.purgeSuperadminAudit);

// Support tools
router.get('/users/search', SuperAdminController.searchUsers);
router.post('/users/:userId/reset-password', superadminSupportToolLimiter, SuperAdminController.resetUserPassword);

// Setup runs export (tenant-scoped)
router.get('/db/runs/export', superadminExportLimiter, SuperAdminController.exportSetupRuns);

export default router;
