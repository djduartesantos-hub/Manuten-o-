import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db } from '../src/config/database';
import { assetCategories, assets, plants, tenants, users } from '../src/db/schema';
import { generateToken } from '../src/auth/jwt';

describe('Compliance Endpoints', () => {
  let app: any;
  let tenantId: string;
  let plantId: string;
  let categoryId: string;
  let assetId: string;
  let token: string;

  beforeAll(async () => {
    app = createApp();

    const [tenant] = await db
      .insert(tenants)
      .values({ name: 'Compliance Tenant', slug: 'compliance-tenant' })
      .returning();
    tenantId = tenant.id;

    const [plant] = await db
      .insert(plants)
      .values({ tenant_id: tenantId, name: 'Compliance Plant', code: 'COMP-PLANT' })
      .returning();
    plantId = plant.id;

    const [category] = await db
      .insert(assetCategories)
      .values({ id: crypto.randomUUID(), tenant_id: tenantId, name: 'Compliance Category' })
      .returning();
    categoryId = category.id;

    const [asset] = await db
      .insert(assets)
      .values({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        plant_id: plantId,
        category_id: categoryId,
        code: 'COMP-001',
        name: 'Compliance Asset',
      })
      .returning();
    assetId = asset.id;

    const [user] = await db
      .insert(users)
      .values({
        tenant_id: tenantId,
        email: 'compliance@example.com',
        first_name: 'Compliance',
        last_name: 'User',
        password_hash: 'dummy_hash',
        role: 'superadmin',
      })
      .returning();

    token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      tenantId,
      plantIds: [plantId],
    });
  });

  afterAll(async () => {
    await db.delete(assets).where(eq(assets.tenant_id, tenantId));
    await db.delete(assetCategories).where(eq(assetCategories.tenant_id, tenantId));
    await db.delete(plants).where(eq(plants.tenant_id, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('upserts and fetches lifecycle', async () => {
    const response = await request(app)
      .put(`/api/compliance/assets/${assetId}/lifecycle`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        commissioning_date: '2024-01-01T00:00:00.000Z',
        expected_lifespan_years: 8,
        depreciation_method: 'linear',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const fetchResponse = await request(app)
      .get(`/api/compliance/assets/${assetId}/lifecycle`)
      .set('Authorization', `Bearer ${token}`);

    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body.success).toBe(true);
  });

  it('creates and lists certification', async () => {
    const create = await request(app)
      .post(`/api/compliance/assets/${assetId}/certifications`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        certification_type: 'ISO 9001',
        issuer: 'TUV',
        issued_at: '2024-01-01T00:00:00.000Z',
      });

    expect(create.status).toBe(201);

    const list = await request(app)
      .get(`/api/compliance/assets/${assetId}/certifications`)
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('creates inspection and calibration', async () => {
    const insp = await request(app)
      .post(`/api/compliance/assets/${assetId}/inspections`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        inspection_date: '2024-02-01T00:00:00.000Z',
        inspector: 'Inspector',
      });

    expect(insp.status).toBe(201);

    const calib = await request(app)
      .post(`/api/compliance/assets/${assetId}/calibrations`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        calibration_date: '2024-02-10T00:00:00.000Z',
        provider: 'CalibraLab',
      });

    expect(calib.status).toBe(201);
  });

  it('creates and looks up tag', async () => {
    const tagCode = `QR-${crypto.randomUUID()}`;
    const create = await request(app)
      .post(`/api/compliance/assets/${assetId}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tag_type: 'qr',
        tag_code: tagCode,
      });

    expect(create.status).toBe(201);

    const lookup = await request(app)
      .get(`/api/compliance/tags/lookup?code=${encodeURIComponent(tagCode)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(lookup.status).toBe(200);
    expect(lookup.body.success).toBe(true);
  });
});
