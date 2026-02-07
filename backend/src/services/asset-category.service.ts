import { db } from '../config/database.js';
import { assetCategories } from '../db/schema.js';
import { and, asc, eq } from 'drizzle-orm';
import {
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
} from '../schemas/validation.js';

export class AssetCategoryService {
  async getCategories(tenantId: string) {
    return db
      .select({
        id: assetCategories.id,
        tenant_id: assetCategories.tenant_id,
        name: assetCategories.name,
        description: assetCategories.description,
        created_at: assetCategories.created_at,
        updated_at: assetCategories.updated_at,
      })
      .from(assetCategories)
      .where(eq(assetCategories.tenant_id, tenantId))
      .orderBy(asc(assetCategories.name));
  }

  async createCategory(tenantId: string, input: CreateAssetCategoryInput) {
    const [category] = await db
      .insert(assetCategories)
      .values({
        tenant_id: tenantId,
        name: input.name,
        description: input.description,
      })
      .returning();

    return category;
  }

  async updateCategory(
    tenantId: string,
    categoryId: string,
    input: UpdateAssetCategoryInput,
  ) {
    const existing = await db
      .select({
        id: assetCategories.id,
        name: assetCategories.name,
        description: assetCategories.description,
      })
      .from(assetCategories)
      .where(
        and(eq(assetCategories.tenant_id, tenantId), eq(assetCategories.id, categoryId)),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Categoria nao encontrada');
    }

    const [updated] = await db
      .update(assetCategories)
      .set({
        name: input.name ?? existing[0].name,
        description: input.description ?? existing[0].description,
        updated_at: new Date(),
      })
      .where(
        and(eq(assetCategories.tenant_id, tenantId), eq(assetCategories.id, categoryId)),
      )
      .returning();

    return updated;
  }
}
