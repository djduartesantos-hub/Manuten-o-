import { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'node:child_process';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import {
  plants,
  tenants,
  users,
  assetCategories,
  assets,
  userPlants,
  maintenancePlans,
  maintenanceTasks,
  workOrders,
  spareParts,
  stockMovements,
} from '../db/schema.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

export class SetupController {
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

  private static async ensureSchemaReady(): Promise<void> {
    if (await SetupController.usersTableExists()) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const env = { ...process.env };
      const configured = env.PG_TLS_REJECT_UNAUTHORIZED ?? env.NODE_TLS_REJECT_UNAUTHORIZED;

      // Railway managed Postgres may use a self-signed cert chain.
      // Keep the TLS bypass limited to the migration subprocess.
      if (configured === undefined && env.NODE_ENV === 'production') {
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const child = spawn('npm', ['run', 'db:migrate'], {
        stdio: 'inherit',
        env,
      });

      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`db:migrate failed with exit code ${code}`));
      });
    });

    if (!(await SetupController.usersTableExists())) {
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
      throw new Error(`Database schema is not ready (users table missing)${suffix}`);
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

  private static async runMigrationsInternal(): Promise<string[]> {
    const { dir: migrationsDir, files: migrationFiles } = await SetupController.listMigrationFiles();

    if (!migrationsDir) {
      return [];
    }

    if (migrationFiles.length === 0) {
      return [];
    }

    const executed: string[] = [];

    for (const file of migrationFiles) {
      const fullPath = path.join(migrationsDir, file);
      const sqlContent = await fs.readFile(fullPath, 'utf-8');
      const trimmed = sqlContent.trim();

      if (!trimmed) {
        continue;
      }

      await db.execute(sql.raw(trimmed));
      executed.push(file);
    }

    return executed;
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
    const demoTechId = '00000000-0000-0000-0000-000000000002';
    const demoCategoryId = '10000000-0000-0000-0000-000000000001';

    let usersAdded = 0;
    let plantsAdded = 0;
    let assetsAdded = 0;
    let plansAdded = 0;
    let workOrdersAdded = 0;
    let partsAdded = 0;

    // Check what already exists
    const existingPlant = await db.execute(sql`SELECT id FROM plants WHERE id = ${demoPlantId}`);
    const existingAdmin = await db.execute(sql`SELECT id FROM users WHERE id = ${demoAdminId}`);
    const existingTech = await db.execute(sql`SELECT id FROM users WHERE username = 'tech'`);
    const existingCategory = await db.execute(
      sql`SELECT id FROM asset_categories WHERE id = ${demoCategoryId}`,
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

    // Insert admin user (only if doesn't exist)
    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash('Admin@123456', 10);
      await db
        .insert(users)
        .values({
          id: demoAdminId,
          tenant_id: tenantId,
          username: 'admin',
          email: 'admin@cmms.com',
          password_hash: passwordHash,
          first_name: 'Admin',
          last_name: 'CMMS',
          role: 'superadmin',
          is_active: true,
        })
        .onConflictDoNothing();
      usersAdded++;
    }

    // Insert technician user (only if doesn't exist)
    if (existingTech.rows.length === 0) {
      const techPasswordHash = await bcrypt.hash('Tech@123456', 10);
      await db
        .insert(users)
        .values({
          id: demoTechId,
          tenant_id: tenantId,
          username: 'tech',
          email: 'tech@cmms.com',
          password_hash: techPasswordHash,
          first_name: 'Tecnico',
          last_name: 'CMMS',
          role: 'tecnico',
          is_active: true,
        })
        .onConflictDoNothing();
      usersAdded++;
    }

    // Link users to plant (with conflict handling)
    await db
      .insert(userPlants)
      .values([
        { id: uuidv4(), user_id: demoAdminId, plant_id: demoPlantId },
        { id: uuidv4(), user_id: demoTechId, plant_id: demoPlantId },
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

    const workOrderBaseIds = [
      '50000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000002',
      '50000000-0000-0000-0000-000000000003',
    ];

    for (let i = 0; i < 3; i++) {
      const existingOrder = await db.execute(
        sql`SELECT id FROM work_orders WHERE id = ${workOrderBaseIds[i]}`,
      );

      if (existingOrder.rows.length === 0) {
        await db
          .insert(workOrders)
          .values({
            id: workOrderBaseIds[i],
            tenant_id: tenantId,
            plant_id: demoPlantId,
            asset_id: assetBaseIds[i],
            plan_id: planBaseIds[i],
            assigned_to: demoTechId,
            created_by: demoAdminId,
            title: `Ordem Demo ${i + 1}`,
            description: 'Ordem de trabalho demonstrativa',
            status: i === 1 ? 'em_execucao' : i === 2 ? 'concluida' : 'aberta',
            priority: i === 2 ? 'alta' : 'media',
            scheduled_date: new Date(),
            started_at: i >= 1 ? new Date() : undefined,
            completed_at: i === 2 ? new Date() : undefined,
            estimated_hours: '2',
            actual_hours: i === 2 ? '1.5' : undefined,
            notes: 'Gerado automaticamente pelo seed demo',
          })
          .onConflictDoNothing();
        workOrdersAdded++;
      }
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

    const note =
      usersAdded === 0 && assetsAdded === 0
        ? 'All demo data already exists. Use "Clear All Data" to reset before seeding again.'
        : 'New demo data added successfully!';

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

      // Database is empty, create initial admin user
      let tenantId = req.tenantId || '';
      const tenantSlug = req.tenantSlug || DEFAULT_TENANT_SLUG;
      const adminId = uuidv4();
      const plantId = uuidv4();

      // Get admin credentials from environment or use defaults
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@cmms.com';
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

      const normalizedAdminUsername = adminUsername.trim().toLowerCase();
      const normalizedAdminEmail = adminEmail.trim().toLowerCase();

      if (!tenantId) {
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

      // Link admin to plant
      await db.insert(userPlants).values({
        id: uuidv4(),
        user_id: adminId,
        plant_id: plantId,
      });

      res.json({
        success: true,
        message: 'Database initialized successfully with admin user',
        data: {
          adminEmail: normalizedAdminEmail,
          adminUsername: normalizedAdminUsername,
          plantId,
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
      // Check if user is admin
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can seed demo data',
        });
        return;
      }

      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const tenantSlug = req.tenantSlug || DEFAULT_TENANT_SLUG;
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

  /**
   * Clear all data from database (dangerous!)
   */
  static async clearData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can clear data',
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

      await SetupController.ensureSchemaReady();

      await SetupController.clearAllInternal(true);

      const migrations = await SetupController.runMigrationsInternal();
      await SetupController.ensureTenantsTable();
      const seedResult = await SetupController.seedDemoDataInternal(tenantId, tenantSlug);

      res.json({
        success: true,
        message: 'Database bootstrap completed',
        data: {
          tenantId,
          tenantSlug,
          loginUrl: '/login',
          migrations,
          seed: seedResult,
          adminUsername: 'admin',
          adminEmail: 'admin@cmms.com',
          passwordHint: 'Admin@123456',
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run migrations',
        });
        return;
      }

      const available = await SetupController.listMigrationFiles();
      const executed = await SetupController.runMigrationsInternal();

      if (available.files.length === 0) {
        res.json({
          success: true,
          message: 'No migrations found',
          data: {
            migrationsDir: available.dir,
            availableFiles: [],
            executedFiles: [],
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Migrations executed successfully',
        data: {
          migrationsDir: available.dir,
          availableFiles: available.files,
          executedFiles: executed,
          files: executed,
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
   * Patch: add work_performed column to work_orders if missing
   */
  static async patchWorkOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
        });
        return;
      }

      const available = await SetupController.listMigrationFiles();
      const migrations = await SetupController.runMigrationsInternal();
      await SetupController.applyWorkOrdersPatchInternal();
      await SetupController.applyWorkOrdersDowntimeRcaPatchInternal();
      await SetupController.applyWorkOrdersSlaPausePatchInternal();
      await SetupController.applyMaintenancePlansToleranceModePatchInternal();
      await SetupController.applyMaintenancePlansScheduleAnchorModePatchInternal();
      await SetupController.applyStockReservationsPatchInternal();
      await SetupController.applyMaintenanceKitsPatchInternal();

      res.json({
        success: true,
        message: 'Correcoes aplicadas com sucesso',
        data: {
          migrations,
          migrationsDir: available.dir,
          availableMigrationFiles: available.files,
          patches: [
            'work_orders_work_performed',
            'work_orders_downtime_rca_fields',
            'work_orders_sla_pause',
            'maintenance_plans_tolerance_mode',
            'maintenance_plans_schedule_anchor_mode',
            'stock_reservations',
            'maintenance_kits',
          ],
        },
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
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
      if (!req.user || req.user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Only superadmin can run patches',
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
