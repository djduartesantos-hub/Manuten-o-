import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { SparePartsPage } from './pages/SparePartsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SearchPage } from './pages/SearchPage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { PlantsPage } from './pages/PlantsPage';
import { DatabaseUpdatePage } from './pages/DatabaseUpdatePage';
import { SetupInitPage } from './pages/SetupInitPage';
import { MaintenanceKitsListPage } from './pages/MaintenanceKitsListPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { TechnicianWorkOrdersHomePage } from './pages/TechnicianWorkOrdersHomePage';
import { OperatorWorkOrdersHomePage } from './pages/OperatorWorkOrdersHomePage';

import { SuperAdminPage } from './pages/SuperAdminPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';


import { ThemeProvider } from './context/ThemeContext';
import { getProfileHomeRoute } from './services/api';
import { getHomeRouteForRole } from './utils/homeRoute';

function App() {
  const { isAuthenticated, user } = useAuth();
  const { selectedPlant, setSelectedPlant, setPlants } = useAppStore();

  function HomeRedirect() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
      if (!isAuthenticated) return;

      // SuperAdmin main page is Settings (global)
      if (String(user?.role || '') === 'superadmin') {
        navigate('/superadmin/dashboard', { replace: true });
        return;
      }

      if (!selectedPlant) return;

      let cancelled = false;
      setLoading(true);

      (async () => {
        try {
          const data = await getProfileHomeRoute(selectedPlant);
          const path = String((data as any)?.homePath || '').trim() || getHomeRouteForRole(user?.role);
          if (!cancelled) navigate(path, { replace: true });
        } catch {
          if (!cancelled) navigate(getHomeRouteForRole(user?.role), { replace: true });
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, navigate, selectedPlant, user?.role]);

    if (String(user?.role || '') === 'superadmin') return null;
    if (!selectedPlant) return null;
    if (loading) return null;
    return null;
  }

  React.useEffect(() => {
    const loadPlants = async () => {
      if (!isAuthenticated) return;

      try {
        const plants = await getUserPlants();
        const safePlants = Array.isArray(plants) ? plants : [];
        setPlants(safePlants);

        if (safePlants.length > 0) {
          const hasSelected =
            !!selectedPlant && safePlants.some((plant) => plant.id === selectedPlant);

          if (!hasSelected) {
            setSelectedPlant(safePlants[0].id);
          }
        } else {
          setSelectedPlant('');
        }
      } catch (error) {
        console.error('Error loading plants:', error);
        setPlants([]);
      }
    };

    loadPlants();
  }, [isAuthenticated, selectedPlant, setPlants, setSelectedPlant]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? <HomeRedirect /> : <LoginPage />
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? <HomeRedirect /> : <LoginPage />
              }
            />
            <Route path="/setup" element={<SetupInitPage />} />

            <Route
              path="/unauthorized"
              element={
                <ProtectedRoute>
                  <UnauthorizedPage />
                </ProtectedRoute>
              }
            />

              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']}>
                    <Navigate to="/superadmin/dashboard" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/dashboard"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']}>
                    <SuperAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/empresas"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']}>
                    <SuperAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/fabricas"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']}>
                    <SuperAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/utilizadores"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']}>
                    <SuperAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/atualizacoes"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']}>
                    <SuperAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/suporte"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']}>
                    <SuperAdminPage />
                  </ProtectedRoute>
                }
              />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/work-orders"
              element={
                <ProtectedRoute>
                  <WorkOrdersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tecnico"
              element={
                <ProtectedRoute requiredRoles={['tecnico']}>
                  <TechnicianWorkOrdersHomePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/operador"
              element={
                <ProtectedRoute requiredRoles={['operador']}>
                  <OperatorWorkOrdersHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'viewer', 'superadmin']}>
                  <AssetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance-plans"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'superadmin']}>
                  <Navigate to="/settings?panel=preventive&sub=plans" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/preventive-schedules"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'superadmin']}>
                  <Navigate to="/settings?panel=preventive&sub=schedules" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spare-parts"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'superadmin']}>
                  <SparePartsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance-kits"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'superadmin']}>
                  <MaintenanceKitsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'superadmin']}>
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'viewer', 'superadmin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'gestor_manutencao', 'supervisor', 'superadmin']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/setup"
              element={
                <ProtectedRoute requiredRoles={['superadmin']}>
                  <AdminSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/database"
              element={
                <ProtectedRoute requiredRoles={['superadmin']}>
                  <DatabaseUpdatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants"
              element={
                <ProtectedRoute requiredRoles={['admin_empresa', 'superadmin']}>
                  <PlantsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />}
            />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 11000,
            }}
          />
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
