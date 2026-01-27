import { describe, it, expect, beforeAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import request from 'supertest';
import { db } from '../src/config/database';
import { tenants, plants, assetCategories, users } from '../src/db/schema';
import { generateToken } from '../src/auth/jwt';

describe('Asset Endpoints', () => {
  let app: any;
  let tenantId: string;
  let plantId: string;
  let categoryId: string;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    app = createApp();

    // Create test tenant
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Test Tenant',
        slug: 'test-tenant',
      })
      .returning();

    tenantId = tenant.id;

    // Create test plant
    const [plant] = await db
      .insert(plants)
      .values({
        tenant_id: tenantId,
        name: 'Test Plant',
        code: 'TEST-PLANT',
      })
      .returning();

    plantId = plant.id;

    // Create test category
    const [category] = await db
      .insert(assetCategories)
      .values({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: 'Test Category',
      })
      .returning();

    categoryId = category.id;

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        tenant_id: tenantId,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'dummy_hash',
        role: 'admin',
      })
      .returning();

    userId = user.id;

    // Generate token
    token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      tenantId: tenant.id,
      plantIds: [plant.id],
    });
  });

  describe('GET /api/tenants/:plantId/assets', () => {
    it('should list assets for a plant', async () => {
      const response = await request(app)
        .get(`/api/tenants/${plantId}/assets`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/tenants/${plantId}/assets`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/tenants/:plantId/assets', () => {
    it('should create a new asset', async () => {
      const assetData = {
        code: 'TEST-001',
        name: 'Test Asset',
        category_id: categoryId,
        manufacturer: 'Test Manufacturer',
        description: 'Test asset via API',
      };

      const response = await request(app)
        .post(`/api/tenants/${plantId}/assets`)
        .set('Authorization', `Bearer ${token}`)
        .send(assetData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('TEST-001');
    });

    it('should validate required fields', async () => {
      const assetData = {
        // Missing code and name
        category_id: categoryId,
      };

      const response = await request(app)
        .post(`/api/tenants/${plantId}/assets`)
        .set('Authorization', `Bearer ${token}`)
        .send(assetData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tenants/:plantId/assets/:id', () => {
    it('should return 404 for non-existent asset', async () => {
      const fakeId = crypto.randomUUID();

      const response = await request(app)
        .get(`/api/tenants/${plantId}/assets/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tenants/:plantId/assets/maintenance/due', () => {
    it('should list assets due for maintenance', async () => {
      const response = await request(app)
        .get(`/api/tenants/${plantId}/assets/maintenance/due`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
