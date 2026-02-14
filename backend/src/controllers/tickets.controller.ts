import { Response } from 'express';
import { and, desc, eq, ilike, like, or, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../types/index.js';
import { RbacService } from '../services/rbac.service.js';
import { NotificationService } from '../services/notification.service.js';
import { ticketAttachments, ticketComments, ticketEvents, tickets, tenants, users } from '../db/schema.js';
import { computeTicketSlaDeadlines, type TicketPriority } from '../utils/ticket-sla.js';

type TicketLevel = 'fabrica' | 'empresa' | 'superadmin';

function normalizeTicketPriority(raw: unknown): TicketPriority | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  const allowed = new Set<TicketPriority>(['baixa', 'media', 'alta', 'critica']);
  return allowed.has(v as TicketPriority) ? (v as TicketPriority) : null;
}

function normalizeTicketTags(raw: unknown): string[] | null {
  if (raw == null) return null;
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const tags = (arr || [])
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((t) => t.slice(0, 40));
  return tags.length > 0 ? Array.from(new Set(tags)) : null;
}

function applyStatusTimestamps(params: {
  nextStatus: string;
  previousStatus?: string | null;
  previousResolvedAt?: Date | null;
  previousClosedAt?: Date | null;
}): { resolved_at?: Date | null; closed_at?: Date | null } {
  const { nextStatus, previousResolvedAt, previousClosedAt } = params;

  // resolved_at
  if (nextStatus === 'resolvido') {
    return {
      resolved_at: previousResolvedAt || new Date(),
      closed_at: null,
    };
  }

  if (nextStatus === 'fechado') {
    return {
      resolved_at: previousResolvedAt || new Date(),
      closed_at: previousClosedAt || new Date(),
    };
  }

  // reopening / in progress
  if (nextStatus === 'aberto' || nextStatus === 'em_progresso') {
    return { resolved_at: null, closed_at: null };
  }

  return {};
}

function computeFileUrlFromUpload(params: { uploadBaseDir: string; file: Express.Multer.File }): string {
  const relative = path.relative(params.uploadBaseDir, params.file.path).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

function normalizeTicketLevel(raw: unknown): TicketLevel | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  const allowed = new Set<TicketLevel>(['fabrica', 'empresa', 'superadmin']);
  return allowed.has(v as TicketLevel) ? (v as TicketLevel) : null;
}

function normalizeTicketStatus(raw: unknown): string | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  const allowed = new Set(['aberto', 'em_progresso', 'resolvido', 'fechado']);
  return allowed.has(v) ? v : null;
}

function isSuperAdmin(req: AuthenticatedRequest): boolean {
  const role = RbacService.normalizeRole(String(req.user?.role || '').trim());
  return role === 'superadmin';
}

function isCompanyAdmin(req: AuthenticatedRequest): boolean {
  const role = RbacService.normalizeRole(String(req.user?.role || '').trim());
  return role === 'admin_empresa';
}

async function getRoleKeyForPlant(req: AuthenticatedRequest, plantId: string): Promise<string> {
  const userId = String(req.user?.userId || '').trim();
  if (!userId) return RbacService.normalizeRole(String(req.user?.role || '').trim()) || '';

  const roleKey = await RbacService.getUserRoleForPlant({
    userId,
    plantId,
  });

  return RbacService.normalizeRole(roleKey || String(req.user?.role || '').trim()) || '';
}

function isPlantManagerRole(roleKey: string): boolean {
  return RbacService.normalizeRole(roleKey) === 'gestor_manutencao';
}

async function canAccessTicketPlantScoped(params: {
  req: AuthenticatedRequest;
  plantId: string;
  ticketRow: any;
}): Promise<boolean> {
  const { req, plantId, ticketRow } = params;
  if (!req.user) return false;
  if (isSuperAdmin(req)) return true;
  if (isCompanyAdmin(req)) return true;

  const userId = String(req.user.userId);
  if (String(ticketRow?.created_by_user_id || '') === userId) return true;

  const roleKey = await getRoleKeyForPlant(req, plantId);
  return isPlantManagerRole(roleKey);
}

async function loadTicketComments(params: {
  ticketId: string;
  tenantId: string;
  includeInternal: boolean;
}): Promise<
  Array<{
    id: string;
    ticket_id: string;
    tenant_id: string;
    body: string;
    is_internal: boolean;
    created_at: any;
    author: { id: string; first_name: any; last_name: any } | null;
  }>
> {
  const { ticketId, tenantId, includeInternal } = params;

  const whereParts: any[] = [
    eq(ticketComments.ticket_id, ticketId),
    eq(ticketComments.tenant_id, tenantId),
  ];
  if (!includeInternal) whereParts.push(eq(ticketComments.is_internal, false));

  const rows = await db
    .select({
      id: ticketComments.id,
      ticket_id: ticketComments.ticket_id,
      tenant_id: ticketComments.tenant_id,
      body: ticketComments.body,
      is_internal: ticketComments.is_internal,
      created_at: ticketComments.created_at,
      author_user_id: ticketComments.author_user_id,
      author_first_name: users.first_name,
      author_last_name: users.last_name,
    })
    .from(ticketComments)
    .leftJoin(users, eq(ticketComments.author_user_id, users.id))
    .where(and(...whereParts))
    .orderBy(desc(ticketComments.created_at));

  return rows.map((c) => ({
    id: String(c.id),
    ticket_id: String(c.ticket_id),
    tenant_id: String(c.tenant_id),
    body: String(c.body || ''),
    is_internal: Boolean(c.is_internal),
    created_at: c.created_at,
    author: c.author_user_id
      ? {
          id: String(c.author_user_id),
          first_name: c.author_first_name,
          last_name: c.author_last_name,
        }
      : null,
  }));
}

async function loadTicketEvents(params: {
  ticketId: string;
  tenantId: string;
}): Promise<
  Array<{
    id: string;
    ticket_id: string;
    tenant_id: string;
    plant_id: string | null;
    level: TicketLevel;
    event_type: string;
    message: string | null;
    meta: any;
    created_at: any;
    actor: { id: string; first_name: any; last_name: any } | null;
  }>
> {
  const { ticketId, tenantId } = params;

  const rows = await db
    .select({
      id: ticketEvents.id,
      ticket_id: ticketEvents.ticket_id,
      tenant_id: ticketEvents.tenant_id,
      plant_id: ticketEvents.plant_id,
      level: ticketEvents.level,
      event_type: ticketEvents.event_type,
      message: ticketEvents.message,
      meta: ticketEvents.meta,
      created_at: ticketEvents.created_at,
      actor_user_id: ticketEvents.actor_user_id,
      actor_first_name: users.first_name,
      actor_last_name: users.last_name,
    })
    .from(ticketEvents)
    .leftJoin(users, eq(ticketEvents.actor_user_id, users.id))
    .where(and(eq(ticketEvents.ticket_id, ticketId), eq(ticketEvents.tenant_id, tenantId)))
    .orderBy(desc(ticketEvents.created_at));

  return (rows || []).map((e) => ({
    id: String(e.id),
    ticket_id: String(e.ticket_id),
    tenant_id: String(e.tenant_id),
    plant_id: e.plant_id ? String(e.plant_id) : null,
    level: (normalizeTicketLevel(e.level) || 'fabrica') as TicketLevel,
    event_type: String(e.event_type || ''),
    message: e.message ? String(e.message) : null,
    meta: e.meta,
    created_at: e.created_at,
    actor: e.actor_user_id
      ? {
          id: String(e.actor_user_id),
          first_name: e.actor_first_name,
          last_name: e.actor_last_name,
        }
      : null,
  }));
}

