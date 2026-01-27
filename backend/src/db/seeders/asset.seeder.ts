import { db } from '../config/database';
import { assets, assetCategories, plants, tenants } from '../db/schema';

const ASSET_CATEGORIES_DATA = [
  { name: 'Bomba', description: 'Equipamentos de bombeamento' },
  { name: 'Motor Elétrico', description: 'Motores elétricos para diversos fins' },
  { name: 'Compressor', description: 'Compressores de ar' },
  { name: 'Turbina', description: 'Turbinas hidráulicas e de vapor' },
  { name: 'Gerador', description: 'Geradores elétricos' },
  { name: 'Transformador', description: 'Transformadores de potência' },
  { name: 'Válvula', description: 'Válvulas de controle e isolamento' },
  { name: 'Caixa Redutora', description: 'Redutor de velocidade e caixas de engrenagens' },
  { name: 'Correia', description: 'Correias e polias' },
  { name: 'Rolamento', description: 'Rolamentos e mancais' },
];

const ASSET_NAMES = [
  { category: 0, names: ['Bomba Centrífuga P-001', 'Bomba Centrífuga P-002', 'Bomba Parafuso P-003', 'Bomba Diafragma P-004'] },
  { category: 1, names: ['Motor 100 HP M-001', 'Motor 50 HP M-002', 'Motor 200 HP M-003', 'Motor 25 HP M-004'] },
  { category: 2, names: ['Compressor 50 L C-001', 'Compressor 75 L C-002', 'Compressor 100 L C-003'] },
  { category: 3, names: ['Turbina T-001', 'Turbina T-002', 'Turbina T-003'] },
  { category: 4, names: ['Gerador G-001', 'Gerador G-002', 'Gerador 30 kW G-003'] },
  { category: 5, names: ['Transformador 500 kVA TR-001', 'Transformador 1000 kVA TR-002'] },
  { category: 6, names: ['Válvula Esfera V-001', 'Válvula Globo V-002', 'Válvula Retenção V-003'] },
  { category: 7, names: ['Redutor 1:5 R-001', 'Redutor 1:10 R-002', 'Redutor 1:20 R-003'] },
  { category: 8, names: ['Correia A-001', 'Correia B-002', 'Polia P-001'] },
  { category: 9, names: ['Rolamento SKF 6008 RB-001', 'Rolamento FAG 6009 RB-002', 'Mancal M-001'] },
];

const MANUFACTURERS = [
  'Bosch Rexroth',
  'SKF',
  'SIEMENS',
  'ABB',
  'PHILIPS',
  'GENERAL ELECTRIC',
  'SULZER',
  'FLOWSERVE',
  'METSO',
  'XYLEM',
  'Parker Hannifin',
  'Eaton',
  'Danfoss',
  'Grundfos',
  'Baldor',
  'Graco',
  'SUMITOMO',
  'SEW-EURODRIVE',
  'Mitsubishi Electric',
  'Nachi Fujikoshi',
];

const LOCATIONS = [
  'Planta A - Setor 1',
  'Planta A - Setor 2',
  'Planta A - Setor 3',
  'Planta B - Setor 1',
  'Planta B - Setor 2',
  'Planta C - Setor 1',
  'Almoxarifado',
  'Depósito Central',
  'Linha de Produção 1',
  'Linha de Produção 2',
  'Subestação Elétrica',
  'Sala de Compressores',
  'Área de Transformadores',
];

const STATUSES = ['operacional', 'parado', 'manutencao'];
const METER_TYPES = ['horas', 'km', 'ciclos', 'outro'];

interface AssetCategoryData {
  name: string;
  description: string;
}

interface NameData {
  category: number;
  names: string[];
}

export async function seedAssets(tenantId: string, plantId: string) {
  try {
    console.log('🌱 Starting asset seeding...');

    // Create asset categories
    console.log('📦 Creating asset categories...');
    const categories = await db
      .insert(assetCategories)
      .values(
        ASSET_CATEGORIES_DATA.map((cat: AssetCategoryData) => ({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          name: cat.name,
          description: cat.description,
        }))
      )
      .returning();

    console.log(`✅ Created ${categories.length} categories`);

    // Create assets
    console.log('🔧 Creating assets...');
    const assetRecords = [];

    for (const categoryAssets of ASSET_NAMES) {
      const category = categories[categoryAssets.category];

      for (const assetName of categoryAssets.names) {
        const currentDate = new Date();
        const acquisitionDate = new Date(
          currentDate.getFullYear() - Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        );

        assetRecords.push({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          plant_id: plantId,
          category_id: category.id,
          name: assetName,
          code: `AST-${Math.random().toString(36).substring(7).toUpperCase()}`,
          description: `${assetName} - Asset management system`,
          manufacturer: MANUFACTURERS[Math.floor(Math.random() * MANUFACTURERS.length)],
          model: `MODEL-${Math.floor(Math.random() * 1000)}`,
          serial_number: `SN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
          qr_code: `QR-${crypto.randomUUID()}`,
          status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
          acquisition_date: acquisitionDate,
          acquisition_cost: (Math.random() * 50000 + 1000).toFixed(2),
          meter_type: METER_TYPES[Math.floor(Math.random() * METER_TYPES.length)],
          current_meter_value: (Math.random() * 10000).toFixed(2),
          is_critical: Math.random() > 0.7,
        });
      }
    }

    const createdAssets = await db.insert(assets).values(assetRecords).returning();

    console.log(`✅ Created ${createdAssets.length} assets`);
    console.log('🎉 Asset seeding completed successfully!');

    return {
      success: true,
      categoriesCreated: categories.length,
      assetsCreated: createdAssets.length,
    };
  } catch (error) {
    console.error('❌ Error seeding assets:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  (async () => {
    try {
      // You need to provide actual tenant and plant IDs
      const tenantId = process.env.SEED_TENANT_ID || '123e4567-e89b-12d3-a456-426614174000';
      const plantId = process.env.SEED_PLANT_ID || '223e4567-e89b-12d3-a456-426614174000';

      await seedAssets(tenantId, plantId);
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}
