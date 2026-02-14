import { Router } from 'express';
import { authMiddleware, plantMiddleware, tenantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { validateRequest } from '../middlewares/validation.js';
import {
  CreateTicketCommentSchema,
  CreateTicketSchema,
  ForwardTicketSchema,
  UpdateTicketStatusSchema,
} from '../schemas/validation.js';
import * as TicketsController from '../controllers/tickets.controller.js';

const router = Router();

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
