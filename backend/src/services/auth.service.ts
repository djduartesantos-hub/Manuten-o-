import { db } from '../config/database.js';
import { users, userPlants, plants } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth/jwt.js';

export class AuthService {
  static async findUserByEmail(tenantId: string, email: string) {
    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.email, email)),
    });
    return user;
  }

  static async findTenantBySlug(_slug: string) {
    // Removed tenant lookup - using default tenant
    return null;
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
      // Admin empresa and super admin can access all plants in their tenant
      if (role === 'admin_empresa' || role === 'superadmin') {
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

    // Load plant IDs for this user
    const plantIds = await this.getUserPlantIds(user.id, tenantId, user.role);

    // Add plantIds to the user object
    return {
      ...user,
      plantIds,
    };
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
