import { and, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  assets,
  maintenanceKitItems,
  maintenanceKits,
  preventiveMaintenanceSchedules,
  spareParts,
  stockMovements,
  stockReservations,
} from '../db/schema.js';

export type SparePartForecastRow = {
  spare_part_id: string;
  code: string;
  name: string;
  min_stock: number;
  current_stock: number;
  reserved_active: number;
  predicted_demand: number;
  projected_available: number;
};

export type SparePartsForecastResult = {
  horizon_days: number;
  from: string;
  to: string;
  total_schedules: number;
  rows: SparePartForecastRow[];
};

export class SparePartForecastService {
  async getForecast(tenantId: string, plantId: string, horizonDays: number): Promise<SparePartsForecastResult> {
    const safeDays = Number.isFinite(horizonDays) ? Math.floor(horizonDays) : 30;
    const days = Math.min(Math.max(safeDays, 1), 365);

    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

    const schedules = await db
      .select({
        plan_id: preventiveMaintenanceSchedules.plan_id,
        asset_category_id: assets.category_id,
      })
      .from(preventiveMaintenanceSchedules)
      .leftJoin(assets, eq(preventiveMaintenanceSchedules.asset_id, assets.id))
      .where(
        and(
          eq(preventiveMaintenanceSchedules.tenant_id, tenantId),
          eq(preventiveMaintenanceSchedules.plant_id, plantId),
          inArray(preventiveMaintenanceSchedules.status, ['agendada', 'reagendada']),
          gte(preventiveMaintenanceSchedules.scheduled_for, from),
          lt(preventiveMaintenanceSchedules.scheduled_for, to),
        ),
      );

    const planCounts = new Map<string, number>();
    const scheduleList = schedules || [];
    for (const sched of scheduleList) {
      const planId = (sched as any).plan_id as string;
      if (!planId) continue;
      planCounts.set(planId, (planCounts.get(planId) || 0) + 1);
    }

    const planIds = Array.from(planCounts.keys());

    const planKits = planIds.length
      ? await db
          .select({
            id: maintenanceKits.id,
            name: maintenanceKits.name,
            plan_id: maintenanceKits.plan_id,
            category_id: maintenanceKits.category_id,
          })
          .from(maintenanceKits)
          .where(
            and(
              eq(maintenanceKits.tenant_id, tenantId),
              eq(maintenanceKits.is_active, true),
              inArray(maintenanceKits.plan_id, planIds),
            ),
          )
      : [];

    const planKitPlanIds = new Set<string>();
    for (const kit of planKits) {
      if (kit.plan_id) planKitPlanIds.add(kit.plan_id);
    }

    const categoryCounts = new Map<string, number>();
    for (const sched of scheduleList) {
      const planId = (sched as any).plan_id as string;
      const categoryId = (sched as any).asset_category_id as string;
      if (!categoryId) continue;
      if (planId && planKitPlanIds.has(planId)) continue; // plan-level kit exists; do not fallback to category
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
    }

    const categoryIds = Array.from(categoryCounts.keys());

    const categoryKits = categoryIds.length
      ? await db
          .select({
            id: maintenanceKits.id,
            name: maintenanceKits.name,
            plan_id: maintenanceKits.plan_id,
            category_id: maintenanceKits.category_id,
          })
          .from(maintenanceKits)
          .where(
            and(
              eq(maintenanceKits.tenant_id, tenantId),
              eq(maintenanceKits.is_active, true),
              isNull(maintenanceKits.plan_id),
              inArray(maintenanceKits.category_id, categoryIds),
            ),
          )
      : [];

    const allKits = [...(planKits || []), ...(categoryKits || [])];
    const kitById = new Map<string, (typeof allKits)[number]>();
    for (const kit of allKits) kitById.set(kit.id, kit);

    const kitIds = allKits.map((k) => k.id);

    const kitItems = kitIds.length
      ? await db
          .select({
            kit_id: maintenanceKitItems.kit_id,
            spare_part_id: maintenanceKitItems.spare_part_id,
            quantity: maintenanceKitItems.quantity,
          })
          .from(maintenanceKitItems)
          .where(and(eq(maintenanceKitItems.tenant_id, tenantId), inArray(maintenanceKitItems.kit_id, kitIds)))
      : [];

    const predictedByPart = new Map<string, number>();

    for (const item of kitItems || []) {
      const kit = kitById.get(item.kit_id);
      if (!kit) continue;

      let multiplier = 0;
      if (kit.plan_id) multiplier = planCounts.get(kit.plan_id) || 0;
      else if (kit.category_id) multiplier = categoryCounts.get(kit.category_id) || 0;

      if (!multiplier) continue;

      const sparePartId = item.spare_part_id;
      const qty = Number(item.quantity) || 0;
      if (!sparePartId || qty <= 0) continue;

      predictedByPart.set(sparePartId, (predictedByPart.get(sparePartId) || 0) + qty * multiplier);
    }

    const stockRows = await db
      .select({
        spare_part_id: stockMovements.spare_part_id,
        quantity: sql<number>`SUM(CASE WHEN ${stockMovements.type} = 'entrada' OR ${stockMovements.type} = 'ajuste' THEN ${stockMovements.quantity} ELSE -${stockMovements.quantity} END)`,
      })
      .from(stockMovements)
      .where(and(eq(stockMovements.tenant_id, tenantId), eq(stockMovements.plant_id, plantId)))
      .groupBy(stockMovements.spare_part_id);

    const stockByPart = new Map<string, number>();
    for (const row of stockRows || []) {
      stockByPart.set(row.spare_part_id, typeof row.quantity === 'number' ? row.quantity : 0);
    }

    const reservedRows = await db
      .select({
        spare_part_id: stockReservations.spare_part_id,
        quantity: sql<number>`SUM(${stockReservations.quantity})`,
      })
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.tenant_id, tenantId),
          eq(stockReservations.plant_id, plantId),
          eq(stockReservations.status, 'ativa'),
        ),
      )
      .groupBy(stockReservations.spare_part_id);

    const reservedByPart = new Map<string, number>();
    for (const row of reservedRows || []) {
      reservedByPart.set(row.spare_part_id, typeof row.quantity === 'number' ? row.quantity : 0);
    }

    const parts = await db
      .select({
        id: spareParts.id,
        code: spareParts.code,
        name: spareParts.name,
        min_stock: spareParts.min_stock,
      })
      .from(spareParts)
      .where(eq(spareParts.tenant_id, tenantId));

    const rows: SparePartForecastRow[] = (parts || []).map((part) => {
      const currentStock = stockByPart.get(part.id) || 0;
      const reservedActive = reservedByPart.get(part.id) || 0;
      const predictedDemand = predictedByPart.get(part.id) || 0;
      const projectedAvailable = currentStock - reservedActive - predictedDemand;

      return {
        spare_part_id: part.id,
        code: part.code,
        name: part.name,
        min_stock: part.min_stock ?? 0,
        current_stock: currentStock,
        reserved_active: reservedActive,
        predicted_demand: predictedDemand,
        projected_available: projectedAvailable,
      };
    });

    // Most important first: biggest projected shortages
    rows.sort((a, b) => a.projected_available - b.projected_available);

    return {
      horizon_days: days,
      from: from.toISOString(),
      to: to.toISOString(),
      total_schedules: scheduleList.length,
      rows,
    };
  }
}
