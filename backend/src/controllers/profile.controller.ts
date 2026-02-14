import { Response } from 'express';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { authSessions, users } from '../db/schema.js';
import { comparePasswords, hashPassword } from '../auth/jwt.js';
import { RbacService } from '../services/rbac.service.js';
import { AuthService } from '../services/auth.service.js';
import { SecurityPolicyService } from '../services/security-policy.service.js';

function toProfileDto(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    role: user.role,
    roleLabel: user.role_label,
    tenantId: user.tenant_id,
  };
}

const fallbackRoleLabels: Record<string, string> = {
  superadmin: 'SuperAdministrador',
  admin_empresa: 'Admin Empresa',
  gestor_manutencao: 'Gestor Fábrica',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  operador: 'Operador',
};

const normalizeHomePath = (value: unknown) => {
  const v = String(value || '').trim();
  if (!v) return null;
  if (!v.startsWith('/')) return null;
  if (v.length > 128) return null;
  return v;
};

const suggestHomeFromPermissions = (permissions: Set<string>): string => {
  if (
    permissions.has('admin:rbac') ||
    permissions.has('admin:users') ||
    permissions.has('admin:plants')
  ) {
    return '/settings';
  }

  if (permissions.has('workorders:write') && permissions.has('assets:write')) {
    return '/tecnico';
  }

  if (permissions.has('workorders:write')) {
    return '/operador';
  }

  return '/dashboard';
};

