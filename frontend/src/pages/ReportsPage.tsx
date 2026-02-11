import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, Download, Filter, Loader2, TrendingUp } from 'lucide-react';
import { useAppStore } from '../context/store';
import { getPreventiveSchedules, getWorkOrders } from '../services/api';
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

const REPORTS_STORAGE_KEY = 'reportsPreferences:v2';

type ReportType = 'general' | 'asset' | 'technician' | 'temporal' | 'downtime' | 'preventive';
type PeriodPreset = 'custom' | 'last7' | 'last30' | 'last90' | 'thisMonth';

const toISODate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfThisMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const pctDelta = (current: number, previous: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
};

const formatDelta = (delta: number | null) => {
  if (delta === null) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
};

const topEntries = (totals: Record<string, number>, take: number) =>
  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take);

const getPriorityBadgeClass = (value?: string | null) => {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'critica') return 'bg-rose-100 text-rose-700';
  if (key === 'alta') return 'bg-amber-100 text-amber-700';
  if (key === 'media') return 'bg-emerald-100 text-emerald-700';
  if (key === 'baixa')
    return 'border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] text-[color:var(--dash-muted)]';
  return 'border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] text-[color:var(--dash-muted)]';
};

const getStatusBadgeClass = (value?: string | null) => {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'aberta') return 'bg-amber-100 text-amber-700';
  if (key === 'em_analise') return 'bg-sky-100 text-sky-700';
  if (key === 'em_execucao') return 'bg-cyan-100 text-cyan-700';
  if (key === 'em_pausa') return 'bg-slate-100 text-slate-700';
  if (key === 'concluida' || key === 'fechada') return 'bg-emerald-100 text-emerald-700';
  if (key === 'cancelada') return 'bg-rose-100 text-rose-700';
  return 'border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] text-[color:var(--dash-muted)]';
};

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

type PreventiveStatus = 'agendada' | 'reagendada' | 'em_execucao' | 'concluida' | 'fechada' | string;

const PREVENTIVE_STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  reagendada: 'Reagendada',
  em_execucao: 'Em Execução',
  concluida: 'Concluída',
  fechada: 'Fechada',
};

const preventiveStatusLabel = (value?: string | null) => {
  const key = String(value || '').trim().toLowerCase();
  return PREVENTIVE_STATUS_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '—');
};

const getPreventiveStatusBadgeClass = (value?: string | null) => {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'agendada' || key === 'reagendada') return 'bg-amber-100 text-amber-700';
  if (key === 'em_execucao') return 'bg-cyan-100 text-cyan-700';
  if (key === 'concluida' || key === 'fechada') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
};

interface PreventiveSchedule {
  id: string;
  plan_id: string;
  asset_id: string;
  scheduled_for?: string | null;
  status: PreventiveStatus;
  notes?: string | null;
  plan_name?: string | null;
  asset_name?: string | null;
  asset_code?: string | null;
  confirmed_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
  rescheduled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function ReportsPage() {
  const { selectedPlant } = useAppStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [preventiveSchedules, setPreventiveSchedules] = useState<PreventiveSchedule[]>([]);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
  const [preventiveLoading, setPreventiveLoading] = useState(false);
  const [workOrdersError, setWorkOrdersError] = useState<string | null>(null);
  const [preventiveError, setPreventiveError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('general');

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [preventiveStatusFilter, setPreventiveStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('custom');
  const [compareEnabled, setCompareEnabled] = useState(false);

  const loading = reportType === 'preventive' ? preventiveLoading : workOrdersLoading;
  const error = reportType === 'preventive' ? preventiveError : workOrdersError;

  // Restore saved preferences (type + filters)
  useEffect(() => {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.reportType) setReportType(parsed.reportType);

      // If stored preferences belong to a different plant, keep only reportType.
      if (parsed?.plantId && selectedPlant && parsed.plantId !== selectedPlant) return;

      setStatusFilter(parsed?.statusFilter || '');
      setPriorityFilter(parsed?.priorityFilter || '');
      setDateFrom(parsed?.dateFrom || '');
      setDateTo(parsed?.dateTo || '');
      setSearchTerm(parsed?.searchTerm || '');
      setAssetFilter(parsed?.assetFilter || '');
      setPreventiveStatusFilter(parsed?.preventiveStatusFilter || '');
      setPlanFilter(parsed?.planFilter || '');
      setPeriodPreset(parsed?.periodPreset || 'custom');
      setCompareEnabled(Boolean(parsed?.compareEnabled));
    } catch {
      // ignore
    }
  }, [selectedPlant]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(
      REPORTS_STORAGE_KEY,
      JSON.stringify({
        plantId: selectedPlant || null,
        reportType,
        statusFilter,
        priorityFilter,
        dateFrom,
        dateTo,
        searchTerm,
        assetFilter,
        preventiveStatusFilter,
        planFilter,
        periodPreset,
        compareEnabled,
      }),
    );
  }, [
    selectedPlant,
    reportType,
    statusFilter,
    priorityFilter,
    dateFrom,
    dateTo,
    searchTerm,
    assetFilter,
    preventiveStatusFilter,
    planFilter,
    periodPreset,
    compareEnabled,
  ]);

