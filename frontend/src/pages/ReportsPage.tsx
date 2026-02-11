import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, Download, Filter, Loader2, TrendingUp } from 'lucide-react';
import { useAppStore } from '../context/store';
import { getWorkOrders } from '../services/api';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement);

const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta',
  em_analise: 'Em Análise',
  em_execucao: 'Em Execução',
  em_pausa: 'Em Pausa',
  concluida: 'Concluída',
  fechada: 'Fechada',
  cancelada: 'Cancelada',
};

const workOrderStatusLabel = (value: string) => WORK_ORDER_STATUS_LABELS[value] || value;

const WORK_ORDER_PRIORITY_LABELS: Record<string, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const workOrderPriorityLabel = (value?: string | null) => {
  const key = String(value || '').trim().toLowerCase();
  return WORK_ORDER_PRIORITY_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '—');
};

const REPORTS_STORAGE_KEY = 'reportsPreferences';

interface WorkOrder {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  sla_deadline?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  downtime_started_at?: string | null;
  downtime_ended_at?: string | null;
  downtime_minutes?: number | null;
  downtime_reason?: string | null;
  downtime_type?: string | null;
  downtime_category?: string | null;
  asset?: {
    code: string;
    name: string;
  } | null;
  assigned_to_id?: string | null;
}

