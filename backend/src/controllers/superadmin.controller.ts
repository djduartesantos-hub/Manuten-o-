import { Response } from 'express';
import { asc, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../types/index.js';
import { tenants } from '../db/schema.js';

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

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
}

export async function getDbStatus(req: AuthenticatedRequest, res: Response) {
  try {
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

    return res.json({
      success: true,
      data: {
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
