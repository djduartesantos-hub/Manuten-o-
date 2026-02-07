import React, { type CSSProperties } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import {
  apiCall,
  getDashboardMetrics,
  getDashboardKPIs,
  getWorkOrders,
  updateWorkOrder,
} from '../services/api';
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

interface DashboardWorkOrder {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  started_at?: string | null;
  asset?: {
    code: string;
    name: string;
  } | null;
}

interface AlertItem {
  id: string;
  severity: string;
  message: string;
  created_at?: string | null;
  asset?: {
    name: string;
    code: string;
  } | null;
}

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const { selectedPlant } = useAppStore();
  const [metrics, setMetrics] = React.useState<Metrics | null>(null);
  const [kpis, setKPIs] = React.useState<KPIs | null>(null);
  const [orders, setOrders] = React.useState<DashboardWorkOrder[]>([]);
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [draggingOrderId, setDraggingOrderId] = React.useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = React.useState<string | null>(null);

  const statusColumns = React.useMemo(
    () => [
      {
        key: 'aberta',
        label: 'Abertas',
        tone: 'border-amber-200 bg-amber-50/60',
        dot: 'bg-amber-400',
      },
      {
        key: 'atribuida',
        label: 'Atribuidas',
        tone: 'border-sky-200 bg-sky-50/60',
        dot: 'bg-sky-400',
      },
      {
        key: 'em_curso',
        label: 'Em curso',
        tone: 'border-emerald-200 bg-emerald-50/60',
        dot: 'bg-emerald-400',
      },
      {
        key: 'concluida',
        label: 'Concluidas',
        tone: 'border-slate-200 bg-slate-50/70',
        dot: 'bg-slate-400',
      },
      {
        key: 'cancelada',
        label: 'Canceladas',
        tone: 'border-rose-200 bg-rose-50/60',
        dot: 'bg-rose-400',
      },
    ],
    [],
  );

  const groupedOrders = React.useMemo(() => {
    return orders.reduce<Record<string, DashboardWorkOrder[]>>((acc, order) => {
      const key = order.status || 'aberta';
      if (!acc[key]) acc[key] = [];
      acc[key].push(order);
      return acc;
    }, {});
  }, [orders]);

  const topAssets = React.useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    orders.forEach((order) => {
      if (!order.asset) return;
      const label = `${order.asset.code} - ${order.asset.name}`;
      const entry = counts.get(label) || { label, count: 0 };
      entry.count += 1;
      counts.set(label, entry);
    });
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  const severityBadge: Record<string, string> = {
    critical: 'bg-rose-100 text-rose-700',
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-emerald-100 text-emerald-700',
  };

  const loadData = React.useCallback(async () => {
    if (!isAuthenticated || !selectedPlant) {
      setError('Plant não selecionada');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [metricsData, kpisData, ordersData, alertsData] = await Promise.all([
        getDashboardMetrics(selectedPlant),
        getDashboardKPIs(selectedPlant),
        getWorkOrders(selectedPlant),
        apiCall('/alerts/history?limit=6'),
      ]);
      setMetrics(metricsData);
      setKPIs(kpisData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedPlant]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const priorityBadge: Record<string, string> = {
    critica: 'bg-rose-100 text-rose-700',
    alta: 'bg-amber-100 text-amber-700',
    media: 'bg-emerald-100 text-emerald-700',
    baixa: 'bg-slate-100 text-slate-600',
  };

  const handleDragStart = (orderId: string) => {
    setDraggingOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggingOrderId(null);
    setDragOverStatus(null);
  };

  const handleDrop = async (status: string) => {
    if (!draggingOrderId || !selectedPlant) return;
    const targetOrder = orders.find((order) => order.id === draggingOrderId);
    if (!targetOrder || targetOrder.status === status) {
      handleDragEnd();
      return;
    }

    const nextOrders = orders.map((order) =>
      order.id === draggingOrderId ? { ...order, status } : order,
    );
    setOrders(nextOrders);

    try {
      await updateWorkOrder(selectedPlant, draggingOrderId, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status');
      await loadData();
    } finally {
      handleDragEnd();
    }
  };

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
      <div
        className="relative space-y-10 font-display text-[color:var(--dash-ink)]"
        style={
          {
            '--dash-accent': '#0f766e',
            '--dash-accent-2': '#38bdf8',
            '--dash-ink': '#0f172a',
            '--dash-surface': '#f8fafc',
          } as CSSProperties
        }
      >
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,_#ecfeff,_#ffffff_60%)] p-8 shadow-[0_28px_80px_-60px_rgba(15,118,110,0.5)]">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-emerald-200/60 blur-3xl dash-float" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-sky-200/50 blur-3xl dash-float" />
          <div className="absolute right-12 top-10 h-2 w-20 rounded-full bg-[color:var(--dash-accent)] opacity-50" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Panorama operacional
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
                Dashboard da manutencao
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Bem-vindo, {user?.firstName}! Acompanhe prioridades, backlog e
                desempenho em tempo real.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-[color:var(--dash-surface)]"
              onClick={loadData}
            >
              <RefreshCcw className="h-4 w-4" />
              Recarregar
            </button>
          </div>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="dash-reveal rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  total
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {metrics?.total_orders ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Resumo geral</p>
            </div>
            <div className="dash-reveal dash-reveal-delay-1 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  execucao
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {metrics?.in_progress ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Em progresso</p>
            </div>
            <div className="dash-reveal dash-reveal-delay-2 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  concluidas
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {metrics?.completed ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Finalizadas hoje</p>
            </div>
            <div className="dash-reveal dash-reveal-delay-3 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-rose-100 p-2 text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  backlog
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {kpis?.backlog ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Pendentes</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-2 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </div>
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-sm text-slate-600">Carregando dados...</p>
          </div>
        )}

        {!loading && metrics && (
          <section className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),#34d399)]" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Ordens por status</h2>
                    <p className="text-xs text-slate-500">Arraste para atualizar o estado</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      <Activity className="h-3.5 w-3.5 text-emerald-600" />
                      {metrics.in_progress} em curso
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      {metrics.open_orders} abertas
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
                  {statusColumns.map((column) => (
                    <div
                      key={column.key}
                      className={`min-w-[250px] flex-1 rounded-[22px] border p-4 transition ${column.tone} ${
                        dragOverStatus === column.key ? 'ring-2 ring-emerald-400/60' : ''
                      }`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverStatus(column.key);
                      }}
                      onDragLeave={() => setDragOverStatus(null)}
                      onDrop={() => handleDrop(column.key)}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                          {column.label}
                        </div>
                        <span className="text-xs text-slate-500">
                          {(groupedOrders[column.key] || []).length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {(groupedOrders[column.key] || []).map((order) => (
                          <div
                            key={order.id}
                            draggable
                            onDragStart={() => handleDragStart(order.id)}
                            onDragEnd={handleDragEnd}
                            className={`rounded-[18px] border border-slate-200 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_14px_24px_-20px_rgba(15,23,42,0.4)] ${
                              draggingOrderId === order.id ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {order.title}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {order.asset
                                    ? `${order.asset.code} - ${order.asset.name}`
                                    : 'Sem ativo'}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  priorityBadge[order.priority || 'media'] || 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {order.priority || 'media'}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                              <span>{formatDateTime(order.created_at)}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                                #{order.id.slice(0, 6)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {(groupedOrders[column.key] || []).length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-6 text-center text-xs text-slate-400">
                            Sem ordens
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {kpis && (
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                  <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,#38bdf8,var(--dash-accent))]" />
                  <h2 className="text-lg font-semibold text-slate-900">Indicadores-chave</h2>
                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        MTTR
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{kpis.mttr}h</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        MTBF
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{kpis.mtbf}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Disponibilidade
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {kpis.availability}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Backlog
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{kpis.backlog}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),#34d399)]" />
                <h3 className="text-sm font-semibold text-slate-900">Alertas recentes</h3>
                <div className="mt-4 space-y-3">
                  {alerts.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-[color:var(--dash-surface)] px-4 py-6 text-center text-xs text-slate-500">
                      Nenhum alerta recente
                    </div>
                  )}
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] px-4 py-3 text-xs text-slate-600"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          severityBadge[alert.severity] || 'bg-slate-100 text-slate-600'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(alert.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {alert.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {alert.asset ? `${alert.asset.code} - ${alert.asset.name}` : 'Sem ativo'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] p-6 text-slate-800 shadow-[0_20px_60px_-45px_rgba(16,185,129,0.6)]">
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-200/50 blur-2xl" />
                <h3 className="text-sm font-semibold">Top ativos</h3>
                <p className="mt-2 text-xs text-slate-600">
                  Equipamentos com mais ordens recentes.
                </p>
                <div className="mt-4 space-y-3">
                  {topAssets.length === 0 && (
                    <p className="text-xs text-slate-500">Sem dados suficientes.</p>
                  )}
                  {topAssets.map((asset) => (
                    <div
                      key={asset.label}
                      className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-slate-700">{asset.label}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        {asset.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