export function ReportsPage() {
  const { selectedPlant } = useAppStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<
    'general' | 'asset' | 'technician' | 'temporal' | 'downtime'
  >('general');

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState('');

  // Restore saved preferences (type + filters)
  useEffect(() => {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.reportType) setReportType(parsed.reportType);
      setStatusFilter(parsed?.statusFilter || '');
      setPriorityFilter(parsed?.priorityFilter || '');
      setDateFrom(parsed?.dateFrom || '');
      setDateTo(parsed?.dateTo || '');
      setSearchTerm(parsed?.searchTerm || '');
      setAssetFilter(parsed?.assetFilter || '');
    } catch {
      // ignore
    }
  }, []);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(
      REPORTS_STORAGE_KEY,
      JSON.stringify({ reportType, statusFilter, priorityFilter, dateFrom, dateTo, searchTerm, assetFilter }),
    );
  }, [reportType, statusFilter, priorityFilter, dateFrom, dateTo, searchTerm, assetFilter]);

  useEffect(() => {
    const load = async () => {
      if (!selectedPlant) return;
      setLoading(true);
      setError(null);
      try {
        const orders = await getWorkOrders(selectedPlant);
        setWorkOrders(
          (orders || []).map((order: WorkOrder) => ({
            ...order,
            status:
              order.status === 'aprovada' || order.status === 'planeada'
                ? 'em_analise'
                : order.status,
          })),
        );
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedPlant]);

  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (priorityFilter && order.priority !== priorityFilter) return false;
      if (assetFilter && order.asset?.code !== assetFilter) return false;

      if (reportType === 'downtime') {
        const minutes = Number(order.downtime_minutes ?? 0);
        const hasInterval = Boolean(order.downtime_started_at && order.downtime_ended_at);
        if (!hasInterval && minutes <= 0) return false;
      }

      if (searchTerm) {
        const haystack = `${order.title} ${order.description || ''} ${order.asset?.code || ''} ${
          order.asset?.name || ''
        }`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) return false;
      }

      if (dateFrom) {
        const referenceIso =
          reportType === 'downtime' ? order.downtime_started_at || '' : order.created_at || '';
        const reference = referenceIso ? new Date(referenceIso).getTime() : 0;
        if (reference < new Date(dateFrom).getTime()) return false;
      }

      if (dateTo) {
        const referenceIso =
          reportType === 'downtime' ? order.downtime_started_at || '' : order.created_at || '';
        const reference = referenceIso ? new Date(referenceIso).getTime() : 0;
        if (reference > new Date(dateTo).getTime() + 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [workOrders, statusFilter, priorityFilter, dateFrom, dateTo, searchTerm, assetFilter, reportType]);

  const downtimeOrders = useMemo(() => {
    if (reportType !== 'downtime') return [];
    return filteredOrders
      .map((order) => {
        const minutes = Number(order.downtime_minutes ?? 0);
        const startedAt = order.downtime_started_at ? new Date(order.downtime_started_at).getTime() : 0;
        return {
          ...order,
          __downtimeMinutes: minutes,
          __downtimeStartedAt: startedAt,
        };
      })
      .sort((a, b) => b.__downtimeStartedAt - a.__downtimeStartedAt);
  }, [filteredOrders, reportType]);

  // Calculate MTTR (Mean Time To Repair) and MTBF (Mean Time Between Failures)
  const calculateMetrics = useMemo(() => {
    const completed = filteredOrders.filter((o) => ['concluida', 'fechada'].includes(o.status));
    
    let totalRepairTime = 0;
    let repairCount = 0;

    completed.forEach((order) => {
      if (order.actual_hours) {
        totalRepairTime += order.actual_hours;
        repairCount += 1;
      }
    });

    const mttr = repairCount > 0 ? (totalRepairTime / repairCount).toFixed(2) : '0';
    
    // MTBF: Average time between failures (days between completed orders)
    let mtbf: string | number = 0;
    if (completed.length > 1) {
      const sortedByDate = [...completed].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      let totalDaysBetween = 0;
      for (let i = 1; i < sortedByDate.length; i++) {
        const prev = new Date(sortedByDate[i - 1].created_at || 0).getTime();
        const curr = new Date(sortedByDate[i].created_at || 0).getTime();
        totalDaysBetween += (curr - prev) / (1000 * 60 * 60 * 24);
      }
      mtbf = (totalDaysBetween / (sortedByDate.length - 1)).toFixed(2);
    } else {
      mtbf = '0';
    }

    const completionRate =
      workOrders.length > 0 ? ((completed.length / workOrders.length) * 100).toFixed(1) : '0';
    const slaCompliance =
      completed.length > 0
        ? (
            ((completed.filter((o) => {
              if (!o.sla_deadline) return true;
              return new Date(o.completed_at || 0).getTime() <= new Date(o.sla_deadline).getTime();
            }).length /
              completed.length) *
              100).toFixed(1)
          )
        : '0';

    return { mttr, mtbf, completionRate, slaCompliance };
  }, [filteredOrders, workOrders]);

  const summary = useMemo(() => {
    const total = filteredOrders.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byAsset: Record<string, number> = {};
    const byTechnician: Record<string, number> = {};
    let overdue = 0;

    filteredOrders.forEach((order) => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      const priority = order.priority || 'n/a';
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      if (order.asset?.code) {
        byAsset[order.asset.code] = (byAsset[order.asset.code] || 0) + 1;
      }

      const tech = order.assigned_to_id || 'Sem atribuição';
      byTechnician[tech] = (byTechnician[tech] || 0) + 1;

      if (order.sla_deadline) {
        const sla = new Date(order.sla_deadline).getTime();
        if (sla < Date.now() && !['concluida', 'fechada', 'cancelada'].includes(order.status)) overdue += 1;
      }
    });

    return { total, byStatus, byPriority, byAsset, byTechnician, overdue };
  }, [filteredOrders]);

  const uniqueAssets = useMemo(() => {
    const assets = new Set<string>();
    workOrders.forEach((order) => {
      if (order.asset?.code) assets.add(order.asset.code);
    });
    return Array.from(assets);
  }, [workOrders]);

  const statusChartData = useMemo(() => {
    const keys = Object.keys(summary.byStatus);
    const labels = keys.map((key) => workOrderStatusLabel(key));
    const palette = ['#0ea5e9', '#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#a855f7', '#14b8a6'];
    return {
      labels,
      datasets: [
        {
          label: 'Ordens por status',
          data: keys.map((key) => summary.byStatus[key]),
          backgroundColor: keys.map((_, idx) => palette[idx % palette.length]),
        },
      ],
    };
  }, [summary]);

  const priorityChartData = useMemo(() => {
    const priorityOrder = ['critica', 'alta', 'media', 'baixa', 'n/a'];
    const rawKeys = Object.keys(summary.byPriority);
    const keys = priorityOrder.filter((k) => rawKeys.includes(k)).concat(rawKeys.filter((k) => !priorityOrder.includes(k)));

    const colorByPriority: Record<string, string> = {
      critica: '#ef4444',
      alta: '#f59e0b',
      media: '#22c55e',
      baixa: '#0ea5e9',
      'n/a': '#94a3b8',
    };
    return {
      labels: keys.map((k) => (k === 'n/a' ? '—' : workOrderPriorityLabel(k))),
      datasets: [
        {
          label: 'Ordens por prioridade',
          data: keys.map((key) => summary.byPriority[key]),
          backgroundColor: keys.map((key) => colorByPriority[key] || '#94a3b8'),
        },
      ],
    };
  }, [summary]);

  const assetChartData = useMemo(() => {
    const labels = Object.keys(summary.byAsset).slice(0, 10);
    return {
      labels,
      datasets: [
        {
          label: 'Ordens por ativo',
          data: labels.map((label) => summary.byAsset[label]),
          backgroundColor: '#0ea5e9',
          borderColor: '#0284c7',
          borderWidth: 1,
        },
      ],
    };
  }, [summary]);

  const technicianChartData = useMemo(() => {
    const labels = Object.keys(summary.byTechnician);
    return {
      labels,
      datasets: [
        {
          label: 'Ordens por técnico',
          data: labels.map((label) => summary.byTechnician[label]),
          backgroundColor: '#6366f1',
          borderColor: '#4f46e5',
          borderWidth: 1,
        },
      ],
    };
  }, [summary]);

  // Temporal analysis: orders over time (by week)
  const temporalChartData = useMemo(() => {
    const ordersByWeek: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      if (order.created_at) {
        const date = new Date(order.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        ordersByWeek[weekKey] = (ordersByWeek[weekKey] || 0) + 1;
      }
    });

    const sortedWeeks = Object.keys(ordersByWeek).sort();
    return {
      labels: sortedWeeks.map((w) => new Date(w).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Ordens por semana',
          data: sortedWeeks.map((w) => ordersByWeek[w]),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [filteredOrders]);

  const downtimeSummary = useMemo(() => {
    if (reportType !== 'downtime') return { totalMinutes: 0, totalHours: '0.0' };
    const totalMinutes = downtimeOrders.reduce(
      (acc, o) => acc + Number((o as any).__downtimeMinutes || 0),
      0,
    );
    return { totalMinutes, totalHours: (totalMinutes / 60).toFixed(1) };
  }, [downtimeOrders, reportType]);

  const downtimeByTypeChartData = useMemo(() => {
    if (reportType !== 'downtime') return null;
    const totals: Record<string, number> = {};
    downtimeOrders.forEach((o) => {
      const key = String(o.downtime_type || 'Sem tipo');
      totals[key] = (totals[key] || 0) + Number((o as any).__downtimeMinutes || 0);
    });
    const labels = Object.keys(totals);
    return {
      labels,
      datasets: [
        {
          label: 'Downtime (min) por tipo',
          data: labels.map((l) => totals[l]),
          backgroundColor: ['#0ea5e9', '#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#a855f7', '#14b8a6'],
        },
      ],
    };
  }, [downtimeOrders, reportType]);

  const downtimeByCategoryChartData = useMemo(() => {
    if (reportType !== 'downtime') return null;
    const totals: Record<string, number> = {};
    downtimeOrders.forEach((o) => {
      const key = String(o.downtime_category || 'Sem categoria');
      totals[key] = (totals[key] || 0) + Number((o as any).__downtimeMinutes || 0);
    });
    const labels = Object.keys(totals);
    return {
      labels,
      datasets: [
        {
          label: 'Downtime (min) por categoria',
          data: labels.map((l) => totals[l]),
          backgroundColor: '#6366f1',
          borderColor: '#4f46e5',
          borderWidth: 1,
        },
      ],
    };
  }, [downtimeOrders, reportType]);

  const downtimeTemporalChartData = useMemo(() => {
    if (reportType !== 'downtime') return null;
    const minutesByWeek: Record<string, number> = {};
    downtimeOrders.forEach((order: any) => {
      if (!order.downtime_started_at) return;
      const date = new Date(order.downtime_started_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      minutesByWeek[weekKey] = (minutesByWeek[weekKey] || 0) + Number(order.__downtimeMinutes || 0);
    });
    const sortedWeeks = Object.keys(minutesByWeek).sort();
    return {
      labels: sortedWeeks.map((w) =>
        new Date(w).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' }),
      ),
      datasets: [
        {
          label: 'Downtime (min) por semana',
          data: sortedWeeks.map((w) => minutesByWeek[w]),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [downtimeOrders, reportType]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
      },
    }),
    [],
  );

  const reportTypeOptions = useMemo(
    () => [
      { key: 'general' as const, label: 'Geral', hint: 'Visão global por status e prioridade.' },
      { key: 'asset' as const, label: 'Por Ativo', hint: 'Top ativos com mais ordens.' },
      { key: 'technician' as const, label: 'Por Técnico', hint: 'Distribuição por responsável.' },
      { key: 'temporal' as const, label: 'Temporal', hint: 'Tendência semanal.' },
      { key: 'downtime' as const, label: 'Downtime', hint: 'Paragens e causas.' },
    ],
    [],
  );

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(
      reportType === 'downtime' ? 'Relatório de Downtime' : 'Relatório de Ordens de Serviço',
      14,
      20,
    );

    doc.setFontSize(10);
    if (reportType === 'downtime') {
      const totalMinutes = downtimeOrders.reduce((acc, order) => acc + Number((order as any).__downtimeMinutes || 0), 0);
      doc.text(`Tipo: downtime | Registos: ${downtimeOrders.length} | Total: ${totalMinutes} min`, 14, 28);

      autoTable(doc, {
        startY: 36,
        head: [['Ordem', 'Ativo', 'Início', 'Fim', 'Min', 'Motivo']],
        body: downtimeOrders.slice(0, 60).map((order) => [
          order.title.substring(0, 22),
          order.asset ? order.asset.code : '-',
          order.downtime_started_at ? new Date(order.downtime_started_at).toLocaleString('pt-PT') : '-',
          order.downtime_ended_at ? new Date(order.downtime_ended_at).toLocaleString('pt-PT') : '-',
          String((order as any).__downtimeMinutes ?? ''),
          (order.downtime_reason || '').substring(0, 26),
        ]),
      });

      doc.save('relatorio-downtime.pdf');
      return;
    }

    doc.text(`Tipo: ${reportType} | Total: ${summary.total} | Em atraso: ${summary.overdue}`, 14, 28);
    doc.text(
      `MTTR: ${calculateMetrics.mttr}h | MTBF: ${calculateMetrics.mtbf}d | Conformidade SLA: ${calculateMetrics.slaCompliance}%`,
      14,
      35,
    );

    autoTable(doc, {
      startY: 42,
      head: [['Ordem', 'Status', 'Prioridade', 'Ativo', 'Horas', 'Criada em']],
      body: filteredOrders.slice(0, 50).map((order) => [
        order.title.substring(0, 20),
        order.status,
        order.priority || '',
        order.asset ? order.asset.code : '-',
        order.actual_hours || order.estimated_hours || '-',
        order.created_at ? new Date(order.created_at).toLocaleDateString() : '-',
      ]),
    });

    doc.save('relatorio-ordens.pdf');
  };

  const exportCsv = () => {
    if (reportType === 'downtime') {
      const headers = [
        'Ordem ID',
        'Ordem',
        'Ativo',
        'Início downtime',
        'Fim downtime',
        'Downtime (min)',
        'Tipo',
        'Categoria',
        'Motivo',
      ];
      const rows = downtimeOrders.map((order) => [
        order.id,
        order.title,
        order.asset ? `${order.asset.code} - ${order.asset.name}` : '',
        order.downtime_started_at ? new Date(order.downtime_started_at).toLocaleString('pt-PT') : '',
        order.downtime_ended_at ? new Date(order.downtime_ended_at).toLocaleString('pt-PT') : '',
        (order as any).__downtimeMinutes ?? '',
        order.downtime_type || '',
        order.downtime_category || '',
        order.downtime_reason || '',
      ]);

      const csvContent = [
        headers,
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `downtime-${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      return;
    }

    const headers = [
      'ID',
      'Título',
      'Status',
      'Prioridade',
      'Ativo',
      'Horas Estimadas',
      'Horas Reais',
      'Criada em',
      'Atualizada em',
    ];
    const rows = filteredOrders.map((order) => [
      order.id,
      order.title,
      order.status,
      order.priority || '',
      order.asset ? `${order.asset.code} - ${order.asset.name}` : '',
      order.estimated_hours || '',
      order.actual_hours || '',
      order.created_at ? new Date(order.created_at).toLocaleString() : '',
      order.updated_at ? new Date(order.updated_at).toLocaleString() : '',
    ]);

    const csvContent = [headers, ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-ordens-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border bg-[linear-gradient(135deg,var(--dash-panel),var(--dash-panel-2))] p-8 shadow-sm">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Analises de desempenho
              </p>
              <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
                Relatorios avancados
              </h1>
              <p className="mt-2 max-w-2xl text-sm theme-text-muted">
                Explore indicadores, historicos e exporte dados para auditorias
                ou reunioes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary inline-flex items-center gap-2"
                onClick={exportCsv}
                disabled={loading}
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                className="btn-primary inline-flex items-center gap-2"
                onClick={exportPdf}
                disabled={loading}
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-[32px] border theme-border theme-card p-12 text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin theme-text-muted" />
            <p className="text-sm theme-text-muted">Carregando relatórios...</p>
          </div>
        )}

        {!loading && (
          <>
          <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">
                  Tipo de relatório
                </p>
                <h2 className="text-lg font-semibold theme-text">Explorar e comparar</h2>
                <p className="text-sm theme-text-muted">
                  {reportTypeOptions.find((o) => o.key === reportType)?.hint}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {reportTypeOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setReportType(opt.key)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      reportType === opt.key
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'border theme-border bg-[color:var(--dash-surface)] theme-text-muted hover:bg-[color:var(--dash-surface-2)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border theme-border bg-[color:var(--dash-surface)] p-4">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                  Filtros
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
                <input
                  className="input md:col-span-2"
                  placeholder="Pesquisar (título, descrição, ativo)"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">Status (todos)</option>
                  <option value="aberta">Aberta</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="em_execucao">Em Execução</option>
                  <option value="em_pausa">Em Pausa</option>
                  <option value="concluida">Concluída</option>
                  <option value="fechada">Fechada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
                <select
                  className="input"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option value="">Prioridade (todas)</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
                <select
                  className="input"
                  value={assetFilter}
                  onChange={(event) => setAssetFilter(event.target.value)}
                >
                  <option value="">Ativo (todos)</option>
                  {uniqueAssets.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          {reportType !== 'downtime' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Total Filtrado</p>
                <p className="text-2xl font-bold theme-text mt-2">{summary.total}</p>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Em Atraso (SLA)</p>
                <p className="text-2xl font-bold text-rose-600 mt-2">{summary.overdue}</p>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">MTTR (horas)</p>
                <p className="text-2xl font-bold text-[color:var(--dash-accent)] mt-2">
                  {calculateMetrics.mttr}
                </p>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Conformidade SLA</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  {calculateMetrics.slaCompliance}%
                </p>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Taxa Conclusão</p>
                <p className="text-2xl font-bold theme-text mt-2">
                  {calculateMetrics.completionRate}%
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Registos de downtime</p>
                <p className="text-2xl font-bold theme-text mt-2">{downtimeOrders.length}</p>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Total (min)</p>
                <p className="text-2xl font-bold theme-text mt-2">{downtimeSummary.totalMinutes}</p>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Total (horas)</p>
                <p className="text-2xl font-bold theme-text mt-2">{downtimeSummary.totalHours}</p>
              </div>
            </div>
          )}

          {/* Charts based on report type */}
          {reportType === 'general' && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Status</h3>
                <div className="h-72">
                  <Doughnut data={statusChartData} options={chartOptions} />
                </div>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Prioridades</h3>
                <div className="h-72">
                  <Bar data={priorityChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {reportType === 'asset' && (
            <div className="mt-6 rounded-[28px] border theme-border theme-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold theme-text mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ordens por Ativo
              </h3>
              <div className="h-80">
                <Bar data={assetChartData} options={chartOptions} />
              </div>
            </div>
          )}

          {reportType === 'technician' && (
            <div className="mt-6 rounded-[28px] border theme-border theme-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold theme-text mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ordens por Técnico
              </h3>
              <div className="h-80">
                <Bar data={technicianChartData} options={chartOptions} />
              </div>
            </div>
          )}

          {reportType === 'temporal' && (
            <div className="mt-6 rounded-[28px] border theme-border theme-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold theme-text mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tendência Temporal (Semanal)
              </h3>
              <div className="h-80">
                <Line data={temporalChartData} options={chartOptions} />
              </div>
            </div>
          )}

          {reportType === 'downtime' && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Downtime por tipo</h3>
                <div className="h-72">
                  {downtimeByTypeChartData ? (
                    <Doughnut data={downtimeByTypeChartData} options={chartOptions} />
                  ) : (
                    <div className="h-full rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-6 text-sm theme-text-muted">
                      Sem dados para este período.
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Downtime por categoria</h3>
                <div className="h-72">
                  {downtimeByCategoryChartData ? (
                    <Bar data={downtimeByCategoryChartData} options={chartOptions} />
                  ) : (
                    <div className="h-full rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-6 text-sm theme-text-muted">
                      Sem dados para este período.
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-semibold theme-text mb-4">Evolução do downtime (semanal)</h3>
                <div className="h-80">
                  {downtimeTemporalChartData ? (
                    <Line data={downtimeTemporalChartData} options={chartOptions} />
                  ) : (
                    <div className="h-full rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-6 text-sm theme-text-muted">
                      Sem dados para este período.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="mt-6 overflow-hidden rounded-[28px] border theme-border theme-card shadow-sm">
            <div className="flex flex-col gap-3 border-b theme-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold theme-text">
                {reportType === 'downtime' ? 'Downtime filtrado' : 'Ordens Filtradas'}
              </h2>
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <span>
                  {reportType === 'downtime' ? downtimeOrders.length : filteredOrders.length} registos
                </span>
                {reportType === 'downtime' && (
                  <span className="rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs font-semibold theme-text">
                    {downtimeSummary.totalHours} h
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
                <thead className="bg-[color:var(--dash-surface)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Ordem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Ativo</th>
                    {reportType !== 'downtime' ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Prioridade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Horas</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Criada em</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Início</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Fim</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Min</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Motivo</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-[color:var(--dash-panel)] divide-y divide-[color:var(--dash-border)]">
                  {(reportType === 'downtime' ? downtimeOrders.length === 0 : filteredOrders.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center theme-text-muted">
                        {reportType === 'downtime'
                          ? 'Nenhum downtime encontrado'
                          : 'Nenhuma ordem encontrada'}
                      </td>
                    </tr>
                  )}
                  {(reportType === 'downtime' ? downtimeOrders : filteredOrders).map((order: any) => (
                    <tr key={order.id} className="hover:bg-[color:var(--dash-surface)]">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium theme-text">{order.title}</div>
                        <div className="text-xs theme-text-muted">{order.description || 'Sem descrição'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm theme-text">
                        {order.asset ? `${order.asset.code}` : '-'}
                      </td>

                      {reportType !== 'downtime' ? (
                        <>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`chip text-xs font-medium px-2 py-1 rounded-full ${
                                order.status === 'concluida' || order.status === 'fechada'
                                  ? 'bg-emerald-500/10 theme-text'
                                  : order.status === 'cancelada'
                                  ? 'bg-rose-500/10 theme-text'
                                  : order.status === 'em_execucao'
                                  ? 'bg-sky-500/10 theme-text'
                                  : order.status === 'em_pausa'
                                  ? 'bg-amber-500/10 theme-text'
                                  : 'bg-[color:var(--dash-surface)] theme-text-muted'
                              }`}
                            >
                              {
                                workOrderStatusLabel(order.status)
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`chip text-xs font-medium px-2 py-1 rounded-full ${
                                order.priority === 'critica'
                                  ? 'bg-rose-500/10 theme-text'
                                  : order.priority === 'alta'
                                  ? 'bg-amber-500/10 theme-text'
                                  : order.priority === 'media'
                                  ? 'bg-emerald-500/10 theme-text'
                                  : 'bg-[color:var(--dash-surface)] theme-text-muted'
                              }`}
                            >
                              {workOrderPriorityLabel(order.priority)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm theme-text">
                            {order.actual_hours
                              ? `${order.actual_hours}h`
                              : order.estimated_hours
                              ? `${order.estimated_hours}h (est.)`
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm theme-text">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString('pt-PT')
                              : '-'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-sm theme-text">
                            {order.downtime_started_at
                              ? new Date(order.downtime_started_at).toLocaleString('pt-PT')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm theme-text">
                            {order.downtime_ended_at
                              ? new Date(order.downtime_ended_at).toLocaleString('pt-PT')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm theme-text">
                            {String(order.__downtimeMinutes ?? '')}
                          </td>
                          <td className="px-6 py-4 text-sm theme-text-muted">
                            {order.downtime_reason || '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
        )}
      </div>
    </MainLayout>
  );
}
