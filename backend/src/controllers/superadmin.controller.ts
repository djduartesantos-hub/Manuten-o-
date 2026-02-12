import { Response } from 'express';
import { asc, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../types/index.js';
import { tenants, users } from '../db/schema.js';
import { hashPassword } from '../auth/jwt.js';
import { SuperadminAuditService } from '../services/superadminAudit.service.js';

const normalizeSlug = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  // Normalize accents/diacritics (e.g., "Fábrica" -> "fabrica")
  const ascii = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  // Convert spaces/underscores to hyphens, drop invalid chars, collapse repeats.
  return ascii
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};
const isSafeSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export async function listTenants(_req: AuthenticatedRequest, res: Response) {
  try {
    const rows = await db.query.tenants.findMany({
      orderBy: (fields: any) => [asc(fields.created_at)],
    });

    const data = (rows || []).map((t: any) => ({
      id: String(t.id),
      name: String(t.name || ''),
      slug: String(t.slug || ''),
      is_active: Boolean(t.is_active),
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch tenants' });
  }
}

export async function createTenant(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, slug, description, is_active } = req.body || {};

    const safeName = String(name || '').trim();
    const safeSlug = normalizeSlug(slug);

    if (!safeName) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (!safeSlug || !isSafeSlug(safeSlug)) {
      return res.status(400).json({ success: false, error: 'Invalid slug' });
    }

    const existing = await db.query.tenants.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.slug, safeSlug),
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'Slug already exists' });
    }

    const [created] = await db
      .insert(tenants)
      .values({
        id: uuidv4(),
        name: safeName,
        slug: safeSlug,
        description: description ? String(description) : null,
        is_active: is_active ?? true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)
      .returning();

    if (created?.id) {
      void SuperadminAuditService.log(req, {
        action: 'tenant.create',
        entity_type: 'tenant',
        entity_id: String(created.id),
        affected_tenant_id: String(created.id),
        metadata: { name: safeName, slug: safeSlug, is_active: Boolean(created.is_active) },
      });
    }

    return res.status(201).json({ success: true, data: created });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create tenant' });
  }
}

export async function updateTenant(req: AuthenticatedRequest, res: Response) {
  try {
    const { tenantId } = req.params as any;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    const before = await db.query.tenants.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.id, tenantId),
    });

    if (!before) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const { name, slug, description, is_active } = req.body || {};

    const patch: any = { updated_at: new Date() };

    if (name !== undefined) {
      const safeName = String(name || '').trim();
      if (!safeName) {
        return res.status(400).json({ success: false, error: 'Invalid name' });
      }
      patch.name = safeName;
    }

    if (slug !== undefined) {
      const safeSlug = normalizeSlug(slug);
      if (!safeSlug || !isSafeSlug(safeSlug)) {
        return res.status(400).json({ success: false, error: 'Invalid slug' });
      }

      const existing = await db.query.tenants.findFirst({
        where: (fields: any, { eq }: any) => eq(fields.slug, safeSlug),
      });
      if (existing && String(existing.id) !== String(tenantId)) {
        return res.status(409).json({ success: false, error: 'Slug already exists' });
      }
      patch.slug = safeSlug;
    }

    if (description !== undefined) {
      patch.description = description === null ? null : String(description);
    }

    if (is_active !== undefined) {
      patch.is_active = Boolean(is_active);
    }

    const [updated] = await db
      .update(tenants)
      .set(patch)
      .where(eq(tenants.id, tenantId))
      .returning();

    if (updated?.id) {
      void SuperadminAuditService.log(req, {
        action: 'tenant.update',
        entity_type: 'tenant',
        entity_id: String(updated.id),
        affected_tenant_id: String(updated.id),
        metadata: {
          before: {
            name: String((before as any)?.name ?? ''),
            slug: String((before as any)?.slug ?? ''),
            description: (before as any)?.description ?? null,
            is_active: Boolean((before as any)?.is_active),
          },
          after: {
            name: String((updated as any)?.name ?? ''),
            slug: String((updated as any)?.slug ?? ''),
            description: (updated as any)?.description ?? null,
            is_active: Boolean((updated as any)?.is_active),
          },
        },
      });
    }

    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
}

export async function getHealth(_req: AuthenticatedRequest, res: Response) {
  try {
    const serverTime = new Date().toISOString();
    const ping = await db.execute(sql`SELECT 1 AS ok;`);
    const dbOk = Number((ping as any)?.rows?.[0]?.ok ?? 0) === 1;

    let dbTime: string | null = null;
    try {
      const dbNowResult = await db.execute(sql`SELECT NOW() AS now;`);
      dbTime = String((dbNowResult as any)?.rows?.[0]?.now ?? '') || null;
    } catch {
      dbTime = null;
    }

    return res.json({
      success: true,
      data: {
        apiOk: true,
        serverTime,
        uptimeSeconds: Math.floor(process.uptime()),
        version: process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || null,
        dbOk,
        dbTime,
        config: {
          nodeEnv: process.env.NODE_ENV || null,
          timezone: process.env.TZ || null,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch health status' });
  }
}

function hasTenantOverrideHeader(req: AuthenticatedRequest): boolean {
  const headerTenantId = (req as any)?.headers?.['x-tenant-id'];
  const headerTenantSlug = (req as any)?.headers?.['x-tenant-slug'];
  return Boolean(
    (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) ||
      (typeof headerTenantSlug === 'string' && headerTenantSlug.trim().length > 0),
  );
}

export async function getDashboardMetrics(_req: AuthenticatedRequest, res: Response) {
  try {
    const serverTime = new Date().toISOString();
    const rows = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM tenants) AS tenants_total,
        (SELECT COUNT(*)::int FROM tenants WHERE is_active = true) AS tenants_active,
        (SELECT COUNT(*)::int FROM plants) AS plants_total,
        (SELECT COUNT(*)::int FROM users) AS users_total,
        (SELECT COUNT(*)::int FROM tenants WHERE created_at >= NOW() - interval '24 hours') AS tenants_created_24h,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - interval '24 hours') AS users_created_24h,
        (SELECT COUNT(*)::int FROM users WHERE last_login >= NOW() - interval '24 hours') AS logins_24h;
    `);

    const r = (rows as any)?.rows?.[0] ?? {};
    return res.json({
      success: true,
      data: {
        serverTime,
        totals: {
          tenants: Number(r.tenants_total ?? 0),
          tenantsActive: Number(r.tenants_active ?? 0),
          plants: Number(r.plants_total ?? 0),
          users: Number(r.users_total ?? 0),
        },
        last24h: {
          tenantsCreated: Number(r.tenants_created_24h ?? 0),
          usersCreated: Number(r.users_created_24h ?? 0),
          logins: Number(r.logins_24h ?? 0),
        },
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard metrics' });
  }
}

export async function listTenantMetrics(_req: AuthenticatedRequest, res: Response) {
  try {
    const rows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.subscription_plan,
        t.is_active,
        t.created_at,
        t.updated_at,
        COALESCE(u.user_count, 0)::int AS users,
        COALESCE(p.plant_count, 0)::int AS plants,
        u.last_login AS last_login
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS user_count, MAX(last_login) AS last_login
        FROM users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS plant_count
        FROM plants
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      ORDER BY t.created_at ASC;
    `);

    const data = ((rows as any)?.rows ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name || ''),
      slug: String(r.slug || ''),
      subscription_plan: r.subscription_plan === null || r.subscription_plan === undefined ? null : String(r.subscription_plan),
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
      users: Number(r.users ?? 0),
      plants: Number(r.plants ?? 0),
      last_login: r.last_login ?? null,
    }));

    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch tenant metrics' });
  }
}