export class ProfileController {
  static async listSessions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const currentSessionId = String((req.user as any)?.sessionId || '').trim();

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    try {
      const rows = await db
        .select({
          id: authSessions.id,
          ipAddress: authSessions.ip_address,
          userAgent: authSessions.user_agent,
          createdAt: authSessions.created_at,
          lastSeenAt: authSessions.last_seen_at,
          revokedAt: authSessions.revoked_at,
          revokedBy: authSessions.revoked_by,
        })
        .from(authSessions)
        .where(and(eq(authSessions.tenant_id, tenantId), eq(authSessions.user_id, userId)))
        .orderBy(desc(authSessions.last_seen_at))
        .limit(50);

      const data = rows.map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        revokedAt: s.revokedAt,
        revokedBy: s.revokedBy,
        isCurrent: currentSessionId && String(s.id) === currentSessionId,
      }));

      return res.json({ success: true, data });
    } catch {
      return res.status(500).json({ success: false, error: 'Falha ao carregar sessões' });
    }
  }

  static async revokeSession(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const sessionId = String(req.params?.sessionId || '').trim();

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (!sessionId || sessionId.length > 64) {
      return res.status(400).json({ success: false, error: 'sessionId inválido' });
    }

    const revoked = await AuthService.revokeSessionForUser({
      tenantId,
      userId,
      sessionId,
      revokedByUserId: userId,
    });

    return res.json({ success: true, data: { revoked } });
  }

  static async revokeOtherSessions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const currentSessionId = String((req.user as any)?.sessionId || '').trim();

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const revoked = await AuthService.revokeAllOtherSessionsForUser({
      tenantId,
      userId,
      currentSessionId: currentSessionId || null,
      revokedByUserId: userId,
    });

    return res.json({ success: true, data: { revoked } });
  }

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let roleLabel: string | null = null;
    try {
      const roleKey = String(user.role || '').trim().toLowerCase();
      const roleResult = await db.execute(sql`
        SELECT name
        FROM rbac_roles
        WHERE tenant_id = ${tenantId} AND key = ${roleKey}
        LIMIT 1;
      `);

      if ((roleResult.rows?.length || 0) > 0) {
        roleLabel = String((roleResult.rows as any)[0]?.name || '') || null;
      }

      if (!roleLabel) {
        roleLabel = fallbackRoleLabels[roleKey] || (roleKey ? roleKey.replace(/_/g, ' ') : null);
      }
    } catch {
      const roleKey = String(user.role || '').trim().toLowerCase();
      roleLabel = fallbackRoleLabels[roleKey] || (roleKey ? roleKey.replace(/_/g, ' ') : null);
    }

    return res.json({ success: true, data: toProfileDto({ ...user, role_label: roleLabel }) });
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { firstName, lastName, email, phone } = req.body || {};

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;

    if (nextEmail && nextEmail !== String(user.email || '').toLowerCase()) {
      const duplicate = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.tenant_id, tenantId),
            sql`lower(${users.email}) = ${nextEmail}`,
            ne(users.id, userId),
          ),
        )
        .limit(1);

      if (duplicate.length > 0) {
        return res.status(409).json({ success: false, error: 'Email já em uso' });
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        first_name: typeof firstName === 'string' ? firstName.trim() : user.first_name,
        last_name: typeof lastName === 'string' ? lastName.trim() : user.last_name,
        email: nextEmail ?? user.email,
        phone: typeof phone === 'string' ? phone.trim() : user.phone,
        updated_at: new Date(),
      })
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, userId)))
      .returning();

    // Keep label consistent with getProfile
    let roleLabel: string | null = null;
    try {
      const roleKey = String(updated.role || '').trim().toLowerCase();
      const roleResult = await db.execute(sql`
        SELECT name
        FROM rbac_roles
        WHERE tenant_id = ${tenantId} AND key = ${roleKey}
        LIMIT 1;
      `);
      if ((roleResult.rows?.length || 0) > 0) {
        roleLabel = String((roleResult.rows as any)[0]?.name || '') || null;
      }
      if (!roleLabel) {
        roleLabel = fallbackRoleLabels[roleKey] || (roleKey ? roleKey.replace(/_/g, ' ') : null);
      }
    } catch {
      const roleKey = String(updated.role || '').trim().toLowerCase();
      roleLabel = fallbackRoleLabels[roleKey] || (roleKey ? roleKey.replace(/_/g, ' ') : null);
    }

    return res.json({ success: true, data: toProfileDto({ ...updated, role_label: roleLabel }) });
  }

  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body || {};

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const ok = await comparePasswords(String(currentPassword || ''), String(user.password_hash || ''));
    if (!ok) {
      return res.status(400).json({ success: false, error: 'Password atual incorreta' });
    }

    const policy = await SecurityPolicyService.getTenantPolicy(String(tenantId));
    const policyError = SecurityPolicyService.validatePassword(String(newPassword || ''), policy);
    if (policyError) {
      return res.status(400).json({ success: false, error: policyError });
    }

    const passwordHash = await hashPassword(String(newPassword));
    await db
      .update(users)
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, userId)));

    return res.json({ success: true, message: 'Password atualizada' });
  }

  static async getHomeRoute(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      const plantId = String((req.query as any)?.plantId || '').trim();

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      if (!plantId) {
        return res.status(400).json({ success: false, error: 'plantId is required' });
      }

      const plantRole = await RbacService.getUserRoleForPlant({ userId, plantId });
      const roleKey = RbacService.normalizeRole(plantRole || String(req.user?.role || ''));
      if (!roleKey) {
        return res.status(403).json({ success: false, error: 'Sem role atribuída' });
      }

      let roleLabel: string | null = null;
      try {
        const roleResult = await db.execute(sql`
          SELECT name
          FROM rbac_roles
          WHERE tenant_id = ${tenantId} AND key = ${roleKey}
          LIMIT 1;
        `);

        if ((roleResult.rows?.length || 0) > 0) {
          roleLabel = String((roleResult.rows as any)[0]?.name || '') || null;
        }

        if (!roleLabel) {
          roleLabel = fallbackRoleLabels[roleKey] || roleKey.replace(/_/g, ' ');
        }
      } catch {
        roleLabel = fallbackRoleLabels[roleKey] || roleKey.replace(/_/g, ' ');
      }

      // Resolve: plant override > global base > suggested
      let homePath: string | null = null;
      try {
        const plantOverride = await db.execute(sql`
          SELECT home_path
          FROM rbac_role_home_pages
          WHERE tenant_id = ${tenantId} AND plant_id = ${plantId} AND role_key = ${roleKey}
          LIMIT 1;
        `);
        homePath = normalizeHomePath((plantOverride.rows?.[0] as any)?.home_path);

        if (!homePath) {
          const globalBase = await db.execute(sql`
            SELECT home_path
            FROM rbac_role_home_pages
            WHERE tenant_id = ${tenantId} AND plant_id IS NULL AND role_key = ${roleKey}
            LIMIT 1;
          `);
          homePath = normalizeHomePath((globalBase.rows?.[0] as any)?.home_path);
        }
      } catch {
        homePath = null;
      }

      if (!homePath) {
        try {
          const perms = await RbacService.getTenantPermissionsForRole({ tenantId, roleKey });
          homePath = suggestHomeFromPermissions(perms);
        } catch {
          homePath = roleKey === 'tecnico' ? '/tecnico' : roleKey === 'operador' ? '/operador' : '/dashboard';
        }
      }

      return res.json({
        success: true,
        data: {
          plantId,
          roleKey,
          roleLabel,
          homePath,
        },
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to resolve home route' });
    }
  }

  static async getPermissions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      const plantId = String((req.query as any)?.plantId || '').trim();

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      if (!plantId) {
        return res.status(400).json({ success: false, error: 'plantId is required' });
      }

      const plantRole = await RbacService.getUserRoleForPlant({ userId, plantId });
      const roleKey = RbacService.normalizeRole(plantRole || String(req.user?.role || ''));
      if (!roleKey) {
        return res.status(403).json({ success: false, error: 'Sem role atribuída' });
      }

      const perms = await RbacService.getTenantPermissionsForRole({ tenantId, roleKey });
      return res.json({
        success: true,
        data: {
          plantId,
          roleKey,
          permissions: Array.from(perms),
        },
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to resolve permissions' });
    }
  }
}