async function logTicketEvent(params: {
  tenantId: string;
  ticketId: string;
  plantId?: string | null;
  level: TicketLevel;
  eventType: string;
  message?: string | null;
  meta?: any;
  actorUserId?: string | null;
}) {
  const { tenantId, ticketId, plantId, level, eventType, message, meta, actorUserId } = params;
  try {
    await db.insert(ticketEvents).values({
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_id: ticketId,
      plant_id: plantId || null,
      level: level as any,
      event_type: eventType,
      message: message || null,
      meta: meta ?? null,
      actor_user_id: actorUserId || null,
      created_at: new Date(),
    } as any);
  } catch {
    // best-effort
  }
}

// -------------------- Tenant / Fábrica (plant scoped) --------------------

export async function listPlantTickets(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });

    const roleKey = await getRoleKeyForPlant(req, plantId);
    const isPlantManager = isPlantManagerRole(roleKey);
    const userId = String(req.user.userId);

    const status = normalizeTicketStatus(req.query?.status);
    const q = String(req.query?.q || '').trim();
    const limitRaw = Number(req.query?.limit || 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
    const offsetRaw = Number(req.query?.offset || 0);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.trunc(offsetRaw)) : 0;

    const whereParts: any[] = [
      eq(tickets.tenant_id, tenantId),
      eq(tickets.plant_id, plantId),
      eq(tickets.is_internal, false),
    ];

    if (status) whereParts.push(eq(tickets.status, status as any));
    if (q) {
      // Prefer ilike when possible, fallback to like
      whereParts.push(or(ilike(tickets.title, `%${q}%`), ilike(tickets.description, `%${q}%`)));
    }

    if (!isPlantManager && !isCompanyAdmin(req)) {
      whereParts.push(eq(tickets.created_by_user_id, userId));
    }

    const rows = await db
      .select({
        id: tickets.id,
        tenant_id: tickets.tenant_id,
        plant_id: tickets.plant_id,
        created_by_user_id: tickets.created_by_user_id,
        assigned_to_user_id: tickets.assigned_to_user_id,
        title: tickets.title,
        description: tickets.description,
        priority: tickets.priority,
        tags: tickets.tags,
        source_type: tickets.source_type,
        source_key: tickets.source_key,
        source_meta: tickets.source_meta,
        sla_response_deadline: tickets.sla_response_deadline,
        sla_resolution_deadline: tickets.sla_resolution_deadline,
        first_response_at: tickets.first_response_at,
        resolved_at: tickets.resolved_at,
        status: tickets.status,
        level: tickets.level,
        is_general: tickets.is_general,
        created_at: tickets.created_at,
        updated_at: tickets.updated_at,
        last_activity_at: tickets.last_activity_at,
        closed_at: tickets.closed_at,
        forwarded_at: tickets.forwarded_at,
        forward_note: tickets.forward_note,
      })
      .from(tickets)
      .where(and(...whereParts))
      .orderBy(desc(tickets.last_activity_at))
      .limit(limit)
      .offset(offset);

    return res.json({ success: true, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to list tickets' });
  }
}

export async function createPlantTicket(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });

    const userId = String(req.user.userId);
    const { title, description, is_general, priority, tags, source_type, source_key, source_meta } = req.body || {};

    const general = Boolean(is_general);
    const level: TicketLevel = general ? 'superadmin' : 'fabrica';

    const prio = normalizeTicketPriority(priority) || 'media';
    const normalizedTags = normalizeTicketTags(tags);
    const deadlines = await computeTicketSlaDeadlines({ tenantId, priority: prio });

    const [created] = await db
      .insert(tickets)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        plant_id: plantId,
        created_by_user_id: userId,
        title: String(title || '').trim(),
        description: String(description || '').trim(),
        priority: prio as any,
        tags: normalizedTags,
        source_type: source_type ? String(source_type).trim().slice(0, 40) : null,
        source_key: source_key ? String(source_key).trim().slice(0, 120) : null,
        source_meta: source_meta ?? null,
        sla_response_deadline: deadlines.slaResponseDeadline,
        sla_resolution_deadline: deadlines.slaResolutionDeadline,
        status: 'aberto' as any,
        level: level as any,
        is_general: general,
        is_internal: false,
        created_at: new Date(),
        updated_at: new Date(),
        last_activity_at: new Date(),
      } as any)
      .returning();

    const createdId = String((created as any)?.id || '').trim();
    if (createdId) {
      await logTicketEvent({
        tenantId,
        ticketId: createdId,
        plantId,
        level,
        eventType: 'ticket_created',
        message: general ? 'Ticket geral criado (envio direto ao SuperAdmin)' : 'Ticket criado',
        meta: { is_general: general },
        actorUserId: userId,
      });

      try {
        await NotificationService.notifyTicketEvent({
          tenantId,
          plantId,
          eventType: 'ticket_created',
          createdBy: userId,
          title: 'Novo ticket',
          message: String(title || '').trim(),
          type: 'info',
          ticketId: createdId,
        });
      } catch {
        // best-effort
      }
    }

    return res.status(201).json({ success: true, data: created, message: 'Ticket criado com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create ticket' });
  }
}

export async function getPlantTicket(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(
          ops.eq(fields.id, ticketId),
          ops.eq(fields.tenant_id, tenantId),
          ops.eq(fields.plant_id, plantId),
          ops.eq(fields.is_internal, false),
        ),
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const allowed = await canAccessTicketPlantScoped({ req, plantId, ticketRow: ticket });
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const comments = await loadTicketComments({
      ticketId: String(ticket.id),
      tenantId,
      includeInternal: false,
    });

    const events = await loadTicketEvents({
      ticketId: String(ticket.id),
      tenantId,
    });

    return res.json({
      success: true,
      data: {
        ticket,
        comments,
        events,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch ticket' });
  }
}

export async function addPlantTicketComment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(
          ops.eq(fields.id, ticketId),
          ops.eq(fields.tenant_id, tenantId),
          ops.eq(fields.plant_id, plantId),
          ops.eq(fields.is_internal, false),
        ),
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const allowed = await canAccessTicketPlantScoped({ req, plantId, ticketRow: ticket });
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const { body } = req.body || {};
    const authorUserId = String(req.user.userId);

    const [created] = await db
      .insert(ticketComments)
      .values({
        id: uuidv4(),
        ticket_id: String(ticket.id),
        tenant_id: tenantId,
        author_user_id: authorUserId,
        body: String(body || '').trim(),
        is_internal: false,
        created_at: new Date(),
      } as any)
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String(ticket.id),
      plantId,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'fabrica') as TicketLevel,
      eventType: 'ticket_commented',
      message: 'Novo comentário',
      meta: { comment_id: String((created as any)?.id || '') },
      actorUserId: authorUserId,
    });

    await db
      .update(tickets)
      .set({
        updated_at: new Date(),
        last_activity_at: new Date(),
        first_response_at:
          (ticket as any)?.first_response_at || String((ticket as any)?.created_by_user_id || '') === authorUserId
            ? (ticket as any)?.first_response_at || null
            : new Date(),
      } as any)
      .where(and(eq(tickets.id, String(ticket.id)), eq(tickets.tenant_id, tenantId)));

    try {
      await NotificationService.notifyTicketEvent({
        tenantId,
        plantId,
        eventType: 'ticket_commented',
        createdBy: String((ticket as any)?.created_by_user_id || null),
        assignedTo: String((ticket as any)?.assigned_to_user_id || null),
        title: 'Novo comentário no ticket',
        message: String((ticket as any)?.title || ''),
        type: 'info',
        ticketId: String(ticket.id),
      });
    } catch {
      // best-effort
    }

    return res.status(201).json({ success: true, data: created, message: 'Comentário adicionado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to add comment' });
  }
}

