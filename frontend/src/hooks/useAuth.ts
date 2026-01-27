import { useEffect } from 'react';
import { useAuthStore } from '../context/store';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore();

  useEffect(() => {
    // Hydrate auth state from localStorage on mount
    useAuthStore.getState().hydrate();
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    logout,
  };
}

export function useRequireAuth() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated]);

  return { isAuthenticated };
}
