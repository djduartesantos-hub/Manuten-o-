import { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
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
  spareParts,
  stockMovements,
} from '../db/schema.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

export class SetupController {
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

  private static async runMigrationsInternal(): Promise<string[]> {
    const migrationsDir = await SetupController.resolveMigrationsDir();

    if (!migrationsDir) {
      return [];
    }

    const entries = await fs.readdir(migrationsDir);
    const migrationFiles = entries
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

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

  private static async seedDemoDataInternal(
    tenantId: string,
    tenantSlug: string,
  ): Promise<{
    added: {
      users: number;
      plants: number;
      assets: number;
      maintenancePlans: number;
      spareParts: number;
    };
    note: string;
  }> {
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
    let partsAdded = 0;

    // Check what already exists
    const existingPlant = await db.execute(sql`SELECT id FROM plants WHERE id = ${demoPlantId}`);
    const existingAdmin = await db.execute(sql`SELECT id FROM users WHERE id = ${demoAdminId}`);
    const existingTech = await db.execute(sql`SELECT id FROM users WHERE email = 'tech@cmms.com'`);
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
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

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
        email: adminEmail,
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
          adminEmail,
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
    await db.execute(sql`TRUNCATE TABLE stock_movements CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE meter_readings CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE attachments CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE audit_logs CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE work_order_tasks CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE work_orders CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE maintenance_tasks CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE maintenance_plans CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE assets CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE spare_parts CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE suppliers CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE asset_categories CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE user_plants CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE users CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE plants CASCADE;`);

    if (includeTenants) {
      await db.execute(sql`TRUNCATE TABLE tenants CASCADE;`);
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
      const rawSlug = typeof req.body?.tenantSlug === 'string' ? req.body.tenantSlug : '';
      const tenantSlug = (rawSlug || DEFAULT_TENANT_SLUG).trim().toLowerCase();
      const tenantId = tenantSlug === DEFAULT_TENANT_SLUG ? DEFAULT_TENANT_ID : uuidv4();

      await SetupController.clearAllInternal(true);

      const migrations = await SetupController.runMigrationsInternal();
      const seedResult = await SetupController.seedDemoDataInternal(tenantId, tenantSlug);

      res.json({
        success: true,
        message: 'Database bootstrap completed',
        data: {
          tenantId,
          tenantSlug,
          loginUrl: `/t/${tenantSlug}/login`,
          migrations,
          seed: seedResult,
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

      const executed = await SetupController.runMigrationsInternal();

      if (executed.length === 0) {
        res.json({
          success: true,
          message: 'No migrations found',
          data: { files: [] },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Migrations executed successfully',
        data: { files: executed },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run migrations',
      });
    }
  }
}
