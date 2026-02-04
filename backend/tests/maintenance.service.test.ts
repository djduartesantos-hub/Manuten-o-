import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/config/database';
import { eq } from 'drizzle-orm';
import {
  tenants,
  plants,
  assetCategories,
  assets,
  maintenancePlans,
} from '../src/db/schema';
import { MaintenanceService } from '../src/services/maintenance.service';
import { v4 as uuidv4 } from 'uuid';

describe('MaintenanceService', () => {
  const service = new MaintenanceService();
  let tenantId: string;
  let plantId: string;
  let categoryId: string;
  let assetId: string;
  let planId: string;

  beforeAll(async () => {
    const [tenant] = await db
      .insert(tenants)
      .values({ name: 'Test Tenant', slug: `tenant-${uuidv4()}` })
      .returning();
    tenantId = tenant.id;

    const [plant] = await db
      .insert(plants)
      .values({
        tenant_id: tenantId,
        name: 'Test Plant',
        code: `PLANT-${uuidv4().slice(0, 6)}`,
      })
      .returning();
    plantId = plant.id;

    const [category] = await db
      .insert(assetCategories)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        name: 'Test Category',
      })
      .returning();
    categoryId = category.id;

    const [asset] = await db
      .insert(assets)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        plant_id: plantId,
        category_id: categoryId,
        name: 'Test Asset',
        code: `ASSET-${uuidv4().slice(0, 6)}`,
        status: 'operacional',
      })
      .returning();
    assetId = asset.id;
  });

  afterAll(async () => {
    if (planId) {
      await db.delete(maintenancePlans).where(eq(maintenancePlans.id, planId));
    }
    if (assetId) {
      await db.delete(assets).where(eq(assets.id, assetId));
    }
    if (categoryId) {
      await db.delete(assetCategories).where(eq(assetCategories.id, categoryId));
    }
    if (plantId) {
      await db.delete(plants).where(eq(plants.id, plantId));
    }
    if (tenantId) {
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }
  });

  it('creates and fetches maintenance plan', async () => {
    const plan = await service.createMaintenancePlan(tenantId, {
      asset_id: assetId,
      name: 'Plano Preventivo Teste',
      description: 'Plano de teste',
      type: 'preventiva',
      frequency_type: 'days',
      frequency_value: 30,
      is_active: true,
    });

    planId = plan.id;

    expect(plan.name).toBe('Plano Preventivo Teste');
    expect(plan.asset_id).toBe(assetId);

    const fetched = await service.getMaintenancePlanById(tenantId, planId);
    expect(fetched.id).toBe(planId);
  });
});
