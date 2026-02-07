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
      expiresAt: now + TENANT_CACHE_TTL_MS,
    };
    return cachedTenant;
  }

  cachedTenant = {
    id: DEFAULT_TENANT_ID,
    slug: DEFAULT_TENANT_SLUG,
    expiresAt: now + TENANT_CACHE_TTL_MS,
  };

  return cachedTenant;
}

export async function tenantSlugMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resolved = await resolveTenant();
    req.tenantId = resolved.id;
    req.tenantSlug = resolved.slug;
    next();
  } catch (error) {
    req.tenantId = DEFAULT_TENANT_ID;
    req.tenantSlug = DEFAULT_TENANT_SLUG;
    res.status(500).json({
      success: false,
      error: 'Failed to resolve tenant',
    });
  }
}
