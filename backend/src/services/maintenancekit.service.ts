import { and, desc, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { maintenanceKitItems, maintenanceKits, spareParts } from '../db/schema.js';

export interface CreateMaintenanceKitInput {
  name?: string;
  notes?: string;
  plan_id?: string;
  category_id?: string;
  is_active?: boolean;
}

export interface UpsertMaintenanceKitItemsInput {
  items?: Array<{ spare_part_id?: string; quantity?: number }>;
}

export class MaintenanceKitService {
  async listKits(
    tenantId: string,
    filters?: { plan_id?: string; category_id?: string; is_active?: boolean },
  ) {
    const conditions: any[] = [eq(maintenanceKits.tenant_id, tenantId)];
    if (filters?.plan_id) conditions.push(eq(maintenanceKits.plan_id, filters.plan_id));
    if (filters?.category_id) conditions.push(eq(maintenanceKits.category_id, filters.category_id));
    if (filters?.is_active !== undefined) conditions.push(eq(maintenanceKits.is_active, filters.is_active));

    return db
      .select({
        id: maintenanceKits.id,
        tenant_id: maintenanceKits.tenant_id,
        name: maintenanceKits.name,
        notes: maintenanceKits.notes,
        plan_id: maintenanceKits.plan_id,
        category_id: maintenanceKits.category_id,
        is_active: maintenanceKits.is_active,
        created_at: maintenanceKits.created_at,
        updated_at: maintenanceKits.updated_at,
      })
      .from(maintenanceKits)
      .where(and(...conditions))
      .orderBy(desc(maintenanceKits.updated_at));
  }

  async getKitById(tenantId: string, kitId: string) {
    const kit = await db.query.maintenanceKits.findFirst({
      where: (fields: any, { and, eq }: any) => and(eq(fields.tenant_id, tenantId), eq(fields.id, kitId)),
    });

    if (!kit) {
      throw new Error('Kit not found');
    }

    return kit;
  }

  async createKit(tenantId: string, userId: string, input: CreateMaintenanceKitInput) {
    if (!input.name?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    // Keep it simple: allow a kit to be linked to a plan OR a category OR none.
    if (input.plan_id && input.category_id) {
      throw new Error('Kit: indique plan_id ou category_id (não ambos)');
    }

    const [kit] = await db
      .insert(maintenanceKits)
      .values({
        tenant_id: tenantId,
        name: input.name.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : null,
        plan_id: input.plan_id ?? null,
        category_id: input.category_id ?? null,
        is_active: input.is_active ?? true,
        created_by: userId,
        updated_by: userId,
      })
      .returning();

    return kit;
  }

  async updateKit(tenantId: string, userId: string, kitId: string, input: Partial<CreateMaintenanceKitInput>) {
    const existing = await this.getKitById(tenantId, kitId);

    const nextPlanId = Object.prototype.hasOwnProperty.call(input, 'plan_id')
      ? (input.plan_id ?? null)
      : (existing as any).plan_id;
    const nextCategoryId = Object.prototype.hasOwnProperty.call(input, 'category_id')
      ? (input.category_id ?? null)
      : (existing as any).category_id;

    if (nextPlanId && nextCategoryId) {
      throw new Error('Kit: indique plan_id ou category_id (não ambos)');
    }

    const [updated] = await db
      .update(maintenanceKits)
      .set({
        name: input.name?.trim() ? input.name.trim() : (existing as any).name,
        notes: Object.prototype.hasOwnProperty.call(input, 'notes')
          ? (input.notes?.trim() ? input.notes.trim() : null)
          : (existing as any).notes,
        plan_id: Object.prototype.hasOwnProperty.call(input, 'plan_id') ? (input.plan_id ?? null) : (existing as any).plan_id,
        category_id: Object.prototype.hasOwnProperty.call(input, 'category_id') ? (input.category_id ?? null) : (existing as any).category_id,
        is_active: Object.prototype.hasOwnProperty.call(input, 'is_active') ? Boolean(input.is_active) : (existing as any).is_active,
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(and(eq(maintenanceKits.tenant_id, tenantId), eq(maintenanceKits.id, kitId)))
      .returning();

    return updated;
  }

  async listKitItems(tenantId: string, kitId: string) {
    await this.getKitById(tenantId, kitId);

    return db
      .select({
        id: maintenanceKitItems.id,
        kit_id: maintenanceKitItems.kit_id,
        spare_part_id: maintenanceKitItems.spare_part_id,
        quantity: maintenanceKitItems.quantity,
        spare_part: {
          id: spareParts.id,
          code: spareParts.code,
          name: spareParts.name,
        },
      })
      .from(maintenanceKitItems)
      .leftJoin(spareParts, eq(maintenanceKitItems.spare_part_id, spareParts.id))
      .where(and(eq(maintenanceKitItems.tenant_id, tenantId), eq(maintenanceKitItems.kit_id, kitId)))
      .orderBy(desc(maintenanceKitItems.created_at));
  }

  async upsertKitItems(tenantId: string, userId: string, kitId: string, input: UpsertMaintenanceKitItemsInput) {
    await this.getKitById(tenantId, kitId);

    const items = input.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Indique pelo menos 1 item');
    }

    for (const item of items) {
      if (!item?.spare_part_id) throw new Error('Item inválido');
      if (!item?.quantity || Number(item.quantity) <= 0) throw new Error('Quantidade inválida');
    }

    // Replace-all approach (simple + deterministic)
    await db
      .delete(maintenanceKitItems)
      .where(and(eq(maintenanceKitItems.tenant_id, tenantId), eq(maintenanceKitItems.kit_id, kitId)));

    const rows = items.map((item) => ({
      tenant_id: tenantId,
      kit_id: kitId,
      spare_part_id: item.spare_part_id,
      quantity: Number(item.quantity),
      created_by: userId,
    }));

    await db.insert(maintenanceKitItems).values(rows);

    // touch kit updated_at
    await db
      .update(maintenanceKits)
      .set({ updated_at: new Date(), updated_by: userId })
      .where(and(eq(maintenanceKits.tenant_id, tenantId), eq(maintenanceKits.id, kitId)));

    return this.listKitItems(tenantId, kitId);
  }
}