export async function updatePlantTicketStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const nextStatus = normalizeTicketStatus(req.body?.status);
    if (!nextStatus) return res.status(400).json({ success: false, error: 'Invalid status' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(
          ops.eq(fields.id, ticketId),
          ops.eq(fields.tenant_id, tenantId),
          ops.eq(fields.plant_id, plantId),
          ops.eq(fields.is_internal, false),
        ),
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const allowed = await canAccessTicketPlantScoped({ req, plantId, ticketRow: ticket });
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const ts = applyStatusTimestamps({
      nextStatus,
      previousStatus: String((ticket as any)?.status || ''),
      previousResolvedAt: (ticket as any)?.resolved_at || null,
      previousClosedAt: (ticket as any)?.closed_at || null,
    });

    const patch: any = {
      status: nextStatus,
      updated_at: new Date(),
      last_activity_at: new Date(),
      ...ts,
    };

    const [updated] = await db
      .update(tickets)
      .set(patch)
      .where(and(eq(tickets.id, String(ticket.id)), eq(tickets.tenant_id, tenantId)))
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String(ticket.id),
      plantId,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'fabrica') as TicketLevel,
      eventType: 'ticket_status_changed',
      message: `Estado alterado para ${nextStatus}`,
      meta: { from: String((ticket as any)?.status || ''), to: nextStatus },
      actorUserId: String(req.user.userId),
    });

    try {
      await NotificationService.notifyTicketEvent({
        tenantId,
        plantId,
        eventType: 'ticket_status_changed',
        createdBy: String((ticket as any)?.created_by_user_id || null),
        assignedTo: String((ticket as any)?.assigned_to_user_id || null),
        title: 'Estado do ticket atualizado',
        message: String((ticket as any)?.title || ''),
        type: nextStatus === 'fechado' ? 'success' : 'info',
        ticketId: String(ticket.id),
      });
    } catch {
      // best-effort
    }

    return res.json({ success: true, data: updated, message: 'Estado atualizado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to update status' });
  }
}

export async function forwardPlantTicketToCompany(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const roleKey = await getRoleKeyForPlant(req, plantId);
    if (!isPlantManagerRole(roleKey)) {
      return res.status(403).json({ success: false, error: 'Apenas o gestor da fábrica pode reencaminhar' });
    }

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(
          ops.eq(fields.id, ticketId),
          ops.eq(fields.tenant_id, tenantId),
          ops.eq(fields.plant_id, plantId),
          ops.eq(fields.is_internal, false),
        ),
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if ((ticket as any)?.is_general) {
      return res.status(400).json({ success: false, error: 'Ticket geral não necessita reencaminhamento' });
    }

    const currentLevel = normalizeTicketLevel((ticket as any)?.level) || 'fabrica';
    if (currentLevel !== 'fabrica') {
      return res.status(400).json({ success: false, error: 'Ticket já foi reencaminhado' });
    }

    const note = String(req.body?.note || '').trim();

    const [updated] = await db
      .update(tickets)
      .set({
        level: 'empresa' as any,
        forwarded_by_user_id: String(req.user.userId),
        forwarded_at: new Date(),
        forward_note: note || null,
        updated_at: new Date(),
        last_activity_at: new Date(),
      } as any)
      .where(and(eq(tickets.id, String(ticket.id)), eq(tickets.tenant_id, tenantId)))
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String(ticket.id),
      plantId,
      level: 'empresa',
      eventType: 'ticket_forwarded_to_company',
      message: 'Reencaminhado para Empresa',
      meta: { note: note || null },
      actorUserId: String(req.user.userId),
    });

    try {
      await NotificationService.notifyTicketEvent({
        tenantId,
        plantId,
        eventType: 'ticket_forwarded_to_company',
        createdBy: String((ticket as any)?.created_by_user_id || null),
        assignedTo: String((ticket as any)?.assigned_to_user_id || null),
        title: 'Ticket reencaminhado',
        message: String((ticket as any)?.title || ''),
        type: 'warning',
        ticketId: String(ticket.id),
      });
    } catch {
      // best-effort
    }

    return res.json({ success: true, data: updated, message: 'Reencaminhado para empresa' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to forward ticket' });
  }
}

// -------------------- Tenant / Empresa (tenant scoped) --------------------

export async function listCompanyTickets(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    if (!isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Apenas o admin/gestor da empresa pode ver esta lista' });
    }

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });

    const status = normalizeTicketStatus(req.query?.status);
    const q = String(req.query?.q || '').trim();
    const limitRaw = Number(req.query?.limit || 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;
    const offsetRaw = Number(req.query?.offset || 0);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.trunc(offsetRaw)) : 0;

    const whereParts: any[] = [
      eq(tickets.tenant_id, tenantId),
      eq(tickets.level, 'empresa' as any),
      eq(tickets.is_internal, false),
    ];
    if (status) whereParts.push(eq(tickets.status, status as any));
    if (q) whereParts.push(or(ilike(tickets.title, `%${q}%`), ilike(tickets.description, `%${q}%`)));

    const rows = await db
      .select({
        id: tickets.id,
        tenant_id: tickets.tenant_id,
        plant_id: tickets.plant_id,
        created_by_user_id: tickets.created_by_user_id,
        assigned_to_user_id: tickets.assigned_to_user_id,
        title: tickets.title,
        description: tickets.description,
        priority: tickets.priority,
        tags: tickets.tags,
        source_type: tickets.source_type,
        source_key: tickets.source_key,
        source_meta: tickets.source_meta,
        sla_response_deadline: tickets.sla_response_deadline,
        sla_resolution_deadline: tickets.sla_resolution_deadline,
        first_response_at: tickets.first_response_at,
        resolved_at: tickets.resolved_at,
        status: tickets.status,
        level: tickets.level,
        is_general: tickets.is_general,
        created_at: tickets.created_at,
        updated_at: tickets.updated_at,
        last_activity_at: tickets.last_activity_at,
        closed_at: tickets.closed_at,
        forwarded_at: tickets.forwarded_at,
        forward_note: tickets.forward_note,
      })
      .from(tickets)
      .where(and(...whereParts))
      .orderBy(desc(tickets.last_activity_at))
      .limit(limit)
      .offset(offset);

    return res.json({ success: true, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to list company tickets' });
  }
}

