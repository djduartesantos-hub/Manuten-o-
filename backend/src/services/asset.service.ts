import { db } from '../config/database';
import { assets } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CreateAssetInput, UpdateAssetInput } from '../schemas/validation';

export class AssetService {
  /**
   * Obter todos os equipamentos de uma planta
   */
  static async getPlantAssets(tenantId: string, plantId: string) {
    return db.query.assets.findMany({
      where: (fields: any, { eq, and }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.plant_id, plantId),
        ),
      with: {
        category: true,
        workOrders: {
          limit: 5,
          orderBy: (fields: any) => [desc(fields.created_at)],
        },
      },
      orderBy: (fields: any) => [desc(fields.created_at)],
      limit: 100,
    });
  }

  /**
   * Obter equipamento por ID
   */
  static async getAssetById(tenantId: string, assetId: string) {
    return db.query.assets.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.id, assetId),
        ),
      with: {
        category: true,
        workOrders: {
          orderBy: (fields: any) => [desc(fields.created_at)],
        },
        meterReadings: {
          limit: 10,
          orderBy: (fields: any) => [desc(fields.reading_date)],
        },
        maintenancePlans: {
          where: (fields: any, { eq }: any) => eq(fields.is_active, true),
        },
      },
    });
  }

  /**
   * Criar novo equipamento
   */
  static async createAsset(
    tenantId: string,
    plantId: string,
    data: CreateAssetInput,
  ) {
    // Validar que a categoria pertence ao mesmo tenant
    const category = await db.query.assetCategories.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(
          eq(fields.id, data.category_id),
          eq(fields.tenant_id, tenantId),
        ),
    });

    if (!category) {
      throw new Error('Categoria não encontrada ou não pertence a sua empresa');
    }

    const [asset] = await db
      .insert(assets)
      .values({
        tenant_id: tenantId,
        plant_id: plantId,
        ...data,
        acquisition_date: data.acquisition_date ? new Date(data.acquisition_date) : undefined,
      })
      .returning();

    return asset;
  }

  /**
   * Atualizar equipamento
   */
  static async updateAsset(
    tenantId: string,
    assetId: string,
    data: UpdateAssetInput,
  ) {
    // Validar que o equipamento pertence ao tenant
    const asset = await db.query.assets.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(
          eq(fields.id, assetId),
          eq(fields.tenant_id, tenantId),
        ),
    });

    if (!asset) {
      throw new Error('Equipamento não encontrado');
    }

    // Se mudar categoria, validar que pertence ao tenant
    if (data.category_id) {
      const category = await db.query.assetCategories.findFirst({
        where: (fields: any, { eq, and }: any) =>
          and(
            eq(fields.id, data.category_id),
            eq(fields.tenant_id, tenantId),
          ),
      });

      if (!category) {
        throw new Error('Categoria não encontrada');
      }
    }

    const [updated] = await db
      .update(assets)
      .set({
        ...data,
        acquisition_date: data.acquisition_date ? new Date(data.acquisition_date) : undefined,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(assets.tenant_id, tenantId),
          eq(assets.id, assetId),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Eliminar equipamento (soft delete)
   */
  static async deleteAsset(tenantId: string, assetId: string) {
    const [deleted] = await db
      .update(assets)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(assets.tenant_id, tenantId),
          eq(assets.id, assetId),
        ),
      )
      .returning();

    return deleted;
  }

  /**
   * Pesquisar equipamentos por código ou nome
   */
  static async searchAssets(
    tenantId: string,
    plantId: string,
    query: string,
  ) {
    return db.query.assets.findMany({
      where: (fields: any, { eq, and, like }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.plant_id, plantId),
          like(fields.name, `%${query}%`),
        ),
      with: {
        category: true,
      },
      limit: 20,
    });
  }

  /**
   * Obter equipamentos por categoria
   */
  static async getAssetsByCategory(
    tenantId: string,
    plantId: string,
    categoryId: string,
  ) {
    return db.query.assets.findMany({
      where: (fields: any, { eq, and }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.plant_id, plantId),
          eq(fields.category_id, categoryId),
        ),
      with: {
        category: true,
      },
      orderBy: (fields: any) => [desc(fields.created_at)],
    });
  }

  /**
   * Obter equipamentos que precisam de manutenção
   */
  static async getAssetsDueForMaintenance(
    tenantId: string,
    plantId: string,
  ) {
    const now = new Date();

    return db.query.assets.findMany({
      where: (fields: any, { eq, and }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.plant_id, plantId),
        ),
      with: {
        category: true,
        maintenancePlans: {
          where: (fields: any, { eq, lt }: any) =>
            and(
              eq(fields.is_active, true),
              lt(fields.next_maintenance_date, now),
            ),
        },
      },
    });
  }
}
