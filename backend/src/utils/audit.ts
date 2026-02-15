import { AuthenticatedRequest } from '../types/index.js';

export function getClientIp(req: AuthenticatedRequest): string | null {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return forwarded || (req.ip ? String(req.ip) : null);
}

const normalizeValue = (value: any) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
};

export function buildAuditDiffFromPatch(params: {
  before: Record<string, any>;
  after: Record<string, any>;
  patch: Record<string, any>;
}) {
  const { before, after, patch } = params;
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  for (const key of Object.keys(patch || {})) {
    const prev = before?.[key];
    const next = after?.[key];
    if (normalizeValue(prev) === normalizeValue(next)) {
      continue;
    }
    oldValues[key] = prev ?? null;
    newValues[key] = next ?? null;
  }

  return { oldValues, newValues };
}
