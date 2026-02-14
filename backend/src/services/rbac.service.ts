import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

export class RbacService {
  static normalizeRole(role?: string | null): string {
    const raw = String(role || '').trim().toLowerCase();
    if (!raw) return '';

    // Normalize accents/diacritics (e.g., "técnico" -> "tecnico")
    let ascii = raw;
    try {
      ascii = raw
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');
    } catch {
      // ignore
    }

    const compact = ascii
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    const roleAliases: Record<string, string> = {
      // Legacy/alt spellings
      admin: 'admin_empresa',
      adminempresa: 'admin_empresa',
      'admin_empresa': 'admin_empresa',
      'admin-empresa': 'admin_empresa',

      maintenance_manager: 'gestor_manutencao',
      planner: 'gestor_manutencao',
      gestor: 'gestor_manutencao',
      gestor_fabrica: 'gestor_manutencao',
      gestor_manutencao: 'gestor_manutencao',

      technician: 'tecnico',
      tecnico: 'tecnico',

      operator: 'operador',
      operador: 'operador',

      supervisor: 'supervisor',
      superadmin: 'superadmin',
    };

    return roleAliases[compact] || compact;
  }

  static async tenantHasAnyRbacPermissions(tenantId: string): Promise<boolean> {
    const res = await db.execute(sql`
      SELECT 1 AS ok
      FROM rbac_role_permissions
      WHERE tenant_id = ${tenantId}
      LIMIT 1;
    `);
    return (res.rows?.length || 0) > 0;
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

  static async permissionExists(permissionKey: string): Promise<boolean> {
    const res = await db.execute(sql`
      SELECT 1 AS ok
      FROM rbac_permissions
      WHERE key = ${permissionKey}
      LIMIT 1;
    `);
    return (res.rows?.length || 0) > 0;
  }
}