  // Apply preset to dates
  useEffect(() => {
    if (periodPreset === 'custom') return;

    const today = new Date();
    const end = toISODate(today);

    if (periodPreset === 'thisMonth') {
      setDateFrom(toISODate(startOfThisMonth()));
      setDateTo(end);
      return;
    }

    const days = periodPreset === 'last7' ? 7 : periodPreset === 'last30' ? 30 : 90;
    setDateFrom(toISODate(addDays(today, -days)));
    setDateTo(end);
  }, [periodPreset]);

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setAssetFilter('');
    setSearchTerm('');
    setPreventiveStatusFilter('');
    setPlanFilter('');
    setDateFrom('');
    setDateTo('');
    setPeriodPreset('custom');
    setCompareEnabled(false);
  };

  useEffect(() => {
    const load = async () => {
      if (!selectedPlant) return;
      try {
        setWorkOrdersLoading(true);
        setPreventiveLoading(true);
        setWorkOrdersError(null);
        setPreventiveError(null);

        const [ordersResult, schedulesResult] = await Promise.allSettled([
          getWorkOrders(selectedPlant),
          getPreventiveSchedules(selectedPlant),
        ]);

        if (ordersResult.status === 'fulfilled') {
          const orders = ordersResult.value;
          setWorkOrders(
            (orders || []).map((order: WorkOrder) => ({
              ...order,
              status: order.status === 'aprovada' || order.status === 'planeada' ? 'em_analise' : order.status,
            })),
          );
        } else {
          setWorkOrdersError(ordersResult.reason?.message || 'Erro ao carregar ordens');
        }

        if (schedulesResult.status === 'fulfilled') {
          const schedules = schedulesResult.value;
          setPreventiveSchedules(Array.isArray(schedules) ? schedules : []);
        } else {
          setPreventiveError(schedulesResult.reason?.message || 'Erro ao carregar preventivas');
        }
      } catch (err: any) {
        // If one of the calls fails, keep the other dataset usable.
        const message = err?.message || 'Erro ao carregar relatórios';
        setWorkOrdersError(message);
        setPreventiveError(message);
      } finally {
        setWorkOrdersLoading(false);
        setPreventiveLoading(false);
      }
    };

    load();
  }, [selectedPlant]);

  const applyFilters = (
    orders: WorkOrder[],
    opts: {
      statusFilter: string;
      priorityFilter: string;
      assetFilter: string;
      searchTerm: string;
      dateFrom: string;
      dateTo: string;
      reportType: ReportType;
    },
  ) => {
    return orders.filter((order) => {
      if (opts.statusFilter && order.status !== opts.statusFilter) return false;
      if (opts.priorityFilter && order.priority !== opts.priorityFilter) return false;
      if (opts.assetFilter && order.asset?.code !== opts.assetFilter) return false;

      if (opts.reportType === 'downtime') {
        const minutes = Number(order.downtime_minutes ?? 0);
        const hasInterval = Boolean(order.downtime_started_at && order.downtime_ended_at);
        if (!hasInterval && minutes <= 0) return false;
      }

      if (opts.searchTerm) {
        const haystack = `${order.title} ${order.description || ''} ${order.asset?.code || ''} ${
          order.asset?.name || ''
        } ${order.assigned_to_id || ''}`.toLowerCase();
        if (!haystack.includes(opts.searchTerm.toLowerCase())) return false;
      }

      if (opts.dateFrom) {
        const referenceIso =
          opts.reportType === 'downtime' ? order.downtime_started_at || '' : order.created_at || '';
        const reference = referenceIso ? new Date(referenceIso).getTime() : 0;
        if (reference < new Date(opts.dateFrom).getTime()) return false;
      }

      if (opts.dateTo) {
        const referenceIso =
          opts.reportType === 'downtime' ? order.downtime_started_at || '' : order.created_at || '';
        const reference = referenceIso ? new Date(referenceIso).getTime() : 0;
        if (reference > new Date(opts.dateTo).getTime() + 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  };

  const filteredOrders = useMemo(() => {
    return applyFilters(workOrders, {
      statusFilter,
      priorityFilter,
      assetFilter,
      searchTerm,
      dateFrom,
      dateTo,
      reportType,
    });
  }, [workOrders, statusFilter, priorityFilter, dateFrom, dateTo, searchTerm, assetFilter, reportType]);

  const applyPreventiveFilters = (
    schedules: PreventiveSchedule[],
    opts: {
      statusFilter: string;
      planFilter: string;
      assetCodeFilter: string;
      searchTerm: string;
      dateFrom: string;
      dateTo: string;
    },
  ) => {
    return schedules.filter((s) => {
      if (opts.statusFilter && String(s.status || '') !== opts.statusFilter) return false;
      if (opts.planFilter && String(s.plan_id || '') !== opts.planFilter) return false;
      if (opts.assetCodeFilter && String(s.asset_code || '') !== opts.assetCodeFilter) return false;

      if (opts.searchTerm) {
        const haystack = `${s.plan_name || ''} ${s.asset_code || ''} ${s.asset_name || ''} ${s.notes || ''} ${
          s.status || ''
        }`.toLowerCase();
        if (!haystack.includes(opts.searchTerm.toLowerCase())) return false;
      }

      if (opts.dateFrom) {
        const ref = s.scheduled_for ? new Date(s.scheduled_for).getTime() : 0;
        if (ref < new Date(opts.dateFrom).getTime()) return false;
      }

      if (opts.dateTo) {
        const ref = s.scheduled_for ? new Date(s.scheduled_for).getTime() : 0;
        if (ref > new Date(opts.dateTo).getTime() + 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  };

  const filteredPreventives = useMemo(() => {
    return applyPreventiveFilters(preventiveSchedules, {
      statusFilter: preventiveStatusFilter,
      planFilter,
      assetCodeFilter: assetFilter,
      searchTerm,
      dateFrom,
      dateTo,
    });
  }, [preventiveSchedules, preventiveStatusFilter, planFilter, assetFilter, searchTerm, dateFrom, dateTo]);

  const comparisonDateRange = useMemo(() => {
    if (!compareEnabled) return null;
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    const ms = to.getTime() - from.getTime();
    if (ms < 0) return null;

    const prevTo = addDays(from, -1);
    const prevFrom = new Date(prevTo.getTime() - ms);
    return { prevFrom: toISODate(prevFrom), prevTo: toISODate(prevTo) };
  }, [compareEnabled, dateFrom, dateTo]);

  const comparisonPreventives = useMemo(() => {
    if (!comparisonDateRange) return [];
    return applyPreventiveFilters(preventiveSchedules, {
      statusFilter: preventiveStatusFilter,
      planFilter,
      assetCodeFilter: assetFilter,
      searchTerm,
      dateFrom: comparisonDateRange.prevFrom,
      dateTo: comparisonDateRange.prevTo,
    });
  }, [preventiveSchedules, preventiveStatusFilter, planFilter, assetFilter, searchTerm, comparisonDateRange]);

  const sortedPreventives = useMemo(() => {
    const copy = [...filteredPreventives];
    copy.sort((a, b) => {
      const aDate = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
      const bDate = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
      return bDate - aDate;
    });
    return copy;
  }, [filteredPreventives]);

  const comparisonOrders = useMemo(() => {
    if (!comparisonDateRange) return [];
    return applyFilters(workOrders, {
      statusFilter,
      priorityFilter,
      assetFilter,
      searchTerm,
      dateFrom: comparisonDateRange.prevFrom,
      dateTo: comparisonDateRange.prevTo,
      reportType,
    });
  }, [workOrders, statusFilter, priorityFilter, assetFilter, searchTerm, reportType, comparisonDateRange]);

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

  const sortedFilteredOrders = useMemo(() => {
    if (reportType === 'downtime') return filteredOrders;
    const copy = [...filteredOrders];
    copy.sort((a, b) => {
      const aSla = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Number.POSITIVE_INFINITY;
      const bSla = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Number.POSITIVE_INFINITY;
      if (aSla !== bSla) return aSla - bSla;

      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });
    return copy;
  }, [filteredOrders, reportType]);

  // Calculate MTTR (Mean Time To Repair) and MTBF (Mean Time Between Failures)
  const computeMetrics = (orders: WorkOrder[], totalUniverse: WorkOrder[]) => {
    const completed = orders.filter((o) => ['concluida', 'fechada'].includes(o.status));

    let totalRepairTime = 0;
    let repairCount = 0;

    completed.forEach((order) => {
      if (order.actual_hours) {
        totalRepairTime += order.actual_hours;
        repairCount += 1;
      }
    });

    const mttr = repairCount > 0 ? totalRepairTime / repairCount : 0;

    let mtbf = 0;
    if (completed.length > 1) {
      const sortedByDate = [...completed].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
      );
      let totalDaysBetween = 0;
      for (let i = 1; i < sortedByDate.length; i++) {
        const prev = new Date(sortedByDate[i - 1].created_at || 0).getTime();
        const curr = new Date(sortedByDate[i].created_at || 0).getTime();
        totalDaysBetween += (curr - prev) / (1000 * 60 * 60 * 24);
      }
      mtbf = totalDaysBetween / (sortedByDate.length - 1);
    }

    const completionRate = totalUniverse.length > 0 ? (completed.length / totalUniverse.length) * 100 : 0;
    const slaCompliance =
      completed.length > 0
        ? (completed.filter((o) => {
            if (!o.sla_deadline) return true;
            return new Date(o.completed_at || 0).getTime() <= new Date(o.sla_deadline).getTime();
          }).length /
            completed.length) *
          100
        : 0;

    return { mttr, mtbf, completionRate, slaCompliance };
  };

  const calculateMetrics = useMemo(() => computeMetrics(filteredOrders, workOrders), [filteredOrders, workOrders]);
  const comparisonMetrics = useMemo(() => computeMetrics(comparisonOrders, workOrders), [comparisonOrders, workOrders]);

  const computeSummary = (orders: WorkOrder[]) => {
    const total = orders.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byAsset: Record<string, number> = {};
    const byTechnician: Record<string, number> = {};
    let overdue = 0;
    const overdueByAsset: Record<string, number> = {};

    orders.forEach((order) => {
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
        if (sla < Date.now() && !['concluida', 'fechada', 'cancelada'].includes(order.status)) {
          overdue += 1;
          const assetKey = order.asset?.code || 'Sem ativo';
          overdueByAsset[assetKey] = (overdueByAsset[assetKey] || 0) + 1;
        }
      }
    });

    return { total, byStatus, byPriority, byAsset, byTechnician, overdue, overdueByAsset };
  };

  const summary = useMemo(() => computeSummary(filteredOrders), [filteredOrders]);
  const comparisonSummary = useMemo(() => computeSummary(comparisonOrders), [comparisonOrders]);

  const preventiveSummary = useMemo(() => {
    const total = filteredPreventives.length;
    const byStatus: Record<string, number> = {};
    const byPlanId: Record<string, number> = {};
    const planNameById: Record<string, string> = {};
    const byAsset: Record<string, number> = {};
    let overdue = 0;

    const now = Date.now();
    filteredPreventives.forEach((s) => {
      const statusKey = String(s.status || '').trim() || '—';
      byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;

      const planId = String(s.plan_id || '').trim() || '—';
      byPlanId[planId] = (byPlanId[planId] || 0) + 1;
      planNameById[planId] = String(s.plan_name || 'Sem plano');

      const assetCode = String(s.asset_code || '').trim() || 'Sem ativo';
      byAsset[assetCode] = (byAsset[assetCode] || 0) + 1;

      const scheduled = s.scheduled_for ? new Date(s.scheduled_for).getTime() : 0;
      const status = String(s.status || '').toLowerCase();
      const isOpen = ['agendada', 'reagendada', 'em_execucao'].includes(status);
      if (scheduled && scheduled < now && isOpen) overdue += 1;
    });

    const completed = filteredPreventives.filter((s) => {
      const status = String(s.status || '').toLowerCase();
      return status === 'concluida' || status === 'fechada';
    }).length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const overdueRate = total > 0 ? (overdue / total) * 100 : 0;

    return { total, byStatus, byPlanId, planNameById, byAsset, overdue, completionRate, overdueRate };
  }, [filteredPreventives]);

  const preventiveComparisonSummary = useMemo(() => {
    const total = comparisonPreventives.length;
    let overdue = 0;
    const now = Date.now();
    comparisonPreventives.forEach((s) => {
      const scheduled = s.scheduled_for ? new Date(s.scheduled_for).getTime() : 0;
      const status = String(s.status || '').toLowerCase();
      const isOpen = ['agendada', 'reagendada', 'em_execucao'].includes(status);
      if (scheduled && scheduled < now && isOpen) overdue += 1;
    });
    const completed = comparisonPreventives.filter((s) => {
      const status = String(s.status || '').toLowerCase();
      return status === 'concluida' || status === 'fechada';
    }).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const overdueRate = total > 0 ? (overdue / total) * 100 : 0;
    return { total, overdue, completionRate, overdueRate };
  }, [comparisonPreventives]);

  const preventiveStatusChartData = useMemo(() => {
    const keys = Object.keys(preventiveSummary.byStatus);
    const labels = keys.map((k) => preventiveStatusLabel(k));
    const palette = ['#0ea5e9', '#f59e0b', '#22c55e', '#6366f1', '#ef4444', '#14b8a6', '#a855f7'];
    return {
      labels,
      datasets: [
        {
          label: 'Preventivas por status',
          data: keys.map((k) => preventiveSummary.byStatus[k]),
          backgroundColor: keys.map((_, idx) => palette[idx % palette.length]),
        },
      ],
    };
  }, [preventiveSummary]);

  const preventivePlanChartData = useMemo(() => {
    const planIds = Object.keys(preventiveSummary.byPlanId)
      .sort((a, b) => (preventiveSummary.byPlanId[b] || 0) - (preventiveSummary.byPlanId[a] || 0))
      .slice(0, 10);
    return {
      labels: planIds.map((id) => preventiveSummary.planNameById[id] || 'Sem plano'),
      datasets: [
        {
          label: 'Preventivas por plano (top 10)',
          data: planIds.map((id) => preventiveSummary.byPlanId[id]),
          backgroundColor: '#6366f1',
          borderColor: '#4f46e5',
          borderWidth: 1,
        },
      ],
    };
  }, [preventiveSummary]);

  const preventiveTemporalChartData = useMemo(() => {
    const byWeek: Record<string, number> = {};
    filteredPreventives.forEach((s) => {
      if (!s.scheduled_for) return;
      const date = new Date(s.scheduled_for);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      byWeek[key] = (byWeek[key] || 0) + 1;
    });
    const sortedWeeks = Object.keys(byWeek).sort();
    return {
      labels: sortedWeeks.map((w) => new Date(w).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Preventivas por semana',
          data: sortedWeeks.map((w) => byWeek[w]),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [filteredPreventives]);

  const uniqueAssets = useMemo(() => {
    const assets = new Set<string>();
    workOrders.forEach((order) => {
      if (order.asset?.code) assets.add(order.asset.code);
    });
    return Array.from(assets);
  }, [workOrders]);

  const uniquePreventiveAssets = useMemo(() => {
    const assets = new Set<string>();
    preventiveSchedules.forEach((s) => {
      if (s.asset_code) assets.add(String(s.asset_code));
    });
    return Array.from(assets);
  }, [preventiveSchedules]);

  const uniquePreventivePlans = useMemo(() => {
    const byId = new Map<string, string>();
    preventiveSchedules.forEach((s) => {
      const id = String(s.plan_id || '').trim();
      if (!id) return;
      byId.set(id, String(s.plan_name || `Plano ${id}`));
    });
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [preventiveSchedules]);

  const overdueRate = useMemo(() => {
    if (summary.total === 0) return 0;
    return (summary.overdue / summary.total) * 100;
  }, [summary]);

  const comparisonOverdueRate = useMemo(() => {
    if (comparisonSummary.total === 0) return 0;
    return (comparisonSummary.overdue / comparisonSummary.total) * 100;
  }, [comparisonSummary]);

  const topOverdueAssets = useMemo(() => topEntries(summary.overdueByAsset, 3), [summary]);

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

  const chartOptionsWithClick = useMemo(() => {
    return {
      ...chartOptions,
      onClick: (_evt: any, elements: any[], chart: any) => {
        const el = elements?.[0];
        if (!el) return;
        const index = el.index;
        const label = chart?.data?.labels?.[index];
        const datasetLabel = chart?.data?.datasets?.[el.datasetIndex]?.label;

        if (!label) return;

        if (reportType === 'preventive') {
          if (datasetLabel?.toLowerCase().includes('preventivas') && datasetLabel?.toLowerCase().includes('status')) {
            const keys = Object.keys(preventiveSummary.byStatus);
            const key = keys[index];
            if (key) setPreventiveStatusFilter(key);
            return;
          }

          if (datasetLabel?.toLowerCase().includes('preventivas') && datasetLabel?.toLowerCase().includes('plano')) {
            const planIds = Object.keys(preventiveSummary.byPlanId)
              .sort((a, b) => (preventiveSummary.byPlanId[b] || 0) - (preventiveSummary.byPlanId[a] || 0))
              .slice(0, 10);
            const planId = planIds[index];
            if (planId) setPlanFilter(planId);
            return;
          }
        }

        // General status chart
        if (datasetLabel?.toLowerCase().includes('status')) {
          const keys = Object.keys(summary.byStatus);
          const key = keys[index];
          if (key) setStatusFilter(key);
          return;
        }

        // General priority chart
        if (datasetLabel?.toLowerCase().includes('prioridade')) {
          const priorityKey = String(label) === '—' ? 'n/a' : String(label).toLowerCase();
          const map: Record<string, string> = {
            'crítica': 'critica',
            critica: 'critica',
            alta: 'alta',
            'média': 'media',
            media: 'media',
            baixa: 'baixa',
          };
          const key = map[priorityKey];
          if (key) setPriorityFilter(key);
          return;
        }

        // Asset chart
        if (datasetLabel?.toLowerCase().includes('ativo')) {
          setAssetFilter(String(label));
          return;
        }

        // Technician chart (assigned_to_id)
        if (datasetLabel?.toLowerCase().includes('técnico') || datasetLabel?.toLowerCase().includes('tecnico')) {
          setSearchTerm(String(label));
          return;
        }

        // Downtime charts
        if (datasetLabel?.toLowerCase().includes('downtime')) {
          setSearchTerm(String(label));
        }
      },
    };
  }, [chartOptions, summary.byStatus, reportType, preventiveSummary.byStatus, preventiveSummary.byPlanId]);

  const reportTypeOptions = useMemo(
    () => [
      { key: 'general' as const, label: 'Geral', hint: 'Visão global por status e prioridade.' },
      { key: 'asset' as const, label: 'Por Ativo', hint: 'Top ativos com mais ordens.' },
      { key: 'technician' as const, label: 'Por Técnico', hint: 'Distribuição por responsável.' },
      { key: 'temporal' as const, label: 'Temporal', hint: 'Tendência semanal.' },
      { key: 'downtime' as const, label: 'Downtime', hint: 'Paragens e causas.' },
      { key: 'preventive' as const, label: 'Preventivas', hint: 'Agenda e execução das preventivas.' },
    ],
    [],
  );

  const kpiDeltas = useMemo(() => {
    if (!compareEnabled || !comparisonDateRange) {
      return {
        total: null,
        overdue: null,
        overdueRate: null,
        mttr: null,
        slaCompliance: null,
        completionRate: null,
      };
    }
    return {
      total: pctDelta(summary.total, comparisonSummary.total),
      overdue: pctDelta(summary.overdue, comparisonSummary.overdue),
      overdueRate: pctDelta(overdueRate, comparisonOverdueRate),
      mttr: pctDelta(calculateMetrics.mttr, comparisonMetrics.mttr),
      slaCompliance: pctDelta(calculateMetrics.slaCompliance, comparisonMetrics.slaCompliance),
      completionRate: pctDelta(calculateMetrics.completionRate, comparisonMetrics.completionRate),
    };
  }, [compareEnabled, comparisonDateRange, summary, comparisonSummary, overdueRate, comparisonOverdueRate, calculateMetrics, comparisonMetrics]);

  const preventiveKpiDeltas = useMemo(() => {
    if (!compareEnabled || !comparisonDateRange) {
      return {
        total: null,
        overdue: null,
        overdueRate: null,
        completionRate: null,
      };
    }
    return {
      total: pctDelta(preventiveSummary.total, preventiveComparisonSummary.total),
      overdue: pctDelta(preventiveSummary.overdue, preventiveComparisonSummary.overdue),
      overdueRate: pctDelta(preventiveSummary.overdueRate, preventiveComparisonSummary.overdueRate),
      completionRate: pctDelta(preventiveSummary.completionRate, preventiveComparisonSummary.completionRate),
    };
  }, [compareEnabled, comparisonDateRange, preventiveSummary, preventiveComparisonSummary]);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(
      reportType === 'downtime'
        ? 'Relatório de Downtime'
        : reportType === 'preventive'
        ? 'Relatório de Preventivas'
        : 'Relatório de Ordens de Serviço',
      14,
      20,
    );

    doc.setFontSize(10);
    const planLabel = planFilter ? uniquePreventivePlans.find((p) => p.id === planFilter)?.name : null;

    const filtersLabel =
      reportType === 'preventive'
        ? [
            preventiveStatusFilter ? `Status: ${preventiveStatusLabel(preventiveStatusFilter)}` : null,
            planLabel ? `Plano: ${planLabel}` : null,
            assetFilter ? `Ativo: ${assetFilter}` : null,
            searchTerm ? `Pesquisa: ${searchTerm}` : null,
            dateFrom ? `De: ${dateFrom}` : null,
            dateTo ? `Até: ${dateTo}` : null,
          ]
            .filter(Boolean)
            .join(' | ')
        : [
            statusFilter ? `Status: ${workOrderStatusLabel(statusFilter)}` : null,
            priorityFilter ? `Prioridade: ${workOrderPriorityLabel(priorityFilter)}` : null,
            assetFilter ? `Ativo: ${assetFilter}` : null,
            searchTerm ? `Pesquisa: ${searchTerm}` : null,
            dateFrom ? `De: ${dateFrom}` : null,
            dateTo ? `Até: ${dateTo}` : null,
          ]
            .filter(Boolean)
            .join(' | ');
    if (filtersLabel) doc.text(`Filtros: ${filtersLabel}`, 14, 28);

    if (reportType === 'preventive') {
      const baseY = filtersLabel ? 35 : 28;
      doc.text(
        `Total: ${preventiveSummary.total} | Em atraso: ${preventiveSummary.overdue} | Conclusão: ${preventiveSummary.completionRate.toFixed(
          1,
        )}%`,
        14,
        baseY,
      );
      doc.text(`Taxa atraso: ${preventiveSummary.overdueRate.toFixed(1)}%`, 14, baseY + 7);

      autoTable(doc, {
        startY: baseY + 14,
        head: [['Plano', 'Ativo', 'Agendada', 'Status', 'Concluída']],
        body: sortedPreventives.slice(0, 60).map((s) => [
          (s.plan_name || 'Sem plano').substring(0, 24),
          s.asset_code ? `${s.asset_code}${s.asset_name ? ` - ${s.asset_name}` : ''}`.substring(0, 24) : '-',
          s.scheduled_for ? new Date(s.scheduled_for).toLocaleDateString('pt-PT') : '-',
          preventiveStatusLabel(s.status),
          s.completed_at ? new Date(s.completed_at).toLocaleDateString('pt-PT') : '-',
        ]),
      });

      doc.save('relatorio-preventivas.pdf');
      return;
    }

    if (reportType === 'downtime') {
      const totalMinutes = downtimeOrders.reduce((acc, order) => acc + Number((order as any).__downtimeMinutes || 0), 0);
      doc.text(`Tipo: downtime | Registos: ${downtimeOrders.length} | Total: ${totalMinutes} min`, 14, filtersLabel ? 35 : 28);

      const byType: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      downtimeOrders.forEach((o) => {
        const t = String(o.downtime_type || 'Sem tipo');
        const c = String(o.downtime_category || 'Sem categoria');
        byType[t] = (byType[t] || 0) + Number((o as any).__downtimeMinutes || 0);
        byCategory[c] = (byCategory[c] || 0) + Number((o as any).__downtimeMinutes || 0);
      });
      const topType = topEntries(byType, 3)
        .map(([k, v]) => `${k} (${v}m)`)
        .join(' | ');
      const topCat = topEntries(byCategory, 3)
        .map(([k, v]) => `${k} (${v}m)`)
        .join(' | ');
      if (topType) doc.text(`Top tipos: ${topType}`, 14, filtersLabel ? 42 : 35);
      if (topCat) doc.text(`Top categorias: ${topCat}`, 14, filtersLabel ? 49 : 42);

      autoTable(doc, {
        startY: filtersLabel ? 56 : 36,
        head: [['Ordem', 'Ativo', 'Início', 'Fim', 'Min', 'Tipo', 'Categoria']],
        body: downtimeOrders.slice(0, 60).map((order) => [
          order.title.substring(0, 22),
          order.asset ? order.asset.code : '-',
          order.downtime_started_at ? new Date(order.downtime_started_at).toLocaleString('pt-PT') : '-',
          order.downtime_ended_at ? new Date(order.downtime_ended_at).toLocaleString('pt-PT') : '-',
          String((order as any).__downtimeMinutes ?? ''),
          (order.downtime_type || '—').substring(0, 18),
          (order.downtime_category || '—').substring(0, 18),
        ]),
      });

      doc.save('relatorio-downtime.pdf');
      return;
    }

    const baseY = filtersLabel ? 35 : 28;
    doc.text(`Tipo: ${reportType} | Total: ${summary.total} | Em atraso: ${summary.overdue}`, 14, baseY);
    doc.text(
      `MTTR: ${calculateMetrics.mttr.toFixed(2)}h | MTBF: ${calculateMetrics.mtbf.toFixed(2)}d | SLA: ${calculateMetrics.slaCompliance.toFixed(1)}% | Conclusão: ${calculateMetrics.completionRate.toFixed(1)}%`,
      14,
      baseY + 7,
    );
    const topOverdue = topOverdueAssets.map(([k, v]) => `${k} (${v})`).join(' | ');
    if (topOverdue) doc.text(`Top ativos em atraso: ${topOverdue}`, 14, baseY + 14);

    autoTable(doc, {
      startY: baseY + 21,
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
    if (reportType === 'preventive') {
      const headers = ['Schedule ID', 'Plano ID', 'Plano', 'Ativo', 'Agendada para', 'Status', 'Concluída em', 'Notas'];
      const rows = sortedPreventives.map((s) => [
        s.id,
        s.plan_id,
        s.plan_name || '',
        s.asset_code ? `${s.asset_code}${s.asset_name ? ` - ${s.asset_name}` : ''}` : '',
        s.scheduled_for ? new Date(s.scheduled_for).toLocaleString('pt-PT') : '',
        s.status || '',
        s.completed_at ? new Date(s.completed_at).toLocaleString('pt-PT') : '',
        s.notes || '',
      ]);

      const csvContent = [
        headers,
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `preventivas-${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      return;
    }

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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                  Filtros
                </p>
              </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="input"
                    value={periodPreset}
                    onChange={(event) => setPeriodPreset(event.target.value as PeriodPreset)}
                  >
                    <option value="custom">Período: Personalizado</option>
                    <option value="last7">Últimos 7 dias</option>
                    <option value="last30">Últimos 30 dias</option>
                    <option value="last90">Últimos 90 dias</option>
                    <option value="thisMonth">Este mês</option>
                  </select>
                  <label className="inline-flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-xs font-semibold theme-text">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={compareEnabled}
                      onChange={(e) => setCompareEnabled(e.target.checked)}
                      disabled={!dateFrom || !dateTo}
                    />
                    Comparar
                  </label>
                  <button
                    type="button"
                    className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-xs font-semibold theme-text-muted hover:bg-[color:var(--dash-surface-2)]"
                    onClick={clearFilters}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {compareEnabled && comparisonDateRange && (
                <p className="mt-3 text-xs theme-text-muted">
                  Comparação: {comparisonDateRange.prevFrom} → {comparisonDateRange.prevTo}
                </p>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
                <input
                  className="input md:col-span-2"
                  placeholder={reportType === 'preventive' ? 'Pesquisar (plano, ativo, notas)' : 'Pesquisar (título, descrição, ativo)'}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />

                {reportType === 'preventive' ? (
                  <>
                    <select
                      className="input"
                      value={preventiveStatusFilter}
                      onChange={(event) => setPreventiveStatusFilter(event.target.value)}
                    >
                      <option value="">Status (todos)</option>
                      {Object.entries(PREVENTIVE_STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <select
                      className="input"
                      value={planFilter}
                      onChange={(event) => setPlanFilter(event.target.value)}
                    >
                      <option value="">Plano (todos)</option>
                      {uniquePreventivePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="input"
                      value={assetFilter}
                      onChange={(event) => setAssetFilter(event.target.value)}
                    >
                      <option value="">Ativo (todos)</option>
                      {uniquePreventiveAssets.map((asset) => (
                        <option key={asset} value={asset}>
                          {asset}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
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
                  </>
                )}

                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(event) => {
                    setPeriodPreset('custom');
                    setDateFrom(event.target.value);
                  }}
                />
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(event) => {
                    setPeriodPreset('custom');
                    setDateTo(event.target.value);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          {reportType === 'downtime' ? (
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
          ) : reportType === 'preventive' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Total Filtrado</p>
                <p className="text-2xl font-bold theme-text mt-2">{preventiveSummary.total}</p>
                {compareEnabled && (
                  <p className="mt-2 text-xs theme-text-muted">{formatDelta(preventiveKpiDeltas.total)}</p>
                )}
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Em Atraso</p>
                <p className="text-2xl font-bold text-rose-600 mt-2">{preventiveSummary.overdue}</p>
                <p className="mt-1 text-xs theme-text-muted">{preventiveSummary.overdueRate.toFixed(1)}%</p>
                {compareEnabled && (
                  <p className="mt-1 text-xs theme-text-muted">{formatDelta(preventiveKpiDeltas.overdueRate)}</p>
                )}
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Taxa Conclusão</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{preventiveSummary.completionRate.toFixed(1)}%</p>
                {compareEnabled && (
                  <p className="mt-2 text-xs theme-text-muted">{formatDelta(preventiveKpiDeltas.completionRate)}</p>
                )}
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Planos distintos</p>
                <p className="text-2xl font-bold theme-text mt-2">{Object.keys(preventiveSummary.byPlanId).length}</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Total Filtrado</p>
                <p className="text-2xl font-bold theme-text mt-2">{summary.total}</p>
                {compareEnabled && (
                  <p className="mt-2 text-xs theme-text-muted">{formatDelta(kpiDeltas.total)}</p>
                )}
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Em Atraso (SLA)</p>
                <p className="text-2xl font-bold text-rose-600 mt-2">{summary.overdue}</p>
                <p className="mt-1 text-xs theme-text-muted">{overdueRate.toFixed(1)}%</p>
                {compareEnabled && (
                  <p className="mt-1 text-xs theme-text-muted">{formatDelta(kpiDeltas.overdueRate)}</p>
                )}
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">MTTR (horas)</p>
                <p className="text-2xl font-bold text-[color:var(--dash-accent)] mt-2">
                  {calculateMetrics.mttr.toFixed(2)}
                </p>
                {compareEnabled && (
                  <p className="mt-2 text-xs theme-text-muted">{formatDelta(kpiDeltas.mttr)}</p>
                )}
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Conformidade SLA</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  {calculateMetrics.slaCompliance.toFixed(1)}%
                </p>
                {compareEnabled && (
                  <p className="mt-2 text-xs theme-text-muted">{formatDelta(kpiDeltas.slaCompliance)}</p>
                )}
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs theme-text-muted uppercase tracking-wider">Taxa Conclusão</p>
                <p className="text-2xl font-bold theme-text mt-2">
                  {calculateMetrics.completionRate.toFixed(1)}%
                </p>
                {compareEnabled && (
                  <p className="mt-2 text-xs theme-text-muted">{formatDelta(kpiDeltas.completionRate)}</p>
                )}
              </div>
            </div>
          )}

          {reportType !== 'downtime' && reportType !== 'preventive' && topOverdueAssets.length > 0 && (
            <div className="mt-4 rounded-[24px] border theme-border bg-[color:var(--dash-surface)] p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">Insights</p>
              <p className="mt-2 theme-text">
                Top ativos em atraso: {topOverdueAssets.map(([k, v]) => `${k} (${v})`).join(' • ')}
              </p>
            </div>
          )}

          {/* Charts based on report type */}
          {reportType === 'general' && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Status</h3>
                <div className="h-72">
                  <Doughnut data={statusChartData} options={chartOptionsWithClick} />
                </div>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Prioridades</h3>
                <div className="h-72">
                  <Bar data={priorityChartData} options={chartOptionsWithClick} />
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
                <Bar data={assetChartData} options={chartOptionsWithClick} />
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
                <Bar data={technicianChartData} options={chartOptionsWithClick} />
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
                    <Doughnut data={downtimeByTypeChartData} options={chartOptionsWithClick} />
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
                    <Bar data={downtimeByCategoryChartData} options={chartOptionsWithClick} />
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

          {reportType === 'preventive' && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Status (Preventivas)</h3>
                <div className="h-72">
                  <Doughnut data={preventiveStatusChartData} options={chartOptionsWithClick} />
                </div>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold theme-text mb-4">Planos (top 10)</h3>
                <div className="h-72">
                  <Bar data={preventivePlanChartData} options={chartOptionsWithClick} />
                </div>
              </div>
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-semibold theme-text mb-4">Tendência (semanal)</h3>
                <div className="h-80">
                  <Line data={preventiveTemporalChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="mt-6 overflow-hidden rounded-[28px] border theme-border theme-card shadow-sm">
            <div className="flex flex-col gap-3 border-b theme-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold theme-text">
                {reportType === 'downtime'
                  ? 'Downtime filtrado'
                  : reportType === 'preventive'
                  ? 'Preventivas filtradas'
                  : 'Ordens Filtradas'}
              </h2>
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <span>
                  {reportType === 'downtime'
                    ? downtimeOrders.length
                    : reportType === 'preventive'
                    ? sortedPreventives.length
                    : filteredOrders.length}{' '}
                  registos
                </span>
                {reportType === 'downtime' && (
                  <span className="rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs font-semibold theme-text">
                    {downtimeSummary.totalHours} h
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              {reportType === 'preventive' ? (
                <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
                  <thead className="bg-[color:var(--dash-surface)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Plano</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Ativo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Agendada</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Concluída</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[color:var(--dash-panel)] divide-y divide-[color:var(--dash-border)]">
                    {sortedPreventives.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center theme-text-muted">
                          Nenhuma preventiva encontrada
                        </td>
                      </tr>
                    )}
                    {sortedPreventives.map((s) => (
                      <tr key={s.id} className="hover:bg-[color:var(--dash-surface)]">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium theme-text">{s.plan_name || 'Sem plano'}</div>
                          <div className="text-xs theme-text-muted">{s.notes || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm theme-text">
                          {s.asset_code ? `${s.asset_code}${s.asset_name ? ` - ${s.asset_name}` : ''}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm theme-text">
                          {s.scheduled_for ? new Date(s.scheduled_for).toLocaleDateString('pt-PT') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getPreventiveStatusBadgeClass(
                              s.status,
                            )}`}
                          >
                            {preventiveStatusLabel(s.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm theme-text">
                          {s.completed_at ? new Date(s.completed_at).toLocaleDateString('pt-PT') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Tipo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Categoria</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--dash-muted)] uppercase">Motivo</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-[color:var(--dash-panel)] divide-y divide-[color:var(--dash-border)]">
                    {(reportType === 'downtime' ? downtimeOrders.length === 0 : sortedFilteredOrders.length === 0) && (
                      <tr>
                        <td colSpan={reportType === 'downtime' ? 8 : 6} className="px-6 py-6 text-center theme-text-muted">
                          {reportType === 'downtime' ? 'Nenhum downtime encontrado' : 'Nenhuma ordem encontrada'}
                        </td>
                      </tr>
                    )}
                    {(reportType === 'downtime' ? downtimeOrders : sortedFilteredOrders).map((order: any) => (
                      <tr key={order.id} className="hover:bg-[color:var(--dash-surface)]">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium theme-text">{order.title}</div>
                          <div className="text-xs theme-text-muted">{order.description || 'Sem descrição'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm theme-text">{order.asset ? `${order.asset.code}` : '-'}</td>

                        {reportType !== 'downtime' ? (
                          <>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                  order.status,
                                )}`}
                              >
                                {workOrderStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadgeClass(
                                  order.priority,
                                )}`}
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
                              {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-PT') : '-'}
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
                            <td className="px-6 py-4 text-sm theme-text">{String(order.__downtimeMinutes ?? '')}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className="chip text-xs font-medium px-2 py-1 rounded-full bg-[color:var(--dash-surface)] theme-text">
                                {order.downtime_type || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="chip text-xs font-medium px-2 py-1 rounded-full bg-[color:var(--dash-surface)] theme-text">
                                {order.downtime_category || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm theme-text-muted">{order.downtime_reason || '-'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
        )}
      </div>
    </MainLayout>
  );
}
