import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  purchaseOrderItems,
  purchaseOrders,
  purchaseReceiptItems,
  purchaseReceipts,
  purchaseRequestItems,
  purchaseRequests,
  spareParts,
  stockMovements,
  suppliers,
} from '../db/schema.js';
import {
  CreatePurchaseOrderInput,
  CreatePurchaseRequestInput,
  ReceivePurchaseOrderInput,
} from '../schemas/purchase.validation.js';

export class PurchaseService {
  async listPurchaseRequests(tenantId: string, plantId: string, status?: string) {
    const rows = await db
      .select({
        id: purchaseRequests.id,
        plant_id: purchaseRequests.plant_id,
        title: purchaseRequests.title,
        description: purchaseRequests.description,
        status: purchaseRequests.status,
        priority: purchaseRequests.priority,
        needed_by: purchaseRequests.needed_by,
        created_by: purchaseRequests.created_by,
        approved_by: purchaseRequests.approved_by,
        approved_at: purchaseRequests.approved_at,
        rejected_by: purchaseRequests.rejected_by,
        rejected_at: purchaseRequests.rejected_at,
        rejection_reason: purchaseRequests.rejection_reason,
        ordered_at: purchaseRequests.ordered_at,
        received_at: purchaseRequests.received_at,
        created_at: purchaseRequests.created_at,
        updated_at: purchaseRequests.updated_at,
      })
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.tenant_id, tenantId),
          eq(purchaseRequests.plant_id, plantId),
          status ? eq(purchaseRequests.status, status as any) : sql`TRUE`,
        ),
      )
      .orderBy(desc(purchaseRequests.created_at));

    return rows;
  }

  async getPurchaseRequest(tenantId: string, plantId: string, requestId: string) {
    const [request] = await db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.tenant_id, tenantId),
          eq(purchaseRequests.plant_id, plantId),
          eq(purchaseRequests.id, requestId),
        ),
      )
      .limit(1);

    if (!request) return null;

    const items = await db
      .select({
        id: purchaseRequestItems.id,
        request_id: purchaseRequestItems.request_id,
        spare_part_id: purchaseRequestItems.spare_part_id,
        supplier_id: purchaseRequestItems.supplier_id,
        quantity: purchaseRequestItems.quantity,
        unit_cost: purchaseRequestItems.unit_cost,
        notes: purchaseRequestItems.notes,
        created_at: purchaseRequestItems.created_at,
        spare_part_code: spareParts.code,
        spare_part_name: spareParts.name,
      })
      .from(purchaseRequestItems)
      .leftJoin(spareParts, eq(purchaseRequestItems.spare_part_id, spareParts.id))
      .where(eq(purchaseRequestItems.request_id, requestId));

    return { ...request, items };
  }

  async createPurchaseRequest(
    tenantId: string,
    plantId: string,
    userId: string,
    payload: CreatePurchaseRequestInput,
  ) {
    return await db.transaction(async (tx: any) => {
      const [request] = await tx
        .insert(purchaseRequests)
        .values({
          tenant_id: tenantId,
          plant_id: plantId,
          title: payload.title,
          description: payload.description ?? null,
          priority: (payload.priority as any) ?? 'media',
          needed_by: payload.needed_by ? new Date(payload.needed_by) : null,
          created_by: userId,
          status: 'draft',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!request) {
        throw new Error('Failed to create purchase request');
      }

      for (const item of payload.items) {
        await tx.insert(purchaseRequestItems).values({
          request_id: request.id,
          spare_part_id: item.spare_part_id,
          supplier_id: item.supplier_id ?? null,
          quantity: item.quantity,
          unit_cost: item.unit_cost ?? null,
          notes: item.notes ?? null,
          created_at: new Date(),
        });
      }

      return request;
    });
  }

  async updatePurchaseRequest(
    tenantId: string,
    plantId: string,
    requestId: string,
    updates: Record<string, any>,
  ) {
    const [updated] = await db
      .update(purchaseRequests)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(purchaseRequests.tenant_id, tenantId),
          eq(purchaseRequests.plant_id, plantId),
          eq(purchaseRequests.id, requestId),
        ),
      )
      .returning();

    return updated ?? null;
  }

  async listPurchaseOrders(tenantId: string, plantId: string, status?: string) {
    const rows = await db
      .select({
        id: purchaseOrders.id,
        plant_id: purchaseOrders.plant_id,
        supplier_id: purchaseOrders.supplier_id,
        supplier_name: suppliers.name,
        request_id: purchaseOrders.request_id,
        status: purchaseOrders.status,
        ordered_at: purchaseOrders.ordered_at,
        expected_at: purchaseOrders.expected_at,
        notes: purchaseOrders.notes,
        created_by: purchaseOrders.created_by,
        created_at: purchaseOrders.created_at,
        updated_at: purchaseOrders.updated_at,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplier_id, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.tenant_id, tenantId),
          eq(purchaseOrders.plant_id, plantId),
          status ? eq(purchaseOrders.status, status as any) : sql`TRUE`,
        ),
      )
      .orderBy(desc(purchaseOrders.created_at));

    return rows;
  }

  async getPurchaseOrder(tenantId: string, plantId: string, orderId: string) {
    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenant_id, tenantId),
          eq(purchaseOrders.plant_id, plantId),
          eq(purchaseOrders.id, orderId),
        ),
      )
      .limit(1);

    if (!order) return null;

    const items = await db
      .select({
        id: purchaseOrderItems.id,
        purchase_order_id: purchaseOrderItems.purchase_order_id,
        spare_part_id: purchaseOrderItems.spare_part_id,
        quantity: purchaseOrderItems.quantity,
        unit_cost: purchaseOrderItems.unit_cost,
        received_quantity: purchaseOrderItems.received_quantity,
        notes: purchaseOrderItems.notes,
        spare_part_code: spareParts.code,
        spare_part_name: spareParts.name,
      })
      .from(purchaseOrderItems)
      .leftJoin(spareParts, eq(purchaseOrderItems.spare_part_id, spareParts.id))
      .where(eq(purchaseOrderItems.purchase_order_id, orderId));

    const receipts = await db
      .select()
      .from(purchaseReceipts)
      .where(eq(purchaseReceipts.purchase_order_id, orderId))
      .orderBy(desc(purchaseReceipts.received_at));

    return { ...order, items, receipts };
  }

  async createPurchaseOrder(
    tenantId: string,
    plantId: string,
    userId: string,
    payload: CreatePurchaseOrderInput,
  ) {
    return await db.transaction(async (tx: any) => {
      let requestItems: Array<any> = [];
      if (payload.request_id) {
        requestItems = await tx
          .select({
            spare_part_id: purchaseRequestItems.spare_part_id,
            quantity: purchaseRequestItems.quantity,
            unit_cost: purchaseRequestItems.unit_cost,
            notes: purchaseRequestItems.notes,
          })
          .from(purchaseRequestItems)
          .where(eq(purchaseRequestItems.request_id, payload.request_id));
      }

      const itemsPayload = (payload.items && payload.items.length > 0) ? payload.items : requestItems;
      if (!itemsPayload || itemsPayload.length === 0) {
        throw new Error('A compra precisa de pelo menos um item');
      }

      const [order] = await tx
        .insert(purchaseOrders)
        .values({
          tenant_id: tenantId,
          plant_id: plantId,
          supplier_id: payload.supplier_id,
          request_id: payload.request_id ?? null,
          status: 'draft',
          expected_at: payload.expected_at ? new Date(payload.expected_at) : null,
          notes: payload.notes ?? null,
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!order) {
        throw new Error('Failed to create purchase order');
      }

      for (const item of itemsPayload) {
        await tx.insert(purchaseOrderItems).values({
          purchase_order_id: order.id,
          spare_part_id: item.spare_part_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost ?? null,
          received_quantity: 0,
          notes: item.notes ?? null,
        });
      }

      if (payload.request_id) {
        await tx
          .update(purchaseRequests)
          .set({ status: 'ordered', ordered_at: new Date(), updated_at: new Date() })
          .where(
            and(
              eq(purchaseRequests.id, payload.request_id),
              eq(purchaseRequests.tenant_id, tenantId),
            ),
          );
      }

      return order;
    });
  }

  async updatePurchaseOrder(tenantId: string, plantId: string, orderId: string, updates: Record<string, any>) {
    const [updated] = await db
      .update(purchaseOrders)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(purchaseOrders.tenant_id, tenantId),
          eq(purchaseOrders.plant_id, plantId),
          eq(purchaseOrders.id, orderId),
        ),
      )
      .returning();

    return updated ?? null;
  }

  async receivePurchaseOrder(
    tenantId: string,
    plantId: string,
    orderId: string,
    userId: string,
    payload: ReceivePurchaseOrderInput,
  ) {
    return await db.transaction(async (tx: any) => {
      const [order] = await tx
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.tenant_id, tenantId),
            eq(purchaseOrders.plant_id, plantId),
            eq(purchaseOrders.id, orderId),
          ),
        )
        .limit(1);

      if (!order) {
        throw new Error('Compra nao encontrada');
      }

      const itemIds = payload.items.map((i) => i.purchase_order_item_id);
      const orderItems = (await tx
        .select({
          id: purchaseOrderItems.id,
          purchase_order_id: purchaseOrderItems.purchase_order_id,
          spare_part_id: purchaseOrderItems.spare_part_id,
          unit_cost: purchaseOrderItems.unit_cost,
          received_quantity: purchaseOrderItems.received_quantity,
        })
        .from(purchaseOrderItems)
        .where(inArray(purchaseOrderItems.id, itemIds))) as Array<{
        id: string;
        purchase_order_id: string;
        spare_part_id: string;
        unit_cost: string | null;
        received_quantity: number | null;
      }>;

      const itemsById = new Map(orderItems.map((i: any) => [String(i.id), i]));

      const [receipt] = await tx
        .insert(purchaseReceipts)
        .values({
          tenant_id: tenantId,
          plant_id: plantId,
          purchase_order_id: orderId,
          received_by: userId,
          received_at: payload.received_at ? new Date(payload.received_at) : new Date(),
          notes: payload.notes ?? null,
          created_at: new Date(),
        })
        .returning();

      for (const item of payload.items) {
        const orderItem = itemsById.get(String(item.purchase_order_item_id));
        if (!orderItem) {
          throw new Error('Item de compra nao encontrado');
        }
        if (String(orderItem.purchase_order_id) !== String(orderId)) {
          throw new Error('Item nao pertence a esta compra');
        }

        const qty = Number(item.quantity);
        if (!qty || qty <= 0) {
          throw new Error('Quantidade recebida invalida');
        }

        const unitCost = item.unit_cost ?? orderItem.unit_cost ?? null;
        const totalCost = unitCost ? Number(unitCost) * qty : null;

        const [movement] = await tx
          .insert(stockMovements)
          .values({
            tenant_id: tenantId,
            plant_id: plantId,
            spare_part_id: orderItem.spare_part_id,
            work_order_id: null,
            type: 'entrada',
            quantity: qty,
            unit_cost: unitCost,
            total_cost: totalCost,
            notes: `Rececao de compra ${orderId}`,
            created_by: userId,
            created_at: new Date(),
          })
          .returning();

        await tx.insert(purchaseReceiptItems).values({
          receipt_id: receipt.id,
          purchase_order_item_id: orderItem.id,
          spare_part_id: orderItem.spare_part_id,
          quantity: qty,
          unit_cost: unitCost,
          stock_movement_id: movement?.id ?? null,
        });

        await tx
          .update(purchaseOrderItems)
          .set({
            received_quantity: Number(orderItem.received_quantity || 0) + qty,
          })
          .where(eq(purchaseOrderItems.id, orderItem.id));
      }

      const updatedItems = await tx
        .select({ id: purchaseOrderItems.id, quantity: purchaseOrderItems.quantity, received_quantity: purchaseOrderItems.received_quantity })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchase_order_id, orderId));

      const allReceived = updatedItems.every((row: any) => Number(row.received_quantity || 0) >= Number(row.quantity || 0));
      const nextStatus = allReceived ? 'received' : 'partially_received';

      await tx
        .update(purchaseOrders)
        .set({ status: nextStatus as any, updated_at: new Date() })
        .where(eq(purchaseOrders.id, orderId));

      if (allReceived && order.request_id) {
        await tx
          .update(purchaseRequests)
          .set({ status: 'received', received_at: new Date(), updated_at: new Date() })
          .where(eq(purchaseRequests.id, order.request_id));
      }

      return { receipt_id: receipt.id, status: nextStatus };
    });
  }
}
