import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { RbacService } from '../services/rbac.service.js';

type PermissionScope = 'tenant' | 'plant';

export function requirePermission(permissionKey: string, scope: PermissionScope = 'plant') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const tenantId = req.tenantId || req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'Tenant ID is required' });
      }

      const normalizedUserRole = RbacService.normalizeRole(String(req.user.role || '').trim());

      // Superadmin bypass
      if (normalizedUserRole === 'superadmin') {
        return next();
      }

      let roleKey: string | null = null;

      if (scope === 'plant') {
        const plantId = req.params?.plantId || req.plantId;
        if (!plantId) {
          return res.status(400).json({ success: false, error: 'Plant ID is required' });
        }

        roleKey = await RbacService.getUserRoleForPlant({
          userId: req.user.userId,
          plantId,
        });

        // fallback: role global no token
        if (!roleKey) {
          roleKey = String(req.user.role || '').trim();
        }
      } else {
        roleKey = String(req.user.role || '').trim();
      }

      const normalizedRole = RbacService.normalizeRole(roleKey);
      if (!normalizedRole) {
        return res.status(403).json({ success: false, error: 'Sem role atribuída' });
      }

      // Nota: admin_empresa é o "admin" do tenant. O resto depende de role_permissions.
      const ok = await RbacService.roleHasPermission({
        tenantId,
        roleKey: normalizedRole,
        permissionKey,
      });

      if (!ok) {
        // Break-glass bootstrap:
        // If RBAC tables exist but tenant has zero seeded permissions,
        // allow admin_empresa to run setup/admin actions so it can repair RBAC.
        if (
          normalizedUserRole === 'admin_empresa' &&
          scope === 'tenant' &&
          (permissionKey === 'setup:run' || permissionKey === 'admin:rbac' || permissionKey === 'admin:users' || permissionKey === 'admin:plants')
        ) {
          const hasAny = await RbacService.tenantHasAnyRbacPermissions(tenantId);
          if (!hasAny) {
            return next();
          }
        }

        return res.status(403).json({
          success: false,
          error: 'Permissão insuficiente',
          permission: permissionKey,
        });
      }

      return next();
    } catch (error: any) {
      // Backward-compat: antes do patch RBAC, as tabelas podem não existir.
      // Nesse caso, fazemos fallback para a lógica antiga baseada em role.
      const msg = String(error?.message || '');
      const pgCode = error?.code;
      if (pgCode === '42P01' || msg.includes('relation') && msg.includes('does not exist')) {
        if (!req.user) {
          return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const role = RbacService.normalizeRole(String(req.user.role || '').trim());
        if (role === 'superadmin' || role === 'admin_empresa') {
          return next();
        }

        return res.status(403).json({
          success: false,
          error: 'Permissão insuficiente (RBAC ainda não aplicado)',
          permission: permissionKey,
        });
      }

      return res.status(500).json({
        success: false,
        error: error?.message || 'Erro ao validar permissões',
      });
    }
  };
}
