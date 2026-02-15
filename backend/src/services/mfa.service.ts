import { authenticator } from 'otplib';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { userMfaTotp } from '../db/schema.js';

const MFA_ISSUER = 'Manuten-o';

function normalizeCode(value: unknown): string {
  return String(value || '').replace(/\s+/g, '');
}

function isValidCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

authenticator.options = {
  window: 1,
};

export class MfaService {
  static async getTotpRecord(input: { tenantId: string; userId: string }) {
    return db.query.userMfaTotp.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, input.tenantId), ops.eq(fields.user_id, input.userId)),
    });
  }

  static async getTotpStatus(input: { tenantId: string; userId: string }) {
    const record = await this.getTotpRecord(input);
    if (!record) {
      return { enabled: false, verifiedAt: null, lastUsedAt: null };
    }
    return {
      enabled: Boolean((record as any).is_enabled),
      verifiedAt: (record as any).verified_at ?? null,
      lastUsedAt: (record as any).last_used_at ?? null,
    };
  }

  static async startTotpSetup(input: { tenantId: string; userId: string; label: string }) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(input.label, MFA_ISSUER, secret);

    await db.execute(sql`
      INSERT INTO user_mfa_totp (
        tenant_id,
        user_id,
        secret,
        is_enabled,
        verified_at,
        last_used_at,
        created_at,
        updated_at
      ) VALUES (
        ${input.tenantId},
        ${input.userId},
        ${secret},
        FALSE,
        NULL,
        NULL,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        secret = EXCLUDED.secret,
        is_enabled = FALSE,
        verified_at = NULL,
        last_used_at = NULL,
        updated_at = NOW();
    `);

    return {
      secret,
      otpauthUrl,
      issuer: MFA_ISSUER,
      label: input.label,
    };
  }

  static async verifyTotpSetup(input: { tenantId: string; userId: string; code: string }) {
    const record = await this.getTotpRecord(input);
    if (!record) return false;

    const secret = String((record as any).secret || '').trim();
    const code = normalizeCode(input.code);
    if (!secret || !isValidCode(code)) return false;

    const valid = authenticator.check(code, secret);
    if (!valid) return false;

    await db
      .update(userMfaTotp)
      .set({
        is_enabled: true,
        verified_at: new Date(),
        last_used_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(userMfaTotp.tenant_id, input.tenantId), eq(userMfaTotp.user_id, input.userId)));

    return true;
  }

  static async verifyTotpForLogin(input: { tenantId: string; userId: string; code: string }) {
    const record = await this.getTotpRecord(input);
    if (!record || !(record as any).is_enabled) return false;

    const secret = String((record as any).secret || '').trim();
    const code = normalizeCode(input.code);
    if (!secret || !isValidCode(code)) return false;

    const valid = authenticator.check(code, secret);
    if (!valid) return false;

    await db
      .update(userMfaTotp)
      .set({ last_used_at: new Date(), updated_at: new Date() })
      .where(and(eq(userMfaTotp.tenant_id, input.tenantId), eq(userMfaTotp.user_id, input.userId)));

    return true;
  }

  static async disableTotp(input: { tenantId: string; userId: string }) {
    await db
      .delete(userMfaTotp)
      .where(and(eq(userMfaTotp.tenant_id, input.tenantId), eq(userMfaTotp.user_id, input.userId)));
  }
}
