import { db } from '../config/database.js';
import { suppliers } from '../db/schema.js';
import { and, desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export interface CreateSupplierInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export class SupplierService {
  async getSuppliers(
    tenantId: string,
    filters?: {
      search?: string;
    },
  ) {
    let query = db
      .select({
        id: suppliers.id,
        tenant_id: suppliers.tenant_id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        city: suppliers.city,
        country: suppliers.country,
        created_at: suppliers.created_at,
        updated_at: suppliers.updated_at,
      })
      .from(suppliers);

    const conditions = [eq(suppliers.tenant_id, tenantId)];

    if (filters?.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        sql`${suppliers.name} ILIKE ${pattern} OR ${suppliers.email} ILIKE ${pattern} OR ${suppliers.phone} ILIKE ${pattern} OR ${suppliers.city} ILIKE ${pattern} OR ${suppliers.country} ILIKE ${pattern}`,
      );
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    } else {
      query = query.where(conditions[0]);
    }

    return query.orderBy(desc(suppliers.created_at));
  }

  async getSupplierById(tenantId: string, supplierId: string) {
    const result = await db
      .select({
        id: suppliers.id,
        tenant_id: suppliers.tenant_id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        city: suppliers.city,
        country: suppliers.country,
        created_at: suppliers.created_at,
        updated_at: suppliers.updated_at,
      })
      .from(suppliers)
      .where(and(eq(suppliers.tenant_id, tenantId), eq(suppliers.id, supplierId)))
      .limit(1);

    if (!result.length) {
      throw new Error('Supplier not found');
    }

    return result[0];
  }

  async createSupplier(tenantId: string, input: CreateSupplierInput) {
    const [supplier] = await db
      .insert(suppliers)
      .values({
        tenant_id: tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        country: input.country,
      })
      .returning();

    return this.getSupplierById(tenantId, supplier.id);
  }

  async updateSupplier(
    tenantId: string,
    supplierId: string,
    input: UpdateSupplierInput,
  ) {
    const supplier = await this.getSupplierById(tenantId, supplierId);

    await db
      .update(suppliers)
      .set({
        name: input.name ?? supplier.name,
        email: input.email ?? supplier.email,
        phone: input.phone ?? supplier.phone,
        address: input.address ?? supplier.address,
        city: input.city ?? supplier.city,
        country: input.country ?? supplier.country,
        updated_at: new Date(),
      })
      .where(and(eq(suppliers.tenant_id, tenantId), eq(suppliers.id, supplierId)));

    return this.getSupplierById(tenantId, supplierId);
  }

  async deleteSupplier(tenantId: string, supplierId: string) {
    await this.getSupplierById(tenantId, supplierId);

    await db
      .delete(suppliers)
      .where(and(eq(suppliers.tenant_id, tenantId), eq(suppliers.id, supplierId)));

    return { success: true };
  }
}
