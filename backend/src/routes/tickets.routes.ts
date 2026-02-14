import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authMiddleware, plantMiddleware, tenantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { validateRequest } from '../middlewares/validation.js';
import {
  CreateTicketCommentSchema,
  CreateTicketSchema,
  CompanyUpdateTicketSchema,
  ForwardTicketSchema,
  UpdateTicketStatusSchema,
} from '../schemas/validation.js';
import * as TicketsController from '../controllers/tickets.controller.js';

const router = Router();

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadBaseDir = path.join(__dirname, '../../uploads');
const ticketUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const tenantId = (req as any).tenantId || (req as any).user?.tenantId || 'unknown-tenant';
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

router.use(authMiddleware);
router.use(tenantMiddleware);

// Plant-scoped (Fábrica)
router.get(
  '/plants/:plantId/tickets',
  plantMiddleware,
  requirePermission('tickets:read', 'plant'),
  TicketsController.listPlantTickets,
);
router.post(
  '/plants/:plantId/tickets',
  plantMiddleware,
  requirePermission('tickets:write', 'plant'),
  validateRequest(CreateTicketSchema),
  TicketsController.createPlantTicket,
);
router.get(
  '/plants/:plantId/tickets/:ticketId',
  plantMiddleware,
  requirePermission('tickets:read', 'plant'),
  TicketsController.getPlantTicket,
);
router.post(
  '/plants/:plantId/tickets/:ticketId/comments',
  plantMiddleware,
  requirePermission('tickets:write', 'plant'),
  validateRequest(CreateTicketCommentSchema),
  TicketsController.addPlantTicketComment,
);
router.get(
  '/plants/:plantId/tickets/:ticketId/attachments',
  plantMiddleware,
  requirePermission('tickets:read', 'plant'),
  TicketsController.listPlantTicketAttachments,
);
router.post(
  '/plants/:plantId/tickets/:ticketId/attachments',
  plantMiddleware,
  requirePermission('tickets:write', 'plant'),
  ticketUpload.single('file'),
  TicketsController.uploadPlantTicketAttachment,
);
router.patch(
  '/plants/:plantId/tickets/:ticketId/status',
  plantMiddleware,
  requirePermission('tickets:write', 'plant'),
  validateRequest(UpdateTicketStatusSchema),
  TicketsController.updatePlantTicketStatus,
);
router.patch(
  '/plants/:plantId/tickets/:ticketId/forward',
  plantMiddleware,
  requirePermission('tickets:forward', 'plant'),
  validateRequest(ForwardTicketSchema),
  TicketsController.forwardPlantTicketToCompany,
);

// Tenant-scoped (Empresa)
router.get('/tickets/company', requirePermission('tickets:read', 'tenant'), TicketsController.listCompanyTickets);
router.get(
  '/tickets/company/:ticketId',
  requirePermission('tickets:read', 'tenant'),
  TicketsController.getCompanyTicket,
);
router.post(
  '/tickets/company/:ticketId/comments',
  requirePermission('tickets:write', 'tenant'),
  validateRequest(CreateTicketCommentSchema),
  TicketsController.addCompanyTicketComment,
);
router.get(
  '/tickets/company/:ticketId/attachments',
  requirePermission('tickets:read', 'tenant'),
  TicketsController.listCompanyTicketAttachments,
);
router.post(
  '/tickets/company/:ticketId/attachments',
  requirePermission('tickets:write', 'tenant'),
  ticketUpload.single('file'),
  TicketsController.uploadCompanyTicketAttachment,
);
router.patch(
  '/tickets/company/:ticketId',
  requirePermission('tickets:write', 'tenant'),
  validateRequest(CompanyUpdateTicketSchema),
  TicketsController.updateCompanyTicket,
);
router.patch(
  '/tickets/company/:ticketId/status',
  requirePermission('tickets:write', 'tenant'),
  validateRequest(UpdateTicketStatusSchema),
  TicketsController.updateCompanyTicketStatus,
);
router.patch(
  '/tickets/company/:ticketId/forward',
  requirePermission('tickets:forward', 'tenant'),
  validateRequest(ForwardTicketSchema),
  TicketsController.forwardCompanyTicketToSuperadmin,
);

// Backward-compat (V1): /tickets?plantId=...
router.get('/tickets', async (req, res) => {
  const plantId = String((req.query as any)?.plantId || '').trim();
  if (!plantId) return res.status(400).json({ success: false, error: 'plantId em falta (use /plants/:plantId/tickets)' });
  (req.params as any).plantId = plantId;
  return plantMiddleware(req as any, res as any, () =>
    requirePermission('tickets:read', 'plant')(req as any, res as any, () =>
      TicketsController.listPlantTickets(req as any, res as any),
    ),
  );
});

router.post('/tickets', async (req, res) => {
  const plantId = String((req.query as any)?.plantId || '').trim();
  if (!plantId) return res.status(400).json({ success: false, error: 'plantId em falta (use /plants/:plantId/tickets)' });
  (req.params as any).plantId = plantId;
  return plantMiddleware(req as any, res as any, () =>
    requirePermission('tickets:write', 'plant')(req as any, res as any, () =>
      validateRequest(CreateTicketSchema)(req as any, res as any, () =>
        TicketsController.createPlantTicket(req as any, res as any),
      ),
    ),
  );
});

export default router;
