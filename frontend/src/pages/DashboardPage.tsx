import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import { getDashboardMetrics, getDashboardKPIs } from '../services/api';
import {
  AlertCircle,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  RefreshCcw,
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

  const loadData = React.useCallback(async () => {
    if (!isAuthenticated || !selectedPlant) {
      setError('Plant não selecionada');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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
  }, [isAuthenticated, selectedPlant]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

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
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50 p-8 shadow-sm">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Panorama operacional
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Dashboard da manutencao
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Bem-vindo, {user?.firstName}! Acompanhe prioridades, backlog e
                desempenho em tempo real.
              </p>
            </div>
            <button
              className="btn-secondary inline-flex items-center gap-2"
              onClick={loadData}
            >
              <RefreshCcw className="h-4 w-4" />
              Recarregar
            </button>
          </div>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <BarChart3 className="h-4 w-4 text-sky-600" />
                Total de ordens
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {metrics?.total_orders ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Resumo geral</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-amber-600" />
                Em progresso
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {metrics?.in_progress ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Execucao ativa</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Concluidas
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {metrics?.completed ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Finalizadas hoje</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Backlog
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {kpis?.backlog ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Pendentes</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm text-slate-600">Carregando dados...</p>
          </div>
        )}

        {!loading && metrics && (
          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Fluxo das ordens</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Abertas
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-sky-600">
                      {metrics.open_orders}
                    </p>
                    <p className="text-xs text-slate-500">Nao atribuídas ainda</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Atribuidas
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-violet-600">
                      {metrics.assigned_orders}
                    </p>
                    <p className="text-xs text-slate-500">Aguardando inicio</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Canceladas
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-rose-600">
                      {metrics.cancelled}
                    </p>
                    <p className="text-xs text-slate-500">Nao realizadas</p>
                  </div>
                </div>
              </div>

              {kpis && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Indicadores-chave</h2>
                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        MTTR
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{kpis.mttr}h</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        MTBF
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{kpis.mtbf}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Disponibilidade
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {kpis.availability}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Backlog
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{kpis.backlog}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Sinalizadores</h3>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-emerald-600" />
                      Ordens em curso
                    </span>
                    <span className="font-semibold text-slate-700">{metrics.in_progress}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Ordens abertas
                    </span>
                    <span className="font-semibold text-slate-700">{metrics.open_orders}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-slate-800 shadow-sm">
                <h3 className="text-sm font-semibold">Resumo rapido</h3>
                <p className="mt-2 text-xs text-slate-600">
                  Priorize ordens abertas e em progresso para reduzir o backlog.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-sky-700">
                    {metrics.open_orders} abertas
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-amber-700">
                    {metrics.in_progress} em curso
                  </span>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
