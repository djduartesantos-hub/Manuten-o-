import { db } from '../config/database';
import bcrypt from 'bcrypt';
import { tenants, plants, users, assetCategories, assets } from './schema';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create default tenant
    const tenantId = uuidv4();
    const adminId = uuidv4();
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

    // Insert sample assets
    for (let i = 1; i <= 3; i++) {
      await db.insert(assets).values({
        id: uuidv4(),
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

    console.log('🎉 Database seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
