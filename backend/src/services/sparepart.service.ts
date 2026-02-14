import { db } from '../config/database.js';
import {
  spareParts,
  stockMovements,
  suppliers,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export interface CreateSparePartInput {
  code: string;
  name: string;
  description?: string;
  unit_cost?: string;
  min_stock?: number;
  supplier_id?: string;
}

export interface UpdateSparePartInput {
  code?: string;
  name?: string;
  description?: string;
  unit_cost?: string;
  min_stock?: number;
  supplier_id?: string;
}

export interface CreateStockMovementInput {
  spare_part_id: string;
  plant_id: string;
  work_order_id?: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  unit_cost?: string;
  notes?: string;
}

export class SparePartService {
  /**
   * Get all spare parts for a tenant
   */
  async getSpareParts(
    tenant_id: string,
    filters?: {
      supplier_id?: string;
      search?: string;
    }
  ) {
    let query = db
      .select({
        id: spareParts.id,
        tenant_id: spareParts.tenant_id,
        code: spareParts.code,
        name: spareParts.name,
        description: spareParts.description,
        unit_cost: spareParts.unit_cost,
        min_stock: spareParts.min_stock,
        supplier_id: spareParts.supplier_id,
        supplier_name: suppliers.name,
        created_at: spareParts.created_at,
        updated_at: spareParts.updated_at,
      })
      .from(spareParts)
      .leftJoin(suppliers, eq(spareParts.supplier_id, suppliers.id));

    // Build conditions array
    const conditions = [eq(spareParts.tenant_id, tenant_id)];

    if (filters?.supplier_id) {
      conditions.push(eq(spareParts.supplier_id, filters.supplier_id));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        sql`${spareParts.code} ILIKE ${searchPattern} OR ${spareParts.name} ILIKE ${searchPattern}`
      );
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    } else {
      query = query.where(conditions[0]);
    }

    return await query.orderBy(desc(spareParts.created_at));
  }

  /**
   * Get a single spare part by ID
   */
  async getSparePartById(tenant_id: string, spare_part_id: string) {
    const part = await db
      .select({
        id: spareParts.id,
        tenant_id: spareParts.tenant_id,
        code: spareParts.code,
        name: spareParts.name,
        description: spareParts.description,
        unit_cost: spareParts.unit_cost,
        min_stock: spareParts.min_stock,
        supplier_id: spareParts.supplier_id,
        supplier_name: suppliers.name,
        created_at: spareParts.created_at,
        updated_at: spareParts.updated_at,
      })
      .from(spareParts)
      .leftJoin(suppliers, eq(spareParts.supplier_id, suppliers.id))
      .where(
        and(eq(spareParts.tenant_id, tenant_id), eq(spareParts.id, spare_part_id))
      )
      .limit(1);

    if (!part.length) {
      throw new Error('Spare part not found');
    }

    return part[0];
  }

  /**
   * Create a new spare part
   */
  async createSparePart(tenant_id: string, input: CreateSparePartInput) {
    // Check if code already exists
    const existing = await db
      .select({ id: spareParts.id })
      .from(spareParts)
      .where(
        and(
          eq(spareParts.tenant_id, tenant_id),
          eq(spareParts.code, input.code)
        )
      )
      .limit(1);

    if (existing.length) {
      throw new Error('Spare part with this code already exists');
    }

    const [part] = await db
      .insert(spareParts)
      .values({
        tenant_id,
        code: input.code,
        name: input.name,
        description: input.description,
        unit_cost: input.unit_cost ? parseFloat(input.unit_cost).toString() : undefined,
        min_stock: input.min_stock ?? 0,
        supplier_id: input.supplier_id,
      })
      .returning();

    return this.getSparePartById(tenant_id, part.id);
  }

  /**
   * Update a spare part
   */
  async updateSparePart(
    tenant_id: string,
    spare_part_id: string,
    input: UpdateSparePartInput
  ) {
    const part = await this.getSparePartById(tenant_id, spare_part_id);

    // Check if new code conflicts with existing
    if (input.code && input.code !== part.code) {
      const existing = await db
        .select({ id: spareParts.id })
        .from(spareParts)
        .where(
          and(
            eq(spareParts.tenant_id, tenant_id),
            eq(spareParts.code, input.code)
          )
        )
        .limit(1);

      if (existing.length) {
        throw new Error('Spare part with this code already exists');
      }
    }

    await db
      .update(spareParts)
      .set({
        code: input.code ?? part.code,
        name: input.name ?? part.name,
        description: input.description ?? part.description,
        unit_cost: input.unit_cost
          ? parseFloat(input.unit_cost).toString()
          : part.unit_cost,
        min_stock: input.min_stock ?? part.min_stock,
        supplier_id: input.supplier_id ?? part.supplier_id,
        updated_at: new Date(),
      })
      .where(eq(spareParts.id, spare_part_id));

    return this.getSparePartById(tenant_id, spare_part_id);
  }

  /**
   * Delete a spare part
   */
  async deleteSparePart(tenant_id: string, spare_part_id: string) {
    await this.getSparePartById(tenant_id, spare_part_id);

    await db
      .delete(spareParts)
      .where(
        and(
          eq(spareParts.tenant_id, tenant_id),
          eq(spareParts.id, spare_part_id)
        )
      );

    return { success: true };
  }

  /**
   * Get current stock quantity for a spare part at a plant
   */
  async getStockQuantity(
    tenant_id: string,
    spare_part_id: string,
    plant_id: string
  ): Promise<number> {
    const result = await db
      .select({
        quantity: sql<number>`SUM(CASE WHEN type = 'entrada' OR type = 'ajuste' THEN quantity ELSE -quantity END)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenant_id, tenant_id),
          eq(stockMovements.spare_part_id, spare_part_id),
          eq(stockMovements.plant_id, plant_id)
        )
      );

    const quantity = result[0]?.quantity;
    return typeof quantity === 'number' ? quantity : 0;
  }

  /**
   * Record a stock movement
   */
  async createStockMovement(
    tenant_id: string,
    user_id: string,
    input: CreateStockMovementInput
  ) {
    // Verify spare part exists
    await this.getSparePartById(tenant_id, input.spare_part_id);

    if (!input.quantity || Number(input.quantity) <= 0) {
      throw new Error('Quantidade deve ser positiva');
    }

    if (input.type === 'saida') {
      const currentQty = await this.getStockQuantity(tenant_id, input.spare_part_id, input.plant_id);
      if (currentQty < Number(input.quantity)) {
        throw new Error(`Stock insuficiente. Disponível: ${currentQty}`);
      }
    }

    // Calculate total cost
    let totalCost: string | undefined;
    if (input.unit_cost && input.quantity) {
      const unitCost = parseFloat(input.unit_cost);
      totalCost = (unitCost * input.quantity).toString();
    }

    const [movement] = await db
      .insert(stockMovements)
      .values({
        tenant_id,
        plant_id: input.plant_id,
        spare_part_id: input.spare_part_id,
        work_order_id: input.work_order_id,
        type: input.type,
        quantity: input.quantity,
        unit_cost: input.unit_cost ? parseFloat(input.unit_cost).toString() : undefined,
        total_cost: totalCost,
        notes: input.notes,
        created_by: user_id,
      })
      .returning();

    return this.getStockMovementById(tenant_id, movement.id);
  }

  /**
   * Get stock movement by ID
   */
  async getStockMovementById(tenant_id: string, movement_id: string) {
    const movement = await db
      .select({
        id: stockMovements.id,
        tenant_id: stockMovements.tenant_id,
        plant_id: stockMovements.plant_id,
        spare_part_id: stockMovements.spare_part_id,
        work_order_id: stockMovements.work_order_id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        unit_cost: stockMovements.unit_cost,
        total_cost: stockMovements.total_cost,
        notes: stockMovements.notes,
        created_by: stockMovements.created_by,
        created_at: stockMovements.created_at,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenant_id, tenant_id),
          eq(stockMovements.id, movement_id)
        )
      )
      .limit(1);

    if (!movement.length) {
      throw new Error('Stock movement not found');
    }

    return movement[0];
  }

  /**
   * Get stock movements for a spare part
   */
  async getStockMovementsByPart(
    tenant_id: string,
    spare_part_id: string,
    plant_id?: string
  ) {
    // Verify spare part exists
    await this.getSparePartById(tenant_id, spare_part_id);

    // Build conditions array
    const conditions = [
      eq(stockMovements.tenant_id, tenant_id),
      eq(stockMovements.spare_part_id, spare_part_id),
    ];

    if (plant_id) {
      conditions.push(eq(stockMovements.plant_id, plant_id));
    }

    return await db
      .select({
        id: stockMovements.id,
        tenant_id: stockMovements.tenant_id,
        plant_id: stockMovements.plant_id,
        spare_part_id: stockMovements.spare_part_id,
        work_order_id: stockMovements.work_order_id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        unit_cost: stockMovements.unit_cost,
        total_cost: stockMovements.total_cost,
        notes: stockMovements.notes,
        created_by: stockMovements.created_by,
        created_at: stockMovements.created_at,
      })
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.created_at));
  }

  /**
   * Get stock movements for a plant
   */
  async getStockMovementsByPlant(tenant_id: string, plant_id: string) {
    return await db
      .select({
        id: stockMovements.id,
        tenant_id: stockMovements.tenant_id,
        plant_id: stockMovements.plant_id,
        spare_part_id: stockMovements.spare_part_id,
        work_order_id: stockMovements.work_order_id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        unit_cost: stockMovements.unit_cost,
        total_cost: stockMovements.total_cost,
        notes: stockMovements.notes,
        created_by: stockMovements.created_by,
        created_at: stockMovements.created_at,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenant_id, tenant_id),
          eq(stockMovements.plant_id, plant_id)
        )
      )
      .orderBy(desc(stockMovements.created_at));
  }

  /**
   * Get stock summary per plant (total entries and exits)
   */
  async getStockSummary(tenant_id: string, spare_part_id: string) {
    // Verify spare part exists
    await this.getSparePartById(tenant_id, spare_part_id);

    const summary = await db
      .select({
        plant_id: stockMovements.plant_id,
        entrada: sql`SUM(CASE WHEN type = 'entrada' THEN quantity ELSE 0 END)`,
        saida: sql`SUM(CASE WHEN type = 'saida' THEN quantity ELSE 0 END)`,
        ajuste: sql`SUM(CASE WHEN type = 'ajuste' THEN quantity ELSE 0 END)`,
        total: sql`SUM(CASE WHEN type = 'entrada' OR type = 'ajuste' THEN quantity ELSE -quantity END)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenant_id, tenant_id),
          eq(stockMovements.spare_part_id, spare_part_id)
        )
      )
      .groupBy(stockMovements.plant_id);

    return summary;
  }
}
