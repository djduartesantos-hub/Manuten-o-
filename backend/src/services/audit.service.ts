import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { auditLogs, users } from '../db/schema.js';

export class AuditService {
  static async createLog(data: {
    tenant_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    ip_address?: string | null;
  }) {
    const [log] = await db
      .insert(auditLogs)
      .values({
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        old_values: data.old_values || null,
        new_values: data.new_values || null,
        ip_address: data.ip_address || null,
      })
      .returning();

    return log;
  }

  static async getEntityLogs(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit = 25,
  ) {
    const tableCheck = await db.execute(sql`SELECT to_regclass('public.audit_logs') AS name`);
    const tableName = (tableCheck as any)?.rows?.[0]?.name;
    if (!tableName) {
      return [];
    }

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity_type: auditLogs.entity_type,
        entity_id: auditLogs.entity_id,
        old_values: auditLogs.old_values,
        new_values: auditLogs.new_values,
        ip_address: auditLogs.ip_address,
        created_at: auditLogs.created_at,
        user_id: auditLogs.user_id,
        user_first_name: users.first_name,
        user_last_name: users.last_name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.user_id, users.id))
      .where(
        and(
          eq(auditLogs.tenant_id, tenantId),
          eq(auditLogs.entity_type, entityType),
          eq(auditLogs.entity_id, entityId),
        ),
      )
      .orderBy(desc(auditLogs.created_at))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      ip_address: row.ip_address,
      created_at: row.created_at,
      user: row.user_id
        ? {
            id: row.user_id,
            first_name: row.user_first_name,
            last_name: row.user_last_name,
          }
        : null,
    }));
  }
}
