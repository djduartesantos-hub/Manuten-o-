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
import { SuppliersPage } from './pages/SuppliersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SearchPage } from './pages/SearchPage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { PlantsPage } from './pages/PlantsPage';
import { DatabaseUpdatePage } from './pages/DatabaseUpdatePage';
import { SetupInitPage } from './pages/SetupInitPage';

import './index.css';

function App() {
  const { isAuthenticated, user } = useAuth();
  const {
    selectedPlant,
    setSelectedPlant,
    setPlants,
  } = useAppStore();

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
        }
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

        const hasSelectedPlant = !!selectedPlant && plants.some((plant) => plant.id === selectedPlant);

        // Auto-select first plant if none selected or stored selection is invalid
        if (!hasSelectedPlant) {
          console.log('Auto-selecting first plant:', plants[0].id);
          setSelectedPlant(plants[0].id);
        }
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

      <Route
        path="admin/database"
        element={
          <ProtectedRoute requiredRoles={['superadmin']}>
            <DatabaseUpdatePage />
          </ProtectedRoute>
        }
      />

      <Route path="unauthorized" element={<div>Unauthorized</div>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
