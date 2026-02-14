import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

export type TenantSecurityPolicy = {
  passwordMinLength: number;
  passwordRequireLower: boolean;
  passwordRequireUpper: boolean;
  passwordRequireDigit: boolean;
  passwordRequireSpecial: boolean;

  maxFailedLogins: number;
  failedLoginWindowMinutes: number;
  lockoutMinutes: number;
};

const DEFAULT_POLICY: TenantSecurityPolicy = {
  passwordMinLength: 8,
  passwordRequireLower: true,
  passwordRequireUpper: false,
  passwordRequireDigit: true,
  passwordRequireSpecial: false,

  maxFailedLogins: 8,
  failedLoginWindowMinutes: 10,
  lockoutMinutes: 15,
};

function normalizeInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export class SecurityPolicyService {
  static getDefaults(): TenantSecurityPolicy {
    return { ...DEFAULT_POLICY };
  }

  static async getTenantPolicy(tenantId: string): Promise<TenantSecurityPolicy> {
    if (!tenantId) return this.getDefaults();

    try {
      const row = await db.query.tenantSecurityPolicies.findFirst({
        where: (fields: any, ops: any) => ops.eq(fields.tenant_id, tenantId),
      });

      if (!row) return this.getDefaults();

      return {
        passwordMinLength: normalizeInt((row as any).password_min_length, DEFAULT_POLICY.passwordMinLength),
        passwordRequireLower: Boolean((row as any).password_require_lower),
        passwordRequireUpper: Boolean((row as any).password_require_upper),
        passwordRequireDigit: Boolean((row as any).password_require_digit),
        passwordRequireSpecial: Boolean((row as any).password_require_special),

        maxFailedLogins: normalizeInt((row as any).max_failed_logins, DEFAULT_POLICY.maxFailedLogins),
        failedLoginWindowMinutes: normalizeInt(
          (row as any).failed_login_window_minutes,
          DEFAULT_POLICY.failedLoginWindowMinutes,
        ),
        lockoutMinutes: normalizeInt((row as any).lockout_minutes, DEFAULT_POLICY.lockoutMinutes),
      };
    } catch {
      // Fail-open during bootstrap.
      return this.getDefaults();
    }
  }

  static validatePassword(password: string, policy: TenantSecurityPolicy): string | null {
    const p = String(password || '');
    if (p.length < policy.passwordMinLength) {
      return `Password deve ter pelo menos ${policy.passwordMinLength} caracteres`;
    }

    if (policy.passwordRequireLower && !/[a-z]/.test(p)) return 'Password deve conter pelo menos uma letra minúscula';
    if (policy.passwordRequireUpper && !/[A-Z]/.test(p)) return 'Password deve conter pelo menos uma letra maiúscula';
    if (policy.passwordRequireDigit && !/[0-9]/.test(p)) return 'Password deve conter pelo menos um dígito';
    if (policy.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(p)) return 'Password deve conter pelo menos um caracter especial';

    return null;
  }

  static async upsertTenantPolicy(input: {
    tenantId: string;
    patch: Partial<{
      password_min_length: number;
      password_require_lower: boolean;
      password_require_upper: boolean;
      password_require_digit: boolean;
      password_require_special: boolean;
      max_failed_logins: number;
      failed_login_window_minutes: number;
      lockout_minutes: number;
    }>;
    actorUserId?: string | null;
  }): Promise<void> {
    const tenantId = String(input.tenantId || '').trim();
    if (!tenantId) return;

    const patch = input.patch || {};

    // Merge strategy: defaults -> existing (if any) -> patch.
    // This ensures PATCH semantics while still allowing first-time insert.
    let existing: any | null = null;
    try {
      existing = await db.query.tenantSecurityPolicies.findFirst({
        where: (fields: any, ops: any) => ops.eq(fields.tenant_id, tenantId),
      });
    } catch {
      existing = null;
    }

    const nextValues = {
      password_min_length:
        patch.password_min_length ?? existing?.password_min_length ?? DEFAULT_POLICY.passwordMinLength,
      password_require_lower:
        patch.password_require_lower ?? existing?.password_require_lower ?? DEFAULT_POLICY.passwordRequireLower,
      password_require_upper:
        patch.password_require_upper ?? existing?.password_require_upper ?? DEFAULT_POLICY.passwordRequireUpper,
      password_require_digit:
        patch.password_require_digit ?? existing?.password_require_digit ?? DEFAULT_POLICY.passwordRequireDigit,
      password_require_special:
        patch.password_require_special ?? existing?.password_require_special ?? DEFAULT_POLICY.passwordRequireSpecial,
      max_failed_logins:
        patch.max_failed_logins ?? existing?.max_failed_logins ?? DEFAULT_POLICY.maxFailedLogins,
      failed_login_window_minutes:
        patch.failed_login_window_minutes ??
        existing?.failed_login_window_minutes ??
        DEFAULT_POLICY.failedLoginWindowMinutes,
      lockout_minutes: patch.lockout_minutes ?? existing?.lockout_minutes ?? DEFAULT_POLICY.lockoutMinutes,
    };

    // Use SQL upsert for compatibility.
    await db.execute(sql`
      INSERT INTO tenant_security_policies (
        tenant_id,
        password_min_length,
        password_require_lower,
        password_require_upper,
        password_require_digit,
        password_require_special,
        max_failed_logins,
        failed_login_window_minutes,
        lockout_minutes,
        updated_at,
        updated_by
      ) VALUES (
        ${tenantId},
        ${nextValues.password_min_length},
        ${nextValues.password_require_lower},
        ${nextValues.password_require_upper},
        ${nextValues.password_require_digit},
        ${nextValues.password_require_special},
        ${nextValues.max_failed_logins},
        ${nextValues.failed_login_window_minutes},
        ${nextValues.lockout_minutes},
        NOW(),
        ${input.actorUserId ?? null}
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        password_min_length = EXCLUDED.password_min_length,
        password_require_lower = EXCLUDED.password_require_lower,
        password_require_upper = EXCLUDED.password_require_upper,
        password_require_digit = EXCLUDED.password_require_digit,
        password_require_special = EXCLUDED.password_require_special,
        max_failed_logins = EXCLUDED.max_failed_logins,
        failed_login_window_minutes = EXCLUDED.failed_login_window_minutes,
        lockout_minutes = EXCLUDED.lockout_minutes,
        updated_at = NOW(),
        updated_by = ${input.actorUserId ?? null};
    `);
  }

  static async getLoginLockoutStatus(input: {
    tenantId: string;
    username: string;
    policy: TenantSecurityPolicy;
  }): Promise<{ locked: boolean; retryAfterSeconds: number; failures: number }> {
    const tenantId = String(input.tenantId || '').trim();
    const username = String(input.username || '').trim().toLowerCase();
    const policy = input.policy;

    if (!tenantId || !username) return { locked: false, retryAfterSeconds: 0, failures: 0 };
    if (policy.maxFailedLogins <= 0 || policy.lockoutMinutes <= 0 || policy.failedLoginWindowMinutes <= 0) {
      return { locked: false, retryAfterSeconds: 0, failures: 0 };
    }

    try {
      const windowMinutes = Math.min(Math.max(policy.failedLoginWindowMinutes, 1), 240);
      const lockoutMinutes = Math.min(Math.max(policy.lockoutMinutes, 1), 24 * 60);

      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int AS failures,
          MAX(created_at) AS last_failure_at
        FROM auth_login_events
        WHERE tenant_id = ${tenantId}
          AND success = false
          AND lower(username) = ${username}
          AND created_at >= (NOW() - (${windowMinutes} || ' minutes')::interval);
      `);

      const failures = Number((result.rows as any)?.[0]?.failures ?? 0);
      const lastFailureAtRaw = (result.rows as any)?.[0]?.last_failure_at ?? null;
      const lastFailureAt = lastFailureAtRaw ? new Date(String(lastFailureAtRaw)) : null;

      if (!Number.isFinite(failures) || failures < policy.maxFailedLogins || !lastFailureAt) {
        return { locked: false, retryAfterSeconds: 0, failures: Number.isFinite(failures) ? failures : 0 };
      }

      const ageSeconds = Math.max(0, Math.floor((Date.now() - lastFailureAt.getTime()) / 1000));
      const lockoutSeconds = lockoutMinutes * 60;
      if (ageSeconds >= lockoutSeconds) {
        return { locked: false, retryAfterSeconds: 0, failures };
      }

      return { locked: true, retryAfterSeconds: Math.max(1, lockoutSeconds - ageSeconds), failures };
    } catch {
      // Fail-open to avoid locking out traffic during bootstrap.
      return { locked: false, retryAfterSeconds: 0, failures: 0 };
    }
  }
}
