import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { SecurityPolicyService } from '../services/security-policy.service.js';
import { AuditService } from '../services/audit.service.js';

export async function getTenantSecurityPolicy(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const tenantId = String(req.tenantId || '').trim();
  if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });

  const policy = await SecurityPolicyService.getTenantPolicy(tenantId);
  return res.json({ success: true, data: policy });
}

export async function updateTenantSecurityPolicy(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const tenantId = String(req.tenantId || '').trim();
  const actorUserId = req.user?.userId ? String(req.user.userId) : null;

  if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID is required' });

  const body = req.body || {};

  const before = await SecurityPolicyService.getTenantPolicy(tenantId);

  await SecurityPolicyService.upsertTenantPolicy({
    tenantId,
    actorUserId,
    patch: {
      password_min_length: body.password_min_length,
      password_require_lower: body.password_require_lower,
      password_require_upper: body.password_require_upper,
      password_require_digit: body.password_require_digit,
      password_require_special: body.password_require_special,
      max_failed_logins: body.max_failed_logins,
      failed_login_window_minutes: body.failed_login_window_minutes,
      lockout_minutes: body.lockout_minutes,
    },
  });

  const updated = await SecurityPolicyService.getTenantPolicy(tenantId);

  // Best-effort audit log (do not block policy updates if audit table is missing).
  if (actorUserId) {
    try {
      const ipAddress =
        (String(req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() ||
        (req.ip ? String(req.ip) : null);

      await AuditService.createLog({
        tenant_id: tenantId,
        user_id: actorUserId,
        action: 'update_security_policy',
        entity_type: 'tenant_security_policy',
        entity_id: tenantId,
        old_values: before as any,
        new_values: updated as any,
        ip_address: ipAddress,
      });
    } catch {
      // ignore
    }
  }

  return res.json({ success: true, data: updated });
}
