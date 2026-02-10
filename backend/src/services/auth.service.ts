import { db } from '../config/database.js';
import { users, userPlants, plants } from '../db/schema.js';
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
  static async findUserByUsername(tenantId: string, username: string) {
    const normalized = username.trim().toLowerCase();
    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.username, normalized)),
    });
    return user;
  }

  static async findUserByEmail(tenantId: string, email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.email, normalized)),
    });
    return user;
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
    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        tenant_id: data.tenant_id,
        username: normalizedUsername,
        email: data.email,
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
