export function getHomeRouteForRole(role?: string): string {
  const normalized = (role || '').toLowerCase();

  // Technician
  if (['tecnico', 'technician', 'tech'].includes(normalized)) {
    return '/work-orders';
  }

  // Default to dashboard for all other roles
  // (superadmin, admin_empresa, gestor_manutencao, supervisor, viewer, etc.)
  return '/dashboard';
}
