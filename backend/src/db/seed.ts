import { db } from '../config/database';
import bcrypt from 'bcrypt';
import {
  tenants,
  plants,
  users,
  assetCategories,
  assets,
  userPlants,
  maintenancePlans,
  maintenanceTasks,
  spareParts,
  stockMovements,
} from './schema';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create default tenant
    const tenantId = uuidv4();
    const adminId = uuidv4();
    const technicianId = uuidv4();
    const plantId = uuidv4();
    const categoryId = uuidv4();

    // Insert tenant
    await db.insert(tenants).values({
      id: tenantId,
      name: 'CMMS Enterprise Demo',
      slug: 'cmms-demo',
      description: 'Demo tenant for CMMS Enterprise',
      subscription_plan: 'enterprise',
      is_active: true,
    });

    console.log('✅ Tenant created');

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

    console.log('✅ Plant created');

    // Insert category
    await db.insert(assetCategories).values({
      id: categoryId,
      tenant_id: tenantId,
      name: 'Equipamento Pesado',
      description: 'Equipamentos de grande porte',
    });

    console.log('✅ Asset category created');

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

    console.log('✅ Admin user created');

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

    console.log('✅ Technician user created');

    // Link users to plant
    await db.insert(userPlants).values([
      { id: uuidv4(), user_id: adminId, plant_id: plantId },
      { id: uuidv4(), user_id: technicianId, plant_id: plantId },
    ]);

    console.log('✅ User plants created');

    // Insert sample assets
    const assetIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
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

    console.log('✅ Sample assets created');

    // Maintenance plans & tasks
    const planIds: string[] = [];
    for (let i = 0; i < assetIds.length; i++) {
      const planId = uuidv4();
      planIds.push(planId);
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

    console.log('✅ Maintenance plans and tasks created');

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

    console.log('✅ Spare parts created');

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

    console.log('✅ Stock movements created');

    console.log('🎉 Database seed completed successfully!');
    console.log('');
    console.log('📊 Demo data loaded:');
    console.log('   Tenant: CMMS Enterprise Demo');
    console.log('   Plant: Fábrica Principal');
    console.log('   Users: Admin + Technician');
    console.log('   Assets: 5 items');
    console.log('   Maintenance Plans: 3');
    console.log('   Tasks: 10+');
    console.log('   Spare Parts: 5');
    console.log('');
    console.log('🚀 You can now start the application:');
    console.log('   npm run dev');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Seed failed');
    console.error('');

    // Detailed error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('📋 Connection Error - PostgreSQL is not running');
        console.error('');
        console.error('Fix:');
        console.error('  1. Start PostgreSQL:');
        console.error('     Windows: Services > PostgreSQL > Start');
        console.error('     Linux:   sudo systemctl start postgresql');
        console.error('     macOS:   brew services start postgresql');
        console.error('');
        console.error('  2. Check your DATABASE_URL in backend/.env');
        console.error('     Should be: postgresql://user:password@localhost:5432/cmms_enterprise');
        console.error('');
        console.error('  3. Verify database exists:');
        console.error('     psql -U postgres -c "CREATE DATABASE cmms_enterprise;"');
        console.error('');
        console.error('  4. Apply schema first:');
        console.error('     npm run db:push');
        console.error('');
      } else if (error.message.includes('does not exist')) {
        console.error('📋 Database or Schema Error');
        console.error('');
        console.error('Fix:');
        console.error('  1. Create database: psql -U postgres -c "CREATE DATABASE cmms_enterprise;"');
        console.error('  2. Apply schema:    npm run db:push');
        console.error('  3. Run seed again:  npm run db:seed');
        console.error('');
      } else if (error.message.includes('password')) {
        console.error('📋 Authentication Error - Wrong PostgreSQL credentials');
        console.error('');
        console.error('Fix:');
        console.error('  1. Check DATABASE_URL in backend/.env');
        console.error('  2. Verify PostgreSQL superuser credentials');
        console.error('  3. Reset password if needed (see docs/GUIDES/DATABASE_SETUP_GUIDE.md)');
        console.error('');
      } else {
        console.error('Error details:', error.message);
        console.error('');
        console.error('📚 See docs/GUIDES/DATABASE_SETUP_GUIDE.md for troubleshooting');
        console.error('');
      }
    }

    console.error('Stack:', error instanceof Error ? error.stack : error);
    console.error('');
    process.exit(1);
  }
}

seed();
