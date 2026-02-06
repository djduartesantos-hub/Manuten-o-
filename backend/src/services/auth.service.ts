import { db } from '../config/database.js';
import { users, userPlants, plants, tenants } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth/jwt.js';

export class AuthService {
  private static normalizeRole(role: string) {
    const roleAliases: Record<string, string> = {
      admin: 'admin_empresa',
      maintenance_manager: 'gestor_manutencao',
      planner: 'gestor_manutencao',
      technician: 'tecnico',
    };

    return roleAliases[role] || role;
  }
  static async findUserByEmail(tenantId: string, email: string) {
    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.email, email)),
    });
    return user;
  }

  static async findTenantBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return null;

    const tenant = await db.query.tenants.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.slug, normalizedSlug),
    });

    if (!tenant || tenant.deleted_at || tenant.is_active === false) {
      return null;
    }

    return tenant;
  }

  static async findUserById(userId: string) {
    const user = await db.query.users.findFirst({
      where: (fields: any) => eq(fields.id, userId),
    });
    return user;
  }

  static async findTenantsByEmail(email: string) {
    const normalized = email.trim().toLowerCase();

    const rows = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenant_id, tenants.id))
      .where(eq(users.email, normalized));

    const unique = new Map<string, { id: string; slug: string; name: string }>();
    for (const row of rows) {
      if (!unique.has(row.slug)) {
        unique.set(row.slug, row);
      }
    }

    return Array.from(unique.values());
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
    email: string,
    password: string,
  ) {
    const user = await this.findUserByEmail(tenantId, email);

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
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string;
  }) {
    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        ...data,
        password_hash: passwordHash,
      })
      .returning();

    return user;
  }
}
