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
  mttr: number;
  mtbf: number;
  sla_compliance: number;
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

  const totalOrders = metrics?.total_orders ?? 0;
  const completionRate = totalOrders
    ? Math.round(((metrics?.completed ?? 0) / totalOrders) * 100)
    : 0;
  const backlogShare = totalOrders
    ? Math.round(((kpis?.backlog ?? 0) / totalOrders) * 100)
    : 0;

  const statusSummary = React.useMemo(
    () => [
      {
        key: 'aberta',
        label: 'Abertas',
        count: metrics?.open_orders ?? 0,
        tone: 'border-amber-200/70 bg-amber-50/70 text-amber-800',
        bar: 'bg-amber-400/80',
      },
      {
        key: 'atribuida',
        label: 'Atribuidas',
        count: metrics?.assigned_orders ?? 0,
        tone: 'border-sky-200/70 bg-sky-50/70 text-sky-800',
        bar: 'bg-sky-400/80',
      },
      {
        key: 'em_curso',
        label: 'Em curso',
        count: metrics?.in_progress ?? 0,
        tone: 'border-emerald-200/70 bg-emerald-50/70 text-emerald-800',
        bar: 'bg-emerald-400/80',
      },
      {
        key: 'concluida',
        label: 'Concluidas',
        count: metrics?.completed ?? 0,
        tone: 'border-slate-200/70 bg-slate-50/70 text-slate-700',
        bar: 'bg-slate-400/80',
      },
      {
        key: 'cancelada',
        label: 'Canceladas',
        count: metrics?.cancelled ?? 0,
        tone: 'border-rose-200/70 bg-rose-50/70 text-rose-700',
        bar: 'bg-rose-400/80',
      },
    ],
    [metrics],
  );

  const urgentOrders = React.useMemo(() => {
    const weight: Record<string, number> = {
      critica: 3,
      alta: 2,
      media: 1,
      baixa: 0,
    };

    return [...orders]
      .filter((order) => order.status !== 'concluida' && order.status !== 'cancelada')
      .sort((a, b) => {
        const left = weight[a.priority || 'media'] ?? 0;
        const right = weight[b.priority || 'media'] ?? 0;
        if (left !== right) return right - left;
        const leftDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const rightDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return rightDate - leftDate;
      })
      .slice(0, 4);
  }, [orders]);

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
            '--dash-accent-2': '#f59e0b',
            '--dash-ink': '#0f172a',
            '--dash-surface': '#f8fafc',
            '--dash-surface-2': '#f1f5f9',
          } as CSSProperties
        }
      >
        <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-[radial-gradient(circle_at_top,_#ecfeff_0%,_#ffffff_55%,_#fef9c3_120%)] p-8 shadow-[0_32px_80px_-55px_rgba(15,118,110,0.45)] lg:p-10">
          <div className="absolute -left-20 top-4 h-40 w-40 rounded-full bg-emerald-200/60 blur-3xl dash-float" />
          <div className="absolute -right-24 -top-16 h-64 w-64 rounded-full bg-amber-200/60 blur-3xl dash-float" />
          <div className="absolute bottom-6 right-8 h-20 w-20 rounded-3xl border border-white/70 bg-white/70 shadow-sm" />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
                Painel vivo
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
                Dashboard da manutencao
              </h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Bem-vindo, {user?.firstName}! Visibilidade total de backlog, SLA e
                operacao em tempo real.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-emerald-700">
                  SLA {kpis?.sla_compliance ?? 0}%
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1 text-amber-700">
                  Backlog {kpis?.backlog ?? 0}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-slate-600">
                  MTTR {kpis?.mttr ?? 0}h
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-slate-600">
                  MTBF {kpis?.mtbf ?? 0}h
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Efetividade
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {completionRate}%
                  </p>
                  <p className="text-xs text-slate-500">Ordens concluidas</p>
                </div>
                <div className="rounded-[22px] border border-slate-200/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Pressao de backlog
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {backlogShare}%
                  </p>
                  <p className="text-xs text-slate-500">Participacao no total</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                <p className="mt-1 text-xs text-slate-500">Ordens registradas</p>
              </div>
              <div className="dash-reveal dash-reveal-delay-1 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    abertas
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold text-slate-900">
                  {metrics?.open_orders ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">Aguardando inicio</p>
              </div>
              <div className="dash-reveal dash-reveal-delay-2 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-sky-100 p-2 text-sky-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    atribuicao
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold text-slate-900">
                  {metrics?.assigned_orders ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">Em fila de equipa</p>
              </div>
              <div className="dash-reveal dash-reveal-delay-3 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    execucao
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold text-slate-900">
                  {metrics?.in_progress ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">Ordens em curso</p>
              </div>
              <button
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-[color:var(--dash-surface)]"
                onClick={loadData}
              >
                <RefreshCcw className="h-4 w-4" />
                Recarregar painel
              </button>
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {statusSummary.map((item, index) => {
                  const percent = totalOrders
                    ? Math.round((item.count / totalOrders) * 100)
                    : 0;
                  return (
                    <div
                      key={item.key}
                      className={`dash-reveal rounded-[22px] border px-4 py-3 shadow-sm ${item.tone}`}
                      style={{ animationDelay: `${index * 0.06}s` }}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{item.label}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="mt-3 h-1.5 w-full rounded-full bg-white/70">
                        <div
                          className={`h-1.5 rounded-full ${item.bar}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">{percent}% do total</p>
                    </div>
                  );
                })}
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),var(--dash-accent-2))]" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Fluxo das ordens</h2>
                    <p className="text-xs text-slate-500">Arraste para atualizar o estado</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
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

                <div className="mt-6 grid gap-4 lg:grid-cols-5">
                  {statusColumns.map((column) => (
                    <div
                      key={column.key}
                      className={`flex min-h-[320px] flex-col rounded-[22px] border p-4 transition ${column.tone} ${
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
                            className={`rounded-[18px] border border-slate-200 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_26px_-20px_rgba(15,23,42,0.45)] ${
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
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center text-xs text-slate-400">
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
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {kpis.mttr}h
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        MTBF
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {kpis.mtbf}h
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        SLA cumprido
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {kpis.sla_compliance}%
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
                <div className="absolute right-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent-2),var(--dash-accent))]" />
                <h3 className="text-sm font-semibold text-slate-900">Foco imediato</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Ordens com maior prioridade em andamento.
                </p>
                <div className="mt-4 space-y-3">
                  {urgentOrders.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-[color:var(--dash-surface-2)] px-4 py-6 text-center text-xs text-slate-500">
                      Sem prioridades criticas no momento.
                    </div>
                  )}
                  {urgentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-slate-100 bg-[color:var(--dash-surface)] px-4 py-3 text-xs text-slate-600"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {order.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            priorityBadge[order.priority || 'media'] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {order.priority || 'media'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {order.asset
                          ? `${order.asset.code} - ${order.asset.name}`
                          : 'Sem ativo'}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

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