export async function exportTenantMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const rows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.subscription_plan,
        t.is_active,
        t.created_at,
        t.updated_at,
        COALESCE(u.user_count, 0)::int AS users,
        COALESCE(p.plant_count, 0)::int AS plants,
        u.last_login AS last_login
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS user_count, MAX(last_login) AS last_login
        FROM users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS plant_count
        FROM plants
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      ORDER BY t.created_at ASC;
    `);

    const data = ((rows as any)?.rows ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name || ''),
      slug: String(r.slug || ''),
      subscription_plan: r.subscription_plan === null || r.subscription_plan === undefined ? null : String(r.subscription_plan),
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
      users: Number(r.users ?? 0),
      plants: Number(r.plants ?? 0),
      last_login: r.last_login ?? null,
    }));

    if (format === 'json') {
      return res.json({ success: true, data });
    }

    const headers = ['id', 'name', 'slug', 'subscription_plan', 'is_active', 'users', 'plants', 'last_login', 'created_at', 'updated_at'];
    const csv = [
      headers.join(','),
      ...data.map((r: any) =>
        [
          r.id,
          r.name,
          r.slug,
          r.subscription_plan,
          r.is_active,
          r.users,
          r.plants,
          r.last_login,
          r.created_at,
          r.updated_at,
        ]
          .map(toCsvValue)
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_tenants_metrics.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export tenant metrics' });
  }
}

export async function getTenantsActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const daysRaw = Number((req.query as any)?.days ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 365) : 30;
    const limitRaw = Number((req.query as any)?.limit ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50) : 10;

    const rows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.subscription_plan,
        COALESCE(u.logins_window, 0)::int AS logins_window,
        COALESCE(s.completed_window, 0)::int AS completed_window,
        COALESCE(o.overdue_open, 0)::int AS overdue_open
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS logins_window
        FROM users
        WHERE last_login IS NOT NULL
          AND last_login >= NOW() - (${days}::int * interval '1 day')
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS completed_window
        FROM preventive_maintenance_schedules
        WHERE completed_at IS NOT NULL
          AND completed_at >= NOW() - (${days}::int * interval '1 day')
        GROUP BY tenant_id
      ) s ON s.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS overdue_open
        FROM preventive_maintenance_schedules
        WHERE scheduled_for < NOW()
          AND status IN ('agendada','em_execucao','reagendada')
        GROUP BY tenant_id
      ) o ON o.tenant_id = t.id
      ORDER BY (COALESCE(u.logins_window, 0) + COALESCE(s.completed_window, 0)) DESC, t.created_at ASC
      LIMIT ${limit};
    `);

    const data = ((rows as any)?.rows ?? []).map((r: any) => ({
      tenant: {
        id: String(r.id),
        name: String(r.name || ''),
        slug: String(r.slug || ''),
        is_active: Boolean(r.is_active),
        subscription_plan: r.subscription_plan === null || r.subscription_plan === undefined ? null : String(r.subscription_plan),
      },
      days,
      logins: Number(r.logins_window ?? 0),
      preventiveCompleted: Number(r.completed_window ?? 0),
      preventiveOverdueOpen: Number(r.overdue_open ?? 0),
    }));

    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch tenants activity' });
  }
}

