export function getRequiredPermissionsForPath(pathRaw: string): string[] | null {
  const path = String(pathRaw || '').trim().split('?')[0].split('#')[0];

  if (!path) return null;

  if (path === '/dashboard') return ['dashboard:read'];
  if (path === '/search') return ['search:read'];
  if (path === '/reports') return ['reports:read'];

  if (path === '/work-orders') return ['workorders:read', 'workorders:write'];
  if (path === '/planner') return ['workorders:read', 'schedules:read'];
  if (path === '/tecnico') return ['workorders:write', 'assets:write'];
  if (path === '/operador') return ['workorders:write'];

  if (path === '/assets') return ['assets:read', 'assets:write'];

  if (path === '/spare-parts') return ['stock:read', 'stock:write'];
  if (path === '/suppliers') return ['suppliers:read', 'suppliers:write'];

  if (path === '/maintenance-kits') return ['kits:read', 'kits:write'];

  // Settings: gate by an explicit permission (configurable via RBAC)
  if (path === '/settings') return ['settings:access', 'admin:plants', 'admin:users', 'admin:rbac', 'setup:run'];

  // Preventive shortcuts
  if (path === '/maintenance-plans') return ['plans:read', 'plans:write'];
  if (path === '/preventive-schedules') return ['schedules:read', 'schedules:write'];

  if (path === '/plants') return ['admin:plants'];

  if (path === '/notifications') return ['notifications:read', 'notifications:write'];
  if (path === '/tickets') return ['tickets:read', 'tickets:write', 'tickets:forward'];
  if (path === '/profile') return null;

  // Default: no explicit gating (keeps backward compatibility)
  return null;
}

export function canAccessPathByPermissions(options: {
  path: string;
  isSuperAdmin: boolean;
  permissions: Set<string>;
  loading?: boolean;
}): boolean {
  const { path, isSuperAdmin, permissions, loading } = options;

  if (isSuperAdmin) return true;

  // While loading, prefer hiding gated pages rather than flashing unauthorized links.
  const required = getRequiredPermissionsForPath(path);
  if (loading) return required === null;

  if (!required || required.length === 0) return true;

  const normalized = String(path || '').trim().split('?')[0].split('#')[0];
  const requiresAll = new Set(['/planner', '/tecnico', '/maintenance-plans', '/preventive-schedules']);
  if (requiresAll.has(normalized)) {
    return required.every((perm) => permissions.has(String(perm).trim()));
  }

  return required.some((perm) => permissions.has(String(perm).trim()));
}
