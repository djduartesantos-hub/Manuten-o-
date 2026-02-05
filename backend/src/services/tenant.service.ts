import { db } from '../config/database.js';
import { plants, workOrders } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export class TenantService {
  static async getUserPlants(userId: string, tenantId: string) {
    const userPlants = await db.query.userPlants.findMany({
      where: (fields: any, { eq }: any) => eq(fields.user_id, userId),
      with: {
        plant: true,
      }
    });

    if (userPlants.length === 0) return [];

    // Extract plant IDs and filter by tenant
    const plants = userPlants
      .map((up: any) => up.plant)
      .filter((plant: any) => plant && plant.tenant_id === tenantId);

    return plants;
  }

  static async getPlantById(tenantId: string, plantId: string) {
    return db.query.plants.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, plantId)),
    });
  }

  static async getPlantAssets(tenantId: string, plantId: string) {
    return db.query.assets.findMany({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.plant_id, plantId)),
      with: {
        category: true,
      },
    });
  }

  static async getPlantWorkOrders(tenantId: string, plantId: string, status?: string) {
    const whereConditions: any[] = [
      eq(plants.tenant_id, tenantId),
      eq(plants.id, plantId),
    ];

    if (status) {
      whereConditions.push(eq(workOrders.status, status as any));
    }

    return db.query.workOrders.findMany({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.plant_id, plantId)),
      with: {
        asset: true,
        assignedUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
  }
}
