import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db } from '../src/config/database';
import { tenants, users } from '../src/db/schema';
import { generateToken } from '../src/auth/jwt';

describe('Integrations Endpoints', () => {
  let app: any;
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    app = createApp();

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        event_type TEXT NOT NULL,
        channel TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        event_types TEXT[] DEFAULT ARRAY[]::TEXT[],
        headers JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
        last_used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `));

    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Integrations Tenant',
        slug: `integrations-${crypto.randomUUID().slice(0, 8)}`,
      })
      .returning();

    tenantId = tenant.id;

    const [user] = await db
      .insert(users)
      .values({
        tenant_id: tenantId,
        email: `integration-${crypto.randomUUID()}@example.com`,
        first_name: 'Integration',
        last_name: 'Tester',
        password_hash: 'dummy_hash',
        role: 'superadmin',
      })
      .returning();

    token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      tenantId,
    });
  });

  it('requires authentication for templates', async () => {
    const response = await request(app).get('/api/notifications/templates');
    expect(response.status).toBe(401);
  });

  it('creates and lists notification templates', async () => {
    const createResponse = await request(app)
      .post('/api/notifications/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventType: 'work_order_status_changed',
        channel: 'email',
        subject: 'Status atualizado',
        body: 'Nova atualizacao: {{message}}',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);

    const listResponse = await request(app)
      .get('/api/notifications/templates')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
  });

  it('creates and lists webhooks', async () => {
    const createResponse = await request(app)
      .post('/api/integrations/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'ERP Hook',
        url: 'https://example.com/webhook',
        eventTypes: ['work_order_status_changed'],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);

    const listResponse = await request(app)
      .get('/api/integrations/webhooks')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
  });

  it('creates and lists API keys', async () => {
    const createResponse = await request(app)
      .post('/api/integrations/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'ERP Key',
        scopes: ['assets:read'],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data?.apiKey).toBeTruthy();

    const listResponse = await request(app)
      .get('/api/integrations/api-keys')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
  });
});
