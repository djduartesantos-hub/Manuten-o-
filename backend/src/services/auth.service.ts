import { db } from '../config/database.js';
import { authLoginEvents, authSessions, users, userPlants, plants } from '../db/schema.js';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth/jwt.js';
import crypto from 'node:crypto';

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
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

  static async recordLoginEvent(input: {
    tenantId: string;
    username: string;
    success: boolean;
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    error?: string | null;
  }): Promise<void> {
    try {
      await db.insert(authLoginEvents).values({
        tenant_id: input.tenantId,
        user_id: input.userId ?? null,
        username: input.username,
        success: input.success,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        error: input.error ?? null,
      });
    } catch {
      // Fail-open for older DBs during bootstrap (e.g. before Drizzle push)
    }
  }

  static async createSession(input: {
    sessionId: string;
    tenantId: string;
    userId: string;
    refreshToken?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      await db.insert(authSessions).values({
        id: input.sessionId,
        tenant_id: input.tenantId,
        user_id: input.userId,
        refresh_token_hash: input.refreshToken ? this.hashToken(input.refreshToken) : null,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        last_seen_at: new Date(),
      });
    } catch {
      // Fail-open for older DBs during bootstrap (e.g. before Drizzle push)
    }
  }

  static async rotateSessionRefreshToken(sessionId: string, refreshToken: string): Promise<void> {
    try {
      await db
        .update(authSessions)
        .set({
          refresh_token_hash: this.hashToken(refreshToken),
          last_seen_at: new Date(),
        })
        .where(eq(authSessions.id, sessionId));
    } catch {
      // ignore (bootstrap)
    }
  }

  static async isSessionActive(sessionId: string, userId?: string): Promise<boolean> {
    if (!sessionId || sessionId.trim() === '') return false;

    const conditions: any[] = [eq(authSessions.id, sessionId), isNull(authSessions.revoked_at)];
    if (userId) {
      conditions.push(eq(authSessions.user_id, userId));
    }

    try {
      const rows = await db
        .select({ id: authSessions.id })
        .from(authSessions)
        .where(and(...conditions))
        .limit(1);

      return rows.length > 0;
    } catch {
      // Fail-open to avoid locking out traffic during bootstrap.
      return true;
    }
  }

  static async isRefreshTokenValidForSession(sessionId: string, refreshToken: string): Promise<boolean> {
    if (!sessionId || sessionId.trim() === '') return false;
    if (!refreshToken || refreshToken.trim() === '') return false;

    const tokenHash = this.hashToken(refreshToken);

    try {
      const rows = await db
        .select({ id: authSessions.id })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.id, sessionId),
            isNull(authSessions.revoked_at),
            eq(authSessions.refresh_token_hash, tokenHash),
          ),
        )
        .limit(1);

      return rows.length > 0;
    } catch {
      // Fail-open during bootstrap.
      return true;
    }
  }

  static async revokeSession(sessionId: string, revokedByUserId?: string | null): Promise<boolean> {
    if (!sessionId || sessionId.trim() === '') return false;

    try {
      const updated = await db
        .update(authSessions)
        .set({
          revoked_at: new Date(),
          revoked_by: revokedByUserId ?? null,
        })
        .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revoked_at)))
        .returning({ id: authSessions.id });

      return updated.length > 0;
    } catch {
      return false;
    }
  }

  static async revokeAllSessionsForUser(tenantId: string, userId: string, revokedByUserId?: string | null): Promise<number> {
    try {
      const updated = await db
        .update(authSessions)
        .set({
          revoked_at: new Date(),
          revoked_by: revokedByUserId ?? null,
        })
        .where(
          and(
            eq(authSessions.tenant_id, tenantId),
            eq(authSessions.user_id, userId),
            isNull(authSessions.revoked_at),
          ),
        )
        .returning({ id: authSessions.id });

      return updated.length;
    } catch {
      return 0;
    }
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

    const isPasswordValid = await comparePasswords(password, user.password_hash);

    if (!isPasswordValid) {
      return null;
    }

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
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        phone: data.phone,
      })
      .returning();

    return user;
  }
}
