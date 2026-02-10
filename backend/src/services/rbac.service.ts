import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

export class RbacService {
  static normalizeRole(role?: string | null): string {
    return String(role || '').trim().toLowerCase();
  }

  static async getUserRoleForPlant(params: {
    userId: string;
    plantId: string;
  }): Promise<string | null> {
    const res = await db.execute(sql`
      SELECT role
      FROM user_plants
      WHERE user_id = ${params.userId} AND plant_id = ${params.plantId}
      LIMIT 1;
    `);

    const role = (res.rows?.[0] as any)?.role;
    return role ? String(role) : null;
  }

  static async getTenantPermissionsForRole(params: {
    tenantId: string;
    roleKey: string;
  }): Promise<Set<string>> {
    const res = await db.execute(sql`
      SELECT permission_key
      FROM rbac_role_permissions
      WHERE tenant_id = ${params.tenantId} AND role_key = ${params.roleKey}
    `);

    return new Set((res.rows || []).map((r: any) => String(r.permission_key)));
  }

  static async roleHasPermission(params: {
    tenantId: string;
    roleKey: string;
    permissionKey: string;
  }): Promise<boolean> {
    const res = await db.execute(sql`
      SELECT 1 AS ok
      FROM rbac_role_permissions
      WHERE tenant_id = ${params.tenantId}
        AND role_key = ${params.roleKey}
        AND permission_key = ${params.permissionKey}
      LIMIT 1;
    `);

    return (res.rows?.length || 0) > 0;
  }
}
