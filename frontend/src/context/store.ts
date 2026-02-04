import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, refreshToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = localStorage.getItem('user');

    if (token && user) {
      set({
        token,
        refreshToken,
        user: JSON.parse(user),
        isAuthenticated: true,
      });
    }
  },
}));

interface Plant {
  id: string;
  name: string;
  code: string;
}

interface AppState {
  selectedTenant: string | null;
  selectedPlant: string | null;
  plants: Plant[];
  setSelectedTenant: (tenantId: string) => void;
  setSelectedPlant: (plantId: string) => void;
  setPlants: (plants: Plant[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedTenant: localStorage.getItem('selectedTenant'),
  selectedPlant: localStorage.getItem('selectedPlant'),
  plants: [],

  setSelectedTenant: (tenantId) => {
    localStorage.setItem('selectedTenant', tenantId);
    set({ selectedTenant: tenantId });
  },

  setSelectedPlant: (plantId) => {
    localStorage.setItem('selectedPlant', plantId);
    set({ selectedPlant: plantId });
  },

  setPlants: (plants) => set({ plants }),
}));
