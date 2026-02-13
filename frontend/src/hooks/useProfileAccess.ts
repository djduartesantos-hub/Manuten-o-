import * as React from 'react';
import { useQuery } from 'react-query';
import { useAppStore } from '../context/store';
import { useAuth } from './useAuth';
import { getProfilePermissions } from '../services/api';

export function useProfileAccess() {
  const { user, isAuthenticated } = useAuth();
  const { selectedPlant } = useAppStore();

  const role = String(user?.role || '').trim().toLowerCase();
  const isSuperAdmin = role === 'superadmin';

  const query = useQuery(
    ['profile-permissions', selectedPlant, role],
    async () => {
      if (!selectedPlant) throw new Error('plantId em falta');
      return getProfilePermissions(selectedPlant);
    },
    {
      enabled: Boolean(isAuthenticated && !isSuperAdmin && selectedPlant),
      staleTime: 60_000,
      retry: 1,
    },
  );

  const permissionsSet = React.useMemo(() => {
    const list = query.data?.permissions || [];
    return new Set(list.map((p) => String(p || '').trim()));
  }, [query.data?.permissions]);

  return {
    isSuperAdmin,
    roleKey: isSuperAdmin ? 'superadmin' : (query.data?.roleKey || role),
    permissions: permissionsSet,
    loading: Boolean(isAuthenticated && !isSuperAdmin && !selectedPlant) || query.isLoading,
    error: query.error as any,
    refetch: query.refetch,
  };
}
