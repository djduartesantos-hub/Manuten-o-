import { Response } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { logger } from '../config/logger.js';
import { slaRules } from '../db/schema.js';
import { AuthenticatedRequest } from '../types/index.js';

type EntityType = 'work_order' | 'ticket';

function normalizeEntityType(raw: unknown): EntityType {
  const v = String(raw || '').trim();
  return v === 'ticket' ? 'ticket' : 'work_order';
}

function normalizePriority(raw: unknown): 'baixa' | 'media' | 'alta' | 'critica' | null {
  const v = String(raw || '').trim();
  const allowed = new Set(['baixa', 'media', 'alta', 'critica']);
  return allowed.has(v) ? (v as any) : null;
}

function logAndReturn500(params: {
  req: AuthenticatedRequest;
  res: Response;
  error: unknown;
  message: string;
}) {
  const { req, res, error, message } = params;
  logger.error(message, { requestId: req.requestId, err: error });
  return res.status(500).json({ success: false, error: message });
}

export async function listSlaRules(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });

    const entityType = normalizeEntityType((req.query as any)?.entityType);

    const rows = await db
      .select({
        id: slaRules.id,
        tenant_id: slaRules.tenant_id,
        entity_type: slaRules.entity_type,
        priority: slaRules.priority,
        response_time_hours: slaRules.response_time_hours,
        resolution_time_hours: slaRules.resolution_time_hours,
        is_active: slaRules.is_active,
        created_at: slaRules.created_at,
        updated_at: slaRules.updated_at,
      })
      .from(slaRules)
      .where(and(eq(slaRules.tenant_id, tenantId), eq(slaRules.entity_type, entityType)))
      .orderBy(asc(slaRules.priority));

    return res.json({ success: true, data: rows });
  } catch (error: any) {
    return logAndReturn500({ req, res, error, message: 'Failed to list SLA rules' });
  }
}

export async function upsertSlaRule(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });

    const { entity_type, priority, response_time_hours, resolution_time_hours, is_active } = req.body || {};

    const entityType = normalizeEntityType(entity_type);
    const prio = normalizePriority(priority);
    if (!prio) return res.status(400).json({ success: false, error: 'Invalid priority' });

    const responseHours = Number(response_time_hours);
    const resolutionHours = Number(resolution_time_hours);
    if (!Number.isFinite(responseHours) || responseHours <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid response_time_hours' });
    }
    if (!Number.isFinite(resolutionHours) || resolutionHours <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid resolution_time_hours' });
    }

    const active = is_active === undefined ? true : Boolean(is_active);

    const existing = await db.query.slaRules.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.entity_type, entityType), ops.eq(fields.priority, prio)),
    });

    if (existing) {
      const [updated] = await db
        .update(slaRules)
        .set({
          response_time_hours: Math.trunc(responseHours),
          resolution_time_hours: Math.trunc(resolutionHours),
          is_active: active,
          updated_at: new Date(),
        } as any)
        .where(eq(slaRules.id, String((existing as any).id)))
        .returning();

      return res.json({ success: true, data: updated, message: 'SLA atualizado' });
    }

    const [created] = await db
      .insert(slaRules)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        entity_type: entityType,
        priority: prio as any,
        response_time_hours: Math.trunc(responseHours),
        resolution_time_hours: Math.trunc(resolutionHours),
        is_active: active,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)
      .returning();

    return res.status(201).json({ success: true, data: created, message: 'SLA criado' });
  } catch (error: any) {
    return logAndReturn500({ req, res, error, message: 'Failed to upsert SLA rule' });
  }
}

export async function deactivateSlaRule(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const tenantId = String(req.tenantId || req.user.tenantId || '').trim();
    const ruleId = String((req.params as any)?.ruleId || '').trim();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    if (!ruleId) return res.status(400).json({ success: false, error: 'Rule ID is required' });

    const existing = await db.query.slaRules.findFirst({
      where: (fields: any, ops: any) => ops.and(ops.eq(fields.id, ruleId), ops.eq(fields.tenant_id, tenantId)),
    });
    if (!existing) return res.status(404).json({ success: false, error: 'SLA rule not found' });

    const [updated] = await db
      .update(slaRules)
      .set({ is_active: false, updated_at: new Date() } as any)
      .where(eq(slaRules.id, ruleId))
      .returning();

    return res.json({ success: true, data: updated, message: 'SLA desativado' });
  } catch (error: any) {
    return logAndReturn500({ req, res, error, message: 'Failed to deactivate SLA rule' });
  }
}
