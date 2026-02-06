// @ts-nocheck
import { db } from '../config/database.js';
import { assets } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { CreateAssetInput, UpdateAssetInput } from '../schemas/validation.js';
import { RedisService, CacheKeys, CacheTTL } from './redis.service.js';
import { logger } from '../config/logger.js';
import { ElasticsearchService } from './elasticsearch.service.js';

export class AssetService {
  /**
   * Obter todos os equipamentos de uma planta
   */
  static async getPlantAssets(tenantId: string, plantId: string) {
    try {
      // Try cache first
      const cacheKey = CacheKeys.assetsList(tenantId, plantId);
      const cached = await RedisService.getJSON(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for assets list: ${cacheKey}`);
        return cached;
      }
    } catch (cacheError) {
      logger.warn('Cache read error, continuing with DB query:', cacheError);
    }

    const assets = await db.query.assets.findMany({
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

    // Cache result
    try {
      const cacheKey = CacheKeys.assetsList(tenantId, plantId);
      await RedisService.setJSON(cacheKey, assets, CacheTTL.ASSETS);
    } catch (cacheError) {
      logger.warn('Cache write error:', cacheError);
    }

    return assets;
  }

  /**
   * Obter equipamento por ID
   */
  static async getAssetById(tenantId: string, assetId: string, plantId?: string) {
    try {
      // Try cache first
      const cacheKey = CacheKeys.asset(tenantId, assetId);
      const cached = await RedisService.getJSON(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for asset: ${cacheKey}`);
        return cached;
      }
    } catch (cacheError) {
      logger.warn('Cache read error, continuing with DB query:', cacheError);
    }

    const asset = await db.query.assets.findFirst({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [eq(fields.tenant_id, tenantId), eq(fields.id, assetId)];

        if (plantId) {
          conditions.push(eq(fields.plant_id, plantId));
        }

        return and(...conditions);
      },
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

    // Cache result
    if (asset) {
      try {
        const cacheKey = CacheKeys.asset(tenantId, assetId);
        await RedisService.setJSON(cacheKey, asset, CacheTTL.ASSETS);
      } catch (cacheError) {
        logger.warn('Cache write error:', cacheError);
      }
    }

    return asset;
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

    // Invalidate cache
    try {
      await RedisService.del(CacheKeys.assetsList(tenantId, plantId));
      logger.debug(`Cache invalidated for assets list: ${tenantId}`);
    } catch (cacheError) {
      logger.warn('Cache invalidation error:', cacheError);
    }

    // Index into Elasticsearch (best-effort)
    try {
      await ElasticsearchService.index('assets_v1', asset.id, {
        id: asset.id,
        tenant_id: tenantId,
        plant_id: asset.plant_id,
        name: asset.name,
        code: asset.code,
        category: asset.category_id,
        created_at: asset.created_at,
      });
    } catch (error) {
      logger.warn('Elasticsearch index error for asset:', error);
    }

    return asset;
  }

  /**
   * Atualizar equipamento
   */
  static async updateAsset(
    tenantId: string,
    assetId: string,
    data: UpdateAssetInput,
    plantId?: string,
  ) {
    // Validar que o equipamento pertence ao tenant
    const asset = await db.query.assets.findFirst({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [eq(fields.id, assetId), eq(fields.tenant_id, tenantId)];

        if (plantId) {
          conditions.push(eq(fields.plant_id, plantId));
        }

        return and(...conditions);
      },
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

    // Invalidate cache
    try {
      await RedisService.delMultiple([
        CacheKeys.asset(tenantId, assetId),
        CacheKeys.assetsList(tenantId, asset.plant_id),
      ]);
      logger.debug(`Cache invalidated for asset: ${assetId}`);
    } catch (cacheError) {
      logger.warn('Cache invalidation error:', cacheError);
    }

    // Index into Elasticsearch (best-effort)
    try {
      await ElasticsearchService.index('assets_v1', updated.id, {
        id: updated.id,
        tenant_id: tenantId,
        plant_id: updated.plant_id,
        name: updated.name,
        code: updated.code,
        category: updated.category_id,
        created_at: updated.created_at,
      });
    } catch (error) {
      logger.warn('Elasticsearch index error for asset:', error);
    }

    return updated;
  }

  /**
   * Eliminar equipamento (soft delete)
   */
  static async deleteAsset(tenantId: string, assetId: string, plantId?: string) {
    const existing = await db.query.assets.findFirst({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [eq(fields.tenant_id, tenantId), eq(fields.id, assetId)];

        if (plantId) {
          conditions.push(eq(fields.plant_id, plantId));
        }

        return and(...conditions);
      },
    });

    if (!existing) {
      throw new Error('Equipamento não encontrado');
    }

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
          ...(plantId ? [eq(assets.plant_id, plantId)] : []),
        ),
      )
      .returning();

    // Invalidate cache
    try {
      await RedisService.delMultiple([
        CacheKeys.asset(tenantId, assetId),
        CacheKeys.assetsList(tenantId, existing.plant_id),
      ]);
    } catch (cacheError) {
      logger.warn('Cache invalidation error:', cacheError);
    }

    // Remove from Elasticsearch (best-effort)
    try {
      await ElasticsearchService.delete('assets_v1', assetId);
    } catch (error) {
      logger.warn('Elasticsearch delete error for asset:', error);
    }

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
