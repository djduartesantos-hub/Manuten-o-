import { db } from '../config/database.js';
import { users, userPlants, plants } from '../db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth/jwt.js';

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