export async function getCompanyTicket(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.id, ticketId), ops.eq(fields.tenant_id, tenantId), ops.eq(fields.is_internal, false)),
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const userId = String(req.user.userId);
    const isOwner = String((ticket as any)?.created_by_user_id || '') === userId;
    if (!isOwner && !isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const comments = await loadTicketComments({
      ticketId: String((ticket as any).id),
      tenantId,
      includeInternal: false,
    });

    const events = await loadTicketEvents({
      ticketId: String((ticket as any).id),
      tenantId,
    });

    return res.json({ success: true, data: { ticket, comments, events } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch ticket' });
  }
}

export async function addCompanyTicketComment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.id, ticketId), ops.eq(fields.tenant_id, tenantId), ops.eq(fields.is_internal, false)),
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const userId = String(req.user.userId);
    const isOwner = String((ticket as any)?.created_by_user_id || '') === userId;
    if (!isOwner && !isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { body } = req.body || {};

    const [created] = await db
      .insert(ticketComments)
      .values({
        id: uuidv4(),
        ticket_id: String((ticket as any).id),
        tenant_id: tenantId,
        author_user_id: userId,
        body: String(body || '').trim(),
        is_internal: false,
        created_at: new Date(),
      } as any)
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String((ticket as any).id),
      plantId: String((ticket as any)?.plant_id || '') || null,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'empresa') as TicketLevel,
      eventType: 'ticket_commented',
      message: 'Novo comentário',
      meta: { comment_id: String((created as any)?.id || '') },
      actorUserId: userId,
    });

    await db
      .update(tickets)
      .set({
        updated_at: new Date(),
        last_activity_at: new Date(),
        first_response_at:
          (ticket as any)?.first_response_at || String((ticket as any)?.created_by_user_id || '') === userId
            ? (ticket as any)?.first_response_at || null
            : new Date(),
      } as any)
      .where(and(eq(tickets.id, String((ticket as any).id)), eq(tickets.tenant_id, tenantId)));

    try {
      await NotificationService.notifyTicketEvent({
        tenantId,
        plantId: String((ticket as any)?.plant_id || '') || '',
        eventType: 'ticket_commented',
        createdBy: String((ticket as any)?.created_by_user_id || null),
        assignedTo: String((ticket as any)?.assigned_to_user_id || null),
        title: 'Novo comentário no ticket',
        message: String((ticket as any)?.title || ''),
        type: 'info',
        ticketId: String((ticket as any).id),
      });
    } catch {
      // best-effort
    }

    return res.status(201).json({ success: true, data: created, message: 'Comentário adicionado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to add comment' });
  }
}

export async function updateCompanyTicketStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
    if (!isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Apenas o admin/gestor da empresa pode alterar estado' });
    }

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const nextStatus = normalizeTicketStatus(req.body?.status);
    if (!nextStatus) return res.status(400).json({ success: false, error: 'Invalid status' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.id, ticketId), ops.eq(fields.tenant_id, tenantId), ops.eq(fields.is_internal, false)),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const ts = applyStatusTimestamps({
      nextStatus,
      previousStatus: String((ticket as any)?.status || ''),
      previousResolvedAt: (ticket as any)?.resolved_at || null,
      previousClosedAt: (ticket as any)?.closed_at || null,
    });

    const [updated] = await db
      .update(tickets)
      .set({
        status: nextStatus as any,
        updated_at: new Date(),
        last_activity_at: new Date(),
        ...ts,
      } as any)
      .where(and(eq(tickets.id, String((ticket as any).id)), eq(tickets.tenant_id, tenantId)))
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String((ticket as any).id),
      plantId: String((ticket as any)?.plant_id || '') || null,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'empresa') as TicketLevel,
      eventType: 'ticket_status_changed',
      message: `Estado alterado para ${nextStatus}`,
      meta: { from: String((ticket as any)?.status || ''), to: nextStatus },
      actorUserId: String(req.user.userId),
    });

    try {
      await NotificationService.notifyTicketEvent({
        tenantId,
        plantId: String((ticket as any)?.plant_id || '') || '',
        eventType: 'ticket_status_changed',
        createdBy: String((ticket as any)?.created_by_user_id || null),
        assignedTo: String((ticket as any)?.assigned_to_user_id || null),
        title: 'Estado do ticket atualizado',
        message: String((ticket as any)?.title || ''),
        type: nextStatus === 'fechado' ? 'success' : 'info',
        ticketId: String((ticket as any).id),
      });
    } catch {
      // best-effort
    }

    return res.json({ success: true, data: updated, message: 'Estado atualizado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to update status' });
  }
}

export async function forwardCompanyTicketToSuperadmin(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
    if (!isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Apenas o admin/gestor da empresa pode reencaminhar' });
    }

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.id, ticketId), ops.eq(fields.tenant_id, tenantId), ops.eq(fields.is_internal, false)),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    if ((ticket as any)?.is_general) {
      return res.status(400).json({ success: false, error: 'Ticket geral já está no SuperAdmin' });
    }

    const currentLevel = normalizeTicketLevel((ticket as any)?.level) || 'fabrica';
    if (currentLevel !== 'empresa') {
      return res.status(400).json({ success: false, error: 'Ticket não está no nível empresa' });
    }

    const note = String(req.body?.note || '').trim();

    const [updated] = await db
      .update(tickets)
      .set({
        level: 'superadmin' as any,
        forwarded_by_user_id: String(req.user.userId),
        forwarded_at: new Date(),
        forward_note: note || null,
        updated_at: new Date(),
        last_activity_at: new Date(),
      } as any)
      .where(and(eq(tickets.id, String((ticket as any).id)), eq(tickets.tenant_id, tenantId)))
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String((ticket as any).id),
      plantId: String((ticket as any)?.plant_id || '') || null,
      level: 'superadmin',
      eventType: 'ticket_forwarded_to_superadmin',
      message: 'Reencaminhado para SuperAdmin',
      meta: { note: note || null },
      actorUserId: String(req.user.userId),
    });

    try {
      await NotificationService.notifyTicketEvent({
        tenantId,
        plantId: String((ticket as any)?.plant_id || '') || '',
        eventType: 'ticket_forwarded_to_superadmin',
        createdBy: String((ticket as any)?.created_by_user_id || null),
        assignedTo: String((ticket as any)?.assigned_to_user_id || null),
        title: 'Ticket reencaminhado para SuperAdmin',
        message: String((ticket as any)?.title || ''),
        type: 'warning',
        ticketId: String((ticket as any).id),
      });
    } catch {
      // best-effort
    }

    return res.json({ success: true, data: updated, message: 'Reencaminhado para SuperAdmin' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to forward ticket' });
  }
}

