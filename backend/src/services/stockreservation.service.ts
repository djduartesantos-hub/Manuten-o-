import { and, eq, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { stockReservations, spareParts } from '../db/schema.js';
import { SparePartService } from './sparepart.service.js';
import { WorkOrderService } from './workorder.service.js';

export interface CreateStockReservationInput {
  plant_id: string;
  work_order_id: string;
  spare_part_id: string;
  quantity: number;
  notes?: string;
}

export class StockReservationService {
  private sparePartService = new SparePartService();

  async listByWorkOrder(tenantId: string, workOrderId: string, plantId?: string) {
    const conditions = [
      eq(stockReservations.tenant_id, tenantId),
      eq(stockReservations.work_order_id, workOrderId),
    ];

    if (plantId) {
      conditions.push(eq(stockReservations.plant_id, plantId));
    }

    return db
      .select({
        id: stockReservations.id,
        tenant_id: stockReservations.tenant_id,
        plant_id: stockReservations.plant_id,
        work_order_id: stockReservations.work_order_id,
        spare_part_id: stockReservations.spare_part_id,
        quantity: stockReservations.quantity,
        status: stockReservations.status,
        notes: stockReservations.notes,
        created_by: stockReservations.created_by,
        created_at: stockReservations.created_at,
        released_at: stockReservations.released_at,
        released_by: stockReservations.released_by,
        release_reason: stockReservations.release_reason,
        spare_part: {
          id: spareParts.id,
          code: spareParts.code,
          name: spareParts.name,
        },
      })
      .from(stockReservations)
      .leftJoin(spareParts, eq(stockReservations.spare_part_id, spareParts.id))
      .where(and(...conditions))
      .orderBy(desc(stockReservations.created_at));
  }

  private async getActiveReservedQuantity(
    tenantId: string,
    plantId: string,
    sparePartId: string,
  ): Promise<number> {
    const result = await db.execute(sql`
      SELECT COALESCE(SUM(quantity), 0)::int AS qty
      FROM stock_reservations
      WHERE tenant_id = ${tenantId}
        AND plant_id = ${plantId}
        AND spare_part_id = ${sparePartId}
        AND status = 'ativa'
    `);

    return Number((result as any)?.rows?.[0]?.qty ?? 0);
  }

  async createReservation(tenantId: string, userId: string, input: CreateStockReservationInput) {
    if (!input.work_order_id || !input.spare_part_id || !input.plant_id) {
      throw new Error('Missing required fields');
    }

    if (!input.quantity || Number(input.quantity) <= 0) {
      throw new Error('Quantidade deve ser positiva');
    }

    const workOrder = await WorkOrderService.getWorkOrderById(tenantId, input.work_order_id, input.plant_id);
    if (!workOrder) {
      throw new Error('Work order not found');
    }

    await this.sparePartService.getSparePartById(tenantId, input.spare_part_id);

    const stockQty = await this.sparePartService.getStockQuantity(tenantId, input.spare_part_id, input.plant_id);
    const reservedQty = await this.getActiveReservedQuantity(tenantId, input.plant_id, input.spare_part_id);
    const availableQty = stockQty - reservedQty;

    if (availableQty < Number(input.quantity)) {
      throw new Error(`Stock insuficiente para reservar. Disponível: ${availableQty}`);
    }

    // Coalesce: if there is already an active reservation for this work order + part, increment it.
    const existing = await db.query.stockReservations.findFirst({
      where: (fields: any, { and, eq }: any) =>
        and(
          eq(fields.tenant_id, tenantId),
          eq(fields.plant_id, input.plant_id),
          eq(fields.work_order_id, input.work_order_id),
          eq(fields.spare_part_id, input.spare_part_id),
          eq(fields.status, 'ativa'),
        ),
    });

    if (existing) {
      const [updated] = await db
        .update(stockReservations)
        .set({
          quantity: existing.quantity + Number(input.quantity),
          notes: input.notes ?? existing.notes,
        })
        .where(and(eq(stockReservations.tenant_id, tenantId), eq(stockReservations.id, existing.id)))
        .returning();

      return updated;
    }

    const [reservation] = await db
      .insert(stockReservations)
      .values({
        tenant_id: tenantId,
        plant_id: input.plant_id,
        work_order_id: input.work_order_id,
        spare_part_id: input.spare_part_id,
        quantity: Number(input.quantity),
        status: 'ativa',
        notes: input.notes?.trim() ? input.notes.trim() : null,
        created_by: userId,
      })
      .returning();

    return reservation;
  }

  async releaseReservation(
    tenantId: string,
    userId: string,
    reservationId: string,
    reason?: string,
  ) {
    const existing = await db.query.stockReservations.findFirst({
      where: (fields: any, { and, eq }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, reservationId)),
    });

    if (!existing) {
      throw new Error('Reserva não encontrada');
    }

    if (existing.status !== 'ativa') {
      return existing;
    }

    const [updated] = await db
      .update(stockReservations)
      .set({
        status: 'libertada',
        released_at: new Date(),
        released_by: userId,
        release_reason: reason?.trim() ? reason.trim() : null,
      })
      .where(and(eq(stockReservations.tenant_id, tenantId), eq(stockReservations.id, reservationId)))
      .returning();

    return updated;
  }

  async releaseAllForWorkOrder(
    tenantId: string,
    plantId: string,
    workOrderId: string,
    userId: string,
    reason?: string,
  ) {
    await db.execute(sql`
      UPDATE stock_reservations
      SET status = 'libertada',
          released_at = NOW(),
          released_by = ${userId},
          release_reason = ${reason ?? null}
      WHERE tenant_id = ${tenantId}
        AND plant_id = ${plantId}
        AND work_order_id = ${workOrderId}
        AND status = 'ativa'
    `);
  }
}
