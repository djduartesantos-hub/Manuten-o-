import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const { tenantSlug } = useAppStore();
  const location = useLocation();
  const slugMatch = location.pathname.match(/^\/t\/([^/]+)/);
  const resolvedSlug = tenantSlug || slugMatch?.[1] || localStorage.getItem('tenantSlug') || '';

  if (!isAuthenticated) {
    return (
      <Navigate
        to={resolvedSlug ? `/t/${resolvedSlug}/login` : '/'}
        state={{ from: location }}
        replace
      />
    );
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to={resolvedSlug ? `/t/${resolvedSlug}/unauthorized` : '/unauthorized'} replace />;
  }

  return <>{children}</>;
}