export async function updateCompanyTicket(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
    if (!isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Apenas o admin/gestor da empresa pode atualizar' });
    }

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const before = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.id, ticketId), ops.eq(fields.tenant_id, tenantId), ops.eq(fields.is_internal, false)),
    });
    if (!before) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const { assigned_to_user_id, priority, tags } = req.body || {};
    const patch: any = {
      updated_at: new Date(),
      last_activity_at: new Date(),
    };

    if (assigned_to_user_id !== undefined) {
      patch.assigned_to_user_id = assigned_to_user_id ? String(assigned_to_user_id) : null;
    }

    const nextPriority = priority !== undefined ? normalizeTicketPriority(priority) : null;
    if (priority !== undefined) {
      if (!nextPriority) return res.status(400).json({ success: false, error: 'Invalid priority' });
      patch.priority = nextPriority;

      const hasFirstResponse = Boolean((before as any)?.first_response_at);
      const hasResolved = Boolean((before as any)?.resolved_at);
      const deadlines = await computeTicketSlaDeadlines({ tenantId, priority: nextPriority });
      if (!hasFirstResponse) patch.sla_response_deadline = deadlines.slaResponseDeadline;
      if (!hasResolved) patch.sla_resolution_deadline = deadlines.slaResolutionDeadline;
    }

    if (tags !== undefined) {
      patch.tags = normalizeTicketTags(tags);
    }

    const [updated] = await db
      .update(tickets)
      .set(patch)
      .where(and(eq(tickets.id, String((before as any).id)), eq(tickets.tenant_id, tenantId)))
      .returning();

    const changes: any = {};
    if (patch.assigned_to_user_id !== undefined) {
      changes.assigned_to_user_id = { from: (before as any)?.assigned_to_user_id, to: patch.assigned_to_user_id };
    }
    if (patch.priority !== undefined) {
      changes.priority = { from: (before as any)?.priority, to: patch.priority };
    }
    if (patch.tags !== undefined) {
      changes.tags = { from: (before as any)?.tags, to: patch.tags };
    }

    await logTicketEvent({
      tenantId,
      ticketId: String((before as any).id),
      plantId: String((before as any)?.plant_id || '') || null,
      level: (normalizeTicketLevel((before as any)?.level) || 'empresa') as TicketLevel,
      eventType: 'ticket_updated',
      message: 'Ticket atualizado (Empresa)',
      meta: { changes },
      actorUserId: String(req.user.userId),
    });

    return res.json({ success: true, data: updated, message: 'Ticket atualizado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to update ticket' });
  }
}

// -------------------- SuperAdmin --------------------

export async function superadminListTickets(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const tenantIdFilter = String(req.query?.tenantId || '').trim();
    const status = normalizeTicketStatus(req.query?.status);
    const q = String(req.query?.q || '').trim();
    const level = normalizeTicketLevel(req.query?.level) || 'superadmin';
    const limitRaw = Number(req.query?.limit || 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;
    const offsetRaw = Number(req.query?.offset || 0);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.trunc(offsetRaw)) : 0;

    const whereParts: any[] = [eq(tickets.level, level as any)];
    if (tenantIdFilter) whereParts.push(eq(tickets.tenant_id, tenantIdFilter));
    if (status) whereParts.push(eq(tickets.status, status as any));
    if (q) whereParts.push(or(ilike(tickets.title, `%${q}%`), ilike(tickets.description, `%${q}%`)));

    const paged = await db
      .select({
        id: tickets.id,
        tenant_id: tickets.tenant_id,
        tenant_name: tenants.name,
        plant_id: tickets.plant_id,
        title: tickets.title,
        status: tickets.status,
        level: tickets.level,
        is_general: tickets.is_general,
        is_internal: tickets.is_internal,
        priority: tickets.priority,
        tags: tickets.tags,
        source_type: tickets.source_type,
        source_key: tickets.source_key,
        sla_response_deadline: tickets.sla_response_deadline,
        sla_resolution_deadline: tickets.sla_resolution_deadline,
        first_response_at: tickets.first_response_at,
        resolved_at: tickets.resolved_at,
        created_at: tickets.created_at,
        last_activity_at: tickets.last_activity_at,
        closed_at: tickets.closed_at,
        forwarded_at: tickets.forwarded_at,
      })
      .from(tickets)
      .leftJoin(tenants, eq(tickets.tenant_id, tenants.id))
      .where(and(...whereParts))
      .orderBy(desc(tickets.last_activity_at))
      .limit(limit)
      .offset(offset);

    return res.json({ success: true, data: paged });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to list tickets' });
  }
}

export async function superadminGetTicket(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    }

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) => ops.eq(fields.id, ticketId),
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const comments = await loadTicketComments({
      ticketId: String((ticket as any).id),
      tenantId: String((ticket as any).tenant_id),
      includeInternal: true,
    });

    const events = await loadTicketEvents({
      ticketId: String((ticket as any).id),
      tenantId: String((ticket as any).tenant_id),
    });

    return res.json({ success: true, data: { ticket, comments, events } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch ticket' });
  }
}

export async function superadminUpdateTicket(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    }

    const before = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) => ops.eq(fields.id, ticketId),
    });

    if (!before) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const {
      status,
      assigned_to_user_id,
      is_internal,
      level,
      priority,
      tags,
      source_type,
      source_key,
      source_meta,
    } = req.body || {};

    const patch: any = {
      updated_at: new Date(),
      last_activity_at: new Date(),
    };

    if (status !== undefined) {
      const nextStatus = normalizeTicketStatus(status);
      if (!nextStatus) return res.status(400).json({ success: false, error: 'Invalid status' });
      patch.status = nextStatus;
      Object.assign(
        patch,
        applyStatusTimestamps({
          nextStatus,
          previousStatus: String((before as any)?.status || ''),
          previousResolvedAt: (before as any)?.resolved_at || null,
          previousClosedAt: (before as any)?.closed_at || null,
        }),
      );
    }

    if (assigned_to_user_id !== undefined) {
      patch.assigned_to_user_id = assigned_to_user_id ? String(assigned_to_user_id) : null;
    }

    if (is_internal !== undefined) {
      patch.is_internal = Boolean(is_internal);
    }

    if (level !== undefined) {
      const nextLevel = normalizeTicketLevel(level);
      if (!nextLevel) return res.status(400).json({ success: false, error: 'Invalid level' });
      patch.level = nextLevel;
    }

    if (priority !== undefined) {
      const nextPriority = normalizeTicketPriority(priority);
      if (!nextPriority) return res.status(400).json({ success: false, error: 'Invalid priority' });
      patch.priority = nextPriority;
      const deadlines = await computeTicketSlaDeadlines({
        tenantId: String((before as any).tenant_id),
        priority: nextPriority,
      });
      if (!(before as any)?.first_response_at) patch.sla_response_deadline = deadlines.slaResponseDeadline;
      if (!(before as any)?.resolved_at) patch.sla_resolution_deadline = deadlines.slaResolutionDeadline;
    }

    if (tags !== undefined) {
      patch.tags = normalizeTicketTags(tags);
    }

    if (source_type !== undefined) {
      patch.source_type = source_type ? String(source_type).trim().slice(0, 40) : null;
    }
    if (source_key !== undefined) {
      patch.source_key = source_key ? String(source_key).trim().slice(0, 120) : null;
    }
    if (source_meta !== undefined) {
      patch.source_meta = source_meta ?? null;
    }

    const [updated] = await db
      .update(tickets)
      .set(patch)
      .where(eq(tickets.id, String((before as any).id)))
      .returning();

    const changes: any = {};
    if (patch.status !== undefined && patch.status !== (before as any)?.status) {
      changes.status = { from: (before as any)?.status, to: patch.status };
    }
    if (
      patch.assigned_to_user_id !== undefined &&
      String(patch.assigned_to_user_id || '') !== String((before as any)?.assigned_to_user_id || '')
    ) {
      changes.assigned_to_user_id = { from: (before as any)?.assigned_to_user_id, to: patch.assigned_to_user_id };
    }
    if (patch.is_internal !== undefined && Boolean(patch.is_internal) !== Boolean((before as any)?.is_internal)) {
      changes.is_internal = { from: (before as any)?.is_internal, to: patch.is_internal };
    }
    if (patch.level !== undefined && String(patch.level || '') !== String((before as any)?.level || '')) {
      changes.level = { from: (before as any)?.level, to: patch.level };
    }
    if (patch.priority !== undefined && String(patch.priority || '') !== String((before as any)?.priority || '')) {
      changes.priority = { from: (before as any)?.priority, to: patch.priority };
    }
    if (patch.tags !== undefined) {
      changes.tags = { from: (before as any)?.tags, to: patch.tags };
    }
    if (patch.source_type !== undefined) {
      changes.source_type = { from: (before as any)?.source_type, to: patch.source_type };
    }
    if (patch.source_key !== undefined) {
      changes.source_key = { from: (before as any)?.source_key, to: patch.source_key };
    }

    await logTicketEvent({
      tenantId: String((before as any).tenant_id),
      ticketId: String((before as any).id),
      plantId: String((before as any)?.plant_id || '') || null,
      level: (normalizeTicketLevel(patch.level ?? (before as any)?.level) || 'superadmin') as TicketLevel,
      eventType: 'ticket_updated',
      message: 'Ticket atualizado (SuperAdmin)',
      meta: { changes },
      actorUserId: req.user?.userId ? String(req.user.userId) : null,
    });

    if (changes.status) {
      try {
        await NotificationService.notifyTicketEvent({
          tenantId: String((before as any).tenant_id),
          plantId: String((before as any)?.plant_id || '') || '',
          eventType: 'ticket_status_changed',
          createdBy: String((before as any)?.created_by_user_id || null),
          assignedTo: String((before as any)?.assigned_to_user_id || null),
          title: 'Estado do ticket atualizado',
          message: String((before as any)?.title || ''),
          type: patch.status === 'fechado' ? 'success' : 'info',
          ticketId: String((before as any).id),
        });
      } catch {
        // best-effort
      }
    }

    return res.json({ success: true, data: updated, message: 'Ticket atualizado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to update ticket' });
  }
}

