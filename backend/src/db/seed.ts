import { db } from '../config/database.js';
import bcrypt from 'bcryptjs';
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
  assetLifecycle,
  assetCertifications,
  assetInspections,
  assetCalibrations,
  assetTags,
} from './schema.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Use default tenant for seed
    const tenantId = DEFAULT_TENANT_ID;
    const adminId = uuidv4();
    const technicianId = uuidv4();
    const plantId = uuidv4();
    const categoryId = uuidv4();

    console.log('ℹ️  Using default tenant ID:', tenantId);

    await db.insert(tenants).values({
      id: tenantId,
      name: 'Demo Company',
      slug: DEFAULT_TENANT_SLUG,
      is_active: true,
    }).onConflictDoNothing();

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

    // Insert superadmin user
    const passwordHash = await bcrypt.hash('SuperAdmin@123456', 10);
    await db.insert(users).values({
      id: adminId,
      tenant_id: tenantId,
      username: 'superadmin',
      email: 'superadmin@cmms.com',
      password_hash: passwordHash,
      first_name: 'Super',
      last_name: 'Administrador',
      role: 'superadmin',
      is_active: true,
    });

    console.log('✅ Superadmin user created');

    // Insert technician user
    const techPasswordHash = await bcrypt.hash('Tecnico@123456', 10);
    await db.insert(users).values({
      id: technicianId,
      tenant_id: tenantId,
      username: 'tecnico',
      email: 'tecnico@cmms.com',
      password_hash: techPasswordHash,
      first_name: 'Técnico',
      last_name: 'CMMS',
      role: 'tecnico',
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

    // Compliance demo data
    if (assetIds.length > 0) {
      const primaryAssetId = assetIds[0];
      await db.insert(assetLifecycle).values({
        asset_id: primaryAssetId,
        tenant_id: tenantId,
        commissioning_date: new Date(new Date().getFullYear() - 3, 0, 15),
        warranty_expires_at: new Date(new Date().getFullYear() + 1, 0, 15),
        expected_lifespan_years: 8,
        depreciation_method: 'linear',
        depreciation_years: 8,
        depreciation_rate: '12.5',
        residual_value: '1500',
        replacement_due_at: new Date(new Date().getFullYear() + 5, 0, 15),
        notes: 'Plano de substituicao previsto para 5 anos.',
      }).onConflictDoNothing();

      const certificationId = uuidv4();
      await db.insert(assetCertifications).values({
        id: certificationId,
        tenant_id: tenantId,
        asset_id: primaryAssetId,
        certification_type: 'ISO 9001',
        standard: 'ISO 9001:2015',
        issuer: 'TUV',
        reference_code: 'ISO-9001-2026',
        issued_at: new Date(new Date().getFullYear() - 1, 6, 10),
        expires_at: new Date(new Date().getFullYear() + 1, 6, 10),
        status: 'valid',
        notes: 'Certificacao valida para auditorias anuais.',
      }).onConflictDoNothing();

      await db.insert(assetInspections).values({
        id: uuidv4(),
        tenant_id: tenantId,
        asset_id: primaryAssetId,
        certification_id: certificationId,
        inspection_date: new Date(),
        inspector: 'Eng. Marta Silva',
        result: 'passed',
        next_due_at: new Date(new Date().getFullYear(), new Date().getMonth() + 6, 1),
        notes: 'Sem nao conformidades.',
      }).onConflictDoNothing();

      await db.insert(assetCalibrations).values({
        id: uuidv4(),
        tenant_id: tenantId,
        asset_id: primaryAssetId,
        calibration_date: new Date(),
        due_at: new Date(new Date().getFullYear(), new Date().getMonth() + 12, 1),
        provider: 'CalibraLab',
        reference_code: 'CAL-2026-001',
        status: 'valid',
        notes: 'Calibracao anual.',
      }).onConflictDoNothing();

      await db.insert(assetTags).values({
        id: uuidv4(),
        tenant_id: tenantId,
        asset_id: primaryAssetId,
        plant_id: plantId,
        tag_type: 'qr',
        tag_code: `QR-${uuidv4()}`,
        status: 'assigned',
        assigned_at: new Date(),
        assigned_by: adminId,
        notes: 'Etiqueta principal do equipamento.',
      }).onConflictDoNothing();

      console.log('✅ Compliance demo data created');
    }

    console.log('🎉 Database seed completed successfully!');
    console.log('');
    console.log('📊 Demo data loaded:');
    console.log('   Plant: Fábrica Principal');
    console.log('   Users: Admin + Technician');
    console.log('   Assets: 5 items');
    console.log('   Maintenance Plans: 3');
    console.log('   Tasks: 10+');
    console.log('   Spare Parts: 5');
    console.log('   Compliance: lifecycle + certifications + inspections + calibrations + tags');
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
