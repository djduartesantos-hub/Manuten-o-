import { db } from '../config/database.js';
import { plants, workOrders } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export class TenantService {
  static async getUserPlants(userId: string, tenantId: string) {
    try {
      console.log(`[getUserPlants] Fetching plants for user: ${userId}, tenant: ${tenantId}`);
      
      const userPlants = await db.query.userPlants.findMany({
        where: (fields: any, { eq }: any) => eq(fields.user_id, userId),
        with: {
          plant: true,
        }
      });

      console.log(`[getUserPlants] Found ${userPlants.length} user_plant records for user ${userId}`);
      
      if (userPlants.length === 0) {
        console.warn(`[getUserPlants] No user_plant records found for user ${userId}`);
        return [];
      }

      // Log each plant relationship
      userPlants.forEach((up: any, idx: number) => {
        console.log(`  [${idx}] user_plants.id=${up.id}, plant_id=${up.plant_id}, plant.id=${up.plant?.id}, plant.name=${up.plant?.name}, plant.tenant_id=${up.plant?.tenant_id}`);
      });

      // Extract plant IDs and filter by tenant
      const filteredPlants = userPlants
        .map((up: any) => up.plant)
        .filter((plant: any) => {
          const matches = plant && plant.tenant_id === tenantId;
          if (!matches) {
            console.warn(`[getUserPlants] Plant ${plant?.id} filtered out - tenant mismatch (expected: ${tenantId}, got: ${plant?.tenant_id})`);
          }
          return matches;
        });

      console.log(`[getUserPlants] Returning ${filteredPlants.length} plants for user ${userId} in tenant ${tenantId}`);
      return filteredPlants;
    } catch (error) {
      console.error('[getUserPlants] Error:', error);
      throw error;
    }
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
