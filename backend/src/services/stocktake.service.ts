import { and, desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { stockMovements, stocktakeItems, stocktakes, spareParts } from '../db/schema.js';
import { SparePartService } from './sparepart.service.js';

export class StocktakeService {
  private sparePartService = new SparePartService();

  async list(tenantId: string, plantId: string, status?: string) {
    const conditions: any[] = [eq(stocktakes.tenant_id, tenantId), eq(stocktakes.plant_id, plantId)];
    if (status) conditions.push(eq(stocktakes.status, status as any));

    return db
      .select({
        id: stocktakes.id,
        tenant_id: stocktakes.tenant_id,
        plant_id: stocktakes.plant_id,
        status: stocktakes.status,
        notes: stocktakes.notes,
        created_by: stocktakes.created_by,
        created_at: stocktakes.created_at,
        closed_by: stocktakes.closed_by,
        closed_at: stocktakes.closed_at,
        close_notes: stocktakes.close_notes,
      })
      .from(stocktakes)
      .where(and(...conditions))
      .orderBy(desc(stocktakes.created_at));
  }

  private async computeExpectedQty(tenantId: string, plantId: string, sparePartId: string): Promise<number> {
    const result = await db
      .select({
        qty: sql<number>`COALESCE(SUM(CASE WHEN ${stockMovements.type} = 'entrada' OR ${stockMovements.type} = 'ajuste' THEN ${stockMovements.quantity} ELSE -${stockMovements.quantity} END), 0)::int`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenant_id, tenantId),
          eq(stockMovements.plant_id, plantId),
          eq(stockMovements.spare_part_id, sparePartId),
        ),
      );

    return Number(result?.[0]?.qty ?? 0);
  }

  async create(tenantId: string, plantId: string, userId: string, notes?: string) {
    const [created] = await db
      .insert(stocktakes)
      .values({
        tenant_id: tenantId,
        plant_id: plantId,
        status: 'aberta' as any,
        notes: notes?.trim() ? notes.trim() : null,
        created_by: userId,
        created_at: new Date(),
      } as any)
      .returning();

    const parts = await db
      .select({
        id: spareParts.id,
        unit_cost: spareParts.unit_cost,
      })
      .from(spareParts)
      .where(eq(spareParts.tenant_id, tenantId));

    for (const part of parts) {
      const expected = await this.computeExpectedQty(tenantId, plantId, String(part.id));
      await db
        .insert(stocktakeItems)
        .values({
          tenant_id: tenantId,
          stocktake_id: (created as any).id,
          spare_part_id: String(part.id),
          expected_qty: expected,
          counted_qty: null,
          unit_cost: part.unit_cost as any,
          created_at: new Date(),
          updated_at: new Date(),
        } as any)
        .onConflictDoNothing();
    }

    return this.getById(tenantId, String((created as any).id));
  }

  async getById(tenantId: string, stocktakeId: string) {
    const header = await db.query.stocktakes.findFirst({
      where: (fields: any, { and, eq }: any) => and(eq(fields.tenant_id, tenantId), eq(fields.id, stocktakeId)),
    });

    if (!header) throw new Error('Inventário não encontrado');

    const items = await db
      .select({
        id: stocktakeItems.id,
        spare_part_id: stocktakeItems.spare_part_id,
        expected_qty: stocktakeItems.expected_qty,
        counted_qty: stocktakeItems.counted_qty,
        unit_cost: stocktakeItems.unit_cost,
        updated_at: stocktakeItems.updated_at,
        spare_part: {
          id: spareParts.id,
          code: spareParts.code,
          name: spareParts.name,
        },
      })
      .from(stocktakeItems)
      .leftJoin(spareParts, eq(stocktakeItems.spare_part_id, spareParts.id))
      .where(and(eq(stocktakeItems.tenant_id, tenantId), eq(stocktakeItems.stocktake_id, stocktakeId)))
      .orderBy(spareParts.code);

    return { stocktake: header, items };
  }

  async updateItemCountedQty(tenantId: string, stocktakeId: string, itemId: string, countedQty: number) {
    const header = await db.query.stocktakes.findFirst({
      where: (fields: any, { and, eq }: any) => and(eq(fields.tenant_id, tenantId), eq(fields.id, stocktakeId)),
    });
    if (!header) throw new Error('Inventário não encontrado');
    if (String((header as any).status) !== 'aberta') throw new Error('Inventário não está aberto');

    const [updated] = await db
      .update(stocktakeItems)
      .set({ counted_qty: countedQty, updated_at: new Date() } as any)
      .where(
        and(
          eq(stocktakeItems.tenant_id, tenantId),
          eq(stocktakeItems.stocktake_id, stocktakeId),
          eq(stocktakeItems.id, itemId),
        ),
      )
      .returning();

    if (!updated) throw new Error('Item não encontrado');
    return updated;
  }

  async close(
    tenantId: string,
    plantId: string,
    stocktakeId: string,
    userId: string,
    input: { applyAdjustments: boolean; closeNotes?: string },
  ) {
    const { stocktake, items } = await this.getById(tenantId, stocktakeId);
    if (String((stocktake as any).plant_id) !== String(plantId)) throw new Error('Inventário inválido para esta fábrica');

    if (String((stocktake as any).status) !== 'aberta') {
      throw new Error('Inventário já foi fechado');
    }

    const adjustments: any[] = [];

    if (input.applyAdjustments) {
      for (const item of items) {
        if (item.counted_qty == null) continue;
        const diff = Number(item.counted_qty) - Number(item.expected_qty);
        if (!diff) continue;

        // For adjustments we use type 'ajuste' with signed quantity (can be negative).
        const movement = await this.sparePartService.createStockMovement(tenantId, userId, {
          plant_id: plantId,
          spare_part_id: String(item.spare_part_id),
          type: 'ajuste',
          quantity: diff,
          unit_cost: item.unit_cost != null ? String(item.unit_cost) : undefined,
          notes: `Ajuste de inventário ${stocktakeId}`,
        } as any);
        adjustments.push(movement);
      }
    }

    const [closed] = await db
      .update(stocktakes)
      .set({
        status: 'fechada',
        closed_by: userId,
        closed_at: new Date(),
        close_notes: input.closeNotes?.trim() ? input.closeNotes.trim() : null,
      } as any)
      .where(and(eq(stocktakes.tenant_id, tenantId), eq(stocktakes.id, stocktakeId)))
      .returning();

    return { stocktake: closed, adjustments };
  }

  toCsv(params: { stocktakeId: string; items: any[] }) {
    const header = ['spare_part_code', 'spare_part_name', 'expected_qty', 'counted_qty', 'diff'];
    const rows = (params.items || []).map((item) => {
      const code = item?.spare_part?.code ? String(item.spare_part.code) : '';
      const name = item?.spare_part?.name ? String(item.spare_part.name) : '';
      const expected = item?.expected_qty != null ? Number(item.expected_qty) : 0;
      const counted = item?.counted_qty != null ? Number(item.counted_qty) : '';
      const diff = item?.counted_qty == null ? '' : Number(item.counted_qty) - expected;

      const esc = (v: any) => {
        const s = String(v ?? '');
        if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      return [esc(code), esc(name), String(expected), String(counted), String(diff)].join(',');
    });

    return [header.join(','), ...rows].join('\n');
  }
}
