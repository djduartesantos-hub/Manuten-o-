import { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'node:child_process';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  plants,
  tenants,
  users,
  notifications,
  assetCategories,
  assets,
  userPlants,
  maintenancePlans,
  maintenanceKits,
  maintenanceKitItems,
  maintenanceTasks,
  workOrders,
  spareParts,
  stockMovements,
  stockReservations,
  suppliers,
} from '../db/schema.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

export class SetupController {
  private static async ensureSetupDbRunsTable(): Promise<void> {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS setup_db_runs (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        run_type TEXT NOT NULL,
        user_id UUID NULL,
        migrations JSONB NULL,
        patches JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS setup_db_runs_tenant_id_created_at_idx
        ON setup_db_runs(tenant_id, created_at DESC);
    `));
  }

  private static async logSetupDbRun(params: {
    tenantId: string;
    runType: 'migrate' | 'corrections' | 'rbac_patch';
    userId?: string | null;
    migrations?: string[];
    patches?: string[];
  }): Promise<void> {
    try {
      await SetupController.ensureSetupDbRunsTable();
      await db.execute(sql`
        INSERT INTO setup_db_runs (id, tenant_id, run_type, user_id, migrations, patches)
        VALUES (
          ${uuidv4()},
          ${params.tenantId},
          ${params.runType},
          ${params.userId ?? null},
          ${params.migrations ? JSON.stringify(params.migrations) : null},
          ${params.patches ? JSON.stringify(params.patches) : null}
        );
      `);
    } catch {
      // Best-effort logging. Never block setup actions due to log write failures.
    }
  }
  private static rbacPermissionsSeed(): Array<{
    key: string;
    label: string;
    group: string;
    description?: string;
  }> {
    return [
      { key: 'dashboard:read', label: 'Ver dashboard', group: 'dashboard' },
      { key: 'jobs:read', label: 'Ver fila de jobs', group: 'jobs' },
      { key: 'jobs:write', label: 'Gerir fila de jobs', group: 'jobs' },
      { key: 'notifications:read', label: 'Ver notificações', group: 'notificacoes' },
      { key: 'notifications:write', label: 'Gerir notificações', group: 'notificacoes' },
      { key: 'tickets:read', label: 'Ver tickets', group: 'tickets' },
      { key: 'tickets:write', label: 'Criar/editar tickets', group: 'tickets' },
      { key: 'tickets:forward', label: 'Reencaminhar tickets', group: 'tickets' },
      { key: 'assets:read', label: 'Ver equipamentos', group: 'ativos' },
      { key: 'assets:write', label: 'Gerir equipamentos', group: 'ativos' },
      { key: 'categories:read', label: 'Ver categorias', group: 'ativos' },
      { key: 'categories:write', label: 'Gerir categorias', group: 'ativos' },
      { key: 'workorders:read', label: 'Ver ordens', group: 'ordens' },
      { key: 'workorders:write', label: 'Gerir ordens', group: 'ordens' },
      { key: 'workflows:read', label: 'Ver workflow de ordens', group: 'ordens' },
      { key: 'workflows:write', label: 'Configurar workflow de ordens', group: 'ordens' },
      { key: 'plans:read', label: 'Ver planos', group: 'preventiva' },
      { key: 'plans:write', label: 'Gerir planos', group: 'preventiva' },
      { key: 'schedules:read', label: 'Ver agendamentos', group: 'preventiva' },
      { key: 'schedules:write', label: 'Gerir agendamentos', group: 'preventiva' },
      { key: 'stock:read', label: 'Ver stock', group: 'stock' },
      { key: 'stock:write', label: 'Gerir stock', group: 'stock' },
      { key: 'suppliers:read', label: 'Ver fornecedores', group: 'stock' },
      { key: 'suppliers:write', label: 'Gerir fornecedores', group: 'stock' },
      { key: 'purchases:read', label: 'Ver compras e requisicoes', group: 'compras' },
      { key: 'purchases:write', label: 'Gerir compras e requisicoes', group: 'compras' },
      { key: 'kits:read', label: 'Ver kits', group: 'kits' },
      { key: 'kits:write', label: 'Gerir kits', group: 'kits' },
      { key: 'admin:plants', label: 'Gerir fábricas', group: 'admin' },
      { key: 'admin:users', label: 'Gerir utilizadores', group: 'admin' },
      { key: 'admin:rbac', label: 'Gerir roles/permissões', group: 'admin' },
      { key: 'setup:run', label: 'Executar setup/patches', group: 'admin' },
    ];
  }

  private static async applyRbacPatchInternal(): Promise<void> {
    // Estrutura
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

      CREATE INDEX IF NOT EXISTS rbac_role_home_pages_tenant_id_idx ON rbac_role_home_pages(tenant_id);
      CREATE INDEX IF NOT EXISTS rbac_role_home_pages_tenant_plant_idx ON rbac_role_home_pages(tenant_id, plant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS rbac_role_home_pages_global_uniq
        ON rbac_role_home_pages(tenant_id, role_key)
        WHERE plant_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS rbac_role_home_pages_plant_uniq
        ON rbac_role_home_pages(tenant_id, plant_id, role_key)
        WHERE plant_id IS NOT NULL;

      ALTER TABLE user_plants
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'tecnico';

      CREATE INDEX IF NOT EXISTS rbac_roles_tenant_id_idx ON rbac_roles(tenant_id);
      CREATE INDEX IF NOT EXISTS rbac_role_permissions_tenant_role_idx ON rbac_role_permissions(tenant_id, role_key);
    `));

