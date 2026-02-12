import { Response } from 'express';
import { asc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../types/index.js';
import { tenants } from '../db/schema.js';

const normalizeSlug = (value: unknown) => String(value || '').trim().toLowerCase();
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
