import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { useAppStore } from './context/store';
import { getUserPlants } from './services/api';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SocketProvider } from './context/SocketContext';
import { queryClient } from './services/queryClient';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { AssetsPage } from './pages/AssetsPage';
import { MaintenancePlansPage } from './pages/MaintenancePlansPage';
import { SparePartsPage } from './pages/SparePartsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SearchPage } from './pages/SearchPage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { PlantsPage } from './pages/PlantsPage';

import './index.css';

function App() {
  const { isAuthenticated, user } = useAuth();
  const {
    selectedTenant,
    tenantSlug,
    selectedPlant,
    setSelectedTenant,
    setTenantSlug,
    setSelectedPlant,
    setPlants,
  } = useAppStore();

  // Auto-select demo tenant if not set
  React.useEffect(() => {
    if (isAuthenticated && !selectedTenant && user) {
      setSelectedTenant(user.tenantId);
    }
  }, [isAuthenticated, user, selectedTenant, setSelectedTenant]);

  React.useEffect(() => {
    if (tenantSlug) {
      setTenantSlug(tenantSlug);
    }
  }, [tenantSlug, setTenantSlug]);

  // Fetch plants for authenticated user and auto-select first
  React.useEffect(() => {
    const loadPlants = async () => {
      if (!isAuthenticated) return;
      
      try {
        const plants = await getUserPlants();
        console.log('Loaded plants:', plants);
        
        if (!plants || plants.length === 0) {
          console.warn('No plants found for user');
          setPlants([]);
          return;
        }
        
        setPlants(plants);

        const hasSelectedPlant = !!selectedPlant && plants.some((plant) => plant.id === selectedPlant);

        // Auto-select first plant if none selected or stored selection is invalid
        if (!hasSelectedPlant) {
          console.log('Auto-selecting first plant:', plants[0].id);
          setSelectedPlant(plants[0].id);
        }
      } catch (error) {
        console.error('Failed to load plants', error);
        setPlants([]);
      }
    };

    loadPlants();
  }, [isAuthenticated, setPlants, setSelectedPlant]); // Removed selectedPlant from deps to prevent loops

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TenantGate />} />
            <Route path="/t/:tenantSlug/*" element={<TenantRoutes />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;

function TenantGate() {
  const storedSlug = localStorage.getItem('tenantSlug');
  const normalized = storedSlug ? storedSlug.trim().toLowerCase() : '';

  if (normalized) {
    return <Navigate to={`/t/${normalized}/login`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Tenant obrigatorio</h1>
        <p className="mt-2 text-sm text-slate-600">
          Aceda usando a URL com slug, por exemplo:
        </p>
        <div className="mt-3 rounded-full bg-slate-100 px-4 py-2 text-xs text-slate-700">
          /t/sua-empresa/login
        </div>
      </div>
    </div>
  );
}

function TenantRoutes() {
  const { tenantSlug } = useParams();
  const { isAuthenticated } = useAuth();
  const { setTenantSlug } = useAppStore();

  React.useEffect(() => {
    if (tenantSlug) {
      setTenantSlug(tenantSlug);
    }
  }, [tenantSlug, setTenantSlug]);

  if (!tenantSlug) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route
        path="login"
        element={
          isAuthenticated ? (
            <Navigate to={`/t/${tenantSlug}/dashboard`} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="work-orders"
        element={
          <ProtectedRoute>
            <WorkOrdersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="assets"
        element={
          <ProtectedRoute>
            <AssetsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="maintenance-plans"
        element={
          <ProtectedRoute>
            <MaintenancePlansPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="spare-parts"
        element={
          <ProtectedRoute>
            <SparePartsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="suppliers"
        element={
          <ProtectedRoute>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="plants"
        element={
          <ProtectedRoute>
            <PlantsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="admin/setup"
        element={
          <ProtectedRoute>
            <AdminSetupPage />
          </ProtectedRoute>
        }
      />

      <Route path="unauthorized" element={<div>Unauthorized</div>} />
      <Route path="*" element={<Navigate to={`/t/${tenantSlug}/dashboard`} replace />} />
    </Routes>
  );
}