    // Seed global permissions (idempotente)
    const permissions = SetupController.rbacPermissionsSeed();
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
  }

  private static async ensureRbacSeedForTenant(tenantId: string): Promise<void> {
    // Roles base (por tenant)
    const roles: Array<{ key: string; name: string; description?: string }> = [
      { key: 'superadmin', name: 'SuperAdministrador' },
      { key: 'admin_empresa', name: 'Admin Empresa' },
      { key: 'gestor_manutencao', name: 'Gestor Fábrica' },
      { key: 'supervisor', name: 'Supervisor' },
      { key: 'tecnico', name: 'Técnico' },
      { key: 'operador', name: 'Operador' },
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

    // Mapeamento default role -> permissões
    const rolePerms: Record<string, string[]> = {
      admin_empresa: [
        'dashboard:read',
        'jobs:read',
        'jobs:write',
        'notifications:read',
        'notifications:write',
        'tickets:read',
        'tickets:write',
        'tickets:forward',
        'assets:read',
        'assets:write',
        'categories:read',
        'categories:write',
        'workorders:read',
        'workorders:write',
        'workflows:read',
        'workflows:write',
        'plans:read',
        'plans:write',
        'schedules:read',
        'schedules:write',
        'stock:read',
        'stock:write',
        'suppliers:read',
        'suppliers:write',
        'purchases:read',
        'purchases:write',
        'kits:read',
        'kits:write',
        'admin:plants',
        'admin:users',
        'admin:rbac',
        'setup:run',
      ],
      gestor_manutencao: [
        'dashboard:read',
        'jobs:read',
        'jobs:write',
        'notifications:read',
        'notifications:write',
        'tickets:read',
        'tickets:write',
        'tickets:forward',
        'assets:read',
        'assets:write',
        'categories:read',
        'workorders:read',
        'workorders:write',
        'workflows:read',
        'workflows:write',
        'plans:read',
        'plans:write',
        'schedules:read',
        'schedules:write',
        'stock:read',
        'suppliers:read',
        'purchases:read',
        'purchases:write',
        'kits:read',
        'kits:write',
      ],
      supervisor: [
        'dashboard:read',
        'jobs:read',
        'jobs:write',
        'notifications:read',
        'tickets:read',
        'tickets:write',
        'assets:read',
        'assets:write',
        'categories:read',
        'workorders:read',
        'workorders:write',
        'workflows:read',
        'plans:read',
        'schedules:read',
        'stock:read',
        'stock:write',
        'suppliers:read',
        'purchases:read',
        'kits:read',
      ],
      tecnico: [
        'dashboard:read',
        'notifications:read',
        'tickets:read',
        'tickets:write',
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
        'tickets:read',
        'tickets:write',
        'assets:read',
        'workorders:read',
        'workorders:write',
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

    // SuperAdministrador: always maximum permissions
    await db.execute(sql`
      DELETE FROM rbac_role_permissions
      WHERE tenant_id = ${tenantId} AND role_key = 'superadmin';
    `);
    await db.execute(sql`
      INSERT INTO rbac_role_permissions (tenant_id, role_key, permission_key)
      SELECT ${tenantId}, 'superadmin', key
      FROM rbac_permissions
      ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;
    `);

    // SuperAdministrador: fixed home page (global base)
    await db.execute(sql`
      DELETE FROM rbac_role_home_pages
      WHERE tenant_id = ${tenantId} AND role_key = 'superadmin';
    `);
    await db.execute(sql`
      INSERT INTO rbac_role_home_pages (tenant_id, plant_id, role_key, home_path, created_at, updated_at)
      VALUES (${tenantId}, NULL, 'superadmin', '/settings?panel=superadmin', NOW(), NOW());
    `);

    // Migrate/remove legacy Leitor role -> Operador
    // - Preserves access by moving users to operador
    // - Ensures the Leitor role no longer exists after running DB updates
    await db.execute(sql`
      UPDATE users
      SET role = 'operador', updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND role = 'leitor';
    `);

    await db.execute(sql`
      UPDATE user_plants up
      SET role = 'operador'
      FROM plants p
      WHERE up.plant_id = p.id
        AND p.tenant_id = ${tenantId}
        AND up.role = 'leitor';
    `);

    await db.execute(sql`
      DELETE FROM rbac_role_permissions
      WHERE tenant_id = ${tenantId} AND role_key = 'leitor';
    `);
    await db.execute(sql`
      DELETE FROM rbac_role_home_pages
      WHERE tenant_id = ${tenantId} AND role_key = 'leitor';
    `);
    await db.execute(sql`
      DELETE FROM rbac_roles
      WHERE tenant_id = ${tenantId} AND key = 'leitor';
    `);

    // Normalize/migrate legacy/alias role values to canonical keys (idempotent)
    // Note: this helps avoid "Role desconhecida" and permission mismatches.
    await db.execute(sql`
      UPDATE users
      SET role = 'admin_empresa', updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND LOWER(TRIM(role)) IN ('admin', 'adminempresa', 'admin-empresa');
    `);

    await db.execute(sql`
      UPDATE users
      SET role = 'gestor_manutencao', updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND LOWER(TRIM(role)) IN ('maintenance_manager', 'planner', 'gestor', 'gestor_fabrica', 'gestor-fabrica');
    `);

    await db.execute(sql`
      UPDATE users
      SET role = 'tecnico', updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND (
          LOWER(TRIM(role)) IN ('technician', 'tech')
          OR role IN ('Técnico', 'técnico')
        );
    `);

    await db.execute(sql`
      UPDATE users
      SET role = 'operador', updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND LOWER(TRIM(role)) IN ('operator');
    `);

    await db.execute(sql`
      UPDATE user_plants up
      SET role = 'admin_empresa'
      FROM plants p
      WHERE up.plant_id = p.id
        AND p.tenant_id = ${tenantId}
        AND LOWER(TRIM(up.role)) IN ('admin', 'adminempresa', 'admin-empresa');
    `);

    await db.execute(sql`
      UPDATE user_plants up
      SET role = 'gestor_manutencao'
      FROM plants p
      WHERE up.plant_id = p.id
        AND p.tenant_id = ${tenantId}
        AND LOWER(TRIM(up.role)) IN ('maintenance_manager', 'planner', 'gestor', 'gestor_fabrica', 'gestor-fabrica');
    `);

    await db.execute(sql`
      UPDATE user_plants up
      SET role = 'tecnico'
      FROM plants p
      WHERE up.plant_id = p.id
        AND p.tenant_id = ${tenantId}
        AND (
          LOWER(TRIM(up.role)) IN ('technician', 'tech')
          OR up.role IN ('Técnico', 'técnico')
        );
    `);

    await db.execute(sql`
      UPDATE user_plants up
      SET role = 'operador'
      FROM plants p
      WHERE up.plant_id = p.id
        AND p.tenant_id = ${tenantId}
        AND LOWER(TRIM(up.role)) IN ('operator');
    `);
  }

  /**
   * Apply only RBAC patch + seed (safe to run multiple times).
   * Useful to repair tenants where RBAC exists but is not seeded.
   */
  static async patchRbac(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run RBAC patch',
        });
        return;
      }

      const tenantId = req.tenantId || DEFAULT_TENANT_ID;

      await SetupController.applyRbacPatchInternal();
      await SetupController.ensureRbacSeedForTenant(String(tenantId));

      const userId = req.user ? String((req.user as any).id || '') : '';
      await SetupController.logSetupDbRun({
        tenantId: String(tenantId),
        runType: 'rbac_patch',
        userId: userId || null,
        migrations: [],
        patches: ['rbac'],
      });

      res.json({
        success: true,
        message: 'RBAC patch aplicado com sucesso',
        data: { patch: 'rbac' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply RBAC patch',
      });
    }
  }
  private static async applyCorrectionsInternal(): Promise<{
    migrations: string[];
    migrationsDir: string | null;
    availableMigrationFiles: string[];
    patches: string[];
  }> {
    await SetupController.applyRbacPatchInternal();

    const available = await SetupController.listMigrationFiles();
    const migrations = await SetupController.runMigrationsInternal();
    await SetupController.applyWorkOrdersPatchInternal();
    await SetupController.applyWorkOrdersDowntimeRcaPatchInternal();
    await SetupController.applyWorkOrdersSlaPausePatchInternal();
    await SetupController.applyMaintenancePlansToleranceModePatchInternal();
    await SetupController.applyMaintenancePlansScheduleAnchorModePatchInternal();
    await SetupController.applyStockReservationsPatchInternal();
    await SetupController.applyMaintenanceKitsPatchInternal();

    return {
      migrations,
      migrationsDir: available.dir,
      availableMigrationFiles: available.files,
      patches: [
        'rbac',
        'work_orders_work_performed',
        'work_orders_downtime_rca_fields',
        'work_orders_sla_pause',
        'maintenance_plans_tolerance_mode',
        'maintenance_plans_schedule_anchor_mode',
        'stock_reservations',
        'maintenance_kits',
      ],
    };
  }

  private static async usersTableExists(): Promise<boolean> {
    const res = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'users'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ) AS exists;
    `);
    const value = (res.rows?.[0] as any)?.exists;
    return value === true || value === 't' || value === 1 || value === 'true';
  }

  private static async notificationsTableExists(): Promise<boolean> {
    const res = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'notifications'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ) AS exists;
    `);
    const value = (res.rows?.[0] as any)?.exists;
    return value === true || value === 't' || value === 1 || value === 'true';
  }

  private static async ensureSchemaReady(): Promise<void> {
    const usersReady = await SetupController.usersTableExists();
    const notificationsReady = usersReady ? await SetupController.notificationsTableExists() : false;

    if (usersReady && notificationsReady) return;

    await new Promise<void>((resolve, reject) => {
      const env = { ...process.env };
      const configured = env.PG_TLS_REJECT_UNAUTHORIZED ?? env.NODE_TLS_REJECT_UNAUTHORIZED;

      // Railway managed Postgres may use a self-signed cert chain.
      // Keep the TLS bypass limited to the migration subprocess.
      if (configured === undefined && env.NODE_ENV === 'production') {
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const run = (script: string) =>
        new Promise<void>((resolveRun, rejectRun) => {
          const child = spawn('npm', ['run', script], {
            stdio: 'inherit',
            env,
          });

          child.on('error', rejectRun);
          child.on('exit', (code) => {
            if (code === 0) resolveRun();
            else rejectRun(new Error(`${script} failed with exit code ${code}`));
          });
        });

      run('db:push').then(resolve).catch(reject);
    });

    const usersOk = await SetupController.usersTableExists();
    const notificationsOk = usersOk ? await SetupController.notificationsTableExists() : false;

    if (!usersOk || !notificationsOk) {
      let meta: any = undefined;
      try {
        const res = await db.execute(sql`
          SELECT current_database() AS db, current_user AS usr, current_schema() AS schema;
        `);
        meta = res.rows?.[0];
      } catch {
        // ignore
      }

      const suffix = meta ? ` (db=${meta.db}, schema=${meta.schema}, user=${meta.usr})` : '';
      const missing = [!usersOk ? 'users' : null, !notificationsOk ? 'notifications' : null]
        .filter(Boolean)
        .join(', ');
      throw new Error(`Database schema is not ready (missing: ${missing})${suffix}`);
    }
  }

  private static async resolveMigrationsDir(): Promise<string | null> {
    const candidates = [
      path.resolve(process.cwd(), 'scripts/database/migrations'),
      path.resolve(process.cwd(), '../scripts/database/migrations'),
    ];

    for (const candidate of candidates) {
      try {
        const stat = await fs.stat(candidate);
        if (stat.isDirectory()) {
          return candidate;
        }
      } catch (error) {
        // Ignore and try next candidate.
      }
    }

    return null;
  }

  private static async listMigrationFiles(): Promise<{ dir: string | null; files: string[] }> {
    const migrationsDir = await SetupController.resolveMigrationsDir();

    if (!migrationsDir) {
      return { dir: null, files: [] };
    }

    const entries = await fs.readdir(migrationsDir);
    const migrationFiles = entries
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    return { dir: migrationsDir, files: migrationFiles };
  }

  private static async ensureSqlMigrationsTable(): Promise<void> {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS sql_migrations (
        filename TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `));
  }

  private static async getSqlMigrationsStatusInternal(): Promise<{
    migrationsDir: string | null;
    availableFiles: string[];
    executedFiles: string[];
    pendingFiles: string[];
  }> {
    const { dir: migrationsDir, files: availableFiles } = await SetupController.listMigrationFiles();

    if (!migrationsDir || availableFiles.length === 0) {
      return {
        migrationsDir,
        availableFiles,
        executedFiles: [],
        pendingFiles: [],
      };
    }

    await SetupController.ensureSqlMigrationsTable();

    const executedRes = await db.execute(sql.raw(`SELECT filename FROM sql_migrations ORDER BY executed_at ASC;`));
    const executedAll = (executedRes.rows ?? [])
      .map((r: any) => String(r.filename || '').trim())
      .filter(Boolean);

    const executedSet = new Set(executedAll);
    const pendingFiles = availableFiles.filter((f) => !executedSet.has(f));

    // Keep ordering consistent with folder sorting.
    const executedFiles = availableFiles.filter((f) => executedSet.has(f));

    return {
      migrationsDir,
      availableFiles,
      executedFiles,
      pendingFiles,
    };
  }

  private static async markSqlMigrationExecuted(filename: string): Promise<void> {
    await SetupController.ensureSqlMigrationsTable();
    await db.execute(sql`
      INSERT INTO sql_migrations (filename)
      VALUES (${filename})
      ON CONFLICT (filename) DO NOTHING;
    `);
  }

  private static async runMigrationsInternal(): Promise<string[]> {
    const status = await SetupController.getSqlMigrationsStatusInternal();

    if (!status.migrationsDir) {
      return [];
    }

    if (status.pendingFiles.length === 0) {
      return [];
    }

    const executedNow: string[] = [];

    for (const file of status.pendingFiles) {
      const fullPath = path.join(status.migrationsDir, file);
      const sqlContent = await fs.readFile(fullPath, 'utf-8');
      const trimmed = sqlContent.trim();

      if (!trimmed) {
        await SetupController.markSqlMigrationExecuted(file);
        continue;
      }

      await db.execute(sql.raw(trimmed));
      await SetupController.markSqlMigrationExecuted(file);
      executedNow.push(file);
    }

    return executedNow;
  }

  private static async ensureTenantsTable(): Promise<void> {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        logo_url TEXT,
        subscription_plan TEXT DEFAULT 'basic',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);
      CREATE INDEX IF NOT EXISTS tenants_active_idx ON tenants(is_active);
    `));
  }

  private static async seedDemoDataInternal(
    tenantId: string,
    tenantSlug: string,
  ): Promise<{
    added: {
      users: number;
      plants: number;
      assets: number;
      maintenancePlans: number;
      workOrders: number;
      spareParts: number;
    };
    note: string;
  }> {
    await SetupController.ensureTenantsTable();
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: 'Demo Company',
        slug: tenantSlug,
        is_active: true,
      })
      .onConflictDoNothing();

    // Use fixed demo IDs so we can check if they exist
    const demoPlantId = '0fab0000-0000-0000-0000-000000000001';
    const demoAdminId = '00000001-0000-0000-0000-000000000001';
    const demoSuperAdminId = '00000001-0000-0000-0000-000000000006';
    const demoTechId = '00000000-0000-0000-0000-000000000002';
    const demoManagerId = '00000000-0000-0000-0000-000000000003';
    const demoSupervisorId = '00000000-0000-0000-0000-000000000004';
    const demoOperatorId = '00000000-0000-0000-0000-000000000005';
    const demoCategoryId = '10000000-0000-0000-0000-000000000001';
    const demoSupplierId = '60000000-0000-0000-0000-000000000001';
    const demoKitId = '70000000-0000-0000-0000-000000000001';

    let usersAdded = 0;
    let plantsAdded = 0;
    let assetsAdded = 0;
    let plansAdded = 0;
    let workOrdersAdded = 0;
    let partsAdded = 0;

    // Check what already exists
    const existingPlant = await db.execute(sql`SELECT id FROM plants WHERE id = ${demoPlantId}`);
    const existingAdmin = await db.execute(sql`SELECT id FROM users WHERE id = ${demoAdminId}`);
    const existingSuperAdmin = await db.execute(sql`SELECT id FROM users WHERE id = ${demoSuperAdminId}`);
    const existingTech = await db.execute(sql`SELECT id FROM users WHERE id = ${demoTechId}`);
    const existingManager = await db.execute(sql`SELECT id FROM users WHERE id = ${demoManagerId}`);
    const existingSupervisor = await db.execute(sql`SELECT id FROM users WHERE id = ${demoSupervisorId}`);
    const existingOperator = await db.execute(sql`SELECT id FROM users WHERE id = ${demoOperatorId}`);
    const existingCategory = await db.execute(
      sql`SELECT id FROM asset_categories WHERE id = ${demoCategoryId}`,
    );
    const existingSupplier = await db.execute(
      sql`SELECT id FROM suppliers WHERE id = ${demoSupplierId}`,
    );

    // Insert plant (only if doesn't exist)
    if (existingPlant.rows.length === 0) {
      await db
        .insert(plants)
        .values({
          id: demoPlantId,
          tenant_id: tenantId,
          name: 'Fábrica Principal',
          code: 'PLANT-001',
          address: 'Rua Industrial, 123',
          city: 'Lisboa',
          country: 'Portugal',
          is_active: true,
        })
        .onConflictDoNothing();
      plantsAdded++;
    }

    // Insert category (only if doesn't exist)
    if (existingCategory.rows.length === 0) {
      await db
        .insert(assetCategories)
        .values({
          id: demoCategoryId,
          tenant_id: tenantId,
          name: 'Equipamento Pesado',
          description: 'Equipamentos de grande porte',
        })
        .onConflictDoNothing();
    }

    // Insert supplier (used by Spare Parts page)
    if (existingSupplier.rows.length === 0) {
      await db
        .insert(suppliers)
        .values({
          id: demoSupplierId,
          tenant_id: tenantId,
          name: 'Fornecedor Demo',
          email: 'fornecedor@demo.pt',
          phone: '+351 210 000 000',
          address: 'Av. Industrial, 10',
          city: 'Lisboa',
          country: 'Portugal',
        })
        .onConflictDoNothing();
    }

    // Upsert demo users (IDs fixos para manter referências dos dados demo)
    // Admin Empresa
    {
      const passwordHash = await bcrypt.hash('Admin@123456', 10);
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active)
        VALUES (${demoAdminId}, ${tenantId}, 'admin', 'admin@cmms.com', ${passwordHash}, 'Admin', 'Empresa', 'admin_empresa', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
      `);
      if (existingAdmin.rows.length === 0) usersAdded++;
    }

    // SuperAdministrador
    {
      const passwordHash = await bcrypt.hash('SuperAdmin@123456', 10);
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active)
        VALUES (${demoSuperAdminId}, ${tenantId}, 'superadmin', 'superadmin@cmms.com', ${passwordHash}, 'Super', 'Administrador', 'superadmin', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
      `);
      if (existingSuperAdmin.rows.length === 0) usersAdded++;
    }

    // Técnico
    {
      const passwordHash = await bcrypt.hash('Tecnico@123456', 10);
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active)
        VALUES (${demoTechId}, ${tenantId}, 'tecnico', 'tecnico@cmms.com', ${passwordHash}, 'Técnico', 'CMMS', 'tecnico', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
      `);
      if (existingTech.rows.length === 0) usersAdded++;
    }

    // Gestor Fábrica
    {
      const passwordHash = await bcrypt.hash('Gestor@123456', 10);
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active)
        VALUES (${demoManagerId}, ${tenantId}, 'gestor', 'gestor@cmms.com', ${passwordHash}, 'Gestor', 'Fábrica', 'gestor_manutencao', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
      `);
      if (existingManager.rows.length === 0) usersAdded++;
    }

    // Supervisor
    {
      const passwordHash = await bcrypt.hash('Supervisor@123456', 10);
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active)
        VALUES (${demoSupervisorId}, ${tenantId}, 'supervisor', 'supervisor@cmms.com', ${passwordHash}, 'Supervisor', 'CMMS', 'supervisor', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
      `);
      if (existingSupervisor.rows.length === 0) usersAdded++;
    }

    // Operador
    {
      const passwordHash = await bcrypt.hash('Operador@123456', 10);
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active)
        VALUES (${demoOperatorId}, ${tenantId}, 'operador', 'operador@cmms.com', ${passwordHash}, 'Operador', 'CMMS', 'operador', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
      `);
      if (existingOperator.rows.length === 0) usersAdded++;
    }

    // Link users to plant (with conflict handling)
    await db
      .insert(userPlants)
      .values([
        { id: uuidv4(), user_id: demoSuperAdminId, plant_id: demoPlantId, role: 'superadmin' },
        { id: uuidv4(), user_id: demoAdminId, plant_id: demoPlantId, role: 'admin_empresa' },
        { id: uuidv4(), user_id: demoManagerId, plant_id: demoPlantId, role: 'gestor_manutencao' },
        { id: uuidv4(), user_id: demoSupervisorId, plant_id: demoPlantId, role: 'supervisor' },
        { id: uuidv4(), user_id: demoTechId, plant_id: demoPlantId, role: 'tecnico' },
        { id: uuidv4(), user_id: demoOperatorId, plant_id: demoPlantId, role: 'operador' },
      ])
      .onConflictDoNothing();

    // Insert sample assets with fixed IDs
    const assetBaseIds = [
      '20000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000003',
      '20000000-0000-0000-0000-000000000004',
      '20000000-0000-0000-0000-000000000005',
    ];

    for (let i = 0; i < 5; i++) {
      const existingAsset = await db.execute(
        sql`SELECT id FROM assets WHERE id = ${assetBaseIds[i]}`,
      );

      if (existingAsset.rows.length === 0) {
        await db
          .insert(assets)
          .values({
            id: assetBaseIds[i],
            tenant_id: tenantId,
            plant_id: demoPlantId,
            category_id: demoCategoryId,
            name: `Equipamento Demo ${i + 1}`,
            code: `DEMO-${String(i + 1).padStart(3, '0')}`,
            model: `Model-X${i + 1}`,
            manufacturer: 'TechMakers Inc',
            serial_number: `SN-DEMO-${String(i + 1).padStart(5, '0')}`,
            location: `Seção ${i + 1}`,
            status: 'operacional',
            is_critical: i === 0,
            meter_type: 'hours',
          })
          .onConflictDoNothing();
        assetsAdded++;
      }
    }

    // Maintenance plans & tasks (first 3 assets)
    const planBaseIds = [
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000003',
    ];

    for (let i = 0; i < 3; i++) {
      const existingPlan = await db.execute(
        sql`SELECT id FROM maintenance_plans WHERE id = ${planBaseIds[i]}`,
      );

      if (existingPlan.rows.length === 0) {
        await db
          .insert(maintenancePlans)
          .values({
            id: planBaseIds[i],
            tenant_id: tenantId,
            asset_id: assetBaseIds[i],
            name: `Plano Preventivo Demo ${i + 1}`,
            description: 'Plano de manutenção preventiva mensal',
            type: 'preventiva',
            frequency_type: 'days',
            frequency_value: 30,
            is_active: true,
          })
          .onConflictDoNothing();
        plansAdded++;

        // Tasks for this plan
        await db
          .insert(maintenanceTasks)
          .values([
            {
              id: uuidv4(),
              tenant_id: tenantId,
              plan_id: planBaseIds[i],
              description: 'Inspeção visual e limpeza',
              sequence: 1,
            },
            {
              id: uuidv4(),
              tenant_id: tenantId,
              plan_id: planBaseIds[i],
              description: 'Verificar níveis e ruídos',
              sequence: 2,
            },
          ])
          .onConflictDoNothing();
      }
    }

    const workOrderSeedRows: Array<{
      id: string;
      assetIndex: number;
      title: string;
      status: 'aberta' | 'em_analise' | 'em_execucao' | 'concluida';
      priority: 'baixa' | 'media' | 'alta' | 'critica';
      assignedTo?: string | null;
      createdBy: string;
      planIndex?: number | null;
    }> = [
      {
        id: '50000000-0000-0000-0000-000000000001',
        assetIndex: 0,
        planIndex: 0,
        assignedTo: demoTechId,
        createdBy: demoAdminId,
        title: 'Ordem Demo 1 (atribuída)',
        status: 'aberta',
        priority: 'media',
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        assetIndex: 1,
        planIndex: 1,
        assignedTo: demoTechId,
        createdBy: demoAdminId,
        title: 'Ordem Demo 2 (em execução)',
        status: 'em_execucao',
        priority: 'media',
      },
      {
        id: '50000000-0000-0000-0000-000000000003',
        assetIndex: 2,
        planIndex: 2,
        assignedTo: demoTechId,
        createdBy: demoAdminId,
        title: 'Ordem Demo 3 (concluída)',
        status: 'concluida',
        priority: 'alta',
      },
      {
        id: '50000000-0000-0000-0000-000000000004',
        assetIndex: 3,
        planIndex: null,
        assignedTo: null,
        createdBy: demoAdminId,
        title: 'Ordem Demo 4 (disponível)',
        status: 'aberta',
        priority: 'baixa',
      },
      {
        id: '50000000-0000-0000-0000-000000000005',
        assetIndex: 4,
        planIndex: null,
        assignedTo: null,
        createdBy: demoOperatorId,
        title: 'Ordem Demo 5 (criada por operador)',
        status: 'aberta',
        priority: 'media',
      },
    ];

    for (const row of workOrderSeedRows) {
      const existingOrder = await db.execute(sql`SELECT id FROM work_orders WHERE id = ${row.id}`);
      if (existingOrder.rows.length > 0) continue;

      const now = new Date();
      const startedAt = row.status === 'em_execucao' ? now : undefined;
      const completedAt = row.status === 'concluida' ? now : undefined;

      await db
        .insert(workOrders)
        .values({
          id: row.id,
          tenant_id: tenantId,
          plant_id: demoPlantId,
          asset_id: assetBaseIds[row.assetIndex],
          plan_id: typeof row.planIndex === 'number' ? planBaseIds[row.planIndex] : null,
          assigned_to: row.assignedTo ?? null,
          created_by: row.createdBy,
          title: row.title,
          description: 'Ordem de trabalho demonstrativa',
          status: row.status,
          priority: row.priority,
          scheduled_date: now,
          started_at: startedAt,
          completed_at: completedAt,
          estimated_hours: '2',
          actual_hours: row.status === 'concluida' ? '1.5' : undefined,
          notes: 'Gerado automaticamente pelo seed demo',
        })
        .onConflictDoNothing();

      workOrdersAdded++;
    }

    // Spare parts with fixed IDs
    const sparePartBaseIds = [
      '40000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000003',
      '40000000-0000-0000-0000-000000000004',
      '40000000-0000-0000-0000-000000000005',
    ];

    for (let i = 0; i < 5; i++) {
      const existingPart = await db.execute(
        sql`SELECT id FROM spare_parts WHERE id = ${sparePartBaseIds[i]}`,
      );

      if (existingPart.rows.length === 0) {
        await db
          .insert(spareParts)
          .values({
            id: sparePartBaseIds[i],
            tenant_id: tenantId,
            code: `SP-DEMO-${String(i + 1).padStart(3, '0')}`,
            name: `Peça Sobressalente Demo ${i + 1}`,
            description: 'Item para manutenção',
            unit_cost: (25 * (i + 1)).toFixed(2),
            supplier_id: i < 3 ? demoSupplierId : null,
          })
          .onConflictDoNothing();
        partsAdded++;

        // Initial stock movement for this part
        await db
          .insert(stockMovements)
          .values({
            id: uuidv4(),
            tenant_id: tenantId,
            plant_id: demoPlantId,
            spare_part_id: sparePartBaseIds[i],
            type: 'entrada',
            quantity: 10 + i * 2,
            unit_cost: (20 + i * 5).toFixed(2),
            total_cost: ((20 + i * 5) * (10 + i * 2)).toFixed(2),
            notes: 'Stock inicial demo',
            created_by: demoAdminId,
          })
          .onConflictDoNothing();
      }
    }

    // Ensure supplier link exists for demo spare parts created before supplier_id was added
    await db.execute(sql`
      UPDATE spare_parts
      SET supplier_id = ${demoSupplierId}, updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND code LIKE 'SP-DEMO-%'
        AND supplier_id IS NULL;
    `);

    // Maintenance kit + items (used by Kits pages)
    const existingKit = await db.execute(
      sql`SELECT id FROM maintenance_kits WHERE id = ${demoKitId}`,
    );

    if (existingKit.rows.length === 0) {
      await db
        .insert(maintenanceKits)
        .values({
          id: demoKitId,
          tenant_id: tenantId,
          name: 'Kit Demo - Preventiva Mensal',
          notes: 'Kit de exemplo gerado automaticamente',
          plan_id: planBaseIds[0],
          category_id: demoCategoryId,
          is_active: true,
          created_by: demoAdminId,
          updated_by: demoAdminId,
        })
        .onConflictDoNothing();
    }

    const demoKitItemIds = [
      '70000000-0000-0000-0000-000000000011',
      '70000000-0000-0000-0000-000000000012',
    ];

    for (let i = 0; i < demoKitItemIds.length; i++) {
      const existingItem = await db.execute(
        sql`SELECT id FROM maintenance_kit_items WHERE id = ${demoKitItemIds[i]}`,
      );
      if (existingItem.rows.length === 0) {
        await db
          .insert(maintenanceKitItems)
          .values({
            id: demoKitItemIds[i],
            tenant_id: tenantId,
            kit_id: demoKitId,
            spare_part_id: sparePartBaseIds[i],
            quantity: 2 + i,
            created_by: demoAdminId,
          })
          .onConflictDoNothing();
      }
    }

    // Stock reservation (used by reservations flow)
    const demoReservationId = '80000000-0000-0000-0000-000000000001';
    const existingReservation = await db.execute(
      sql`SELECT id FROM stock_reservations WHERE id = ${demoReservationId}`,
    );
    if (existingReservation.rows.length === 0) {
      await db
        .insert(stockReservations)
        .values({
          id: demoReservationId,
          tenant_id: tenantId,
          plant_id: demoPlantId,
          work_order_id: '50000000-0000-0000-0000-000000000001',
          spare_part_id: sparePartBaseIds[0],
          quantity: 1,
          status: 'ativa',
          notes: 'Reserva demo gerada automaticamente',
          created_by: demoAdminId,
        })
        .onConflictDoNothing();
    }

    const note =
      usersAdded === 0 && assetsAdded === 0
        ? 'All demo data already exists. Use "Clear All Data" to reset before seeding again.'
        : 'New demo data added successfully!';

    // Seed a few demo notifications (best-effort)
    try {
      const existingNotif = await db.execute(
        sql`SELECT id FROM notifications WHERE tenant_id = ${tenantId} AND (user_id = ${demoAdminId} OR user_id = ${demoTechId}) LIMIT 1;`,
      );

      if (existingNotif.rows.length === 0) {
        await db
          .insert(notifications)
          .values([
            {
              tenant_id: tenantId,
              user_id: demoAdminId,
              plant_id: demoPlantId,
              event_type: 'stock_low',
              title: 'Stock minimo',
              message: 'Parafuso demo abaixo do minimo (2/5).',
              level: 'warning',
              entity: 'spare-part',
              entity_id: '50000000-0000-0000-0000-000000000001',
              is_read: false,
            },
            {
              tenant_id: tenantId,
              user_id: demoTechId,
              plant_id: demoPlantId,
              event_type: 'work_order_assigned',
              title: 'Ordem atribuída',
              message: 'Foi atribuída uma nova ordem de trabalho demo.',
              level: 'info',
              entity: 'work-order',
              entity_id: '40000000-0000-0000-0000-000000000001',
              is_read: false,
            },
          ])
          .onConflictDoNothing();
      }
    } catch {
      // ignore demo notification seeding failures
    }

    return {
      added: {
        users: usersAdded,
        plants: plantsAdded,
        assets: assetsAdded,
        maintenancePlans: plansAdded,
        workOrders: workOrdersAdded,
        spareParts: partsAdded,
      },
      note,
    };
  }
  /**
   * Initialize database with admin user (only works if DB is empty)
   * This endpoint does NOT require authentication
   */
  static async initialize(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await SetupController.ensureSchemaReady();

      // Check if there are any users in the database
      const userCount = await db.execute(sql`SELECT COUNT(*) FROM users;`);
      const count = Number(userCount.rows[0].count);

      if (count > 0) {
        res.status(400).json({
          success: false,
          error: 'Database already initialized. Users exist.',
          userCount: count,
        });
        return;
      }

      // Garante que a estrutura está atualizada logo no setup (inclui RBAC)
      const corrections = await SetupController.applyCorrectionsInternal();

      // Database is empty, create initial admin user
      let tenantId = req.tenantId || '';
      const tenantSlug = req.tenantSlug || DEFAULT_TENANT_SLUG;
      const adminId = uuidv4();
      const plantId = uuidv4();

      // Get admin credentials from environment or use defaults
      const adminEmail = process.env.ADMIN_EMAIL || 'superadmin@cmms.com';
      const adminUsername = process.env.ADMIN_USERNAME || 'superadmin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'SuperAdmin@123456';

      const normalizedAdminUsername = adminUsername.trim().toLowerCase();
      const normalizedAdminEmail = adminEmail.trim().toLowerCase();

      const techEmail = process.env.TECH_EMAIL || 'tecnico@cmms.com';
      const techUsername = process.env.TECH_USERNAME || 'tecnico';
      const techPassword = process.env.TECH_PASSWORD || 'Tecnico@123456';
      const normalizedTechUsername = techUsername.trim().toLowerCase();
      const normalizedTechEmail = techEmail.trim().toLowerCase();
      const techId = uuidv4();

      if (!tenantId) {
        await SetupController.ensureTenantsTable();
        const tenantIdToUse = tenantSlug === DEFAULT_TENANT_SLUG ? DEFAULT_TENANT_ID : uuidv4();
        const [tenant] = await db
          .insert(tenants)
          .values({
            id: tenantIdToUse,
            name: tenantSlug === DEFAULT_TENANT_SLUG ? 'Demo Company' : `Tenant ${tenantSlug}`,
            slug: tenantSlug,
            is_active: true,
          })
          .returning();
        tenantId = tenant.id;
      }

      // Seed RBAC do tenant (roles/permissões default)
      await SetupController.ensureRbacSeedForTenant(tenantId);

      // Insert default plant
      await db.insert(plants).values({
        id: plantId,
        tenant_id: tenantId,
        name: 'Fábrica Principal',
        code: 'PLANT-001',
        address: 'Rua Industrial, 123',
        city: 'Lisboa',
        country: 'Portugal',
        is_active: true,
      });

      // Insert admin user
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.insert(users).values({
        id: adminId,
        tenant_id: tenantId,
        username: normalizedAdminUsername,
        email: normalizedAdminEmail,
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'CMMS',
        role: 'superadmin',
        is_active: true,
      });

      // Insert demo technician user
      const techPasswordHash = await bcrypt.hash(techPassword, 10);
      await db.insert(users).values({
        id: techId,
        tenant_id: tenantId,
        username: normalizedTechUsername,
        email: normalizedTechEmail,
        password_hash: techPasswordHash,
        first_name: 'Tecnico',
        last_name: 'CMMS',
        role: 'tecnico',
        is_active: true,
      });

      // Link admin to plant
      await db
        .insert(userPlants)
        .values([
          {
            id: uuidv4(),
            user_id: adminId,
            plant_id: plantId,
            role: 'admin_empresa',
          },
          {
            id: uuidv4(),
            user_id: techId,
            plant_id: plantId,
            role: 'tecnico',
          },
        ])
        .onConflictDoNothing();

      res.json({
        success: true,
        message: 'Database initialized successfully with admin user',
        data: {
          adminEmail: normalizedAdminEmail,
          adminUsername: normalizedAdminUsername,
          techEmail: normalizedTechEmail,
          techUsername: normalizedTechUsername,
          plantId,
          corrections,
          note: 'You can now login with the admin credentials',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize database',
      });
    }
  }

  /**
   * Check database connection and tables status
   */
  static async checkStatus(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if tables exist
      const result = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      const tableCount = result.rows.length;

      // Check if there's data
      const userCount = await db.execute(sql`SELECT COUNT(*) FROM users;`);
      const tenantCount = await db.execute(sql`SELECT COUNT(*) FROM tenants;`);
      const plantCount = await db.execute(sql`SELECT COUNT(*) FROM plants;`);
      const assetCount = await db.execute(sql`SELECT COUNT(*) FROM assets;`);
      const planCount = await db.execute(sql`SELECT COUNT(*) FROM maintenance_plans;`);
      const taskCount = await db.execute(sql`SELECT COUNT(*) FROM maintenance_tasks;`);
      const sparePartCount = await db.execute(sql`SELECT COUNT(*) FROM spare_parts;`);
      const stockMovementCount = await db.execute(sql`SELECT COUNT(*) FROM stock_movements;`);
      const workOrderCount = await db.execute(sql`SELECT COUNT(*) FROM work_orders;`);
      const categoryCount = await db.execute(sql`SELECT COUNT(*) FROM asset_categories;`);
      const supplierCount = await db.execute(sql`SELECT COUNT(*) FROM suppliers;`);

      res.json({
        success: true,
        data: {
          connected: true,
          tablesCount: tableCount,
          tables: result.rows.map((r: any) => r.table_name),
          hasData: {
            tenants: Number(tenantCount.rows[0].count) > 0,
            users: Number(userCount.rows[0].count) > 0,
            plants: Number(plantCount.rows[0].count) > 0,
            assets: Number(assetCount.rows[0].count) > 0,
            maintenancePlans: Number(planCount.rows[0].count) > 0,
            maintenanceTasks: Number(taskCount.rows[0].count) > 0,
            spareParts: Number(sparePartCount.rows[0].count) > 0,
            stockMovements: Number(stockMovementCount.rows[0].count) > 0,
            workOrders: Number(workOrderCount.rows[0].count) > 0,
            categories: Number(categoryCount.rows[0].count) > 0,
            suppliers: Number(supplierCount.rows[0].count) > 0,
          },
          counts: {
            tenants: Number(tenantCount.rows[0].count),
            users: Number(userCount.rows[0].count),
            plants: Number(plantCount.rows[0].count),
            assets: Number(assetCount.rows[0].count),
            maintenancePlans: Number(planCount.rows[0].count),
            maintenanceTasks: Number(taskCount.rows[0].count),
            spareParts: Number(sparePartCount.rows[0].count),
            stockMovements: Number(stockMovementCount.rows[0].count),
            workOrders: Number(workOrderCount.rows[0].count),
            categories: Number(categoryCount.rows[0].count),
            suppliers: Number(supplierCount.rows[0].count),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check database status',
      });
    }
  }

  /**
   * Seed demo data into the database
   * This endpoint is idempotent - can be run multiple times without errors
   */
  static async seedDemoData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user is allowed (security-in-depth; route já exige setup:run)
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can seed demo data',
        });
        return;
      }

      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const tenantSlug = req.tenantSlug || DEFAULT_TENANT_SLUG;

      // Ensure schema is up-to-date before seeding (Drizzle push)
      await SetupController.ensureSchemaReady();

      // Mantém a BD atualizada antes de inserir demo
      await SetupController.applyCorrectionsInternal();

      // Garante RBAC base
      await SetupController.ensureRbacSeedForTenant(tenantId);

      const result = await SetupController.seedDemoDataInternal(tenantId, tenantSlug);
      const { added, note } = result;

      res.json({
        success: true,
        message:
          added.users > 0 || added.assets > 0
            ? 'Demo data seeded successfully'
            : 'Demo data already exists - no changes made',
        data: {
          added,
          note,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed demo data',
      });
    }
  }

  private static async clearAllInternal(includeTenants: boolean): Promise<void> {
    const tables = [
      'stock_reservations',
      'stock_movements',
      'meter_readings',
      'attachments',
      'audit_logs',
      'work_order_tasks',
      'work_orders',
      'maintenance_tasks',
      'maintenance_plans',
      'maintenance_kit_items',
      'maintenance_kits',
      'assets',
      'spare_parts',
      'suppliers',
      'asset_categories',
      'user_plants',
      'users',
      'plants',
    ];

    if (includeTenants) {
      tables.push('tenants');
    }

    for (const table of tables) {
      await db.execute(
        sql.raw(
          `DO $$
BEGIN
  IF to_regclass('public.${table}') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ${table} CASCADE';
  END IF;
END $$;`
        )
      );
    }
  }

  private static async resetPublicSchemaInternal(): Promise<void> {
    // Full rebuild: guarantees schema is recreated from current code.
    // Prefer this over ALTER-based pushes on existing DBs (can require interactive confirmation).
    await db.execute(sql.raw('DROP SCHEMA IF EXISTS public CASCADE;'));
    await db.execute(sql.raw('CREATE SCHEMA public;'));
  }

  private static async seedMinimalAdminInternal(
    tenantId: string,
    tenantSlug: string,
  ): Promise<{
    added: {
      users: number;
      plants: number;
      assets: number;
      maintenancePlans: number;
      workOrders: number;
      spareParts: number;
    };
    note: string;
  }> {
    await SetupController.ensureTenantsTable();
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: 'Demo Company',
        slug: tenantSlug,
        is_active: true,
      })
      .onConflictDoNothing();

    const demoPlantId = '0fab0000-0000-0000-0000-000000000001';
    const demoSuperAdminId = '00000001-0000-0000-0000-000000000006';

    let usersAdded = 0;
    let plantsAdded = 0;

    const existingPlant = await db.execute(sql`SELECT id FROM plants WHERE id = ${demoPlantId}`);
    if (existingPlant.rows.length === 0) {
      await db
        .insert(plants)
        .values({
          id: demoPlantId,
          tenant_id: tenantId,
          name: 'Fábrica Principal',
          code: 'PLANT-001',
          address: 'Rua Industrial, 123',
          city: 'Lisboa',
          country: 'Portugal',
          is_active: true,
        })
        .onConflictDoNothing();
      plantsAdded++;
    }

    const existingSuperAdmin = await db.execute(sql`SELECT id FROM users WHERE id = ${demoSuperAdminId}`);
    {
      const passwordHash = await bcrypt.hash('SuperAdmin@123456', 10);
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active)
        VALUES (${demoSuperAdminId}, ${tenantId}, 'superadmin', 'superadmin@cmms.com', ${passwordHash}, 'Super', 'Administrador', 'superadmin', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
      `);
      if (existingSuperAdmin.rows.length === 0) usersAdded++;
    }

    await db
      .insert(userPlants)
      .values([{ id: uuidv4(), user_id: demoSuperAdminId, plant_id: demoPlantId, role: 'superadmin' }])
      .onConflictDoNothing();

    return {
      added: {
        users: usersAdded,
        plants: plantsAdded,
        assets: 0,
        maintenancePlans: 0,
        workOrders: 0,
        spareParts: 0,
      },
      note: 'Minimal seed applied (superadmin + 1 plant).',
    };
  }

  /**
   * Clear all data from database (dangerous!)
   */
  static async clearData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can clear data',
        });
        return;
      }

      await SetupController.clearAllInternal(false);

      res.json({
        success: true,
        message: 'All data cleared successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear data',
      });
    }
  }

  /**
   * Public bootstrap: run migrations + seed demo data (only when DB is empty)
   */
  static async bootstrapAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantSlug = DEFAULT_TENANT_SLUG;
      const tenantId = DEFAULT_TENANT_ID;

      const body: any = (req as any).body ?? {};
      const seedDemo = body.seedDemo !== false;
      const runSqlMigrations = body.runSqlMigrations !== false;
      const resetMode = String(body.resetMode || 'schema').toLowerCase();

      if (resetMode === 'schema') {
        try {
          await SetupController.resetPublicSchemaInternal();
        } catch {
          await SetupController.clearAllInternal(true);
        }
      } else {
        await SetupController.clearAllInternal(true);
      }

      await SetupController.ensureSchemaReady();

      const migrations = runSqlMigrations ? await SetupController.runMigrationsInternal() : [];
      await SetupController.ensureTenantsTable();
      const seedResult = seedDemo
        ? await SetupController.seedDemoDataInternal(tenantId, tenantSlug)
        : await SetupController.seedMinimalAdminInternal(tenantId, tenantSlug);

      const demoUsers = [
        {
          role: 'superadmin',
          username: 'superadmin',
          email: 'superadmin@cmms.com',
          passwordHint: 'SuperAdmin@123456',
        },
        {
          role: 'admin_empresa',
          username: 'admin',
          email: 'admin@cmms.com',
          passwordHint: 'Admin@123456',
        },
        {
          role: 'gestor_manutencao',
          username: 'gestor',
          email: 'gestor@cmms.com',
          passwordHint: 'Gestor@123456',
        },
        {
          role: 'supervisor',
          username: 'supervisor',
          email: 'supervisor@cmms.com',
          passwordHint: 'Supervisor@123456',
        },
        {
          role: 'tecnico',
          username: 'tecnico',
          email: 'tecnico@cmms.com',
          passwordHint: 'Tecnico@123456',
        },
        {
          role: 'operador',
          username: 'operador',
          email: 'operador@cmms.com',
          passwordHint: 'Operador@123456',
        },
      ];

      res.json({
        success: true,
        message: 'Database bootstrap completed',
        data: {
          tenantId,
          tenantSlug,
          loginUrl: '/login',
          migrations,
          seed: seedResult,
          options: {
            resetMode: resetMode === 'schema' ? 'schema' : 'truncate',
            runSqlMigrations,
            seedDemo,
          },
          adminUsername: 'superadmin',
          adminEmail: 'superadmin@cmms.com',
          passwordHint: 'SuperAdmin@123456',
          demoUsers,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bootstrap database',
      });
    }
  }

  /**
   * Run SQL migrations from scripts/database/migrations
   */
  static async runMigrations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run migrations',
        });
        return;
      }

      const before = await SetupController.getSqlMigrationsStatusInternal();
      const executedNow = await SetupController.runMigrationsInternal();
      const after = await SetupController.getSqlMigrationsStatusInternal();

      const tenantId = String(req.tenantId || DEFAULT_TENANT_ID);
      const userId = req.user ? String((req.user as any).id || '') : '';
      await SetupController.logSetupDbRun({
        tenantId,
        runType: 'migrate',
        userId: userId || null,
        migrations: executedNow,
      });

      if (before.availableFiles.length === 0) {
        res.json({
          success: true,
          message: 'No migrations found',
          data: {
            migrationsDir: before.migrationsDir,
            availableFiles: [],
            executedFiles: [],
            pendingFiles: [],
            executedFilesAll: [],
            pendingFilesBefore: [],
            pendingFilesAfter: [],
          },
        });
        return;
      }

      res.json({
        success: true,
        message: executedNow.length > 0 ? 'Migrations executed successfully' : 'No pending migrations to execute',
        data: {
          migrationsDir: before.migrationsDir,
          availableFiles: before.availableFiles,
          pendingFiles: before.pendingFiles,
          executedFiles: executedNow,
          executedFilesAll: after.executedFiles,
          pendingFilesBefore: before.pendingFiles,
          pendingFilesAfter: after.pendingFiles,
          files: executedNow,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run migrations',
      });
    }
  }

  /**
   * SQL migrations status (pending/executed) for scripts/database/migrations
   */
  static async getSqlMigrationsStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can view migrations status',
        });
        return;
      }

      const status = await SetupController.getSqlMigrationsStatusInternal();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get migrations status',
      });
    }
  }

  /**
   * Patch: add work_performed column to work_orders if missing
   */
  static async patchWorkOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      await SetupController.applyWorkOrdersPatchInternal();

      res.json({
        success: true,
        message: 'Patch aplicado com sucesso',
        data: { patch: 'work_orders_work_performed' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply patch',
      });
    }
  }

  /**
   * Patch: add downtime_type/downtime_category/root_cause/corrective_action to work_orders if missing
   */
  static async patchWorkOrdersDowntimeRca(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      await SetupController.applyWorkOrdersDowntimeRcaPatchInternal();

      res.json({
        success: true,
        message: 'Patch aplicado com sucesso',
        data: { patch: 'work_orders_downtime_rca_fields' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply patch',
      });
    }
  }

  /**
   * Patch: create stock_reservations table (Phase 3) if missing
   */
  static async patchStockReservations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      await SetupController.applyStockReservationsPatchInternal();

      res.json({
        success: true,
        message: 'Patch aplicado com sucesso',
        data: { patch: 'stock_reservations' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply patch',
      });
    }
  }

  /**
   * Patch: create maintenance_kits + maintenance_kit_items tables (Phase 3) if missing
   */
  static async patchMaintenanceKits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      await SetupController.applyMaintenanceKitsPatchInternal();

      res.json({
        success: true,
        message: 'Patch aplicado com sucesso',
        data: { patch: 'maintenance_kits' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply patch',
      });
    }
  }

  /**
   * Apply all known DB corrections (migrations + targeted patches)
   */
  static async applyCorrections(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      const result = await SetupController.applyCorrectionsInternal();

      // Garante RBAC base no tenant atual
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      await SetupController.ensureRbacSeedForTenant(tenantId);

      const userId = req.user ? String((req.user as any).id || '') : '';
      const migrations = Array.isArray((result as any)?.migrations) ? ((result as any).migrations as string[]) : [];
      const patches = Array.isArray((result as any)?.patches) ? ((result as any).patches as string[]) : [];
      await SetupController.logSetupDbRun({
        tenantId: String(tenantId),
        runType: 'corrections',
        userId: userId || null,
        migrations,
        patches,
      });

      res.json({
        success: true,
        message: 'Correcoes aplicadas com sucesso',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply corrections',
      });
    }
  }

  private static async applyWorkOrdersPatchInternal(): Promise<void> {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF to_regclass('public.work_orders') IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'work_performed'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN work_performed TEXT;
          END IF;
        END IF;
      END $$;
    `));
  }

  private static async applyWorkOrdersDowntimeRcaPatchInternal(): Promise<void> {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF to_regclass('public.work_orders') IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'downtime_type'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN downtime_type TEXT;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'downtime_category'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN downtime_category TEXT;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'root_cause'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN root_cause TEXT;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'corrective_action'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN corrective_action TEXT;
          END IF;
        END IF;
      END $$;
    `));
  }

  /**
   * Patch: add SLA pause/exclude helper columns to work_orders if missing
   */
  static async patchWorkOrdersSlaPause(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      await SetupController.applyWorkOrdersSlaPausePatchInternal();

      res.json({
        success: true,
        message: 'Patch aplicado com sucesso',
        data: { patch: 'work_orders_sla_pause' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply patch',
      });
    }
  }

  private static async applyWorkOrdersSlaPausePatchInternal(): Promise<void> {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF to_regclass('public.work_orders') IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'sla_exclude_pause'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN sla_exclude_pause boolean NOT NULL DEFAULT true;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'sla_paused_ms'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN sla_paused_ms integer NOT NULL DEFAULT 0;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_orders'
              AND column_name = 'sla_pause_started_at'
          ) THEN
            ALTER TABLE work_orders ADD COLUMN sla_pause_started_at timestamptz;
          END IF;
        END IF;
      END $$;
    `));
  }

  private static async applyStockReservationsPatchInternal(): Promise<void> {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'stock_reservation_status'
        ) THEN
          CREATE TYPE stock_reservation_status AS ENUM ('ativa', 'libertada', 'cancelada');
        END IF;

        IF to_regclass('public.stock_reservations') IS NULL THEN
          CREATE TABLE stock_reservations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
            work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
            spare_part_id uuid NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
            quantity integer NOT NULL,
            status stock_reservation_status NOT NULL DEFAULT 'ativa',
            notes text,
            created_by uuid NOT NULL REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            released_at timestamptz,
            released_by uuid REFERENCES users(id),
            release_reason text
          );

          CREATE INDEX stock_reservations_tenant_id_idx ON stock_reservations(tenant_id);
          CREATE INDEX stock_reservations_plant_id_idx ON stock_reservations(plant_id);
          CREATE INDEX stock_reservations_work_order_id_idx ON stock_reservations(work_order_id);
          CREATE INDEX stock_reservations_spare_part_id_idx ON stock_reservations(spare_part_id);
        END IF;
      END $$;
    `));
  }

  private static async applyMaintenanceKitsPatchInternal(): Promise<void> {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF to_regclass('public.maintenance_kits') IS NULL THEN
          CREATE TABLE maintenance_kits (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            name text NOT NULL,
            notes text,
            plan_id uuid REFERENCES maintenance_plans(id) ON DELETE SET NULL,
            category_id uuid REFERENCES asset_categories(id) ON DELETE SET NULL,
            is_active boolean NOT NULL DEFAULT true,
            created_by uuid NOT NULL REFERENCES users(id),
            updated_by uuid REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT maintenance_kits_plan_or_category_ck CHECK (NOT (plan_id IS NOT NULL AND category_id IS NOT NULL))
          );

          CREATE INDEX maintenance_kits_tenant_id_idx ON maintenance_kits(tenant_id);
          CREATE INDEX maintenance_kits_plan_id_idx ON maintenance_kits(plan_id);
          CREATE INDEX maintenance_kits_category_id_idx ON maintenance_kits(category_id);
        END IF;

        IF to_regclass('public.maintenance_kit_items') IS NULL THEN
          CREATE TABLE maintenance_kit_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            kit_id uuid NOT NULL REFERENCES maintenance_kits(id) ON DELETE CASCADE,
            spare_part_id uuid NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
            quantity integer NOT NULL,
            created_by uuid NOT NULL REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT maintenance_kit_items_quantity_ck CHECK (quantity > 0)
          );

          CREATE INDEX maintenance_kit_items_tenant_id_idx ON maintenance_kit_items(tenant_id);
          CREATE INDEX maintenance_kit_items_kit_id_idx ON maintenance_kit_items(kit_id);
          CREATE INDEX maintenance_kit_items_spare_part_id_idx ON maintenance_kit_items(spare_part_id);
        END IF;
      END $$;
    `));
  }

  /**
   * Patch: add tolerance_mode to maintenance_plans if missing
   */
  static async patchMaintenancePlansToleranceMode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      await SetupController.applyMaintenancePlansToleranceModePatchInternal();

      res.json({
        success: true,
        message: 'Patch aplicado com sucesso',
        data: { patch: 'maintenance_plans_tolerance_mode' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply patch',
      });
    }
  }

  private static async applyMaintenancePlansToleranceModePatchInternal(): Promise<void> {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF to_regclass('public.maintenance_plans') IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'maintenance_plans'
              AND column_name = 'tolerance_mode'
          ) THEN
            ALTER TABLE maintenance_plans ADD COLUMN tolerance_mode TEXT DEFAULT 'soft';
          END IF;
        END IF;
      END $$;
    `));
  }

  /**
   * Patch: add schedule_anchor_mode to maintenance_plans if missing
   */
  static async patchMaintenancePlansScheduleAnchorMode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !['superadmin', 'admin_empresa'].includes(String(req.user.role))) {
        res.status(403).json({
          success: false,
          error: 'Only superadmin/admin_empresa can run patches',
        });
        return;
      }

      await SetupController.applyMaintenancePlansScheduleAnchorModePatchInternal();

      res.json({
        success: true,
        message: 'Patch aplicado com sucesso',
        data: { patch: 'maintenance_plans_schedule_anchor_mode' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply patch',
      });
    }
  }

  private static async applyMaintenancePlansScheduleAnchorModePatchInternal(): Promise<void> {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF to_regclass('public.maintenance_plans') IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'maintenance_plans'
              AND column_name = 'schedule_anchor_mode'
          ) THEN
            ALTER TABLE maintenance_plans ADD COLUMN schedule_anchor_mode TEXT DEFAULT 'interval';
          END IF;
        END IF;
      END $$;
    `));
  }
}
