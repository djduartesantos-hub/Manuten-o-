import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/config/database';
import { eq } from 'drizzle-orm';
import { tenants, plants, users, spareParts, stockMovements } from '../src/db/schema';
import { SparePartService } from '../src/services/sparepart.service';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

describe('SparePartService', () => {
  const service = new SparePartService();
  let tenantId: string;
  let plantId: string;
  let userId: string;
  let partId: string;
  let movementId: string;

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

    const [user] = await db
      .insert(users)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        email: `user-${uuidv4()}@cmms.com`,
        password_hash: await bcrypt.hash('Test@123456', 10),
        first_name: 'Test',
        last_name: 'User',
        role: 'technician',
        is_active: true,
      })
      .returning();
    userId = user.id;
  });

  afterAll(async () => {
    if (movementId) {
      await db
        .delete(stockMovements)
        .where(eq(stockMovements.id, movementId));
    }
    if (partId) {
      await db.delete(spareParts).where(eq(spareParts.id, partId));
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
    if (plantId) {
      await db.delete(plants).where(eq(plants.id, plantId));
    }
    if (tenantId) {
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }
  });

  it('creates spare part and stock movement', async () => {
    const part = await service.createSparePart(tenantId, {
      code: `SP-${uuidv4().slice(0, 6)}`,
      name: 'Filtro hidráulico',
      unit_cost: '12.50',
    });

    partId = part.id;
    expect(part.code).toContain('SP-');

    const movement = await service.createStockMovement(tenantId, userId, {
      spare_part_id: partId,
      plant_id: plantId,
      type: 'entrada',
      quantity: 5,
      unit_cost: '12.50',
      notes: 'Stock inicial',
    });

    movementId = movement.id;
    expect(movement.quantity).toBe(5);

    const quantity = await service.getStockQuantity(tenantId, partId, plantId);
    expect(quantity).toBe(5);
  });
});
