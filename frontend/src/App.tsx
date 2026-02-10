import React, { useState, useEffect } from 'react';
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


import { ThemeProvider } from './context/ThemeContext';

function App() {
  const { isAuthenticated } = useAuth();
  const { selectedPlant, setSelectedPlant, setPlants } = useAppStore();

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
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
              }
            />
            <Route path="/setup" element={<SetupInitPage />} />
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
                  <Navigate to="/settings?panel=preventive&sub=plans" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/preventive-schedules"
              element={
                <ProtectedRoute>
                  <Navigate to="/settings?panel=preventive&sub=schedules" replace />
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
              path="/maintenance-kits"
              element={
                <ProtectedRoute>
                  <MaintenanceKitsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <SuppliersPage />
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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