export async function superadminAddComment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    }

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) => ops.eq(fields.id, ticketId),
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { body, is_internal } = req.body || {};
    const internal = Boolean(is_internal);
    const authorUserId = req.user?.userId ? String(req.user.userId) : null;

    const [created] = await db
      .insert(ticketComments)
      .values({
        id: uuidv4(),
        ticket_id: String((ticket as any).id),
        tenant_id: String((ticket as any).tenant_id),
        author_user_id: authorUserId,
        body: String(body || '').trim(),
        is_internal: internal,
        created_at: new Date(),
      } as any)
      .returning();

    await logTicketEvent({
      tenantId: String((ticket as any).tenant_id),
      ticketId: String((ticket as any).id),
      plantId: String((ticket as any)?.plant_id || '') || null,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'superadmin') as TicketLevel,
      eventType: 'ticket_commented',
      message: internal ? 'Novo comentário interno (SuperAdmin)' : 'Novo comentário (SuperAdmin)',
      meta: { comment_id: String((created as any)?.id || ''), is_internal: internal },
      actorUserId: authorUserId,
    });

    await db
      .update(tickets)
      .set({
        updated_at: new Date(),
        last_activity_at: new Date(),
        first_response_at:
          (ticket as any)?.first_response_at ||
          String((ticket as any)?.created_by_user_id || '') === String(authorUserId || '')
            ? (ticket as any)?.first_response_at || null
            : new Date(),
      } as any)
      .where(eq(tickets.id, String((ticket as any).id)));

    if (!internal) {
      try {
        await NotificationService.notifyTicketEvent({
          tenantId: String((ticket as any).tenant_id),
          plantId: String((ticket as any)?.plant_id || '') || '',
          eventType: 'ticket_commented',
          createdBy: String((ticket as any)?.created_by_user_id || null),
          assignedTo: String((ticket as any)?.assigned_to_user_id || null),
          title: 'Novo comentário no ticket',
          message: String((ticket as any)?.title || ''),
          type: 'info',
          ticketId: String((ticket as any).id),
        });
      } catch {
        // best-effort
      }
    }

    return res.status(201).json({ success: true, data: created, message: 'Comentário adicionado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to add comment' });
  }
}

// -------------------- Attachments --------------------

async function listTicketAttachmentsByScope(params: {
  tenantId: string;
  ticketId: string;
}): Promise<
  Array<{
    id: string;
    ticket_id: string;
    comment_id: string | null;
    file_url: string;
    file_name: string;
    file_type: string | null;
    file_size: number | null;
    uploaded_by: string | null;
    created_at: any;
  }>
> {
  const rows = await db
    .select({
      id: ticketAttachments.id,
      ticket_id: ticketAttachments.ticket_id,
      comment_id: ticketAttachments.comment_id,
      file_url: ticketAttachments.file_url,
      file_name: ticketAttachments.file_name,
      file_type: ticketAttachments.file_type,
      file_size: ticketAttachments.file_size,
      uploaded_by: ticketAttachments.uploaded_by,
      created_at: ticketAttachments.created_at,
    })
    .from(ticketAttachments)
    .where(and(eq(ticketAttachments.tenant_id, params.tenantId), eq(ticketAttachments.ticket_id, params.ticketId)))
    .orderBy(desc(ticketAttachments.created_at));

  return (rows || []).map((r) => ({
    id: String(r.id),
    ticket_id: String(r.ticket_id),
    comment_id: r.comment_id ? String(r.comment_id) : null,
    file_url: String(r.file_url),
    file_name: String(r.file_name),
    file_type: r.file_type ? String(r.file_type) : null,
    file_size: r.file_size == null ? null : Number(r.file_size),
    uploaded_by: r.uploaded_by ? String(r.uploaded_by) : null,
    created_at: r.created_at,
  }));
}

export async function listPlantTicketAttachments(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(
          ops.eq(fields.id, ticketId),
          ops.eq(fields.tenant_id, tenantId),
          ops.eq(fields.plant_id, plantId),
          ops.eq(fields.is_internal, false),
        ),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const allowed = await canAccessTicketPlantScoped({ req, plantId, ticketRow: ticket });
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const rows = await listTicketAttachmentsByScope({ tenantId, ticketId: String((ticket as any).id) });
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to list attachments' });
  }
}

