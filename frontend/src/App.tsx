import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAppStore } from './context/store';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { AssetsPage } from './pages/AssetsPage';

import './index.css';

function App() {
  const { isAuthenticated, user } = useAuth();
  const { selectedTenant, selectedPlant, setSelectedTenant, setSelectedPlant } = useAppStore();

  // Auto-select demo tenant if not set
  React.useEffect(() => {
    if (isAuthenticated && !selectedTenant && user) {
      setSelectedTenant(user.tenantId);
    }
  }, [isAuthenticated, user, selectedTenant, setSelectedTenant]);

  // Auto-select first plant if not set (would need to fetch from API in real app)
  React.useEffect(() => {
    if (isAuthenticated && !selectedPlant) {
      // In a real app, fetch plants from API
      setSelectedPlant('4c8e4c8d-1234-5678-1234-567812345678');
    }
  }, [isAuthenticated, selectedPlant, setSelectedPlant]);

  return (
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

        <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
