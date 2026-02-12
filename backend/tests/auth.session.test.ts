import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { eq, and } from 'drizzle-orm';

import authRoutes from '../src/routes/auth.routes.js';
import profileRoutes from '../src/routes/profile.routes.js';
import { tenantSlugMiddleware } from '../src/middlewares/tenant.js';
import { db } from '../src/config/database.js';
import { tenants, users } from '../src/db/schema.js';
import { AuthService } from '../src/services/auth.service.js';
import { verifyToken, verifyRefreshToken } from '../src/auth/jwt.js';

function makeTestApp() {
  const app = express();
  app.use(express.json());

  app.use('/api/auth', tenantSlugMiddleware, authRoutes);
  app.use('/api/profile', tenantSlugMiddleware, profileRoutes);

  return app;
}

describe('Auth session revocation', () => {
  const app = makeTestApp();

  let tenantId = '';
  let userId = '';
  const username = `auth-test-${Date.now()}`;
  const password = 'Password@123456';
  const email = `${username}@example.com`;
  const tenantSlug = `tenant-${username}`;

  beforeAll(async () => {
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Auth Test Tenant',
        slug: tenantSlug,
      })
      .returning();

    tenantId = tenant.id;

    const user = await AuthService.createUser({
      tenant_id: tenantId,
      username,
      email,
      password,
      first_name: 'Auth',
      last_name: 'Tester',
      role: 'admin_empresa',
    });

    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup user + tenant
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('invalidates access+refresh tokens after /auth/logout', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('x-tenant-id', tenantId)
      .send({ username, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body?.success).toBe(true);

    const token = loginRes.body?.data?.token as string;
    const refreshToken = loginRes.body?.data?.refreshToken as string;

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBeGreaterThan(20);

    const accessPayload: any = verifyToken(token);
    const refreshPayload: any = verifyRefreshToken(refreshToken);

    expect(accessPayload?.userId).toBe(userId);
    expect(accessPayload?.tenantId).toBe(tenantId);
    expect(accessPayload?.sessionVersion ?? 0).toBe(0);

    expect(refreshPayload?.userId).toBe(userId);
    expect(refreshPayload?.tenantId).toBe(tenantId);
    expect(refreshPayload?.sessionVersion ?? 0).toBe(0);

    const profileOk = await request(app)
      .get('/api/profile')
      .set('x-tenant-id', tenantId)
      .set('authorization', `Bearer ${token}`);

    expect(profileOk.status).toBe(200);
    expect(profileOk.body?.success).toBe(true);

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('x-tenant-id', tenantId)
      .set('authorization', `Bearer ${token}`)
      .send({});

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body?.success).toBe(true);

    const profileAfterLogout = await request(app)
      .get('/api/profile')
      .set('x-tenant-id', tenantId)
      .set('authorization', `Bearer ${token}`);

    expect(profileAfterLogout.status).toBe(401);
    expect(profileAfterLogout.body?.success).toBe(false);
    expect(profileAfterLogout.body?.error).toBe('Session revoked');

    const refreshAfterLogout = await request(app)
      .post('/api/auth/refresh')
      .set('x-tenant-id', tenantId)
      .send({ refreshToken });

    expect(refreshAfterLogout.status).toBe(401);
    expect(refreshAfterLogout.body?.success).toBe(false);
    expect(refreshAfterLogout.body?.error).toBe('Session revoked');

    const reloginRes = await request(app)
      .post('/api/auth/login')
      .set('x-tenant-id', tenantId)
      .send({ username, password });

    expect(reloginRes.status).toBe(200);

    const newToken = reloginRes.body?.data?.token as string;
    const newPayload: any = verifyToken(newToken);
    expect(newPayload?.sessionVersion).toBe(1);
  });
});
