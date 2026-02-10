import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { tenants, plants, users, userPlants } from './schema.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Safely ensures demo credentials exist when the database is empty.
 * - Does NOT clear data.
 * - Only seeds when there are 0 users.
 * - Uses ON CONFLICT DO NOTHING to avoid duplicates.
 */
export async function autoSeedDemoIfEmpty(): Promise<void> {
  const enabled = process.env.AUTO_SEED_DEMO !== 'false';
  if (!enabled) return;

  // Avoid seeding in tests
  if (process.env.NODE_ENV === 'test') return;

  const tenantSlug = process.env.TENANT_SLUG || DEFAULT_TENANT_SLUG;

  const userCountResult = await db.execute(sql`SELECT COUNT(*)::int AS count FROM users;`);
  const userCount = Number((userCountResult.rows?.[0] as any)?.count ?? 0);
  if (userCount > 0) return;

  const tenantId = tenantSlug === DEFAULT_TENANT_SLUG ? DEFAULT_TENANT_ID : uuidv4();

  const adminEmail = normalize(process.env.ADMIN_EMAIL || 'admin@cmms.com');
  const adminUsername = normalize(process.env.ADMIN_USERNAME || 'admin');
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const techEmail = normalize(process.env.TECH_EMAIL || 'tech@cmms.com');
  const techUsername = normalize(process.env.TECH_USERNAME || 'tech');
  const techPassword = process.env.TECH_PASSWORD || 'Tech@123456';

  const adminId = uuidv4();
  const techId = uuidv4();
  const plantId = uuidv4();

  await db
    .insert(tenants)
    .values({
      id: tenantId,
      name: tenantSlug === DEFAULT_TENANT_SLUG ? 'Demo Company' : `Tenant ${tenantSlug}`,
      slug: tenantSlug,
      is_active: true,
    })
    .onConflictDoNothing();

  await db
    .insert(plants)
    .values({
      id: plantId,
      tenant_id: tenantId,
      name: 'Fábrica Principal',
      code: 'PLANT-001',
      address: 'Rua Industrial, 123',
      city: 'Lisboa',
      country: 'Portugal',
      is_active: true,
    })
    .onConflictDoNothing();

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  await db
    .insert(users)
    .values({
      id: adminId,
      tenant_id: tenantId,
      username: adminUsername,
      email: adminEmail,
      password_hash: adminPasswordHash,
      first_name: 'Admin',
      last_name: 'CMMS',
      role: 'superadmin',
      is_active: true,
    })
    .onConflictDoNothing();

  const techPasswordHash = await bcrypt.hash(techPassword, 10);
  await db
    .insert(users)
    .values({
      id: techId,
      tenant_id: tenantId,
      username: techUsername,
      email: techEmail,
      password_hash: techPasswordHash,
      first_name: 'Tecnico',
      last_name: 'CMMS',
      role: 'tecnico',
      is_active: true,
    })
    .onConflictDoNothing();

  await db
    .insert(userPlants)
    .values([
      { id: uuidv4(), user_id: adminId, plant_id: plantId },
      { id: uuidv4(), user_id: techId, plant_id: plantId },
    ])
    .onConflictDoNothing();

  // eslint-disable-next-line no-console
  console.log(
    `✅ Auto-seed demo completed (tenantSlug=${tenantSlug}, admin=${adminUsername}/${adminEmail})`,
  );
}
