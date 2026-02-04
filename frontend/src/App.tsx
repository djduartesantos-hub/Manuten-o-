import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

import './index.css';

function App() {
  const { isAuthenticated, user } = useAuth();
  const {
    selectedTenant,
    selectedPlant,
    setSelectedTenant,
    setSelectedPlant,
    setPlants,
  } = useAppStore();

  // Auto-select demo tenant if not set
  React.useEffect(() => {
    if (isAuthenticated && !selectedTenant && user) {
      setSelectedTenant(user.tenantId);
    }
  }, [isAuthenticated, user, selectedTenant, setSelectedTenant]);

  // Fetch plants for authenticated user and auto-select first
  React.useEffect(() => {
    const loadPlants = async () => {
      if (!isAuthenticated) return;
      try {
        const plants = await getUserPlants();
        setPlants(plants || []);
        if (!selectedPlant && plants && plants.length > 0) {
          setSelectedPlant(plants[0].id);
        }
      } catch (error) {
        console.error('Failed to load plants', error);
      }
    };

    loadPlants();
  }, [isAuthenticated, selectedPlant, setPlants, setSelectedPlant]);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
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
              path="/assets"
              element={
                <ProtectedRoute>
                  <AssetsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/maintenance-plans"
              element={
                <ProtectedRoute>
                  <MaintenancePlansPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/spare-parts"
              element={
                <ProtectedRoute>
                  <SparePartsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
