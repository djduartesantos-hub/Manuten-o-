import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  assetCalibrations,
  assetCertifications,
  assetInspections,
  assetLifecycle,
  assetTags,
  assets,
} from '../db/schema.js';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export class ComplianceService {
  static async getAsset(tenantId: string, assetId: string) {
    return db.query.assets.findFirst({
      where: (fields: any, ops: any) => ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.id, assetId)),
    });
  }

  static async getLifecycle(tenantId: string, assetId: string) {
    return db.query.assetLifecycle.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.asset_id, assetId)),
    });
  }

  static async upsertLifecycle(tenantId: string, assetId: string, payload: any) {
    await db.execute(sql`
      INSERT INTO asset_lifecycle (
        asset_id,
        tenant_id,
        commissioning_date,
        warranty_expires_at,
        expected_lifespan_years,
        depreciation_method,
        depreciation_years,
        depreciation_rate,
        residual_value,
        replacement_due_at,
        decommissioned_at,
        notes,
        created_at,
        updated_at
      ) VALUES (
        ${assetId},
        ${tenantId},
        ${toDate(payload.commissioning_date) || null},
        ${toDate(payload.warranty_expires_at) || null},
        ${toNumber(payload.expected_lifespan_years) ?? null},
        ${payload.depreciation_method ?? null},
        ${toNumber(payload.depreciation_years) ?? null},
        ${toNumber(payload.depreciation_rate) ?? null},
        ${toNumber(payload.residual_value) ?? null},
        ${toDate(payload.replacement_due_at) || null},
        ${toDate(payload.decommissioned_at) || null},
        ${payload.notes ?? null},
        NOW(),
        NOW()
      )
      ON CONFLICT (asset_id) DO UPDATE SET
        commissioning_date = EXCLUDED.commissioning_date,
        warranty_expires_at = EXCLUDED.warranty_expires_at,
        expected_lifespan_years = EXCLUDED.expected_lifespan_years,
        depreciation_method = EXCLUDED.depreciation_method,
        depreciation_years = EXCLUDED.depreciation_years,
        depreciation_rate = EXCLUDED.depreciation_rate,
        residual_value = EXCLUDED.residual_value,
        replacement_due_at = EXCLUDED.replacement_due_at,
        decommissioned_at = EXCLUDED.decommissioned_at,
        notes = EXCLUDED.notes,
        updated_at = NOW();
    `);

    return this.getLifecycle(tenantId, assetId);
  }

  static async listCertifications(tenantId: string, assetId: string) {
    return db.query.assetCertifications.findMany({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.asset_id, assetId)),
      orderBy: (fields: any) => [desc(fields.created_at)],
    });
  }

  static async createCertification(tenantId: string, assetId: string, payload: any) {
    const [row] = await db
      .insert(assetCertifications)
      .values({
        tenant_id: tenantId,
        asset_id: assetId,
        certification_type: payload.certification_type,
        standard: payload.standard,
        issuer: payload.issuer,
        reference_code: payload.reference_code,
        issued_at: toDate(payload.issued_at),
        expires_at: toDate(payload.expires_at),
        status: payload.status,
        document_id: payload.document_id,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .returning();

    return row;
  }

  static async updateCertification(tenantId: string, id: string, payload: any) {
    const [row] = await db
      .update(assetCertifications)
      .set({
        certification_type: payload.certification_type,
        standard: payload.standard,
        issuer: payload.issuer,
        reference_code: payload.reference_code,
        issued_at: toDate(payload.issued_at),
        expires_at: toDate(payload.expires_at),
        status: payload.status,
        document_id: payload.document_id,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .where(and(eq(assetCertifications.tenant_id, tenantId), eq(assetCertifications.id, id)))
      .returning();

    return row;
  }

  static async deleteCertification(tenantId: string, id: string) {
    await db
      .delete(assetCertifications)
      .where(and(eq(assetCertifications.tenant_id, tenantId), eq(assetCertifications.id, id)));
  }

  static async listInspections(tenantId: string, assetId: string) {
    return db.query.assetInspections.findMany({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.asset_id, assetId)),
      orderBy: (fields: any) => [desc(fields.inspection_date)],
    });
  }

  static async createInspection(tenantId: string, assetId: string, payload: any) {
    const [row] = await db
      .insert(assetInspections)
      .values({
        tenant_id: tenantId,
        asset_id: assetId,
        certification_id: payload.certification_id,
        inspection_date: toDate(payload.inspection_date) || new Date(),
        inspector: payload.inspector,
        result: payload.result,
        next_due_at: toDate(payload.next_due_at),
        document_id: payload.document_id,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .returning();

    return row;
  }

  static async updateInspection(tenantId: string, id: string, payload: any) {
    const [row] = await db
      .update(assetInspections)
      .set({
        certification_id: payload.certification_id,
        inspection_date: toDate(payload.inspection_date),
        inspector: payload.inspector,
        result: payload.result,
        next_due_at: toDate(payload.next_due_at),
        document_id: payload.document_id,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .where(and(eq(assetInspections.tenant_id, tenantId), eq(assetInspections.id, id)))
      .returning();

    return row;
  }

  static async deleteInspection(tenantId: string, id: string) {
    await db
      .delete(assetInspections)
      .where(and(eq(assetInspections.tenant_id, tenantId), eq(assetInspections.id, id)));
  }

  static async listCalibrations(tenantId: string, assetId: string) {
    return db.query.assetCalibrations.findMany({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.asset_id, assetId)),
      orderBy: (fields: any) => [desc(fields.calibration_date)],
    });
  }

  static async createCalibration(tenantId: string, assetId: string, payload: any) {
    const [row] = await db
      .insert(assetCalibrations)
      .values({
        tenant_id: tenantId,
        asset_id: assetId,
        calibration_date: toDate(payload.calibration_date) || new Date(),
        due_at: toDate(payload.due_at),
        provider: payload.provider,
        reference_code: payload.reference_code,
        status: payload.status,
        document_id: payload.document_id,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .returning();

    return row;
  }

  static async updateCalibration(tenantId: string, id: string, payload: any) {
    const [row] = await db
      .update(assetCalibrations)
      .set({
        calibration_date: toDate(payload.calibration_date),
        due_at: toDate(payload.due_at),
        provider: payload.provider,
        reference_code: payload.reference_code,
        status: payload.status,
        document_id: payload.document_id,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .where(and(eq(assetCalibrations.tenant_id, tenantId), eq(assetCalibrations.id, id)))
      .returning();

    return row;
  }

  static async deleteCalibration(tenantId: string, id: string) {
    await db
      .delete(assetCalibrations)
      .where(and(eq(assetCalibrations.tenant_id, tenantId), eq(assetCalibrations.id, id)));
  }

  static async listTags(tenantId: string, assetId: string) {
    return db.query.assetTags.findMany({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.asset_id, assetId)),
      orderBy: (fields: any) => [desc(fields.created_at)],
    });
  }

  static async lookupTag(tenantId: string, code: string) {
    return db.query.assetTags.findFirst({
      where: (fields: any, ops: any) =>
        ops.and(ops.eq(fields.tenant_id, tenantId), ops.eq(fields.tag_code, code)),
    });
  }

  static async createTag(tenantId: string, assetId: string, payload: any) {
    const [row] = await db
      .insert(assetTags)
      .values({
        tenant_id: tenantId,
        asset_id: assetId,
        plant_id: payload.plant_id,
        tag_type: payload.tag_type,
        tag_code: payload.tag_code,
        status: payload.status,
        assigned_at: toDate(payload.assigned_at),
        assigned_by: payload.assigned_by,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .returning();

    return row;
  }

  static async updateTag(tenantId: string, id: string, payload: any) {
    const [row] = await db
      .update(assetTags)
      .set({
        asset_id: payload.asset_id,
        plant_id: payload.plant_id,
        tag_type: payload.tag_type,
        tag_code: payload.tag_code,
        status: payload.status,
        assigned_at: toDate(payload.assigned_at),
        assigned_by: payload.assigned_by,
        notes: payload.notes,
        updated_at: new Date(),
      })
      .where(and(eq(assetTags.tenant_id, tenantId), eq(assetTags.id, id)))
      .returning();

    return row;
  }

  static async deleteTag(tenantId: string, id: string) {
    await db.delete(assetTags).where(and(eq(assetTags.tenant_id, tenantId), eq(assetTags.id, id)));
  }
}
