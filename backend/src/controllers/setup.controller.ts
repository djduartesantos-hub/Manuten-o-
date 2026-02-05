import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { db } from '../config/database';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import {
  plants,
  users,
  assetCategories,
  assets,
  userPlants,
  maintenancePlans,
  maintenanceTasks,
  spareParts,
  stockMovements,
} from '../db/schema';
import { DEFAULT_TENANT_ID } from '../config/constants';
import { v4 as uuidv4 } from 'uuid';

export class SetupController {
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
      const plantCount = await db.execute(sql`SELECT COUNT(*) FROM plants;`);
      const assetCount = await db.execute(sql`SELECT COUNT(*) FROM assets;`);

      res.json({
        success: true,
        data: {
          connected: true,
          tablesCount: tableCount,
          tables: result.rows.map((r: any) => r.table_name),
          hasData: {
            users: Number(userCount.rows[0].count) > 0,
            plants: Number(plantCount.rows[0].count) > 0,
            assets: Number(assetCount.rows[0].count) > 0,
          },
          counts: {
            users: Number(userCount.rows[0].count),
            plants: Number(plantCount.rows[0].count),
            assets: Number(assetCount.rows[0].count),
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

      const tenantId = DEFAULT_TENANT_ID;
      const adminId = uuidv4();
      const technicianId = uuidv4();
      const plantId = uuidv4();
      const categoryId = uuidv4();

      // Insert plant
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

      // Insert category
      await db.insert(assetCategories).values({
        id: categoryId,
        tenant_id: tenantId,
        name: 'Equipamento Pesado',
        description: 'Equipamentos de grande porte',
      });

      // Insert admin user
      const passwordHash = await bcrypt.hash('Admin@123456', 10);
      await db.insert(users).values({
        id: adminId,
        tenant_id: tenantId,
        email: 'admin@cmms.com',
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'CMMS',
        role: 'superadmin',
        is_active: true,
      });

      // Insert technician user
      const techPasswordHash = await bcrypt.hash('Tech@123456', 10);
      await db.insert(users).values({
        id: technicianId,
        tenant_id: tenantId,
        email: 'tech@cmms.com',
        password_hash: techPasswordHash,
        first_name: 'Tecnico',
        last_name: 'CMMS',
        role: 'technician',
        is_active: true,
      });

      // Link users to plant
      await db.insert(userPlants).values([
        { id: uuidv4(), user_id: adminId, plant_id: plantId },
        { id: uuidv4(), user_id: technicianId, plant_id: plantId },
      ]);

      // Insert sample assets
      const assetIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const assetId = uuidv4();
        assetIds.push(assetId);
        await db.insert(assets).values({
          id: assetId,
          tenant_id: tenantId,
          plant_id: plantId,
          category_id: categoryId,
          name: `Equipamento ${i}`,
          code: `ASSET-${String(i).padStart(3, '0')}`,
          model: `Model-X${i}`,
          manufacturer: 'TechMakers Inc',
          serial_number: `SN-${String(i).padStart(5, '0')}`,
          location: `Seção ${i}`,
          status: 'operacional',
          is_critical: i === 1,
          meter_type: 'hours',
        });
      }

      // Maintenance plans & tasks
      for (let i = 0; i < 3; i++) {
        const planId = uuidv4();
        await db.insert(maintenancePlans).values({
          id: planId,
          tenant_id: tenantId,
          asset_id: assetIds[i],
          name: `Plano Preventivo ${i + 1}`,
          description: 'Plano de manutenção preventiva mensal',
          type: 'preventiva',
          frequency_type: 'days',
          frequency_value: 30,
          is_active: true,
        });

        await db.insert(maintenanceTasks).values([
          {
            id: uuidv4(),
            tenant_id: tenantId,
            plan_id: planId,
            description: 'Inspeção visual e limpeza',
            sequence: 1,
          },
          {
            id: uuidv4(),
            tenant_id: tenantId,
            plan_id: planId,
            description: 'Verificar níveis e ruídos',
            sequence: 2,
          },
        ]);
      }

      // Spare parts
      const sparePartIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const sparePartId = uuidv4();
        sparePartIds.push(sparePartId);
        await db.insert(spareParts).values({
          id: sparePartId,
          tenant_id: tenantId,
          code: `SP-${String(i).padStart(3, '0')}`,
          name: `Peça Sobressalente ${i}`,
          description: 'Item para manutenção',
          unit_cost: (25 * i).toFixed(2),
        });
      }

      // Stock movements
      for (let i = 0; i < sparePartIds.length; i++) {
        await db.insert(stockMovements).values({
          id: uuidv4(),
          tenant_id: tenantId,
          plant_id: plantId,
          spare_part_id: sparePartIds[i],
          type: 'entrada',
          quantity: 10 + i * 2,
          unit_cost: (20 + i * 5).toFixed(2),
          total_cost: ((20 + i * 5) * (10 + i * 2)).toFixed(2),
          notes: 'Stock inicial',
          created_by: adminId,
        });
      }

      res.json({
        success: true,
        message: 'Demo data seeded successfully',
        data: {
          users: 2,
          plants: 1,
          assets: 5,
          maintenancePlans: 3,
          spareParts: 5,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed demo data',
      });
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

      // Truncate tables in correct order (respecting foreign keys)
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
}
