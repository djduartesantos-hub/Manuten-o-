import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { AssetService } from '../src/services/asset.service';
import { db } from '../src/config/database';
import { tenants, plants, assetCategories, assets } from '../src/db/schema';

describe('AssetService', () => {
  let tenantId: string;
  let plantId: string;
  let categoryId: string;

  beforeAll(async () => {
    // Setup test data
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Test Tenant',
        slug: 'test-tenant',
      })
      .returning();

    tenantId = tenant.id;

    const [plant] = await db
      .insert(plants)
      .values({
        tenant_id: tenantId,
        name: 'Test Plant',
        code: 'TEST-PLANT',
      })
      .returning();

    plantId = plant.id;

    const [category] = await db
      .insert(assetCategories)
      .values({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: 'Test Category',
      })
      .returning();

    categoryId = category.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(assets).where(eq(assets.tenant_id, tenantId));
    await db.delete(assetCategories).where(eq(assetCategories.tenant_id, tenantId));
    await db.delete(plants).where(eq(plants.tenant_id, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  describe('createAsset', () => {
    it('should create an asset successfully', async () => {
      const assetData = {
        code: 'TEST-001',
        name: 'Test Asset',
        category_id: categoryId,
        description: 'Test asset for unit testing',
        manufacturer: 'Test Manufacturer',
        model: 'TEST-MODEL',
      };

      const asset = await AssetService.createAsset(tenantId, plantId, assetData);

      expect(asset).toBeDefined();
      expect(asset.code).toBe('TEST-001');
      expect(asset.name).toBe('Test Asset');
      expect(asset.category_id).toBe(categoryId);
    });

    it('should throw error for non-existent category', async () => {
      const assetData = {
        code: 'TEST-002',
        name: 'Test Asset 2',
        category_id: crypto.randomUUID(),
        description: 'Test asset with invalid category',
      };

      try {
        await AssetService.createAsset(tenantId, plantId, assetData);
        expect.fail('Should throw error');
      } catch (error: any) {
        expect(error.message).toContain('Categoria não encontrada');
      }
    });
  });

  describe('getPlantAssets', () => {
    it('should retrieve all assets for a plant', async () => {
      // Create test asset
      await db.insert(assets).values({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        plant_id: plantId,
        category_id: categoryId,
        code: 'TEST-003',
        name: 'Asset for listing',
      });

      const plantAssets = await AssetService.getPlantAssets(tenantId, plantId);

      expect(Array.isArray(plantAssets)).toBe(true);
      expect(plantAssets.length).toBeGreaterThan(0);
    });
  });

  describe('getAssetById', () => {
    it('should retrieve an asset by id', async () => {
      const [asset] = await db
        .insert(assets)
        .values({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          plant_id: plantId,
          category_id: categoryId,
          code: 'TEST-004',
          name: 'Asset for get',
        })
        .returning();

      const retrievedAsset = await AssetService.getAssetById(tenantId, asset.id);

      expect(retrievedAsset).toBeDefined();
      expect(retrievedAsset?.id).toBe(asset.id);
    });

    it('should return undefined for non-existent asset', async () => {
      const asset = await AssetService.getAssetById(tenantId, crypto.randomUUID());
      expect(asset).toBeUndefined();
    });
  });

  describe('updateAsset', () => {
    it('should update an asset successfully', async () => {
      const [asset] = await db
        .insert(assets)
        .values({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          plant_id: plantId,
          category_id: categoryId,
          code: 'TEST-005',
          name: 'Asset to update',
        })
        .returning();

      const updated = await AssetService.updateAsset(tenantId, asset.id, {
        name: 'Updated Asset Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Asset Name');
    });
  });

  describe('deleteAsset', () => {
    it('should soft delete an asset', async () => {
      const [asset] = await db
        .insert(assets)
        .values({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          plant_id: plantId,
          category_id: categoryId,
          code: 'TEST-006',
          name: 'Asset to delete',
        })
        .returning();

      await AssetService.deleteAsset(tenantId, asset.id);

      // Asset should still exist but with deleted_at set
      const deleted = await db.query.assets.findFirst({
        where: (fields: any, { eq }: any) => eq(fields.id, asset.id),
      });

      expect(deleted?.deleted_at).toBeDefined();
    });
  });
});