export async function uploadPlantTicketAttachment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const plantId = String((req.params as any)?.plantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!plantId) return res.status(400).json({ success: false, error: 'Plant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'Missing file upload' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(
          ops.eq(fields.id, ticketId),
          ops.eq(fields.tenant_id, tenantId),
          ops.eq(fields.plant_id, plantId),
          ops.eq(fields.is_internal, false),
        ),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const allowed = await canAccessTicketPlantScoped({ req, plantId, ticketRow: ticket });
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const uploadBaseDir = path.resolve(file.destination, '../../..');
    const fileUrl = computeFileUrlFromUpload({ uploadBaseDir, file });

    const [created] = await db
      .insert(ticketAttachments)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        ticket_id: String((ticket as any).id),
        comment_id: null,
        file_url: fileUrl,
        file_name: String(file.originalname || file.filename || 'file').slice(0, 250),
        file_type: String(file.mimetype || '') || null,
        file_size: Number.isFinite(file.size) ? Math.trunc(file.size) : null,
        uploaded_by: String(req.user.userId),
        created_at: new Date(),
      } as any)
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String((ticket as any).id),
      plantId,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'fabrica') as TicketLevel,
      eventType: 'ticket_attachment_uploaded',
      message: 'Anexo adicionado',
      meta: { attachment_id: String((created as any)?.id || ''), file_name: file.originalname, file_url: fileUrl },
      actorUserId: String(req.user.userId),
    });

    await db
      .update(tickets)
      .set({ updated_at: new Date(), last_activity_at: new Date() } as any)
      .where(and(eq(tickets.id, String((ticket as any).id)), eq(tickets.tenant_id, tenantId)));

    return res.status(201).json({ success: true, data: created, message: 'Anexo enviado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to upload attachment' });
  }
}

export async function listCompanyTicketAttachments(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.id, ticketId), ops.eq(fields.tenant_id, tenantId), ops.eq(fields.is_internal, false)),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const userId = String(req.user.userId);
    const isOwner = String((ticket as any)?.created_by_user_id || '') === userId;
    if (!isOwner && !isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const rows = await listTicketAttachmentsByScope({ tenantId, ticketId: String((ticket as any).id) });
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to list attachments' });
  }
}

export async function uploadCompanyTicketAttachment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'Missing file upload' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.id, ticketId), ops.eq(fields.tenant_id, tenantId), ops.eq(fields.is_internal, false)),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const userId = String(req.user.userId);
    const isOwner = String((ticket as any)?.created_by_user_id || '') === userId;
    if (!isOwner && !isCompanyAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const uploadBaseDir = path.resolve(file.destination, '../../..');
    const fileUrl = computeFileUrlFromUpload({ uploadBaseDir, file });

    const [created] = await db
      .insert(ticketAttachments)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        ticket_id: String((ticket as any).id),
        comment_id: null,
        file_url: fileUrl,
        file_name: String(file.originalname || file.filename || 'file').slice(0, 250),
        file_type: String(file.mimetype || '') || null,
        file_size: Number.isFinite(file.size) ? Math.trunc(file.size) : null,
        uploaded_by: userId,
        created_at: new Date(),
      } as any)
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String((ticket as any).id),
      plantId: String((ticket as any)?.plant_id || '') || null,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'empresa') as TicketLevel,
      eventType: 'ticket_attachment_uploaded',
      message: 'Anexo adicionado',
      meta: { attachment_id: String((created as any)?.id || ''), file_name: file.originalname, file_url: fileUrl },
      actorUserId: userId,
    });

    await db
      .update(tickets)
      .set({ updated_at: new Date(), last_activity_at: new Date() } as any)
      .where(and(eq(tickets.id, String((ticket as any).id)), eq(tickets.tenant_id, tenantId)));

    return res.status(201).json({ success: true, data: created, message: 'Anexo enviado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to upload attachment' });
  }
}

export async function superadminListTicketAttachments(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) => ops.eq(fields.id, ticketId),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const tenantId = String((ticket as any).tenant_id);
    const rows = await listTicketAttachmentsByScope({ tenantId, ticketId: String((ticket as any).id) });
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to list attachments' });
  }
}

export async function superadminUploadTicketAttachment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const ticketId = String((req.params as any)?.ticketId || '').trim();
    if (!ticketId) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'Missing file upload' });

    const ticket = await db.query.tickets.findFirst({
      where: (fields: any, ops: any) => ops.eq(fields.id, ticketId),
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const tenantId = String((ticket as any).tenant_id);
    const uploadBaseDir = path.resolve(file.destination, '../../..');
    const fileUrl = computeFileUrlFromUpload({ uploadBaseDir, file });

    const authorUserId = req.user?.userId ? String(req.user.userId) : null;

    const [created] = await db
      .insert(ticketAttachments)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        ticket_id: String((ticket as any).id),
        comment_id: null,
        file_url: fileUrl,
        file_name: String(file.originalname || file.filename || 'file').slice(0, 250),
        file_type: String(file.mimetype || '') || null,
        file_size: Number.isFinite(file.size) ? Math.trunc(file.size) : null,
        uploaded_by: authorUserId,
        created_at: new Date(),
      } as any)
      .returning();

    await logTicketEvent({
      tenantId,
      ticketId: String((ticket as any).id),
      plantId: String((ticket as any)?.plant_id || '') || null,
      level: (normalizeTicketLevel((ticket as any)?.level) || 'superadmin') as TicketLevel,
      eventType: 'ticket_attachment_uploaded',
      message: 'Anexo adicionado (SuperAdmin)',
      meta: { attachment_id: String((created as any)?.id || ''), file_name: file.originalname, file_url: fileUrl },
      actorUserId: authorUserId,
    });

    await db
      .update(tickets)
      .set({ updated_at: new Date(), last_activity_at: new Date() } as any)
      .where(eq(tickets.id, String((ticket as any).id)));

    return res.status(201).json({ success: true, data: created, message: 'Anexo enviado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to upload attachment' });
  }
}

// -------------------- SuperAdmin Ticket Suggestions (Diagnostics) --------------------

type TicketSuggestion = {
  key: string;
  title: string;
  description: string;
  priority: TicketPriority;
  source_type: string;
  source_key: string;
  source_meta: any;
};

async function findOpenTicketBySource(params: {
  tenantId: string;
  sourceType: string;
  sourceKey: string;
}): Promise<boolean> {
  const row = await db.query.tickets.findFirst({
    where: (fields: any, ops: any) =>
      ops.and(
        ops.eq(fields.tenant_id, params.tenantId),
        ops.eq(fields.source_type, params.sourceType),
        ops.eq(fields.source_key, params.sourceKey),
        ops.notInArray(fields.status, ['fechado']),
      ),
  });
  return Boolean(row);
}

