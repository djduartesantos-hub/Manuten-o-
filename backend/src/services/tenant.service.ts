import { db } from '../config/database';
import { plants, workOrders } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class TenantService {
  static async getUserPlants(userId: string, tenantId: string) {
    const userPlants = await db.query.userPlants.findMany({
      where: (fields: any, { eq }: any) => eq(fields.user_id, userId),
    });

    const plantIds = userPlants.map((up: any) => up.plant_id);

    if (plantIds.length === 0) return [];

    return db.query.plants.findMany({
      where: (fields: any, { inArray, eq }: any) =>
        and(eq(fields.tenant_id, tenantId), inArray(fields.id, plantIds)),
    });
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
      whereConditions.push(eq(workOrders.status, status));
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
