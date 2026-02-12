import { and, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { logger } from '../config/logger.js';
import { superadminAuditLogs } from '../db/schema.js';
import { AuthenticatedRequest } from '../types/index.js';

type SuperadminAuditRow = {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  affected_tenant_id: string | null;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: any;
};

export class SuperadminAuditService {
  static async isAvailable(): Promise<boolean> {
    try {
      const tableCheck = await db.execute(sql`SELECT to_regclass('public.superadmin_audit_logs') AS name;`);
      return Boolean((tableCheck as any)?.rows?.[0]?.name);
    } catch {
      return false;
    }
  }

  static getClientIp(req: AuthenticatedRequest): string | null {
    const forwarded = (req as any)?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]?.trim() || null;
    }
    return (req as any)?.ip || null;
  }

  static async log(
    req: AuthenticatedRequest,
    data: {
      action: string;
      entity_type: string;
      entity_id: string;
      affected_tenant_id?: string | null;
      metadata?: Record<string, any> | null;
    },
  ): Promise<void> {
    try {
      if (!req.user?.userId) return;
      const available = await SuperadminAuditService.isAvailable();
      if (!available) return;

      const ip = SuperadminAuditService.getClientIp(req);
      const userAgent = String((req as any)?.headers?.['user-agent'] || '').trim() || null;

      await db.insert(superadminAuditLogs).values({
        actor_user_id: String(req.user.userId),
        action: String(data.action),
        entity_type: String(data.entity_type),
        entity_id: String(data.entity_id),
        affected_tenant_id: data.affected_tenant_id ? String(data.affected_tenant_id) : null,
        metadata: data.metadata || null,
        ip_address: ip,
        user_agent: userAgent,
      } as any);
    } catch (error) {
      logger.warn('Superadmin audit log insert failed:', error);
    }
  }

  static async list(params: {
    limit?: number;
    offset?: number;
    from?: string | null;
    to?: string | null;
  }): Promise<SuperadminAuditRow[]> {
    const limitRaw = Number(params.limit ?? 20);
    const offsetRaw = Number(params.offset ?? 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 20;
    const offset = Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0;

    const available = await SuperadminAuditService.isAvailable();
    if (!available) return [];

    const whereParts: any[] = [];
    if (params.from) {
      const fromDate = new Date(String(params.from));
      if (!Number.isNaN(fromDate.getTime())) whereParts.push(gte(superadminAuditLogs.created_at, fromDate));
    }
    if (params.to) {
      const toDate = new Date(String(params.to));
      if (!Number.isNaN(toDate.getTime())) whereParts.push(lte(superadminAuditLogs.created_at, toDate));
    }

    const where = whereParts.length ? and(...whereParts) : undefined;

    const rows = await db
      .select({
        id: superadminAuditLogs.id,
        actor_user_id: superadminAuditLogs.actor_user_id,
        action: superadminAuditLogs.action,
        entity_type: superadminAuditLogs.entity_type,
        entity_id: superadminAuditLogs.entity_id,
        affected_tenant_id: superadminAuditLogs.affected_tenant_id,
        metadata: superadminAuditLogs.metadata,
        ip_address: superadminAuditLogs.ip_address,
        user_agent: superadminAuditLogs.user_agent,
        created_at: superadminAuditLogs.created_at,
      })
      .from(superadminAuditLogs)
      .where(where as any)
      .orderBy(desc(superadminAuditLogs.created_at))
      .limit(limit)
      .offset(offset);

    return (rows || []) as any;
  }

  static async purgeOlderThan(days: number): Promise<{ deleted: number; disabled?: boolean }> {
    if (!Number.isFinite(days) || days <= 0) return { deleted: 0, disabled: true };

    const available = await SuperadminAuditService.isAvailable();
    if (!available) return { deleted: 0 };

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.execute(
      sql`DELETE FROM superadmin_audit_logs WHERE created_at < ${cutoff} RETURNING id;`,
    );
    const deleted = Number((result as any)?.rows?.length ?? 0);
    return { deleted };
  }
}