async function computeIntegritySuggestion(tenantId: string): Promise<TicketSuggestion | null> {
  const assetsMissingPlant = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM assets a
    WHERE a.tenant_id = ${tenantId}
      AND NOT EXISTS (SELECT 1 FROM plants p WHERE p.id = a.plant_id);
  `);

  const schedulesMissingAsset = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM preventive_maintenance_schedules s
    WHERE s.tenant_id = ${tenantId}
      AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = s.asset_id);
  `);

  const schedulesMissingPlan = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM preventive_maintenance_schedules s
    WHERE s.tenant_id = ${tenantId}
      AND NOT EXISTS (SELECT 1 FROM maintenance_plans p WHERE p.id = s.plan_id);
  `);

  const userPlantsMissingUser = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM user_plants up
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = up.user_id);
  `);

  const userPlantsMissingPlant = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM user_plants up
    WHERE NOT EXISTS (SELECT 1 FROM plants p WHERE p.id = up.plant_id);
  `);

  const checks = [
    { key: 'assets_missing_plant', label: 'Assets sem fábrica válida', count: Number((assetsMissingPlant as any)?.rows?.[0]?.count ?? 0) },
    { key: 'schedules_missing_asset', label: 'Preventivas sem asset válido', count: Number((schedulesMissingAsset as any)?.rows?.[0]?.count ?? 0) },
    { key: 'schedules_missing_plan', label: 'Preventivas sem plano válido', count: Number((schedulesMissingPlan as any)?.rows?.[0]?.count ?? 0) },
    { key: 'user_plants_missing_user', label: 'UserPlants com user inexistente', count: Number((userPlantsMissingUser as any)?.rows?.[0]?.count ?? 0) },
    { key: 'user_plants_missing_plant', label: 'UserPlants com fábrica inexistente', count: Number((userPlantsMissingPlant as any)?.rows?.[0]?.count ?? 0) },
  ];

  const nonZero = checks.filter((c) => c.count > 0);
  if (nonZero.length === 0) return null;

  const total = nonZero.reduce((sum, c) => sum + c.count, 0);
  const priority: TicketPriority = total >= 50 ? 'critica' : total >= 10 ? 'alta' : 'media';

  const lines = nonZero.map((c) => `- ${c.label}: ${c.count}`).join('\n');
  return {
    key: 'integrity',
    title: `Integrity checks com problemas (${nonZero.length})`,
    description: `Foram detetados problemas de integridade:\n\n${lines}\n\nSugestão: corrigir referências inválidas e/ou re-seed/patch conforme necessário.`,
    priority,
    source_type: 'diagnostics',
    source_key: 'integrity_checks',
    source_meta: { checks },
  };
}

async function computeRbacDriftSuggestion(tenantId: string): Promise<TicketSuggestion | null> {
  const rolesZeroPerms = await db.execute(sql`
    SELECT r.key, r.name
    FROM rbac_roles r
    LEFT JOIN rbac_role_permissions rp
      ON rp.tenant_id = r.tenant_id AND rp.role_key = r.key
    WHERE r.tenant_id = ${tenantId}
    GROUP BY r.key, r.name
    HAVING COUNT(rp.permission_key) = 0
    ORDER BY r.key ASC;
  `);

  const permsUnused = await db.execute(sql`
    SELECT p.key, p.label, p.group_name
    FROM rbac_permissions p
    LEFT JOIN rbac_role_permissions rp
      ON rp.permission_key = p.key AND rp.tenant_id = ${tenantId}
    GROUP BY p.key, p.label, p.group_name
    HAVING COUNT(rp.role_key) = 0
    ORDER BY p.group_name ASC, p.key ASC
    LIMIT 200;
  `);

  const roles = ((rolesZeroPerms as any)?.rows ?? []).map((r: any) => ({ key: String(r.key), name: String(r.name || '') }));
  const perms = ((permsUnused as any)?.rows ?? []).map((r: any) => ({
    key: String(r.key),
    label: String(r.label || ''),
    group_name: String(r.group_name || ''),
  }));

  if (roles.length === 0 && perms.length === 0) return null;

  const score = roles.length * 5 + perms.length;
  const priority: TicketPriority = score >= 40 ? 'alta' : 'media';
  const roleLines = roles.slice(0, 30).map((r: any) => `- Role sem permissões: ${r.key} (${r.name})`).join('\n');
  const permLines = perms.slice(0, 30).map((p: any) => `- Permissão não usada: ${p.group_name}/${p.key} (${p.label})`).join('\n');

  return {
    key: 'rbac_drift',
    title: `RBAC drift (roles sem permissões: ${roles.length}, permissões sem roles: ${perms.length})`,
    description:
      `Foi detetado drift no RBAC.\n\n${roleLines}${roleLines && permLines ? '\n' : ''}${permLines}`.trim(),
    priority,
    source_type: 'diagnostics',
    source_key: 'rbac_drift',
    source_meta: { rolesWithNoPermissions: roles, permissionsUnused: perms },
  };
}

export async function superadminListTicketSuggestions(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const hasOverride = Boolean((req as any)?.headers?.['x-tenant-id'] || (req as any)?.headers?.['x-tenant-slug']);
    if (!hasOverride) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) via x-tenant-id to list suggestions' });
    }

    const tenantId = String(req.tenantId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });

    const suggestions: TicketSuggestion[] = [];
    const integrity = await computeIntegritySuggestion(tenantId);
    if (integrity) suggestions.push(integrity);
    const drift = await computeRbacDriftSuggestion(tenantId);
    if (drift) suggestions.push(drift);

    const filtered: any[] = [];
    for (const s of suggestions) {
      const alreadyOpen = await findOpenTicketBySource({ tenantId, sourceType: s.source_type, sourceKey: s.source_key });
      filtered.push({ ...s, alreadyOpen });
    }

    return res.json({ success: true, data: { tenantId, suggestions: filtered } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to list suggestions' });
  }
}

export async function superadminCreateTicketFromSuggestion(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const hasOverride = Boolean((req as any)?.headers?.['x-tenant-id'] || (req as any)?.headers?.['x-tenant-slug']);
    if (!hasOverride) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) via x-tenant-id to create from suggestions' });
    }

    const tenantId = String(req.tenantId || '').trim();
    const key = String((req.params as any)?.key || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!key) return res.status(400).json({ success: false, error: 'Suggestion key is required' });

    const integrity = key === 'integrity' ? await computeIntegritySuggestion(tenantId) : null;
    const drift = key === 'rbac_drift' ? await computeRbacDriftSuggestion(tenantId) : null;
    const suggestion = integrity || drift;
    if (!suggestion) return res.status(404).json({ success: false, error: 'Suggestion not found or no issues' });

    const alreadyOpen = await findOpenTicketBySource({
      tenantId,
      sourceType: suggestion.source_type,
      sourceKey: suggestion.source_key,
    });
    if (alreadyOpen) {
      return res.status(409).json({ success: false, error: 'Já existe um ticket aberto para esta sugestão' });
    }

    const deadlines = await computeTicketSlaDeadlines({ tenantId, priority: suggestion.priority });
    const authorUserId = req.user?.userId ? String(req.user.userId) : null;

    const [created] = await db
      .insert(tickets)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        plant_id: null,
        created_by_user_id: authorUserId,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority as any,
        tags: ['diagnostics', suggestion.key],
        status: 'aberto' as any,
        level: 'superadmin' as any,
        is_general: true,
        is_internal: true,
        source_type: suggestion.source_type,
        source_key: suggestion.source_key,
        source_meta: suggestion.source_meta,
        sla_response_deadline: deadlines.slaResponseDeadline,
        sla_resolution_deadline: deadlines.slaResolutionDeadline,
        created_at: new Date(),
        updated_at: new Date(),
        last_activity_at: new Date(),
      } as any)
      .returning();

    const createdId = String((created as any)?.id || '').trim();
    if (createdId) {
      await logTicketEvent({
        tenantId,
        ticketId: createdId,
        plantId: null,
        level: 'superadmin',
        eventType: 'ticket_created',
        message: `Ticket criado a partir de diagnóstico (${suggestion.key})`,
        meta: { suggestion_key: suggestion.key, source_type: suggestion.source_type, source_key: suggestion.source_key },
        actorUserId: authorUserId,
      });
    }

    return res.status(201).json({ success: true, data: created, message: 'Ticket criado a partir de sugestão' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create ticket from suggestion' });
  }
}