export async function exportTenantsActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const daysRaw = Number((req.query as any)?.days ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 365) : 30;
    const limitRaw = Number((req.query as any)?.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50;

    const rows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.subscription_plan,
        COALESCE(u.logins_window, 0)::int AS logins_window,
        COALESCE(s.completed_window, 0)::int AS completed_window,
        COALESCE(o.overdue_open, 0)::int AS overdue_open
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS logins_window
        FROM users
        WHERE last_login IS NOT NULL
          AND last_login >= NOW() - (${days}::int * interval '1 day')
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS completed_window
        FROM preventive_maintenance_schedules
        WHERE completed_at IS NOT NULL
          AND completed_at >= NOW() - (${days}::int * interval '1 day')
        GROUP BY tenant_id
      ) s ON s.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS overdue_open
        FROM preventive_maintenance_schedules
        WHERE scheduled_for < NOW()
          AND status IN ('agendada','em_execucao','reagendada')
        GROUP BY tenant_id
      ) o ON o.tenant_id = t.id
      ORDER BY (COALESCE(u.logins_window, 0) + COALESCE(s.completed_window, 0)) DESC, t.created_at ASC
      LIMIT ${limit};
    `);

    const data = ((rows as any)?.rows ?? []).map((r: any) => ({
      tenant_id: String(r.id),
      tenant_name: String(r.name || ''),
      tenant_slug: String(r.slug || ''),
      is_active: Boolean(r.is_active),
      subscription_plan: r.subscription_plan === null || r.subscription_plan === undefined ? null : String(r.subscription_plan),
      days,
      logins: Number(r.logins_window ?? 0),
      preventive_completed: Number(r.completed_window ?? 0),
      preventive_overdue_open: Number(r.overdue_open ?? 0),
    }));

    if (format === 'json') {
      return res.json({ success: true, data });
    }

    const headers = [
      'tenant_id',
      'tenant_name',
      'tenant_slug',
      'is_active',
      'subscription_plan',
      'days',
      'logins',
      'preventive_completed',
      'preventive_overdue_open',
    ];
    const csv = [
      headers.join(','),
      ...data.map((r: any) =>
        headers.map((h) => toCsvValue((r as any)[h])).join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_tenants_activity.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export tenants activity' });
  }
}

export async function listPlantMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to view plant diagnostics' });
    }

    const tenantId = String(req.tenantId || '');
    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.code,
        p.is_active,
        p.created_at,
        COALESCE(a.asset_count, 0)::int AS assets,
        COALESCE(o.overdue_count, 0)::int AS overdue,
        COALESCE(s.scheduled_30d, 0)::int AS scheduled_30d,
        COALESCE(s.completed_30d, 0)::int AS completed_30d
      FROM plants p
      LEFT JOIN (
        SELECT plant_id, COUNT(*)::int AS asset_count
        FROM assets
        WHERE tenant_id = ${tenantId}
        GROUP BY plant_id
      ) a ON a.plant_id = p.id
      LEFT JOIN (
        SELECT plant_id, COUNT(*)::int AS overdue_count
        FROM preventive_maintenance_schedules
        WHERE tenant_id = ${tenantId}
          AND scheduled_for < NOW()
          AND status IN ('agendada','em_execucao','reagendada')
        GROUP BY plant_id
      ) o ON o.plant_id = p.id
      LEFT JOIN (
        SELECT
          plant_id,
          COUNT(*) FILTER (WHERE scheduled_for >= NOW() - interval '30 days')::int AS scheduled_30d,
          COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND completed_at >= NOW() - interval '30 days')::int AS completed_30d
        FROM preventive_maintenance_schedules
        WHERE tenant_id = ${tenantId}
        GROUP BY plant_id
      ) s ON s.plant_id = p.id
      WHERE p.tenant_id = ${tenantId}
      ORDER BY p.created_at ASC;
    `);

    const upcomingRows = await db.execute(sql`
      SELECT
        plant_id,
        COUNT(*) FILTER (WHERE scheduled_for >= NOW() AND scheduled_for < NOW() + interval '7 days')::int AS next_7d,
        COUNT(*) FILTER (WHERE scheduled_for >= NOW() AND scheduled_for < NOW() + interval '14 days')::int AS next_14d
      FROM preventive_maintenance_schedules
      WHERE tenant_id = ${tenantId}
        AND status IN ('agendada','em_execucao','reagendada')
      GROUP BY plant_id;
    `);

    const upcomingByPlant = new Map<string, { next_7d: number; next_14d: number }>();
    for (const r of ((upcomingRows as any)?.rows ?? [])) {
      upcomingByPlant.set(String(r.plant_id), {
        next_7d: Number(r.next_7d ?? 0),
        next_14d: Number(r.next_14d ?? 0),
      });
    }

    const data = ((rows as any)?.rows ?? []).map((r: any) => {
      const scheduled = Number(r.scheduled_30d ?? 0);
      const completed = Number(r.completed_30d ?? 0);
      const rate = scheduled > 0 ? completed / scheduled : null;
      const upcoming = upcomingByPlant.get(String(r.id)) || { next_7d: 0, next_14d: 0 };
      return {
        id: String(r.id),
        name: String(r.name || ''),
        code: String(r.code || ''),
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
        assets: Number(r.assets ?? 0),
        overdue: Number(r.overdue ?? 0),
        scheduled_30d: scheduled,
        completed_30d: completed,
        completion_rate_30d: rate,
        next_7d: upcoming.next_7d,
        next_14d: upcoming.next_14d,
      };
    });

    const warnings = data
      .filter((p: any) => !p.is_active && (Number(p.assets) > 0 || Number(p.overdue) > 0 || Number(p.next_7d) > 0))
      .map((p: any) => ({
        type: 'inactive_with_activity',
        plant: { id: p.id, name: p.name, code: p.code, is_active: p.is_active },
        assets: p.assets,
        overdue: p.overdue,
        next_7d: p.next_7d,
      }));

    return res.json({ success: true, data: { rows: data, warnings } });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch plant metrics' });
  }
}

