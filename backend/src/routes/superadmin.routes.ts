import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validation.js';
import {
	SuperadminCreateTicketCommentSchema,
	SuperadminUpdateTicketSchema,
} from '../schemas/validation.js';
import * as SuperAdminController from '../controllers/superadmin.controller.js';
import * as TicketsController from '../controllers/tickets.controller.js';
import { db } from '../config/database.js';

const router = Router();

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadBaseDir = path.join(__dirname, '../../uploads');
const ticketUpload = multer({
	storage: multer.diskStorage({
		destination: (req, _file, cb) => {
			const tenantId = (req as any).tenantId || (req as any).resolvedTicketTenantId || 'unknown-tenant';
			const ticketId = String((req as any).params?.ticketId || 'unknown-ticket');
			const dest = path.join(uploadBaseDir, tenantId, 'tickets', ticketId);
			try {
				fs.mkdirSync(dest, { recursive: true });
			} catch {
				// ignore
			}
			cb(null, dest);
		},
		filename: (_req, file, cb) => {
			const original = file.originalname || 'file';
			const ext = path.extname(original).slice(0, 12);
			const safeBase = path
				.basename(original, path.extname(original))
				.replace(/[^a-zA-Z0-9_.-]/g, '_')
				.slice(0, 60);
			cb(null, `${Date.now()}-${safeBase}${ext}`);
		},
	}),
	limits: { fileSize: 10 * 1024 * 1024 },
});

async function resolveTicketTenant(req: any, res: any, next: any) {
	try {
		const ticketId = String(req.params?.ticketId || '').trim();
		if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });
		const ticket = await db.query.tickets.findFirst({
			where: (fields: any, ops: any) => ops.eq(fields.id, ticketId),
		});
		if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
		(req as any).resolvedTicketTenantId = String((ticket as any).tenant_id);
		(req as any).tenantId = String((ticket as any).tenant_id);
		return next();
	} catch (e: any) {
		return res.status(500).json({ success: false, error: e?.message || 'Failed to resolve tenant' });
	}
}

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

// Tickets (Support)
router.get('/tickets', TicketsController.superadminListTickets);
router.get('/tickets/:ticketId', TicketsController.superadminGetTicket);
router.patch(
	'/tickets/:ticketId',
	validateRequest(SuperadminUpdateTicketSchema),
	TicketsController.superadminUpdateTicket,
);
router.post(
	'/tickets/:ticketId/comments',
	validateRequest(SuperadminCreateTicketCommentSchema),
	TicketsController.superadminAddComment,
);

router.get('/tickets/:ticketId/attachments', TicketsController.superadminListTicketAttachments);
router.post(
	'/tickets/:ticketId/attachments',
	resolveTicketTenant,
	ticketUpload.single('file'),
	TicketsController.superadminUploadTicketAttachment,
);

// Diagnostics -> Ticket suggestions
router.get('/tickets/suggestions', TicketsController.superadminListTicketSuggestions);
router.post('/tickets/suggestions/:key/create', TicketsController.superadminCreateTicketFromSuggestion);

// Setup runs export (tenant-scoped)
router.get('/db/runs/export', SuperAdminController.exportSetupRuns);

export default router;
