import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfileAccess } from '../hooks/useProfileAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requiredAllPermissions?: string[];
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  requiredAllPermissions,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const { permissions, loading, isSuperAdmin } = useProfileAccess();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Evita redirects indevidos enquanto carrega permissões.
  if (!isSuperAdmin && loading) {
    return null;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const role = String(user?.role || '').trim().toLowerCase();
    const ok = requiredRoles.map((r) => String(r).trim().toLowerCase()).includes(role);
    if (!ok) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  // RBAC por permissões (definidas nas settings). OR semantics: qualquer permissão válida.
  if (!isSuperAdmin && requiredPermissions && requiredPermissions.length > 0) {
    const ok = requiredPermissions.some((perm) => permissions.has(String(perm).trim()));
    if (!ok) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  // RBAC por permissões (AND semantics): precisa de todas.
  if (!isSuperAdmin && requiredAllPermissions && requiredAllPermissions.length > 0) {
    const ok = requiredAllPermissions.every((perm) => permissions.has(String(perm).trim()));
    if (!ok) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}