export async function exportPlantMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to export plant metrics' });
    }

    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const tenantId = String(req.tenantId || '');

    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.code,
        p.is_active,
        p.created_at,
        COALESCE(a.asset_count, 0)::int AS assets,
        COALESCE(o.overdue_count, 0)::int AS overdue,
        COALESCE(s.scheduled_30d, 0)::int AS scheduled_30d,
        COALESCE(s.completed_30d, 0)::int AS completed_30d
      FROM plants p
      LEFT JOIN (
        SELECT plant_id, COUNT(*)::int AS asset_count
        FROM assets
        WHERE tenant_id = ${tenantId}
        GROUP BY plant_id
      ) a ON a.plant_id = p.id
      LEFT JOIN (
        SELECT plant_id, COUNT(*)::int AS overdue_count
        FROM preventive_maintenance_schedules
        WHERE tenant_id = ${tenantId}
          AND scheduled_for < NOW()
          AND status IN ('agendada','em_execucao','reagendada')
        GROUP BY plant_id
      ) o ON o.plant_id = p.id
      LEFT JOIN (
        SELECT
          plant_id,
          COUNT(*) FILTER (WHERE scheduled_for >= NOW() - interval '30 days')::int AS scheduled_30d,
          COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND completed_at >= NOW() - interval '30 days')::int AS completed_30d
        FROM preventive_maintenance_schedules
        WHERE tenant_id = ${tenantId}
        GROUP BY plant_id
      ) s ON s.plant_id = p.id
      WHERE p.tenant_id = ${tenantId}
      ORDER BY p.created_at ASC;
    `);

    const upcomingRows = await db.execute(sql`
      SELECT
        plant_id,
        COUNT(*) FILTER (WHERE scheduled_for >= NOW() AND scheduled_for < NOW() + interval '7 days')::int AS next_7d,
        COUNT(*) FILTER (WHERE scheduled_for >= NOW() AND scheduled_for < NOW() + interval '14 days')::int AS next_14d
      FROM preventive_maintenance_schedules
      WHERE tenant_id = ${tenantId}
        AND status IN ('agendada','em_execucao','reagendada')
      GROUP BY plant_id;
    `);

    const upcomingByPlant = new Map<string, { next_7d: number; next_14d: number }>();
    for (const r of ((upcomingRows as any)?.rows ?? [])) {
      upcomingByPlant.set(String(r.plant_id), {
        next_7d: Number(r.next_7d ?? 0),
        next_14d: Number(r.next_14d ?? 0),
      });
    }

    const data = ((rows as any)?.rows ?? []).map((r: any) => {
      const scheduled = Number(r.scheduled_30d ?? 0);
      const completed = Number(r.completed_30d ?? 0);
      const rate = scheduled > 0 ? completed / scheduled : null;
      const upcoming = upcomingByPlant.get(String(r.id)) || { next_7d: 0, next_14d: 0 };
      return {
        id: String(r.id),
        name: String(r.name || ''),
        code: String(r.code || ''),
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
        assets: Number(r.assets ?? 0),
        overdue: Number(r.overdue ?? 0),
        scheduled_30d: scheduled,
        completed_30d: completed,
        completion_rate_30d: rate,
        next_7d: upcoming.next_7d,
        next_14d: upcoming.next_14d,
      };
    });

    if (format === 'json') {
      return res.json({ success: true, data });
    }

    const headers = [
      'id',
      'name',
      'code',
      'is_active',
      'assets',
      'overdue',
      'next_7d',
      'next_14d',
      'scheduled_30d',
      'completed_30d',
      'completion_rate_30d',
      'created_at',
    ];
    const csv = [
      headers.join(','),
      ...data.map((r: any) =>
        [
          r.id,
          r.name,
          r.code,
          r.is_active,
          r.assets,
          r.overdue,
          r.next_7d,
          r.next_14d,
          r.scheduled_30d,
          r.completed_30d,
          r.completion_rate_30d,
          r.created_at,
        ]
          .map(toCsvValue)
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_plants_metrics.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export plant metrics' });
  }
}

export async function getRbacDrift(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to view RBAC drift' });
    }

    const tenantId = String(req.tenantId || '');

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

    const data = {
      rolesWithNoPermissions: ((rolesZeroPerms as any)?.rows ?? []).map((r: any) => ({
        key: String(r.key),
        name: String(r.name || ''),
      })),
      permissionsUnused: ((permsUnused as any)?.rows ?? []).map((r: any) => ({
        key: String(r.key),
        label: String(r.label || ''),
        group_name: String(r.group_name || ''),
      })),
    };

    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch RBAC drift' });
  }
}

export async function exportRbacDrift(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to export RBAC drift' });
    }

    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const tenantId = String(req.tenantId || '');

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

    const data = {
      tenantId,
      rolesWithNoPermissions: ((rolesZeroPerms as any)?.rows ?? []).map((r: any) => ({
        key: String(r.key),
        name: String(r.name || ''),
      })),
      permissionsUnused: ((permsUnused as any)?.rows ?? []).map((r: any) => ({
        key: String(r.key),
        label: String(r.label || ''),
        group_name: String(r.group_name || ''),
      })),
    };

    if (format === 'json') {
      return res.json({ success: true, data });
    }

    const headers = ['type', 'key', 'name', 'label', 'group_name'];
    const rows: any[] = [];
    for (const r of data.rolesWithNoPermissions) {
      rows.push({ type: 'role_no_permissions', key: r.key, name: r.name, label: '', group_name: '' });
    }
    for (const p of data.permissionsUnused) {
      rows.push({ type: 'permission_unused', key: p.key, name: '', label: p.label, group_name: p.group_name });
    }

    const csv = [
      headers.join(','),
      ...rows.map((r: any) => headers.map((h) => toCsvValue(r[h])).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_rbac_drift.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export RBAC drift' });
  }
}

export async function getUserSecurityInsights(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to view user security insights' });
    }

    const daysRaw = Number((req.query as any)?.days ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 365) : 30;
    const limitRaw = Number((req.query as any)?.limit ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50) : 10;

    const tenantId = String(req.tenantId || '');

    const available = await SuperadminAuditService.isAvailable();
    if (!available) {
      return res.json({ success: true, data: { days, topPasswordResets: [] } });
    }

    const rows = await db.execute(sql`
      SELECT
        entity_id,
        COUNT(*)::int AS reset_count,
        MAX(created_at) AS last_reset_at
      FROM superadmin_audit_logs
      WHERE action = 'user.reset_password'
        AND affected_tenant_id = ${tenantId}
        AND created_at >= NOW() - (${days}::int * interval '1 day')
      GROUP BY entity_id
      ORDER BY COUNT(*) DESC, MAX(created_at) DESC
      LIMIT ${limit};
    `);

    const ids = ((rows as any)?.rows ?? []).map((r: any) => String(r.entity_id));
    let usersRows: any[] = [];
    if (ids.length > 0) {
      const usersResult = await db.execute(sql`
        SELECT id, username, email, first_name, last_name, is_active, last_login
        FROM users
        WHERE tenant_id = ${tenantId}
          AND id = ANY(${ids}::uuid[]);
      `);
      usersRows = (usersResult as any)?.rows ?? [];
    }
    const userById = new Map<string, any>();
    for (const u of usersRows) userById.set(String(u.id), u);

    const topPasswordResets = ((rows as any)?.rows ?? []).map((r: any) => {
      const u = userById.get(String(r.entity_id));
      return {
        userId: String(r.entity_id),
        resetCount: Number(r.reset_count ?? 0),
        lastResetAt: r.last_reset_at ?? null,
        user: u
          ? {
              id: String(u.id),
              username: String(u.username || ''),
              email: String(u.email || ''),
              first_name: String(u.first_name || ''),
              last_name: String(u.last_name || ''),
              is_active: Boolean(u.is_active),
              last_login: u.last_login ?? null,
            }
          : null,
      };
    });

    return res.json({ success: true, data: { days, topPasswordResets } });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch user security insights' });
  }
}

export async function exportUserSecurityInsights(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to export user security insights' });
    }

    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const daysRaw = Number((req.query as any)?.days ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 365) : 30;
    const limitRaw = Number((req.query as any)?.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50;

    const tenantId = String(req.tenantId || '');

    const available = await SuperadminAuditService.isAvailable();
    if (!available) {
      const empty = { days, tenantId, topPasswordResets: [] as any[] };
      if (format === 'json') return res.json({ success: true, data: empty });

      const headers = ['tenant_id', 'days', 'user_id', 'username', 'email', 'reset_count', 'last_reset_at', 'is_active', 'last_login'];
      const csv = [headers.join(',')].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="superadmin_user_security.csv"');
      return res.status(200).send(csv);
    }

    const rows = await db.execute(sql`
      SELECT
        entity_id,
        COUNT(*)::int AS reset_count,
        MAX(created_at) AS last_reset_at
      FROM superadmin_audit_logs
      WHERE action = 'user.reset_password'
        AND affected_tenant_id = ${tenantId}
        AND created_at >= NOW() - (${days}::int * interval '1 day')
      GROUP BY entity_id
      ORDER BY COUNT(*) DESC, MAX(created_at) DESC
      LIMIT ${limit};
    `);

    const ids = ((rows as any)?.rows ?? []).map((r: any) => String(r.entity_id));
    let usersRows: any[] = [];
    if (ids.length > 0) {
      const usersResult = await db.execute(sql`
        SELECT id, username, email, first_name, last_name, is_active, last_login
        FROM users
        WHERE tenant_id = ${tenantId}
          AND id = ANY(${ids}::uuid[]);
      `);
      usersRows = (usersResult as any)?.rows ?? [];
    }
    const userById = new Map<string, any>();
    for (const u of usersRows) userById.set(String(u.id), u);

    const topPasswordResets = ((rows as any)?.rows ?? []).map((r: any) => {
      const u = userById.get(String(r.entity_id));
      return {
        userId: String(r.entity_id),
        resetCount: Number(r.reset_count ?? 0),
        lastResetAt: r.last_reset_at ?? null,
        user: u
          ? {
              id: String(u.id),
              username: String(u.username || ''),
              email: String(u.email || ''),
              first_name: String(u.first_name || ''),
              last_name: String(u.last_name || ''),
              is_active: Boolean(u.is_active),
              last_login: u.last_login ?? null,
            }
          : null,
      };
    });

    const data = { tenantId, days, topPasswordResets };
    if (format === 'json') {
      return res.json({ success: true, data });
    }

    const headers = ['tenant_id', 'days', 'user_id', 'username', 'email', 'reset_count', 'last_reset_at', 'is_active', 'last_login'];
    const csvRows = topPasswordResets.map((r: any) => ({
      tenant_id: tenantId,
      days,
      user_id: r.userId,
      username: r.user?.username || '',
      email: r.user?.email || '',
      reset_count: r.resetCount,
      last_reset_at: r.lastResetAt,
      is_active: r.user?.is_active ?? '',
      last_login: r.user?.last_login ?? '',
    }));

    const csv = [
      headers.join(','),
      ...csvRows.map((r: any) => headers.map((h) => toCsvValue(r[h])).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_user_security.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export user security insights' });
  }
}

export async function getIntegrityChecks(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to run integrity checks' });
    }

    const tenantId = String(req.tenantId || '');

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
      {
        key: 'assets_missing_plant',
        label: 'Assets sem fábrica válida',
        count: Number((assetsMissingPlant as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'schedules_missing_asset',
        label: 'Preventivas sem asset válido',
        count: Number((schedulesMissingAsset as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'schedules_missing_plan',
        label: 'Preventivas sem plano válido',
        count: Number((schedulesMissingPlan as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'user_plants_missing_user',
        label: 'UserPlants com user inexistente',
        count: Number((userPlantsMissingUser as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'user_plants_missing_plant',
        label: 'UserPlants com fábrica inexistente',
        count: Number((userPlantsMissingPlant as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
    ];

    return res.json({ success: true, data: { tenantId, checks } });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to run integrity checks' });
  }
}

export async function exportIntegrityChecks(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to export integrity checks' });
    }

    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const tenantId = String(req.tenantId || '');

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
      {
        key: 'assets_missing_plant',
        label: 'Assets sem fábrica válida',
        count: Number((assetsMissingPlant as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'schedules_missing_asset',
        label: 'Preventivas sem asset válido',
        count: Number((schedulesMissingAsset as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'schedules_missing_plan',
        label: 'Preventivas sem plano válido',
        count: Number((schedulesMissingPlan as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'user_plants_missing_user',
        label: 'UserPlants com user inexistente',
        count: Number((userPlantsMissingUser as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
      {
        key: 'user_plants_missing_plant',
        label: 'UserPlants com fábrica inexistente',
        count: Number((userPlantsMissingPlant as any)?.rows?.[0]?.count ?? 0),
        severity: 'warning',
      },
    ];

    const data = { tenantId, checks };
    if (format === 'json') {
      return res.json({ success: true, data });
    }

    const headers = ['tenant_id', 'key', 'label', 'count', 'severity'];
    const csv = [
      headers.join(','),
      ...checks.map((c: any) =>
        [tenantId, c.key, c.label, c.count, c.severity].map(toCsvValue).join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_integrity_checks.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export integrity checks' });
  }
}

export async function getUserAnomalies(req: AuthenticatedRequest, res: Response) {
  try {
    if (!hasTenantOverrideHeader(req)) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to view user diagnostics' });
    }

    const tenantId = String(req.tenantId || '');

    const withoutPlantsRows = await db.execute(sql`
      SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at
      FROM users u
      WHERE u.tenant_id = ${tenantId}
        AND NOT EXISTS (
          SELECT 1 FROM user_plants up WHERE up.user_id = u.id
        )
      ORDER BY last_login DESC NULLS LAST, created_at DESC
      LIMIT 50;
    `);

    const withoutRoleRows = await db.execute(sql`
      SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at
      FROM users u
      WHERE u.tenant_id = ${tenantId}
        AND (u.role IS NULL OR LENGTH(TRIM(u.role)) = 0)
      ORDER BY last_login DESC NULLS LAST, created_at DESC
      LIMIT 50;
    `);

    const unknownRoleRows = await db.execute(sql`
      SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at
      FROM users u
      WHERE u.tenant_id = ${tenantId}
        AND NOT EXISTS (
          SELECT 1 FROM rbac_roles r WHERE r.tenant_id = ${tenantId} AND r.key = u.role
        )
      ORDER BY last_login DESC NULLS LAST, created_at DESC
      LIMIT 50;
    `);

    const mapUser = (r: any) => ({
      id: String(r.id),
      username: String(r.username || ''),
      email: String(r.email || ''),
      first_name: String(r.first_name || ''),
      last_name: String(r.last_name || ''),
      role: r.role === null || r.role === undefined ? null : String(r.role),
      is_active: Boolean(r.is_active),
      last_login: r.last_login ?? null,
      created_at: r.created_at ?? null,
    });

    const usersWithoutPlants = ((withoutPlantsRows as any)?.rows ?? []).map(mapUser);
    const usersWithoutRole = ((withoutRoleRows as any)?.rows ?? []).map(mapUser);
    const usersWithUnknownRole = ((unknownRoleRows as any)?.rows ?? []).map(mapUser);

    return res.json({
      success: true,
      data: {
        usersWithoutPlants,
        usersWithoutRole,
        usersWithUnknownRole,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch user anomalies' });
  }
}

export async function exportDiagnosticsBundle(req: AuthenticatedRequest, res: Response) {
  try {
    const format = String((req.query as any)?.format || 'json').toLowerCase();
    const auditLimitRaw = Number((req.query as any)?.auditLimit ?? 50);
    const auditLimit = Number.isFinite(auditLimitRaw) ? Math.min(Math.max(Math.trunc(auditLimitRaw), 1), 200) : 50;
    const diagLimitRaw = Number((req.query as any)?.diagnosticsLimit ?? 10);
    const diagnosticsLimit = Number.isFinite(diagLimitRaw) ? Math.min(Math.max(Math.trunc(diagLimitRaw), 1), 50) : 10;
    const dbLimitRaw = Number((req.query as any)?.dbRunsLimit ?? 10);
    const dbRunsLimit = Number.isFinite(dbLimitRaw) ? Math.min(Math.max(Math.trunc(dbLimitRaw), 1), 50) : 10;

    const serverTime = new Date().toISOString();
    const ping = await db.execute(sql`SELECT 1 AS ok;`);
    const dbOk = Number((ping as any)?.rows?.[0]?.ok ?? 0) === 1;

    let dbTime: string | null = null;
    try {
      const dbNowResult = await db.execute(sql`SELECT NOW() AS now;`);
      dbTime = String((dbNowResult as any)?.rows?.[0]?.now ?? '') || null;
    } catch {
      dbTime = null;
    }

    const health = {
      apiOk: true,
      serverTime,
      uptimeSeconds: Math.floor(process.uptime()),
      version: process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || null,
      dbOk,
      dbTime,
      config: {
        nodeEnv: process.env.NODE_ENV || null,
        timezone: process.env.TZ || null,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // tenant diagnostics
    const diagReq: any = { query: { limit: diagnosticsLimit } };
    // Reuse the same SQL pattern from getTenantDiagnostics (inlined here)
    const diagRows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        COALESCE(u.user_count, 0)::int AS users,
        COALESCE(p.plant_count, 0)::int AS plants
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS user_count
        FROM users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS plant_count
        FROM plants
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      ORDER BY COALESCE(u.user_count, 0) DESC, COALESCE(p.plant_count, 0) DESC, t.created_at ASC
      LIMIT ${diagnosticsLimit};
    `);

    const topTenants = ((diagRows as any)?.rows ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name || ''),
      slug: String(r.slug || ''),
      is_active: Boolean(r.is_active),
      users: Number(r.users ?? 0),
      plants: Number(r.plants ?? 0),
    }));

    const warningsRows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        COALESCE(u.user_count, 0)::int AS users,
        COALESCE(p.plant_count, 0)::int AS plants
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS user_count
        FROM users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS plant_count
        FROM plants
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      WHERE (t.is_active = true AND COALESCE(p.plant_count, 0) = 0)
         OR (t.is_active = true AND COALESCE(u.user_count, 0) = 0)
         OR (t.is_active = false AND COALESCE(u.user_count, 0) > 0)
      ORDER BY t.is_active DESC, COALESCE(u.user_count, 0) DESC;
    `);

    const warnings = ((warningsRows as any)?.rows ?? []).map((r: any) => {
      const usersCount = Number(r.users ?? 0);
      const plantsCount = Number(r.plants ?? 0);
      const isActive = Boolean(r.is_active);

      let type = 'warning';
      if (isActive && plantsCount === 0) type = 'active_without_plants';
      else if (isActive && usersCount === 0) type = 'active_without_users';
      else if (!isActive && usersCount > 0) type = 'inactive_with_users';

      return {
        type,
        tenant: {
          id: String(r.id),
          name: String(r.name || ''),
          slug: String(r.slug || ''),
          is_active: isActive,
        },
        users: usersCount,
        plants: plantsCount,
      };
    });

    const tenantDiagnostics = { topTenants, warnings };

    // db status (global or tenant depending on override)
    const hasOverride = hasTenantOverrideHeader(req);
    const tenantId = String(req.tenantId || '');
    const tenantSlug = String(req.tenantSlug || '');

    let userCount: number | null = null;
    let plantCount: number | null = null;
    if (hasOverride) {
      try {
        const userCountResult = await db.execute(
          sql`SELECT COUNT(*)::int AS count FROM users WHERE tenant_id = ${tenantId};`,
        );
        userCount = Number((userCountResult as any)?.rows?.[0]?.count ?? 0);
      } catch {
        userCount = null;
      }

      try {
        const plantCountResult = await db.execute(
          sql`SELECT COUNT(*)::int AS count FROM plants WHERE tenant_id = ${tenantId};`,
        );
        plantCount = Number((plantCountResult as any)?.rows?.[0]?.count ?? 0);
      } catch {
        plantCount = null;
      }
    }

    let migrationsTable: string | null = null;
    let latestMigration: any | null = null;
    try {
      const tableCheck = await db.execute(
        sql`SELECT to_regclass('public.__drizzle_migrations') AS name;`,
      );
      migrationsTable = String((tableCheck as any)?.rows?.[0]?.name ?? '') || null;

      if (migrationsTable) {
        const latest = await db.execute(
          sql`SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1;`,
        );
        latestMigration = (latest as any)?.rows?.[0] ?? null;
      }
    } catch {
      migrationsTable = null;
      latestMigration = null;
    }

    let lastSetupRun: any | null = null;
    let setupRuns: any[] = [];
    if (hasOverride) {
      try {
        const tableCheck = await db.execute(sql`SELECT to_regclass('public.setup_db_runs') AS name;`);
        const tableName = String((tableCheck as any)?.rows?.[0]?.name ?? '') || null;
        if (tableName) {
          const runs = await db.execute(sql`
            SELECT id, tenant_id, run_type, user_id, migrations, patches, created_at
            FROM setup_db_runs
            WHERE tenant_id = ${tenantId}
            ORDER BY created_at DESC
            LIMIT ${dbRunsLimit};
          `);
          setupRuns = (runs as any)?.rows ?? [];
          lastSetupRun = setupRuns[0] ?? null;
        }
      } catch {
        lastSetupRun = null;
        setupRuns = [];
      }
    }

    const dbStatus = {
      scope: hasOverride ? 'tenant' : 'global',
      tenantId,
      tenantSlug,
      serverTime,
      dbOk,
      dbTime,
      counts: {
        users: userCount,
        plants: plantCount,
      },
      drizzleMigrations: {
        table: migrationsTable,
        latest: latestMigration,
      },
      lastSetupRun,
      setupRuns,
    };

    const audit = await SuperadminAuditService.list({ limit: auditLimit, offset: 0, from: null, to: null });

    let integrity: any = null;
    let rbacDrift: any = null;
    let userSecurity: any = null;
    if (hasOverride) {
      try {
        const integrityRes = await getIntegrityChecks(req, {
          json: (payload: any) => payload,
          status: () => ({ json: (payload: any) => payload }),
        } as any);
        integrity = (integrityRes as any)?.data ?? null;
      } catch {
        integrity = null;
      }

      try {
        const driftRes = await getRbacDrift(req, {
          json: (payload: any) => payload,
          status: () => ({ json: (payload: any) => payload }),
        } as any);
        rbacDrift = (driftRes as any)?.data ?? null;
      } catch {
        rbacDrift = null;
      }

      try {
        const secRes = await getUserSecurityInsights(req, {
          json: (payload: any) => payload,
          status: () => ({ json: (payload: any) => payload }),
        } as any);
        userSecurity = (secRes as any)?.data ?? null;
      } catch {
        userSecurity = null;
      }
    }

    const bundle = {
      generatedAt: serverTime,
      health,
      tenantDiagnostics,
      dbStatus,
      audit,
      integrity,
      rbacDrift,
      userSecurity,
    };

    if (format === 'zip') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="superadmin_diagnostics_bundle.zip"');

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', () => {
        try {
          res.status(500).end();
        } catch {
          // ignore
        }
      });
      archive.pipe(res);

      const wrap = (obj: any) => JSON.stringify({ success: true, data: obj }, null, 2);
      archive.append(wrap(health), { name: 'health.json' });
      archive.append(wrap(tenantDiagnostics), { name: 'tenant_diagnostics.json' });
      archive.append(wrap(dbStatus), { name: 'db_status.json' });
      archive.append(wrap(audit), { name: 'audit.json' });
      archive.append(wrap(integrity), { name: 'integrity.json' });
      archive.append(wrap(rbacDrift), { name: 'rbac_drift.json' });
      archive.append(wrap(userSecurity), { name: 'user_security.json' });
      archive.append(wrap(bundle), { name: 'bundle.json' });

      await archive.finalize();
      return res;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_diagnostics_bundle.json"');
    return res.status(200).send(JSON.stringify({ success: true, data: bundle }, null, 2));
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export diagnostics bundle' });
  }
}

export async function getTenantDiagnostics(req: AuthenticatedRequest, res: Response) {
  try {
    const limitRaw = Number((req.query as any)?.limit ?? 5);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50) : 5;

    const rows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        COALESCE(u.user_count, 0)::int AS users,
        COALESCE(p.plant_count, 0)::int AS plants
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS user_count
        FROM users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS plant_count
        FROM plants
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      ORDER BY COALESCE(u.user_count, 0) DESC, COALESCE(p.plant_count, 0) DESC, t.created_at ASC
      LIMIT ${limit};
    `);

    const tenantsSummary = ((rows as any)?.rows ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name || ''),
      slug: String(r.slug || ''),
      is_active: Boolean(r.is_active),
      users: Number(r.users ?? 0),
      plants: Number(r.plants ?? 0),
    }));

    const warningsRows = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        COALESCE(u.user_count, 0)::int AS users,
        COALESCE(p.plant_count, 0)::int AS plants
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS user_count
        FROM users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS plant_count
        FROM plants
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      WHERE (t.is_active = true AND COALESCE(p.plant_count, 0) = 0)
         OR (t.is_active = true AND COALESCE(u.user_count, 0) = 0)
         OR (t.is_active = false AND COALESCE(u.user_count, 0) > 0)
      ORDER BY t.is_active DESC, COALESCE(u.user_count, 0) DESC;
    `);

    const warnings = ((warningsRows as any)?.rows ?? []).map((r: any) => {
      const usersCount = Number(r.users ?? 0);
      const plantsCount = Number(r.plants ?? 0);
      const isActive = Boolean(r.is_active);

      let type = 'warning';
      if (isActive && plantsCount === 0) type = 'active_without_plants';
      else if (isActive && usersCount === 0) type = 'active_without_users';
      else if (!isActive && usersCount > 0) type = 'inactive_with_users';

      return {
        type,
        tenant: {
          id: String(r.id),
          name: String(r.name || ''),
          slug: String(r.slug || ''),
          is_active: isActive,
        },
        users: usersCount,
        plants: plantsCount,
      };
    });

    return res.json({ success: true, data: { topTenants: tenantsSummary, warnings } });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch tenant diagnostics' });
  }
}

export async function listSuperadminAudit(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = Number((req.query as any)?.limit ?? 20);
    const offset = Number((req.query as any)?.offset ?? 0);
    const from = (req.query as any)?.from ? String((req.query as any)?.from) : null;
    const to = (req.query as any)?.to ? String((req.query as any)?.to) : null;

    const rows = await SuperadminAuditService.list({ limit, offset, from, to });
    return res.json({ success: true, data: rows });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
}

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function exportSuperadminAudit(req: AuthenticatedRequest, res: Response) {
  try {
    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const limit = Number((req.query as any)?.limit ?? 200);
    const from = (req.query as any)?.from ? String((req.query as any)?.from) : null;
    const to = (req.query as any)?.to ? String((req.query as any)?.to) : null;

    const rows = await SuperadminAuditService.list({ limit, offset: 0, from, to });

    if (format === 'json') {
      return res.json({ success: true, data: rows });
    }

    const headers = [
      'id',
      'created_at',
      'actor_user_id',
      'action',
      'entity_type',
      'entity_id',
      'affected_tenant_id',
      'ip_address',
      'user_agent',
      'metadata',
    ];

    const csv = [
      headers.join(','),
      ...rows.map((r: any) =>
        [
          r.id,
          r.created_at,
          r.actor_user_id,
          r.action,
          r.entity_type,
          r.entity_id,
          r.affected_tenant_id,
          r.ip_address,
          r.user_agent,
          r.metadata ? JSON.stringify(r.metadata) : '',
        ]
          .map(toCsvValue)
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_audit_logs.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export audit logs' });
  }
}

export async function purgeSuperadminAudit(req: AuthenticatedRequest, res: Response) {
  try {
    const retentionDaysRaw = Number(process.env.SUPERADMIN_AUDIT_RETENTION_DAYS || 90);
    if (!Number.isFinite(retentionDaysRaw) || retentionDaysRaw <= 0) {
      return res.json({ success: true, data: { deleted: 0, disabled: true } });
    }

    const result = await SuperadminAuditService.purgeOlderThan(retentionDaysRaw);
    void SuperadminAuditService.log(req, {
      action: 'audit.purge',
      entity_type: 'superadmin_audit_logs',
      entity_id: 'superadmin_audit_logs',
      metadata: { retentionDays: retentionDaysRaw, deleted: result.deleted },
    });

    return res.json({ success: true, data: result });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to purge audit logs' });
  }
}

export async function searchUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const q = String((req.query as any)?.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const rows = await db.execute(sql`
      SELECT id, tenant_id, username, email, first_name, last_name, is_active
      FROM users
      WHERE username ILIKE ${'%' + q + '%'}
         OR email ILIKE ${'%' + q + '%'}
         OR first_name ILIKE ${'%' + q + '%'}
         OR last_name ILIKE ${'%' + q + '%'}
      ORDER BY last_login DESC NULLS LAST, created_at DESC
      LIMIT 10;
    `);

    const data = ((rows as any)?.rows ?? []).map((r: any) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      username: String(r.username || ''),
      email: String(r.email || ''),
      first_name: String(r.first_name || ''),
      last_name: String(r.last_name || ''),
      is_active: Boolean(r.is_active),
    }));

    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to search users' });
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const len = 16;
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function resetUserPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params as any;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const found = await db.query.users.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.id, userId),
    });

    if (!found) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({ password_hash: passwordHash, updated_at: new Date() } as any)
      .where(eq(users.id, userId));

    void SuperadminAuditService.log(req, {
      action: 'user.reset_password',
      entity_type: 'user',
      entity_id: String(userId),
      affected_tenant_id: String((found as any).tenant_id),
      metadata: { username: String((found as any).username || ''), email: String((found as any).email || '') },
    });

    return res.json({
      success: true,
      data: {
        userId: String(userId),
        tenantId: String((found as any).tenant_id),
        username: String((found as any).username || ''),
        oneTimePassword: password,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
}

export async function exportSetupRuns(req: AuthenticatedRequest, res: Response) {
  try {
    const headerTenantId = (req as any)?.headers?.['x-tenant-id'];
    const headerTenantSlug = (req as any)?.headers?.['x-tenant-slug'];
    const hasTenantOverride = Boolean(
      (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) ||
        (typeof headerTenantSlug === 'string' && headerTenantSlug.trim().length > 0),
    );

    if (!hasTenantOverride) {
      return res.status(400).json({ success: false, error: 'Select a tenant (Empresa) to export setup runs' });
    }

    const format = String((req.query as any)?.format || 'csv').toLowerCase();
    const limitRaw = Number((req.query as any)?.limit ?? 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 1000) : 200;

    const tenantId = String(req.tenantId || '');
    const tableCheck = await db.execute(sql`SELECT to_regclass('public.setup_db_runs') AS name;`);
    const tableName = String((tableCheck as any)?.rows?.[0]?.name ?? '') || null;
    if (!tableName) {
      return res.status(404).json({ success: false, error: 'setup_db_runs table not found' });
    }

    const runs = await db.execute(sql`
      SELECT id, tenant_id, run_type, user_id, migrations, patches, created_at
      FROM setup_db_runs
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `);
    const rows = (runs as any)?.rows ?? [];

    if (format === 'json') {
      return res.json({ success: true, data: rows });
    }

    const headers = ['id', 'tenant_id', 'run_type', 'user_id', 'migrations', 'patches', 'created_at'];
    const csv = [
      headers.join(','),
      ...rows.map((r: any) =>
        [
          r.id,
          r.tenant_id,
          r.run_type,
          r.user_id,
          r.migrations ? JSON.stringify(r.migrations) : '',
          r.patches ? JSON.stringify(r.patches) : '',
          r.created_at,
        ]
          .map(toCsvValue)
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="setup_db_runs.csv"');
    return res.status(200).send(csv);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to export setup runs' });
  }
}

export async function getDbStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const headerTenantId = (req as any)?.headers?.['x-tenant-id'];
    const headerTenantSlug = (req as any)?.headers?.['x-tenant-slug'];
    const hasTenantOverride = Boolean(
      (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) ||
        (typeof headerTenantSlug === 'string' && headerTenantSlug.trim().length > 0),
    );

    const tenantId = String(req.tenantId || '');
    const tenantSlug = String(req.tenantSlug || '');

    const limitRaw = Number((req.query as any)?.limit ?? 10);
    const setupRunsLimit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50)
      : 10;

    const serverTime = new Date().toISOString();

    const ping = await db.execute(sql`SELECT 1 AS ok;`);
    const dbOk = Number((ping as any)?.rows?.[0]?.ok ?? 0) === 1;

    const dbNowResult = await db.execute(sql`SELECT NOW() AS now;`);
    const dbTime = String((dbNowResult as any)?.rows?.[0]?.now ?? '');

    let userCount: number | null = null;
    let plantCount: number | null = null;

    // Only compute tenant-scoped counts when a tenant override header is provided.
    // When absent, we treat the request as "global scope" even though tenant middleware
    // resolves a default tenant for single-tenant deployments.
    if (hasTenantOverride) {
      try {
        const userCountResult = await db.execute(
          sql`SELECT COUNT(*)::int AS count FROM users WHERE tenant_id = ${tenantId};`,
        );
        userCount = Number((userCountResult as any)?.rows?.[0]?.count ?? 0);
      } catch {
        userCount = null;
      }

      try {
        const plantCountResult = await db.execute(
          sql`SELECT COUNT(*)::int AS count FROM plants WHERE tenant_id = ${tenantId};`,
        );
        plantCount = Number((plantCountResult as any)?.rows?.[0]?.count ?? 0);
      } catch {
        plantCount = null;
      }
    }

    let migrationsTable: string | null = null;
    let latestMigration: any | null = null;

    try {
      const tableCheck = await db.execute(
        sql`SELECT to_regclass('public.__drizzle_migrations') AS name;`,
      );
      migrationsTable = String((tableCheck as any)?.rows?.[0]?.name ?? '') || null;

      if (migrationsTable) {
        const latest = await db.execute(
          sql`SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1;`,
        );
        latestMigration = (latest as any)?.rows?.[0] ?? null;
      }
    } catch {
      migrationsTable = null;
      latestMigration = null;
    }

    let lastSetupRun: any | null = null;
    let setupRuns: any[] = [];
    if (hasTenantOverride) {
      try {
        const tableCheck = await db.execute(sql`SELECT to_regclass('public.setup_db_runs') AS name;`);
        const tableName = String((tableCheck as any)?.rows?.[0]?.name ?? '') || null;
        if (tableName) {
          const runs = await db.execute(sql`
            SELECT id, tenant_id, run_type, user_id, migrations, patches, created_at
            FROM setup_db_runs
            WHERE tenant_id = ${tenantId}
            ORDER BY created_at DESC
            LIMIT ${setupRunsLimit};
          `);
          setupRuns = (runs as any)?.rows ?? [];
          lastSetupRun = setupRuns[0] ?? null;
        }
      } catch {
        lastSetupRun = null;
        setupRuns = [];
      }
    }

    return res.json({
      success: true,
      data: {
        scope: hasTenantOverride ? 'tenant' : 'global',
        tenantId,
        tenantSlug,
        serverTime,
        dbOk,
        dbTime,
        counts: {
          users: userCount,
          plants: plantCount,
        },
        drizzleMigrations: {
          table: migrationsTable,
          latest: latestMigration,
        },
        lastSetupRun,
        setupRuns,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch database status' });
  }
}
