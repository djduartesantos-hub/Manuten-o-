import { NextFunction, Response } from 'express';
import { asc } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/index.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';
import { db } from '../config/database.js';

const TENANT_CACHE_TTL_MS = 60_000;
let cachedTenant:
  | {
      id: string;
      slug: string;
      isReadOnly: boolean;
      expiresAt: number;
    }
  | undefined;

async function resolveTenant() {
  const now = Date.now();
  if (cachedTenant && cachedTenant.expiresAt > now) {
    return cachedTenant;
  }

  const preferredSlug = process.env.TENANT_SLUG || DEFAULT_TENANT_SLUG;

  const preferred = await db.query.tenants.findFirst({
    where: (fields: any, { eq }: any) => eq(fields.slug, preferredSlug),
  });

  if (preferred) {
    cachedTenant = {
      id: preferred.id,
      slug: preferred.slug,
      isReadOnly: Boolean((preferred as any).is_read_only),
      expiresAt: now + TENANT_CACHE_TTL_MS,
    };
    return cachedTenant;
  }

  const fallback = await db.query.tenants.findFirst({
    orderBy: (fields: any) => [asc(fields.created_at)],
  });

  if (fallback) {
    cachedTenant = {
      id: fallback.id,
      slug: fallback.slug,
      isReadOnly: Boolean((fallback as any).is_read_only),
      expiresAt: now + TENANT_CACHE_TTL_MS,
    };
    return cachedTenant;
  }

  cachedTenant = {
    id: DEFAULT_TENANT_ID,
    slug: DEFAULT_TENANT_SLUG,
    isReadOnly: false,
    expiresAt: now + TENANT_CACHE_TTL_MS,
  };

  return cachedTenant;
}

function headerValue(header: unknown): string | null {
  if (typeof header === 'string') {
    const trimmed = header.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(header) && header.length > 0) {
    const first = header[0];
    return typeof first === 'string' ? headerValue(first) : null;
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function tenantSlugMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const overrideTenantId = headerValue((req as any)?.headers?.['x-tenant-id']);
    const overrideTenantSlug = headerValue((req as any)?.headers?.['x-tenant-slug']);

    if (overrideTenantId || overrideTenantSlug) {
      if (overrideTenantId && !isUuid(overrideTenantId)) {
        res.status(400).json({ success: false, error: 'Invalid x-tenant-id' });
        return;
      }

      const tenant = overrideTenantId
        ? await db.query.tenants.findFirst({
            where: (fields: any, { eq }: any) => eq(fields.id, overrideTenantId),
          })
        : await db.query.tenants.findFirst({
            where: (fields: any, { eq }: any) => eq(fields.slug, overrideTenantSlug),
          });

      if (!tenant) {
        res.status(404).json({ success: false, error: 'Tenant not found' });
        return;
      }

      req.tenantId = tenant.id;
      req.tenantSlug = tenant.slug;
      req.tenantIsReadOnly = Boolean((tenant as any).is_read_only);
      next();
      return;
    }

    const resolved = await resolveTenant();
    req.tenantId = resolved.id;
    req.tenantSlug = resolved.slug;
    req.tenantIsReadOnly = Boolean(resolved.isReadOnly);
    next();
  } catch (error) {
    req.tenantId = DEFAULT_TENANT_ID;
    req.tenantSlug = DEFAULT_TENANT_SLUG;
    req.tenantIsReadOnly = false;
    // In single-tenant deployments we prefer a safe fallback over blocking the request.
    // Downstream handlers can still fail if the DB is unreachable, but the error
    // should come from the actual operation (auth/query) rather than tenant resolution.
    next();
  }
}
