export function normalizeRole(role?: string): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

const ROLE = {
  superadmin: 'superadmin',
  adminEmpresa: 'admin_empresa',
  gestorManutencao: 'gestor_manutencao',
  supervisor: 'supervisor',
  tecnico: 'tecnico',
  operador: 'operador',
  viewer: 'viewer',
} as const;

function isOneOf(role: string, allowed: string[]) {
  return allowed.includes(role);
}

export function canAccessPath(roleRaw: string | undefined, pathRaw: string): boolean {
  const role = normalizeRole(roleRaw);
  const path = String(pathRaw || '').trim();

  if (!role) return false;

  // Public-ish authenticated pages (menu + routes may still restrict further)
  if (['/profile', '/notifications'].includes(path)) return true;

  // SuperAdmin: keep it explicit. (Also allow Settings superadmin panel URL entry.)
  if (role === ROLE.superadmin) {
    if (path.startsWith('/superadmin')) return true;
    if (path === '/settings') return true;
    return false;
  }

  // Role-specific homes
  if (path === '/tecnico') return role === ROLE.tecnico;
  if (path === '/operador') return role === ROLE.operador;

  // Base app pages
  if (['/dashboard', '/search', '/work-orders'].includes(path)) return true;

  if (path === '/reports') return isOneOf(role, [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.viewer]);

  if (path === '/assets') return isOneOf(role, [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.viewer]);

  if (path === '/spare-parts') return isOneOf(role, [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor]);
  if (path === '/maintenance-kits') return isOneOf(role, [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor]);
  if (path === '/suppliers') return isOneOf(role, [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor]);

  if (path === '/settings') return isOneOf(role, [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor]);

  // Tenant admin page (already protected in routes too)
  if (path === '/plants') return role === ROLE.adminEmpresa;

  // Hide internal superadmin admin pages for non-superadmin
  if (path.startsWith('/admin/')) return false;

  // Default: allow (keeps backwards-compat for any unknown routes)
  return true;
}

export function getAllowedRolesForPath(pathRaw: string): string[] | null {
  const path = String(pathRaw || '').trim();

  if (path.startsWith('/superadmin')) return [ROLE.superadmin];
  if (path.startsWith('/admin/')) return [ROLE.superadmin];

  if (path === '/plants') return [ROLE.adminEmpresa, ROLE.superadmin];
  if (path === '/settings') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.superadmin];

  if (path === '/tecnico') return [ROLE.tecnico];
  if (path === '/operador') return [ROLE.operador];

  if (path === '/assets') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.viewer, ROLE.superadmin];
  if (path === '/reports') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.viewer, ROLE.superadmin];

  if (path === '/spare-parts') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.superadmin];
  if (path === '/maintenance-kits') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.superadmin];
  if (path === '/suppliers') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.superadmin];

  if (path === '/maintenance-plans') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.superadmin];
  if (path === '/preventive-schedules') return [ROLE.adminEmpresa, ROLE.gestorManutencao, ROLE.supervisor, ROLE.superadmin];

  return null;
}
