import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email?: string;
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
  selectedPlant: string | null;
  plants: Plant[];
  setSelectedPlant: (plantId: string) => void;
  setPlants: (plants: Plant[]) => void;
}

export const useAppStore = create<AppState>((set) => {
  // Safely retrieve and validate stored values
  const storedPlant = localStorage.getItem('selectedPlant');
  
  // Filter out null-like strings and empty values
  const selectedPlant = storedPlant && storedPlant !== 'null' && storedPlant !== 'undefined' ? storedPlant : null;
  
  return {
    selectedPlant,
    plants: [],

    setSelectedPlant: (plantId) => {
        const normalized =
          plantId && plantId !== 'null' && plantId !== 'undefined' && plantId.trim() !== ''
            ? plantId
            : null;

        if (normalized) {
          localStorage.setItem('selectedPlant', normalized);
        } else {
          localStorage.removeItem('selectedPlant');
        }

        set({ selectedPlant: normalized });
      },

    setPlants: (plants) => set({ plants }),
  };
});
