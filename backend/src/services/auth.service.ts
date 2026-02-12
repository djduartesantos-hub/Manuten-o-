import { db } from '../config/database.js';
import { tenants, users, userPlants, plants } from '../db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth/jwt.js';

export class AuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type TenantPasswordPolicy = {
  minLength: number;
  expirationDays: number | null;
  maxFailedAttempts: number;
  lockoutMinutes: number;
};

export class AuthService {
  private static sessionVersionCache = new Map<
    string,
    { sessionVersion: number; isActive: boolean; tenantId: string; expiresAt: number }
  >();

  private static getSessionCacheKey(userId: string): string {
    return String(userId);
  }

  static invalidateSessionCache(userId: string): void {
    AuthService.sessionVersionCache.delete(AuthService.getSessionCacheKey(userId));
  }

  static async getUserSessionState(userId: string): Promise<
    { sessionVersion: number; isActive: boolean; tenantId: string } | null
  > {
    const cacheMs = Number(process.env.AUTH_SESSION_CACHE_MS || 5_000);
    const key = AuthService.getSessionCacheKey(userId);
    const cached = AuthService.sessionVersionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        sessionVersion: cached.sessionVersion,
        isActive: cached.isActive,
        tenantId: cached.tenantId,
      };
    }

    const row = await db.query.users.findFirst({
      where: (fields: any) => eq(fields.id, userId),
      columns: {
        tenant_id: true,
        is_active: true,
        session_version: true,
      } as any,
    });

    if (!row) {
      AuthService.sessionVersionCache.delete(key);
      return null;
    }

    const sessionVersion = Number((row as any).session_version ?? 0);
    const isActive = Boolean((row as any).is_active);
    const tenantId = String((row as any).tenant_id);

    AuthService.sessionVersionCache.set(key, {
      sessionVersion,
      isActive,
      tenantId,
      expiresAt: Date.now() + cacheMs,
    });

    return { sessionVersion, isActive, tenantId };
  }

  static async bumpUserSessionVersion(params: { tenantId: string; userId: string }): Promise<number> {
    const { tenantId, userId } = params;

    const result = await db.execute(sql`
      UPDATE users
      SET session_version = COALESCE(session_version, 0) + 1,
          updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${userId}
      RETURNING session_version;
    `);

    AuthService.invalidateSessionCache(userId);

    const newVersion = Number((result as any)?.rows?.[0]?.session_version ?? NaN);
    if (Number.isNaN(newVersion)) {
      // Fallback: re-read
      const state = await AuthService.getUserSessionState(userId);
      return Number(state?.sessionVersion ?? 0);
    }

    return newVersion;
  }

  private static normalizeRole(role: string) {
    const roleAliases: Record<string, string> = {
      admin: 'admin_empresa',
      maintenance_manager: 'gestor_manutencao',
      planner: 'gestor_manutencao',
      technician: 'tecnico',
      operator: 'operador',
    };

    return roleAliases[role] || role;
  }

  private static tenantPolicyCache = new Map<string, { policy: TenantPasswordPolicy; expiresAt: number }>();

  private static async getTenantPasswordPolicy(tenantId: string): Promise<TenantPasswordPolicy> {
    const cacheMs = Number(process.env.AUTH_TENANT_POLICY_CACHE_MS || 60_000);
    const cached = AuthService.tenantPolicyCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.policy;
    }

    const row = await db.query.tenants.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.id, tenantId),
      columns: {
        password_min_length: true,
        password_expiration_days: true,
        password_max_failed_attempts: true,
        password_lockout_minutes: true,
      } as any,
    });

    const policy: TenantPasswordPolicy = {
      minLength: Math.max(6, Math.min(64, Number((row as any)?.password_min_length ?? 10) || 10)),
      expirationDays:
        (row as any)?.password_expiration_days == null
          ? null
          : Math.max(1, Math.min(3650, Number((row as any).password_expiration_days) || 0)) || null,
      maxFailedAttempts: Math.max(0, Math.min(50, Number((row as any)?.password_max_failed_attempts ?? 10) || 10)),
      lockoutMinutes: Math.max(0, Math.min(24 * 60, Number((row as any)?.password_lockout_minutes ?? 15) || 15)),
    };

    AuthService.tenantPolicyCache.set(tenantId, { policy, expiresAt: Date.now() + cacheMs });
    return policy;
  }
  static async findUserByUsername(tenantId: string, username: string) {
    const normalized = username.trim().toLowerCase();
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.tenant_id, tenantId),
          sql`lower(${users.username}) = ${normalized}`,
        ),
      )
      .limit(1);

    return result[0];
  }

  static async findUserByEmail(tenantId: string, email: string) {
    const normalized = email.trim().toLowerCase();
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.tenant_id, tenantId),
          sql`lower(${users.email}) = ${normalized}`,
        ),
      )
      .limit(1);

    return result[0];
  }

  static async findUserById(userId: string) {
    const user = await db.query.users.findFirst({
      where: (fields: any) => eq(fields.id, userId),
    });
    return user;
  }


  /**
   * Get user's plant IDs - loads from user_plants relationship or all plants for admin roles
   */
  static async getUserPlantIds(userId: string, tenantId: string, role: string): Promise<string[]> {
    try {
      const normalizedRole = this.normalizeRole(role);

      // Admin empresa and super admin can access all plants in their tenant
      if (normalizedRole === 'admin_empresa' || normalizedRole === 'superadmin') {
        const allPlants = await db.query.plants.findMany({
          where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
        });
        return allPlants.map(p => p.id);
      }

      // Other roles: get plants from user_plants relationship
      const userPlantsData = await db.query.userPlants.findMany({
        where: (fields: any, { eq }: any) => eq(fields.user_id, userId),
      });

      return userPlantsData.map(up => up.plant_id);
    } catch (error) {
      console.error('Error loading user plant IDs:', error);
      return [];
    }
  }

  static async validateCredentials(
    tenantId: string,
    username: string,
    password: string,
  ) {
    // Accept either username or email in the same field.
    // Frontend labels it as username, but users often try their email.
    const user =
      (await this.findUserByUsername(tenantId, username)) ||
      (await this.findUserByEmail(tenantId, username));

    if (!user || !user.is_active) {
      return null;
    }

    const policy = await AuthService.getTenantPasswordPolicy(tenantId);

    const lockedUntil = (user as any).locked_until ? new Date((user as any).locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      throw new AuthError('ACCOUNT_LOCKED', 'Conta temporariamente bloqueada');
    }

    const isPasswordValid = await comparePasswords(password, user.password_hash);

    if (!isPasswordValid) {
      const maxFailed = Number(policy.maxFailedAttempts ?? 0);
      const lockoutMinutes = Number(policy.lockoutMinutes ?? 0);
      const currentAttempts = Number((user as any).failed_login_attempts ?? 0);
      const nextAttempts = currentAttempts + 1;

      if (maxFailed > 0) {
        if (nextAttempts >= maxFailed && lockoutMinutes > 0) {
          const until = new Date(Date.now() + lockoutMinutes * 60_000);
          await db
            .update(users)
            .set({
              failed_login_attempts: 0,
              locked_until: until,
              updated_at: new Date(),
            } as any)
            .where(and(eq(users.tenant_id, tenantId), eq(users.id, user.id)));

          throw new AuthError('ACCOUNT_LOCKED', 'Conta temporariamente bloqueada');
        }

        await db
          .update(users)
          .set({ failed_login_attempts: nextAttempts, updated_at: new Date() } as any)
          .where(and(eq(users.tenant_id, tenantId), eq(users.id, user.id)));
      }

      return null;
    }

    const expirationDays = policy.expirationDays;
    if (expirationDays && expirationDays > 0) {
      const changedAt = (user as any).password_changed_at ? new Date((user as any).password_changed_at) : null;
      if (changedAt) {
        const ageMs = Date.now() - changedAt.getTime();
        const maxAgeMs = expirationDays * 24 * 60 * 60_000;
        if (ageMs > maxAgeMs) {
          throw new AuthError('PASSWORD_EXPIRED', 'Password expirada');
        }
      }
    }

    // Success: reset counters + track last login
    await db
      .update(users)
      .set({
        failed_login_attempts: 0,
        locked_until: null,
        last_login: new Date(),
        updated_at: new Date(),
      } as any)
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, user.id)));

    // In single-tenant mode, skip plantIds loading
    // All authenticated users can access all plants
    return user;
  }

  static async createUser(data: {
    tenant_id: string;
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string;
  }) {
    const normalizedUsername = data.username.trim().toLowerCase();
    const normalizedEmail = data.email.trim().toLowerCase();
    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        tenant_id: data.tenant_id,
        username: normalizedUsername,
        email: normalizedEmail,
        password_hash: passwordHash,
        password_changed_at: new Date(),
        failed_login_attempts: 0,
        locked_until: null,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        phone: data.phone,
      })
      .returning();

    return user;
  }
}
