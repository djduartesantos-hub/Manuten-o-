import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { tenants, plants, users, userPlants } from './schema.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function ensureRbacStructureAndSeed(tenantId: string): Promise<void> {
  // Estrutura base (idempotente)
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS rbac_permissions (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      group_name TEXT NOT NULL DEFAULT 'geral',
      description TEXT,
      is_system BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rbac_roles (
      tenant_id UUID NOT NULL,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, key)
    );

    CREATE TABLE IF NOT EXISTS rbac_role_permissions (
      tenant_id UUID NOT NULL,
      role_key TEXT NOT NULL,
      permission_key TEXT NOT NULL REFERENCES rbac_permissions(key) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, role_key, permission_key)
    );

    CREATE TABLE IF NOT EXISTS rbac_role_home_pages (
      tenant_id UUID NOT NULL,
      plant_id UUID NULL,
      role_key TEXT NOT NULL,
      home_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- If a previous version created a PK including plant_id, it would force plant_id NOT NULL.
    -- We need plant_id nullable to support the global (base) configuration.
    ALTER TABLE rbac_role_home_pages
      DROP CONSTRAINT IF EXISTS rbac_role_home_pages_pkey;
    ALTER TABLE rbac_role_home_pages
      ALTER COLUMN plant_id DROP NOT NULL;

    ALTER TABLE user_plants
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'tecnico';

    CREATE INDEX IF NOT EXISTS rbac_roles_tenant_id_idx ON rbac_roles(tenant_id);
    CREATE INDEX IF NOT EXISTS rbac_role_permissions_tenant_role_idx ON rbac_role_permissions(tenant_id, role_key);
    CREATE INDEX IF NOT EXISTS rbac_role_home_pages_tenant_id_idx ON rbac_role_home_pages(tenant_id);
    CREATE INDEX IF NOT EXISTS rbac_role_home_pages_tenant_plant_idx ON rbac_role_home_pages(tenant_id, plant_id);
    CREATE UNIQUE INDEX IF NOT EXISTS rbac_role_home_pages_global_uniq
      ON rbac_role_home_pages(tenant_id, role_key)
      WHERE plant_id IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS rbac_role_home_pages_plant_uniq
      ON rbac_role_home_pages(tenant_id, plant_id, role_key)
      WHERE plant_id IS NOT NULL;
  `));

  // Permissões globais (idempotente)
  const permissions: Array<{ key: string; label: string; group: string; description?: string }> = [
    { key: 'dashboard:read', label: 'Ver dashboard', group: 'dashboard' },
    { key: 'jobs:read', label: 'Ver fila de jobs', group: 'jobs' },
    { key: 'jobs:write', label: 'Gerir fila de jobs', group: 'jobs' },
    { key: 'notifications:read', label: 'Ver notificações', group: 'notificacoes' },
    { key: 'notifications:write', label: 'Gerir notificações', group: 'notificacoes' },
    { key: 'assets:read', label: 'Ver equipamentos', group: 'ativos' },
    { key: 'assets:write', label: 'Gerir equipamentos', group: 'ativos' },
    { key: 'categories:read', label: 'Ver categorias', group: 'ativos' },
    { key: 'categories:write', label: 'Gerir categorias', group: 'ativos' },
    { key: 'workorders:read', label: 'Ver ordens', group: 'ordens' },
    { key: 'workorders:write', label: 'Gerir ordens', group: 'ordens' },
    { key: 'plans:read', label: 'Ver planos', group: 'preventiva' },
    { key: 'plans:write', label: 'Gerir planos', group: 'preventiva' },
    { key: 'schedules:read', label: 'Ver agendamentos', group: 'preventiva' },
    { key: 'schedules:write', label: 'Gerir agendamentos', group: 'preventiva' },
    { key: 'stock:read', label: 'Ver stock', group: 'stock' },
    { key: 'stock:write', label: 'Gerir stock', group: 'stock' },
    { key: 'suppliers:read', label: 'Ver fornecedores', group: 'stock' },
    { key: 'suppliers:write', label: 'Gerir fornecedores', group: 'stock' },
    { key: 'kits:read', label: 'Ver kits', group: 'kits' },
    { key: 'kits:write', label: 'Gerir kits', group: 'kits' },
    { key: 'admin:plants', label: 'Gerir fábricas', group: 'admin' },
    { key: 'admin:users', label: 'Gerir utilizadores', group: 'admin' },
    { key: 'admin:rbac', label: 'Gerir roles/permissões', group: 'admin' },
    { key: 'setup:run', label: 'Executar setup/patches', group: 'admin' },
  ];

  for (const p of permissions) {
    await db.execute(sql`
      INSERT INTO rbac_permissions (key, label, group_name, description, is_system)
      VALUES (${p.key}, ${p.label}, ${p.group}, ${p.description ?? null}, TRUE)
      ON CONFLICT (key) DO UPDATE
      SET label = EXCLUDED.label,
          group_name = EXCLUDED.group_name,
          description = EXCLUDED.description,
          updated_at = NOW();
    `);
  }

  // Roles base por tenant
  const roles: Array<{ key: string; name: string; description?: string }> = [
    { key: 'admin_empresa', name: 'Admin Empresa' },
    { key: 'gestor_manutencao', name: 'Gestor Manutenção' },
    { key: 'supervisor', name: 'Supervisor' },
    { key: 'tecnico', name: 'Técnico' },
    { key: 'operador', name: 'Operador' },
    { key: 'leitor', name: 'Leitor' },
  ];

  for (const r of roles) {
    await db.execute(sql`
      INSERT INTO rbac_roles (tenant_id, key, name, description, is_system)
      VALUES (${tenantId}, ${r.key}, ${r.name}, ${r.description ?? null}, TRUE)
      ON CONFLICT (tenant_id, key) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW();
    `);
  }

  const rolePerms: Record<string, string[]> = {
    admin_empresa: permissions.map((p) => p.key),
    gestor_manutencao: [
      'dashboard:read',
      'jobs:read',
      'jobs:write',
      'notifications:read',
      'notifications:write',
      'assets:read',
      'assets:write',
      'categories:read',
      'workorders:read',
      'workorders:write',
      'plans:read',
      'plans:write',
      'schedules:read',
      'schedules:write',
      'stock:read',
      'suppliers:read',
      'kits:read',
      'kits:write',
    ],
    supervisor: [
      'dashboard:read',
      'jobs:read',
      'jobs:write',
      'notifications:read',
      'assets:read',
      'assets:write',
      'categories:read',
      'workorders:read',
      'workorders:write',
      'plans:read',
      'schedules:read',
      'stock:read',
      'stock:write',
      'suppliers:read',
      'kits:read',
    ],
    tecnico: [
      'dashboard:read',
      'notifications:read',
      'assets:read',
      'assets:write',
      'categories:read',
      'workorders:read',
      'workorders:write',
      'plans:read',
      'schedules:read',
      'stock:read',
      'stock:write',
      'suppliers:read',
      'kits:read',
    ],
    operador: [
      'dashboard:read',
      'notifications:read',
      'assets:read',
      'categories:read',
      'workorders:read',
      'workorders:write',
      'stock:read',
    ],
    leitor: [
      'dashboard:read',
      'notifications:read',
      'assets:read',
      'categories:read',
      'workorders:read',
      'plans:read',
      'schedules:read',
      'stock:read',
      'suppliers:read',
      'kits:read',
    ],
  };

  for (const [roleKey, perms] of Object.entries(rolePerms)) {
    for (const perm of perms) {
      await db.execute(sql`
        INSERT INTO rbac_role_permissions (tenant_id, role_key, permission_key)
        VALUES (${tenantId}, ${roleKey}, ${perm})
        ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;
      `);
    }
  }
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

  // Garante RBAC antes de criar links por fábrica com role
  await ensureRbacStructureAndSeed(tenantId);

  await db
    .insert(userPlants)
    .values([
      { id: uuidv4(), user_id: adminId, plant_id: plantId, role: 'admin_empresa' },
      { id: uuidv4(), user_id: techId, plant_id: plantId, role: 'tecnico' },
    ])
    .onConflictDoNothing();

  // eslint-disable-next-line no-console
  console.log(
    `✅ Auto-seed demo completed (tenantSlug=${tenantSlug}, admin=${adminUsername}/${adminEmail})`,
  );
}
