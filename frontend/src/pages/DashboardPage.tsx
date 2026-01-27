import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import { getDashboardMetrics, getDashboardKPIs } from '../services/api';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

interface Metrics {
  total_orders: number;
  open_orders: number;
  assigned_orders: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

interface KPIs {
  mttr: number | string;
  mtbf: string;
  availability: string;
  backlog: number;
}

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const { selectedPlant } = useAppStore();
  const [metrics, setMetrics] = React.useState<Metrics | null>(null);
  const [kpis, setKPIs] = React.useState<KPIs | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!isAuthenticated || !selectedPlant) {
      setError('Plant não selecionada');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setError('');
        const [metricsData, kpisData] = await Promise.all([
          getDashboardMetrics(selectedPlant),
          getDashboardKPIs(selectedPlant),
        ]);
        setMetrics(metricsData);
        setKPIs(kpisData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPlant, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Não Autenticado</h2>
          <p className="text-gray-600">Por favor, faça login para acessar o dashboard</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Bem-vindo, {user?.firstName}! Aqui está o resumo da sua manutenção.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      )}

      {/* Metrics Grid */}
      {!loading && metrics && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total de Ordens</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {metrics.total_orders}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Em Progresso</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {metrics.in_progress}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Concluídas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {metrics.completed}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Backlog</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {kpis?.backlog || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordens Abertas</h3>
              <p className="text-3xl font-bold text-blue-600">{metrics.open_orders}</p>
              <p className="text-sm text-gray-600 mt-2">Não atribuídas ainda</p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordens Atribuídas</h3>
              <p className="text-3xl font-bold text-purple-600">{metrics.assigned_orders}</p>
              <p className="text-sm text-gray-600 mt-2">Aguardando início</p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Canceladas</h3>
              <p className="text-3xl font-bold text-red-600">{metrics.cancelled}</p>
              <p className="text-sm text-gray-600 mt-2">Desistidas ou não realizadas</p>
            </div>
          </div>

          {/* KPIs Section */}
          {kpis && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicadores-Chave</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">MTTR (Tempo Médio)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.mttr}h</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium">MTBF</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.mtbf}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium">Disponibilidade</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.availability}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium">Backlog Total</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.backlog}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
