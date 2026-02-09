import { useEffect, useMemo, useRef, useState } from 'react';
 
import { MainLayout } from '../layouts/MainLayout';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Save,
  SlidersHorizontal,
  User,
  UserCheck,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import { useAuth } from '../hooks/useAuth';
import {
  createWorkOrder,
  createStockMovement,
  deleteWorkOrder,
  getAssets,
  getApiHealth,
  getPreventiveSchedules,
  getWorkOrder,
  getWorkOrderAuditLogs,
  getSpareParts,
  getStockMovementsByPlant,
  getWorkOrders,
  addWorkOrderTask,
  updateWorkOrderTask,
  updateWorkOrder,
  updatePreventiveSchedule,
} from '../services/api';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';

interface AssetOption {
  id: string;
  code: string;
  name: string;
}

interface SparePartOption {
  id: string;
  code: string;
  name: string;
  unit_cost?: string | null;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  unit_cost?: string | null;
  created_at?: string;
  notes?: string | null;
  spare_part?: {
    code: string;
    name: string;
  } | null;
}

interface WorkOrderTask {
  id: string;
  description: string;
  is_completed: boolean;
  completed_at?: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  created_at?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  user?: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

interface WorkOrder {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  sub_status?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  priority?: string | null;
  estimated_hours?: string | null;
  actual_hours?: string | null;
  created_at?: string;
  updated_at?: string;
  sla_deadline?: string | null;
  scheduled_date?: string | null;
  analysis_started_at?: string | null;
  started_at?: string | null;
  paused_at?: string | null;
  pause_reason?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  downtime_started_at?: string | null;
  downtime_ended_at?: string | null;
  downtime_minutes?: number | null;
  downtime_reason?: string | null;
  notes?: string | null;
  work_performed?: string | null;
  tasks?: WorkOrderTask[];
  asset?: {
    code: string;
    name: string;
  } | null;
  assignedUser?: {
    id?: string;
    first_name: string;
    last_name: string;
  } | null;
  createdByUser?: {
    id?: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface PreventiveSchedule {
  id: string;
  plan_id?: string;
  asset_id?: string;
  scheduled_for: string;
  status: string;
  notes?: string | null;
  plan_name?: string | null;
  asset_name?: string | null;
  asset_code?: string | null;
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromDatetimeLocal(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

interface WorkOrderFormState {
  asset_id: string;
  title: string;
  description: string;
  priority: string;
  estimated_hours: string;
  scheduled_date: string;
}

interface WorkOrderUpdateState {
  status: string;
  sub_status: string;
  priority: string;
  scheduled_date: string;
  notes: string;
  estimated_hours: string;
  pause_reason: string;
  cancel_reason: string;
}

interface WorkOrderFinishState {
  actual_hours: string;
  work_performed: string;
  downtime_started_at: string;
  downtime_ended_at: string;
  downtime_reason: string;
}

export function WorkOrdersPage() {

  const { selectedPlant } = useAppStore();
  const { user } = useAuth();
  const diagnosticsEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('diag') === '1' || localStorage.getItem('diagnostics') === '1';
  }, []);
  const diagnosticsTimerRef = useRef<number | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [spareParts, setSpareParts] = useState<SparePartOption[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [activeSection, setActiveSection] = useState<'orders' | 'preventive'>('orders');
  const [preventiveSchedules, setPreventiveSchedules] = useState<PreventiveSchedule[]>([]);
  const [preventiveStatusFilter, setPreventiveStatusFilter] = useState('');
  const [preventiveViewMode, setPreventiveViewMode] = useState<'table' | 'cards'>('table');
  const [preventiveLoading, setPreventiveLoading] = useState(false);
  const [preventiveError, setPreventiveError] = useState<string | null>(null);
  const [editingPreventive, setEditingPreventive] = useState<PreventiveSchedule | null>(null);
  const [preventiveSaving, setPreventiveSaving] = useState(false);
  const [preventiveEditForm, setPreventiveEditForm] = useState({
    scheduled_for: '',
    status: 'agendada',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  const [ordersDiagnostics, setOrdersDiagnostics] = useState({
    status: 'idle',
    durationMs: 0,
    lastUpdatedAt: '',
    lastError: '',
  });
  const [assetsDiagnostics, setAssetsDiagnostics] = useState({
    status: 'idle',
    durationMs: 0,
    lastUpdatedAt: '',
    lastError: '',
  });
  const [apiDiagnostics, setApiDiagnostics] = useState({
    status: 'idle',
    lastUpdatedAt: '',
    lastMessage: '',
  });
  const [form, setForm] = useState<WorkOrderFormState>({
    asset_id: '',
    title: '',
    description: '',
    priority: 'media',
    estimated_hours: '',
    scheduled_date: '',
  });
  const [updateForm, setUpdateForm] = useState<WorkOrderUpdateState>({
    status: 'aberta',
    sub_status: '',
    priority: 'media',
    scheduled_date: '',
    notes: '',
    estimated_hours: '',
    pause_reason: '',
    cancel_reason: '',
  });
  const [finishForm, setFinishForm] = useState<WorkOrderFinishState>({
    actual_hours: '',
    work_performed: '',
    downtime_started_at: '',
    downtime_ended_at: '',
    downtime_reason: '',
  });
  const [showFinishFields, setShowFinishFields] = useState(false);
  const [usageForm, setUsageForm] = useState({
    spare_part_id: '',
    quantity: 1,
    unit_cost: '',
    notes: '',
  });
  const [usagePartSearch, setUsagePartSearch] = useState('');
  const [usageSaving, setUsageSaving] = useState(false);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);
  const [orderMovements, setOrderMovements] = useState<StockMovement[]>([]);
  const [orderMovementsLoading, setOrderMovementsLoading] = useState(false);
  const [orderMovementsError, setOrderMovementsError] = useState<string | null>(null);
  const [orderTasks, setOrderTasks] = useState<WorkOrderTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [tasksSaving, setTasksSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<
    Array<{ name: string; data: WorkOrderFormState }>
  >([]);
  const userId = user?.id || '';
  const userRole = user?.role || '';
  const isAdmin = userRole === 'admin_empresa' || userRole === 'superadmin';
  const isManager = userRole === 'gestor_manutencao';
  const canManagePreventive = ['superadmin', 'admin_empresa', 'gestor_manutencao', 'supervisor'].includes(userRole);

  useEffect(() => {
    const saved = localStorage.getItem('workOrdersFilters');
    const savedTemplates = localStorage.getItem('workOrdersTemplates');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStatusFilter(parsed.statusFilter || '');
        setSearchTerm(parsed.searchTerm || '');
        setViewMode(parsed.viewMode || 'table');
      } catch {
        // ignore
      }
    }

    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'workOrdersFilters',
      JSON.stringify({ statusFilter, searchTerm, viewMode }),
    );
  }, [statusFilter, searchTerm, viewMode]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Todos' },
      { value: 'aberta', label: 'Aberta' },
      { value: 'em_analise', label: 'Em Análise' },
      { value: 'em_execucao', label: 'Em Execução' },
      { value: 'em_pausa', label: 'Em Pausa' },
      { value: 'concluida', label: 'Concluída' },
      { value: 'fechada', label: 'Fechada' },
      { value: 'cancelada', label: 'Cancelada' },
    ],
    [],
  );

  const allowedStatusOptionsForEdit = useMemo(() => {
    if (!editingOrder) return null;

    const labelByStatus: Record<string, string> = {
      aberta: 'Aberta',
      em_analise: 'Em Análise',
      em_execucao: 'Em Execução',
      em_pausa: 'Em Pausa',
      concluida: 'Concluída',
      fechada: 'Fechada',
      cancelada: 'Cancelada',
    };

    const current = String(editingOrder.status || 'aberta');
    const currentNormalized = current;

    const nextByStatus: Record<string, string[]> = {
      aberta: ['em_analise', 'cancelada'],
      em_analise: ['em_execucao', 'cancelada'],
      em_execucao: ['em_pausa', 'concluida', 'cancelada'],
      em_pausa: ['em_execucao', 'cancelada'],
      concluida: ['fechada', 'cancelada'],
      fechada: [],
      cancelada: [],
    };

    const allowed = [currentNormalized, ...(nextByStatus[currentNormalized] || [])];
    const unique = Array.from(new Set(allowed));

    return unique
      .filter((value) => {
        if (value === 'fechada') return isAdmin || isManager;
        return true;
      })
      .map((value) => ({ value, label: labelByStatus[value] || value }));
  }, [editingOrder, isAdmin, isManager]);

  const loadData = async () => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setOrdersDiagnostics({
        status: 'idle',
        durationMs: 0,
        lastUpdatedAt: '',
        lastError: '',
      });
      setAssetsDiagnostics({
        status: 'idle',
        durationMs: 0,
        lastUpdatedAt: '',
        lastError: '',
      });
      return;
    }
    setLoading(true);
    setError(null);
    setOrdersDiagnostics((prev) => ({
      ...prev,
      status: 'loading',
      lastError: '',
    }));
    setAssetsDiagnostics((prev) => ({
      ...prev,
      status: 'loading',
      lastError: '',
    }));

    const measure = async <T,>(action: () => Promise<T>) => {
      const startedAt = performance.now();
      try {
        const value = await action();
        return {
          status: 'ok' as const,
          value,
          durationMs: Math.round(performance.now() - startedAt),
        };
      } catch (error: any) {
        return {
          status: 'error' as const,
          error,
          durationMs: Math.round(performance.now() - startedAt),
        };
      }
    };

    try {
      const [ordersResult, assetsResult] = await Promise.all([
        measure(() => getWorkOrders(selectedPlant, statusFilter || undefined)),
        measure(() => getAssets(selectedPlant)),
      ]);

      if (ordersResult.status === 'ok') {
        const normalizedOrders = (ordersResult.value || [])
          .map((order: WorkOrder) => {
            const mappedStatus =
              order.status === 'aprovada' || order.status === 'planeada'
                ? 'em_analise'
                : order.status;
            return { ...order, status: mappedStatus };
          })
          .filter((order: WorkOrder) => {
          if (!searchTerm) return true;
          const haystack = `${order.title} ${order.description || ''} ${order.asset?.code || ''} ${order.asset?.name || ''}`.toLowerCase();
          return haystack.includes(searchTerm.toLowerCase());
        });
        setWorkOrders(normalizedOrders);
        setOrdersDiagnostics({
          status: 'ok',
          durationMs: ordersResult.durationMs,
          lastUpdatedAt: new Date().toLocaleTimeString(),
          lastError: '',
        });
      } else {
        const message =
          ordersResult.error?.message || 'Erro ao carregar ordens de trabalho';
        setWorkOrders([]);
        setOrdersDiagnostics({
          status: 'error',
          durationMs: ordersResult.durationMs,
          lastUpdatedAt: new Date().toLocaleTimeString(),
          lastError: message,
        });
      }

      if (assetsResult.status === 'ok') {
        setAssets(assetsResult.value || []);
        setAssetsDiagnostics({
          status: 'ok',
          durationMs: assetsResult.durationMs,
          lastUpdatedAt: new Date().toLocaleTimeString(),
          lastError: '',
        });
      } else {
        const message = assetsResult.error?.message || 'Erro ao carregar equipamentos';
        setAssets([]);
        setAssetsDiagnostics({
          status: 'error',
          durationMs: assetsResult.durationMs,
          lastUpdatedAt: new Date().toLocaleTimeString(),
          lastError: message,
        });
      }

      if (ordersResult.status === 'error' || assetsResult.status === 'error') {
        const ordersMessage =
          ordersResult.status === 'error'
            ? ordersResult.error?.message || 'Erro ao carregar ordens de trabalho'
            : null;
        const assetsMessage =
          assetsResult.status === 'error'
            ? assetsResult.error?.message || 'Erro ao carregar equipamentos'
            : null;
        setError(ordersMessage || assetsMessage);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar ordens de trabalho');
    } finally {
      setLoading(false);
    }
  };

  const loadPreventiveSchedules = async () => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setPreventiveSchedules([]);
      setPreventiveError(null);
      return;
    }
    setPreventiveLoading(true);
    setPreventiveError(null);
    try {
      const data = await getPreventiveSchedules(
        selectedPlant,
        preventiveStatusFilter ? { status: preventiveStatusFilter } : undefined,
      );
      setPreventiveSchedules(Array.isArray(data) ? (data as any) : []);
    } catch (err: any) {
      setPreventiveSchedules([]);
      setPreventiveError(err.message || 'Erro ao carregar preventivas');
    } finally {
      setPreventiveLoading(false);
    }
  };

  const openPreventiveEditor = (schedule: PreventiveSchedule) => {
    setEditingPreventive(schedule);
    setPreventiveEditForm({
      scheduled_for: toDatetimeLocal(schedule.scheduled_for),
      status: schedule.status || 'agendada',
      notes: schedule.notes ? String(schedule.notes) : '',
    });
  };

  const closePreventiveEditor = () => {
    if (preventiveSaving) return;
    setEditingPreventive(null);
  };

  const savePreventiveEdit = async () => {
    if (!selectedPlant || !editingPreventive) return;
    if (!canManagePreventive) return;

    const scheduledIso =
      toIsoFromDatetimeLocal(preventiveEditForm.scheduled_for) || editingPreventive.scheduled_for;

    setPreventiveSaving(true);
    try {
      await updatePreventiveSchedule(selectedPlant, editingPreventive.id, {
        status: preventiveEditForm.status,
        scheduled_for: scheduledIso,
        notes: preventiveEditForm.notes || undefined,
      });
      await loadPreventiveSchedules();
      setEditingPreventive(null);
    } catch (err: any) {
      setPreventiveError(err?.message || 'Erro ao atualizar preventiva');
    } finally {
      setPreventiveSaving(false);
    }
  };

  const loadSpareParts = async () => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setSpareParts([]);
      setPartsError(null);
      return;
    }
    setPartsLoading(true);
    setPartsError(null);
    try {
      const data = await getSpareParts(selectedPlant);
      setSpareParts(data || []);
    } catch (err: any) {
      setSpareParts([]);
      setPartsError(err.message || 'Erro ao carregar pecas');
    } finally {
      setPartsLoading(false);
    }
  };

  const loadOrderMovements = async (workOrderId: string) => {
    if (!selectedPlant) return;

    setOrderMovementsLoading(true);
    setOrderMovementsError(null);
    try {
      const data = await getStockMovementsByPlant(selectedPlant);
      const marker = `Ordem ${workOrderId}`;
      const filtered = (data || []).filter((movement: StockMovement) =>
        (movement.notes || '').includes(marker),
      );
      setOrderMovements(filtered);
    } catch (err: any) {
      setOrderMovements([]);
      setOrderMovementsError(err.message || 'Erro ao carregar movimentos da ordem');
    } finally {
      setOrderMovementsLoading(false);
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      if (!diagnosticsEnabled) return;
      setApiDiagnostics((prev) => ({ ...prev, status: 'loading' }));
      const result = await getApiHealth();
      setApiDiagnostics({
        status: result.ok ? 'ok' : 'error',
        lastUpdatedAt: new Date().toLocaleTimeString(),
        lastMessage: result.message,
      });
    };

    checkHealth();
  }, [diagnosticsEnabled, selectedPlant]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, statusFilter, searchTerm]);

  useEffect(() => {
    if (activeSection !== 'preventive') return;
    loadPreventiveSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, activeSection, preventiveStatusFilter]);

  useEffect(() => {
    loadSpareParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant]);

  const handleDiagnosticsPressStart = () => {
    if (typeof window === 'undefined') return;
    diagnosticsTimerRef.current = window.setTimeout(() => {
      const next = localStorage.getItem('diagnostics') === '1' ? '0' : '1';
      localStorage.setItem('diagnostics', next);
      window.location.reload();
    }, 2000);
  };

  const handleDiagnosticsPressEnd = () => {
    if (diagnosticsTimerRef.current) {
      window.clearTimeout(diagnosticsTimerRef.current);
      diagnosticsTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!editingOrder) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingOrder]);

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      loadData();
    };

    window.addEventListener('realtime:work-orders', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('realtime:work-orders', handleRealtimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, statusFilter, searchTerm]);

  useEffect(() => {
    if (!editingOrder) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingOrder]);

  const handleCreate = async () => {
    if (!selectedPlant) return;
    if (!form.asset_id || !form.title) {
      setError('Selecione o ativo e preencha o título');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await createWorkOrder(selectedPlant, {
        asset_id: form.asset_id,
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
      });

      setForm({
        asset_id: '',
        title: '',
        description: '',
        priority: 'media',
        estimated_hours: '',
        scheduled_date: '',
      });
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar ordem');
    } finally {
      setCreating(false);
    }
  };

  const toDateTimeLocal = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    const pad = (n: number) => `${n}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const formatShortDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  };

  const formatDuration = (from?: string | null, to?: string | null) => {
    if (!from || !to) return '-';
    const start = new Date(from);
    const end = new Date(to);
    const ms = end.getTime() - start.getTime();
    if (Number.isNaN(ms) || ms < 0) return '-';
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    if (hours < 48) return `${hours.toFixed(1)} h`;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours - days * 24);
    return `${days} d ${remHours} h`;
  };

  const formatMinutes = (value?: number | null) => {
    if (value === null || value === undefined) return '-';
    if (value < 60) return `${value} min`;
    return `${(value / 60).toFixed(1)} h`;
  };

  const formatAuditUser = (log: AuditLog) => {
    if (!log.user) return 'Sistema';
    const name = `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim();
    return name || log.user.id || 'Utilizador';
  };

  const formatAuditFields = (log: AuditLog) => {
    const next = (log.new_values || {}) as Record<string, any>;
    const prev = (log.old_values || {}) as Record<string, any>;
    if (next.status) {
      const from = prev.status ? String(prev.status) : '—';
      return `Estado: ${from} → ${String(next.status)}`;
    }
    const fields = Object.keys(next || {});
    if (fields.length === 0) return 'Sem detalhes';
    return `Campos: ${fields.join(', ')}`;
  };

  const handleStartEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setShowFinishFields(false);
    setUsageForm({ spare_part_id: '', quantity: 1, unit_cost: '', notes: '' });
    setUsageMessage(null);
    setUsagePartSearch('');
    setOrderMovements([]);
    setOrderMovementsError(null);
    setOrderTasks([]);
    setTasksError(null);
    setNewTaskDescription('');
    setAuditLogs([]);
    setAuditError(null);
    setUpdateForm({
      status: order.status || 'aberta',
      sub_status: order.sub_status || '',
      priority: order.priority || 'media',
      scheduled_date: toDateTimeLocal(order.scheduled_date),
      notes: order.notes || '',
      estimated_hours: order.estimated_hours || '',
      pause_reason: order.pause_reason || '',
      cancel_reason: order.cancel_reason || '',
    });
    setFinishForm({
      actual_hours: order.actual_hours || '',
      work_performed: order.work_performed || '',
      downtime_started_at: toDateTimeLocal(order.downtime_started_at),
      downtime_ended_at: toDateTimeLocal(order.downtime_ended_at),
      downtime_reason: order.downtime_reason || '',
    });
    loadWorkOrderDetails(order.id);
  };

  useEffect(() => {
    if (!editingOrder || !selectedPlant) return;
    loadOrderMovements(editingOrder.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOrder, selectedPlant]);

  const loadWorkOrderDetails = async (workOrderId: string) => {
    if (!selectedPlant) return;
    setTasksLoading(true);
    setTasksError(null);
    setAuditLoading(true);
    setAuditError(null);
    try {
      const workOrder = await getWorkOrder(selectedPlant, workOrderId);
      setEditingOrder(workOrder);
      setOrderTasks(workOrder.tasks || []);
      setUpdateForm({
        status: workOrder.status || 'aberta',
        sub_status: workOrder.sub_status || '',
        priority: workOrder.priority || 'media',
        scheduled_date: toDateTimeLocal(workOrder.scheduled_date),
        notes: workOrder.notes || '',
        estimated_hours: workOrder.estimated_hours || '',
        pause_reason: workOrder.pause_reason || '',
        cancel_reason: workOrder.cancel_reason || '',
      });
      setFinishForm({
        actual_hours: workOrder.actual_hours || '',
        work_performed: workOrder.work_performed || '',
        downtime_started_at: toDateTimeLocal(workOrder.downtime_started_at),
        downtime_ended_at: toDateTimeLocal(workOrder.downtime_ended_at),
        downtime_reason: workOrder.downtime_reason || '',
      });
      setShowFinishFields(false);
    } catch (err: any) {
      setTasksError(err.message || 'Erro ao carregar ordem.');
      setAuditLoading(false);
      setTasksLoading(false);
      setAuditLogs([]);
      return;
    } finally {
      setTasksLoading(false);
    }

    try {
      const logs = await getWorkOrderAuditLogs(selectedPlant, workOrderId);
      setAuditLogs(logs || []);
    } catch (err: any) {
      setAuditLogs([]);
      setAuditError(err.message || 'Erro ao carregar historico.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!selectedPlant || !editingOrder) return;
    if (['concluida', 'fechada', 'cancelada'].includes(editingOrder.status)) {
      setTasksError('Esta ordem nao pode receber novas tarefas.');
      return;
    }
    if (
      !editingPermissions?.canOperateOrder &&
      !editingPermissions?.canEditOrder &&
      !(
        (editingOrder.status === 'aberta' || editingOrder.status === 'em_analise') &&
        editingPermissions?.canAssumeOrder
      )
    ) {
      setTasksError('Sem permissao para atualizar tarefas.');
      return;
    }
    if (!newTaskDescription.trim()) {
      setTasksError('Indique a tarefa.');
      return;
    }

    setTasksSaving(true);
    setTasksError(null);
    try {
      const task = await addWorkOrderTask(
        selectedPlant,
        editingOrder.id,
        newTaskDescription.trim(),
      );
      setOrderTasks((prev) => [...prev, task]);
      setNewTaskDescription('');
    } catch (err: any) {
      setTasksError(err.message || 'Erro ao adicionar tarefa.');
    } finally {
      setTasksSaving(false);
    }
  };

  const handleToggleTask = async (task: WorkOrderTask) => {
    if (!selectedPlant || !editingOrder) return;
    if (editingOrder.status !== 'em_execucao') {
      setTasksError('Apenas ordens em execucao podem marcar tarefas como concluidas.');
      return;
    }
    if (!editingPermissions?.canOperateOrder) {
      setTasksError('Sem permissao para atualizar tarefas.');
      return;
    }

    setTasksSaving(true);
    setTasksError(null);
    try {
      const updated = await updateWorkOrderTask(
        selectedPlant,
        editingOrder.id,
        task.id,
        !task.is_completed,
      );
      setOrderTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setTasksError(err.message || 'Erro ao atualizar tarefa.');
    } finally {
      setTasksSaving(false);
    }
  };

  const handleAddUsedPart = async () => {
    if (!selectedPlant || !editingOrder) return;
    if (!['em_execucao', 'em_pausa'].includes(editingOrder.status)) {
      setUsageMessage('Apenas ordens em execucao/pausa podem registar pecas usadas.');
      return;
    }
    if (!usageForm.spare_part_id) {
      setUsageMessage('Selecione a peca utilizada.');
      return;
    }
    if (!usageForm.quantity || Number(usageForm.quantity) <= 0) {
      setUsageMessage('Indique uma quantidade valida.');
      return;
    }
    if (!editingPermissions?.canOperateOrder) {
      setUsageMessage('Sem permissao para registar pecas nesta ordem.');
      return;
    }

    setUsageSaving(true);
    setUsageMessage(null);
    try {
      const baseNote = `Ordem ${editingOrder.id} - ${editingOrder.title}`;
      const notes = usageForm.notes.trim()
        ? `${baseNote} | ${usageForm.notes.trim()}`
        : baseNote;

      await createStockMovement(selectedPlant, {
        spare_part_id: usageForm.spare_part_id,
        work_order_id: editingOrder.id,
        type: 'saida',
        quantity: Number(usageForm.quantity),
        unit_cost: usageForm.unit_cost || undefined,
        notes,
      });

      setUsageForm({ spare_part_id: '', quantity: 1, unit_cost: '', notes: '' });
      setUsageMessage('Movimento registado com sucesso.');
      await loadOrderMovements(editingOrder.id);
    } catch (err: any) {
      setUsageMessage(err.message || 'Erro ao registar peca utilizada.');
    } finally {
      setUsageSaving(false);
    }
  };

  const filteredUsageParts = useMemo(() => {
    const query = usagePartSearch.trim().toLowerCase();
    if (!query) return spareParts;
    return spareParts.filter((part) => {
      const label = `${part.code} ${part.name}`.toLowerCase();
      return label.includes(query);
    });
  }, [spareParts, usagePartSearch]);

  const handleUpdate = async () => {
    if (!selectedPlant || !editingOrder) return;
    const canEditOrder = isAdmin || isManager || editingOrder.created_by === userId;
    const canOperateOrder = isAdmin || isManager || editingOrder.assigned_to === userId;

    if (!canEditOrder && !canOperateOrder) {
      setError('Sem permissao para atualizar esta ordem');
      return;
    }

    if (editingOrder.status === 'concluida' && !canOperateOrder) {
      setError('Apenas o responsavel ou admin pode alterar ordens concluidas');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const payload: Record<string, any> = {};
      if (canEditOrder) {
        payload.priority = updateForm.priority;
        payload.scheduled_date = updateForm.scheduled_date || undefined;
        payload.estimated_hours = updateForm.estimated_hours || undefined;
      }
      if (canOperateOrder) {
        payload.notes = updateForm.notes || undefined;
        if (updateForm.status && updateForm.status !== editingOrder.status) {
          if (updateForm.status === 'em_pausa') {
            const reason = updateForm.pause_reason.trim();
            if (!reason) {
              setError('Motivo é obrigatório ao colocar a ordem em pausa');
              return;
            }
            payload.pause_reason = reason;
          }

          if (updateForm.status === 'cancelada') {
            const reason = updateForm.cancel_reason.trim();
            if (!reason) {
              setError('Motivo é obrigatório ao cancelar a ordem');
              return;
            }
            payload.cancel_reason = reason;
          }

          payload.status = updateForm.status;
        }
        if (updateForm.sub_status && updateForm.sub_status.trim()) {
          payload.sub_status = updateForm.sub_status.trim();
        }
      }

      if (Object.keys(payload).length === 0) {
        setError('Sem campos para atualizar');
        return;
      }

      await updateWorkOrder(selectedPlant, editingOrder.id, payload);

      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar ordem');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignWait = async () => {
    if (!selectedPlant || !editingOrder || !userId) return;
    if (editingOrder.assigned_to && editingOrder.assigned_to !== userId && !isAdmin) {
      setError('Ordem atribuida a outro utilizador');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: 'em_analise',
        assigned_to: editingOrder.assigned_to || userId,
      });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar ordem');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartOrder = async () => {
    if (!selectedPlant || !editingOrder || !userId) return;
    if (editingOrder.assigned_to && editingOrder.assigned_to !== userId && !isAdmin) {
      setError('Ordem atribuida a outro utilizador');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: 'em_execucao',
        assigned_to: editingOrder.assigned_to || userId,
        started_at: new Date().toISOString(),
        scheduled_date: updateForm.scheduled_date || undefined,
        estimated_hours: updateForm.estimated_hours || undefined,
      });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar ordem');
    } finally {
      setUpdating(false);
    }
  };

  const handlePauseOrder = async () => {
    if (!selectedPlant || !editingOrder || !userId) return;
    if (!isAdmin && editingOrder.assigned_to !== userId) {
      setError('Apenas o responsavel pode pausar a ordem');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const reason = updateForm.pause_reason.trim();
      if (!reason) {
        setError('Motivo é obrigatório ao colocar a ordem em pausa');
        return;
      }
      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: 'em_pausa',
        pause_reason: reason,
        sub_status: updateForm.sub_status?.trim() || undefined,
      });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao pausar ordem');
    } finally {
      setUpdating(false);
    }
  };

  const handleFinishOrder = async () => {
    if (!selectedPlant || !editingOrder || !userId) return;
    if (!isAdmin && editingOrder.assigned_to !== userId) {
      setError('Apenas o responsavel pode terminar a ordem');
      return;
    }

    if (orderTasks.some((task) => !task.is_completed)) {
      setError('Conclua todas as tarefas antes de terminar a ordem');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const workPerformed = finishForm.work_performed.trim();
      if (!workPerformed) {
        setError('Registe o trabalho realizado antes de terminar a ordem');
        return;
      }

      const downtimeStartIso = finishForm.downtime_started_at.trim()
        ? toIsoFromDatetimeLocal(finishForm.downtime_started_at)
        : '';
      const downtimeEndIso = finishForm.downtime_ended_at.trim()
        ? toIsoFromDatetimeLocal(finishForm.downtime_ended_at)
        : '';

      if ((finishForm.downtime_started_at.trim() || finishForm.downtime_ended_at.trim()) && (!downtimeStartIso || !downtimeEndIso)) {
        setError('Paragem: indique início e fim válidos (ou deixe ambos vazios)');
        return;
      }

      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: 'concluida',
        completed_at: new Date().toISOString(),
        actual_hours: finishForm.actual_hours || undefined,
        work_performed: workPerformed,
        downtime_started_at: downtimeStartIso || undefined,
        downtime_ended_at: downtimeEndIso || undefined,
        downtime_reason: finishForm.downtime_reason.trim() || undefined,
      });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao terminar ordem');
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseOrder = async () => {
    if (!selectedPlant || !editingOrder) return;
    if (!isAdmin && !isManager) {
      setError('Apenas gestor ou admin pode fechar a ordem');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: 'fechada',
        actual_hours: finishForm.actual_hours || editingOrder.actual_hours || undefined,
        completed_at: editingOrder.completed_at || undefined,
      });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao fechar ordem');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedPlant || !editingOrder) return;
    const canDelete = isAdmin || editingOrder.created_by === userId;
    if (!canDelete) {
      setError('Sem permissao para eliminar esta ordem');
      return;
    }
    if (!window.confirm('Eliminar esta ordem de trabalho?')) return;

    setUpdating(true);
    setError(null);

    try {
      await deleteWorkOrder(selectedPlant, editingOrder.id);
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao eliminar ordem');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!form.title) {
      setError('Indique um nome no título para salvar o template');
      return;
    }

    const newTemplate = { name: form.title, data: { ...form } };
    const updatedTemplates = [newTemplate, ...templates].slice(0, 10);
    setTemplates(updatedTemplates);
    localStorage.setItem('workOrdersTemplates', JSON.stringify(updatedTemplates));
  };

  const handleApplyTemplate = (template: { name: string; data: WorkOrderFormState }) => {
    setForm({ ...template.data });
    setShowCreate(true);
  };

  const exportCsv = () => {
    const headers = ['Título', 'Descrição', 'Status', 'Prioridade', 'Ativo', 'Responsável', 'SLA'];
    const rows = workOrders.map((order) => [
      order.title,
      order.description || '',
      order.status,
      order.priority || '',
      order.asset ? `${order.asset.code} - ${order.asset.name}` : '',
      order.assignedUser
        ? `${order.assignedUser.first_name} ${order.assignedUser.last_name}`
        : '',
      order.sla_deadline ? new Date(order.sla_deadline).toISOString() : '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'work-orders.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const groupedByStatus = useMemo(() => {
    return workOrders.reduce<Record<string, WorkOrder[]>>((acc, order) => {
      const key = order.status || 'aberta';
      if (!acc[key]) acc[key] = [];
      acc[key].push(order);
      return acc;
    }, {});
  }, [workOrders]);
  const alertSummary = useMemo(() => {
    const now = Date.now();
    const soon = now + 24 * 60 * 60 * 1000;
    let overdue = 0;
    let dueSoon = 0;

    workOrders.forEach((order) => {
      if (!order.sla_deadline) return;
      if (['concluida', 'fechada', 'cancelada'].includes(order.status)) return;
      const slaTime = new Date(order.sla_deadline).getTime();
      if (slaTime < now) overdue += 1;
      else if (slaTime <= soon) dueSoon += 1;
    });

    return { overdue, dueSoon };
  }, [workOrders]);

  const statusLabels: Record<string, string> = {
    aberta: 'Aberta',
    em_analise: 'Em Análise',
    em_execucao: 'Em Execução',
    em_pausa: 'Em Pausa',
    concluida: 'Concluída',
    fechada: 'Fechada',
    cancelada: 'Cancelada',
  };
  const statusBadgeClass: Record<string, string> = {
    aberta: 'border theme-border bg-[color:var(--dash-surface)] theme-text',
    em_analise: 'border theme-border bg-[color:var(--dash-surface)] theme-text',
    em_execucao: 'border theme-border bg-[color:var(--dash-surface)] theme-text',
    em_pausa: 'border theme-border bg-[color:var(--dash-surface)] theme-text',
    concluida: 'border theme-border bg-[color:var(--dash-surface)] theme-text',
    fechada: 'border theme-border bg-[color:var(--dash-surface)] theme-text',
    cancelada: 'border theme-border bg-[color:var(--dash-surface)] theme-text',
  };

  const statusSummary = useMemo(() => {
    const counts = {
      total: workOrders.length,
      aberta: 0,
      em_execucao: 0,
      concluida: 0,
    };

    workOrders.forEach((order) => {
      if (order.status === 'aberta') counts.aberta += 1;
      if (order.status === 'em_execucao') counts.em_execucao += 1;
      if (order.status === 'concluida' || order.status === 'fechada') counts.concluida += 1;
    });

    return counts;
  }, [workOrders]);

  const prioritySummary = useMemo(() => {
    return workOrders.reduce<Record<string, number>>((acc, order) => {
      const key = order.priority || 'n/a';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [workOrders]);

  const editingPermissions = useMemo(() => {
    if (!editingOrder) return null;
    const isAssignedToUser = editingOrder.assigned_to === userId;
    const isAssignedToOther = Boolean(
      editingOrder.assigned_to && editingOrder.assigned_to !== userId,
    );
    const canEditOrder = isAdmin || isManager || editingOrder.created_by === userId;
    const canOperateOrder = isAdmin || isManager || isAssignedToUser;
    const canAssumeOrder = isAdmin || !editingOrder.assigned_to || isAssignedToUser;
    const canDeleteOrder = isAdmin || editingOrder.created_by === userId;

    return {
      isAssignedToUser,
      isAssignedToOther,
      canEditOrder,
      canOperateOrder,
      canAssumeOrder,
      canDeleteOrder,
    };
  }, [editingOrder, isAdmin, isManager, userId]);

  const canShowPartsSection = Boolean(
    editingOrder &&
      editingPermissions?.canOperateOrder &&
      (editingOrder.status === 'em_execucao' ||
        editingOrder.status === 'em_pausa' ||
        editingOrder.status === 'concluida' ||
        editingOrder.status === 'fechada' ||
        Boolean(editingOrder.started_at)),
  );

  const canShowEditForm = Boolean(
    editingOrder &&
      (editingOrder.status === 'concluida' || editingOrder.status === 'fechada'
        ? editingPermissions?.canOperateOrder
        : editingPermissions?.canEditOrder ||
          editingPermissions?.canOperateOrder ||
          ((editingOrder.status === 'aberta' || editingOrder.status === 'em_analise') &&
            editingPermissions?.canAssumeOrder)),
  );

  const canShowChecklist = Boolean(
    editingOrder &&
      (editingPermissions?.canOperateOrder ||
        editingPermissions?.canEditOrder ||
        ((editingOrder.status === 'aberta' || editingOrder.status === 'em_analise') &&
          editingPermissions?.canAssumeOrder)),
  );

  const isPlanningStage =
    Boolean(
      editingOrder &&
        ['aberta', 'em_analise'].includes(editingOrder.status),
    );

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_45%,var(--dash-surface)_100%)] p-8 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.45)]">
          <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full bg-emerald-200/60 blur-3xl" />
          <div className="absolute left-10 top-10 h-12 w-12 rotate-12 rounded-2xl border border-emerald-200/70 bg-[color:var(--dash-panel)] opacity-70 shadow-sm" />
          <div className="absolute bottom-6 right-12 h-16 w-16 rounded-full border theme-border bg-[color:var(--dash-panel)] opacity-70" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
                Sala de comando
              </p>
              <h1
                className="text-3xl font-semibold tracking-tight theme-text sm:text-4xl"
                onPointerDown={handleDiagnosticsPressStart}
                onPointerUp={handleDiagnosticsPressEnd}
                onPointerLeave={handleDiagnosticsPressEnd}
              >
                Ordens em movimento e decisao rapida
              </h1>
              <p className="max-w-2xl text-sm theme-text-muted">
                Controle operacoes com clareza: prioridades, SLA e progresso lado a lado.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowCreate((value) => !value)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nova ordem
                </button>
                <button
                  onClick={exportCsv}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
                <button
                  onClick={loadData}
                  className="btn-secondary inline-flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.5)]">
                <div className="flex items-center gap-3 text-sm theme-text-muted">
                  <List className="h-4 w-4 text-emerald-600" />
                  Total de ordens
                </div>
                <p className="mt-3 text-2xl font-semibold theme-text">
                  {statusSummary.total}
                </p>
                <p className="mt-1 text-xs theme-text-muted">Fila completa</p>
              </div>
              <div className="rounded-2xl border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.5)]">
                <div className="flex items-center gap-3 text-sm theme-text-muted">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Abertas
                </div>
                <p className="mt-3 text-2xl font-semibold theme-text">
                  {statusSummary.aberta}
                </p>
                <p className="mt-1 text-xs theme-text-muted">Aguardando inicio</p>
              </div>
              <div className="rounded-2xl border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.5)]">
                <div className="flex items-center gap-3 text-sm theme-text-muted">
                  <RefreshCcw className="h-4 w-4 text-cyan-600" />
                  Em execução
                </div>
                <p className="mt-3 text-2xl font-semibold theme-text">
                  {statusSummary.em_execucao}
                </p>
                <p className="mt-1 text-xs theme-text-muted">Execucao ativa</p>
              </div>
              <div className="rounded-2xl border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.5)]">
                <div className="flex items-center gap-3 text-sm theme-text-muted">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Concluidas
                </div>
                <p className="mt-3 text-2xl font-semibold theme-text">
                  {statusSummary.concluida}
                </p>
                <p className="mt-1 text-xs theme-text-muted">Finalizadas</p>
              </div>
            </div>
          </div>

          {(alertSummary.overdue > 0 || alertSummary.dueSoon > 0) && (
            <div className="relative mt-6 flex flex-wrap items-center gap-3 text-xs">
              {alertSummary.overdue > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {alertSummary.overdue} em atraso
                </span>
              )}
              {alertSummary.dueSoon > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {alertSummary.dueSoon} a vencer
                </span>
              )}
            </div>
          )}
        </section>

        {selectedPlant && diagnosticsEnabled && (
          <DiagnosticsPanel
            title="Ordens e ativos"
            rows={[
              { label: 'Planta', value: selectedPlant || '-' },
              { label: 'Ordens', value: ordersDiagnostics.status },
              { label: 'Tempo ordens', value: `${ordersDiagnostics.durationMs}ms` },
              { label: 'Ativos', value: assetsDiagnostics.status },
              { label: 'Tempo ativos', value: `${assetsDiagnostics.durationMs}ms` },
              {
                label: 'Online',
                value: typeof navigator !== 'undefined' && navigator.onLine ? 'sim' : 'nao',
              },
              { label: 'API', value: apiDiagnostics.status },
              { label: 'API msg', value: apiDiagnostics.lastMessage || '-' },
              {
                label: 'Erro',
                value: ordersDiagnostics.lastError || assetsDiagnostics.lastError || '-',
              },
            ]}
          />
        )}

        {!selectedPlant && (
          <div className="rounded-3xl border border-dashed theme-border theme-card p-10 text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 theme-text-muted" />
            <h2 className="mb-2 text-xl font-semibold theme-text">
              Selecione uma fabrica
            </h2>
            <p className="text-sm theme-text-muted">
              Escolha uma fabrica no topo para visualizar as ordens.
            </p>
          </div>
        )}

        {selectedPlant && showCreate && (
          <div className="rounded-[28px] border theme-border theme-card p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                  Nova ordem
                </p>
                <h2 className="mt-2 text-lg font-semibold theme-text">
                  Registrar intervencao
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium theme-text">Ativo</label>
                <select
                  className="input"
                  value={form.asset_id}
                  onChange={(event) => setForm({ ...form, asset_id: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.code} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium theme-text">Titulo</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium theme-text">Prioridade</label>
                <select
                  className="input"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium theme-text">Descricao</label>
                <textarea
                  className="input min-h-[96px]"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={handleCreate} className="btn-primary" disabled={creating}>
                {creating ? 'A criar...' : 'Criar ordem'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="btn-secondary inline-flex items-center gap-2"
                disabled={creating}
              >
                <Save className="h-4 w-4" />
                Guardar template
              </button>
            </div>
          </div>
        )}

        {selectedPlant && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setEditingOrder(null)}
            />
            <div
              className="relative w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-[32px] border theme-border bg-[linear-gradient(135deg,var(--dash-panel),var(--dash-panel-2))] p-6 shadow-[0_40px_80px_-45px_rgba(15,23,42,0.6)]"
              role="dialog"
              aria-modal="true"
            >
              <button
                onClick={() => setEditingOrder(null)}
                className="absolute right-4 top-4 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
              >
                Fechar
              </button>
              <div className="space-y-6">
                <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
                    Detalhes da ordem
                  </p>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold theme-text">
                        {editingOrder.title}
                      </h2>
                      <p className="mt-1 text-xs theme-text-muted">
                        {editingOrder.asset
                          ? `${editingOrder.asset.code} - ${editingOrder.asset.name}`
                          : 'Sem ativo'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        statusBadgeClass[editingOrder.status] ||
                        'border theme-border bg-[color:var(--dash-surface)] theme-text'
                      }`}
                    >
                      {statusLabels[editingOrder.status] || editingOrder.status}
                    </span>
                  </div>
                </div>

                {diagnosticsEnabled && (
                  <DiagnosticsPanel
                    title="Diagnostico da ordem"
                    rows={[
                      { label: 'Planta', value: selectedPlant || '-' },
                      { label: 'Ordem', value: editingOrder.id },
                      { label: 'Status', value: editingOrder.status || '-' },
                      { label: 'Tarefas', value: tasksLoading ? 'a carregar' : 'ok' },
                      { label: 'Erro tarefas', value: tasksError || '-' },
                      { label: 'Auditoria', value: auditLoading ? 'a carregar' : 'ok' },
                      { label: 'Erro auditoria', value: auditError || '-' },
                      { label: 'Movimentos', value: orderMovementsLoading ? 'a carregar' : 'ok' },
                      { label: 'Erro movimentos', value: orderMovementsError || '-' },
                    ]}
                  />
                )}

                {editingPermissions?.isAssignedToOther &&
                  !editingPermissions?.canEditOrder &&
                  !editingPermissions?.canOperateOrder && (
                  <div className="rounded-[24px] border theme-border bg-amber-500/10 p-4 text-xs theme-text">
                    Esta ordem esta atribuida a outro utilizador. Apenas leitura.
                  </div>
                )}

                <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                      Resumo rapido
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                      <p className="font-semibold theme-text">Criado por</p>
                      <p className="mt-1">
                        {editingOrder.createdByUser
                          ? `${editingOrder.createdByUser.first_name} ${editingOrder.createdByUser.last_name}`
                          : 'Nao informado'}
                      </p>
                      <p className="mt-1 text-[11px] theme-text-muted">
                        {formatDateTime(editingOrder.created_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                      <p className="font-semibold theme-text">Responsavel</p>
                      <p className="mt-1">
                        {editingOrder.assignedUser
                          ? `${editingOrder.assignedUser.first_name} ${editingOrder.assignedUser.last_name}`
                          : 'Nao atribuido'}
                      </p>
                      <p className="mt-1 text-[11px] theme-text-muted">
                        {formatDateTime(
                          editingOrder.started_at || editingOrder.updated_at || editingOrder.created_at,
                        )}
                      </p>
                      <p className="mt-2 text-[11px] theme-text-muted">
                        Planeado: {formatShortDateTime(editingOrder.scheduled_date)}
                      </p>
                      <p className="mt-1 text-[11px] theme-text-muted">
                        Estimativa: {editingOrder.estimated_hours || '-'}
                      </p>
                    </div>
                    <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                      <p className="font-semibold theme-text">Prioridade</p>
                      <p className="mt-1">{updateForm.priority}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                    SLA por fase (informativo)
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                      <p className="font-semibold theme-text">Abertura → Análise</p>
                      <p className="mt-1">
                        {formatDuration(editingOrder.created_at, editingOrder.analysis_started_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                      <p className="font-semibold theme-text">Análise → Execução</p>
                      <p className="mt-1">
                        {formatDuration(editingOrder.analysis_started_at, editingOrder.started_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                      <p className="font-semibold theme-text">Execução → Conclusão</p>
                      <p className="mt-1">
                        {formatDuration(editingOrder.started_at, editingOrder.completed_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                      <p className="font-semibold theme-text">Paragem</p>
                      <p className="mt-1">
                        {editingOrder.downtime_minutes !== null && editingOrder.downtime_minutes !== undefined
                          ? formatMinutes(editingOrder.downtime_minutes)
                          : formatDuration(editingOrder.downtime_started_at, editingOrder.downtime_ended_at)}
                      </p>
                    </div>
                  </div>
                </div>

              {canShowEditForm && (
                <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                    Atualizacao da ordem
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium theme-text">Prioridade</label>
                      <select
                        className="input"
                        value={updateForm.priority}
                        onChange={(event) =>
                          setUpdateForm({ ...updateForm, priority: event.target.value })
                        }
                        disabled={!editingPermissions?.canEditOrder}
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="critica">Critica</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium theme-text">Estado</label>
                      <select
                        className="input"
                        value={updateForm.status}
                        onChange={(event) =>
                          setUpdateForm({ ...updateForm, status: event.target.value })
                        }
                        disabled={!editingPermissions?.canOperateOrder}
                      >
                        {(allowedStatusOptionsForEdit || [
                          { value: 'aberta', label: 'Aberta' },
                          { value: 'em_analise', label: 'Em Análise' },
                          { value: 'em_execucao', label: 'Em Execução' },
                          { value: 'em_pausa', label: 'Em Pausa' },
                          { value: 'concluida', label: 'Concluída' },
                          { value: 'fechada', label: 'Fechada' },
                          { value: 'cancelada', label: 'Cancelada' },
                        ]).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                      {updateForm.status === 'em_pausa' && (
                        <>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium theme-text">
                              Motivo da pausa
                            </label>
                            <textarea
                              className="input min-h-[96px]"
                              value={updateForm.pause_reason}
                              onChange={(event) =>
                                setUpdateForm({ ...updateForm, pause_reason: event.target.value })
                              }
                              disabled={!editingPermissions?.canOperateOrder}
                              placeholder="Ex: aguardando peças, aguardando produção, falta de acesso"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium theme-text">
                              Sub-estado (opcional)
                            </label>
                            <input
                              className="input"
                              list="workorder-substatus-options"
                              value={updateForm.sub_status}
                              onChange={(event) =>
                                setUpdateForm({ ...updateForm, sub_status: event.target.value })
                              }
                              disabled={!editingPermissions?.canOperateOrder}
                              placeholder="Ex: aguardando_pecas"
                            />
                            <datalist id="workorder-substatus-options">
                              <option value="aguardando_pecas" />
                              <option value="aguardando_producao" />
                              <option value="aguardando_fornecedor" />
                              <option value="aguardando_autorizacao" />
                              <option value="aguardando_externo" />
                              <option value="bloqueada_seguranca" />
                            </datalist>
                          </div>
                        </>
                      )}

                      {updateForm.status === 'cancelada' && (
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Motivo do cancelamento
                          </label>
                          <textarea
                            className="input min-h-[96px]"
                            value={updateForm.cancel_reason}
                            onChange={(event) =>
                              setUpdateForm({ ...updateForm, cancel_reason: event.target.value })
                            }
                            disabled={!editingPermissions?.canOperateOrder}
                            placeholder="Ex: duplicada, pedido anulado, ativo indisponível"
                          />
                        </div>
                      )}

                    {isPlanningStage && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Horas estimadas
                          </label>
                          <input
                            className="input"
                            value={updateForm.estimated_hours}
                            onChange={(event) =>
                              setUpdateForm({ ...updateForm, estimated_hours: event.target.value })
                            }
                            disabled={
                              !(
                                editingPermissions?.canEditOrder ||
                                ((editingOrder.status === 'aberta' ||
                                  editingOrder.status === 'em_analise') &&
                                  editingPermissions?.canAssumeOrder)
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Data e hora planeada
                          </label>
                          <input
                            type="datetime-local"
                            className="input"
                            value={updateForm.scheduled_date}
                            onChange={(event) =>
                              setUpdateForm({ ...updateForm, scheduled_date: event.target.value })
                            }
                            disabled={
                              !(
                                editingPermissions?.canEditOrder ||
                                ((editingOrder.status === 'aberta' ||
                                  editingOrder.status === 'em_analise') &&
                                  editingPermissions?.canAssumeOrder)
                              )
                            }
                          />
                        </div>
                      </>
                    )}
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium theme-text">Notas</label>
                      <textarea
                        className="input min-h-[96px]"
                        value={updateForm.notes}
                        onChange={(event) =>
                          setUpdateForm({ ...updateForm, notes: event.target.value })
                        }
                        disabled={!editingPermissions?.canOperateOrder}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {(editingPermissions?.canEditOrder || editingPermissions?.canOperateOrder) && (
                      <button onClick={handleUpdate} className="btn-primary" disabled={updating}>
                        {updating ? 'A atualizar...' : 'Guardar alteracoes'}
                      </button>
                    )}
                    {editingPermissions?.canDeleteOrder && (
                      <button
                        onClick={handleDeleteOrder}
                        className="btn-secondary text-rose-600"
                        disabled={updating}
                      >
                        Eliminar
                      </button>
                    )}
                    <button
                      onClick={() => setEditingOrder(null)}
                      className="btn-secondary"
                      disabled={updating}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}

              {canShowChecklist && (
                <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                    {['em_execucao', 'em_pausa', 'concluida', 'fechada'].includes(editingOrder.status)
                      ? 'Checklist'
                      : 'Tarefas a realizar'}
                  </p>
                  <p className="mt-2 text-sm theme-text-muted">
                    {['em_execucao', 'em_pausa', 'concluida', 'fechada'].includes(editingOrder.status)
                      ? 'Marque as tarefas concluídas antes de finalizar a ordem.'
                      : 'Defina as tarefas planeadas para esta ordem.'}
                  </p>

                  {tasksError && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {tasksError}
                    </div>
                  )}

                  {tasksLoading && (
                    <p className="mt-4 text-xs theme-text-muted">A carregar tarefas...</p>
                  )}

                  {!tasksLoading && orderTasks.length === 0 && (
                    <p className="mt-4 text-xs theme-text-muted">
                      Ainda nao ha tarefas registadas nesta ordem.
                    </p>
                  )}

                  {orderTasks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {orderTasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border theme-border bg-[color:var(--dash-surface)] px-3 py-2 text-xs theme-text-muted"
                        >
                          {['em_execucao', 'em_pausa', 'concluida', 'fechada'].includes(editingOrder.status) && (
                            <input
                              type="checkbox"
                              checked={task.is_completed}
                              onChange={() => handleToggleTask(task)}
                              disabled={
                                tasksSaving ||
                                !editingPermissions?.canOperateOrder ||
                                editingOrder.status !== 'em_execucao'
                              }
                            />
                          )}
                          <span
                            className={
                              task.is_completed
                                ? 'theme-text-muted line-through'
                                : 'theme-text'
                            }
                          >
                            {task.description}
                          </span>
                          {task.completed_at && (
                            <span className="ml-auto text-[11px] theme-text-muted">
                              {formatShortDateTime(task.completed_at)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {(editingPermissions?.canOperateOrder ||
                    editingPermissions?.canEditOrder ||
                    ((editingOrder.status === 'aberta' || editingOrder.status === 'em_analise') &&
                      editingPermissions?.canAssumeOrder)) &&
                    !['concluida', 'fechada', 'cancelada'].includes(editingOrder.status) && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <input
                        className="input flex-1"
                        placeholder="Adicionar tarefa"
                        value={newTaskDescription}
                        onChange={(event) => setNewTaskDescription(event.target.value)}
                        disabled={tasksSaving}
                      />
                      <button
                        className="btn-secondary"
                        onClick={handleAddTask}
                        disabled={tasksSaving}
                      >
                        Adicionar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {['em_execucao', 'em_pausa'].includes(editingOrder.status) &&
                editingPermissions?.canOperateOrder && (
                <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                    Finalizar ordem
                  </p>
                  <p className="mt-2 text-sm theme-text-muted">
                    Ao terminar, indique o trabalho realizado (obrigatório). Horas reais e paragem são opcionais.
                  </p>
                  {!showFinishFields ? (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setShowFinishFields(true)}
                        className="btn-primary"
                        disabled={updating}
                      >
                        Finalizar agora
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Horas reais (opcional)
                          </label>
                          <input
                            className="input"
                            value={finishForm.actual_hours}
                            onChange={(event) =>
                              setFinishForm({ ...finishForm, actual_hours: event.target.value })
                            }
                            disabled={updating}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Trabalho realizado
                          </label>
                          <textarea
                            className="input min-h-[96px]"
                            value={finishForm.work_performed}
                            onChange={(event) =>
                              setFinishForm({ ...finishForm, work_performed: event.target.value })
                            }
                            disabled={updating}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Início da paragem (opcional)
                          </label>
                          <input
                            type="datetime-local"
                            className="input"
                            value={finishForm.downtime_started_at}
                            onChange={(event) =>
                              setFinishForm({ ...finishForm, downtime_started_at: event.target.value })
                            }
                            disabled={updating}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Fim da paragem (opcional)
                          </label>
                          <input
                            type="datetime-local"
                            className="input"
                            value={finishForm.downtime_ended_at}
                            onChange={(event) =>
                              setFinishForm({ ...finishForm, downtime_ended_at: event.target.value })
                            }
                            disabled={updating}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Motivo da paragem (opcional)
                          </label>
                          <input
                            className="input"
                            value={finishForm.downtime_reason}
                            onChange={(event) =>
                              setFinishForm({ ...finishForm, downtime_reason: event.target.value })
                            }
                            disabled={updating}
                            placeholder="Ex: produção parada, falta de energia, aguardando autorização"
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          onClick={handleFinishOrder}
                          className="btn-primary"
                          disabled={updating}
                        >
                          {updating ? 'A terminar...' : 'Terminar'}
                        </button>
                        <button
                          onClick={() => setShowFinishFields(false)}
                          className="btn-secondary"
                          disabled={updating}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                  Historico de alteracoes
                </p>
                {auditError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {auditError}
                  </div>
                )}
                {auditLoading && (
                  <p className="mt-4 text-xs theme-text-muted">A carregar historico...</p>
                )}
                {!auditLoading && auditLogs.length === 0 && (
                  <p className="mt-4 text-xs theme-text-muted">
                    Sem alteracoes registadas ainda.
                  </p>
                )}
                {auditLogs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] px-3 py-2 text-xs theme-text-muted"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold theme-text">
                            {log.action}
                          </span>
                          <span className="text-[11px] theme-text-muted">
                            {formatShortDateTime(log.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] theme-text-muted">
                          {formatAuditUser(log)}
                        </p>
                        <p className="mt-1 text-[11px] theme-text-muted">
                          {formatAuditFields(log)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canShowPartsSection && (
                <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                    Pecas utilizadas
                  </p>
                  <p className="mt-2 text-sm theme-text-muted">
                    Registe as pecas consumidas nesta ordem para atualizar o stock.
                  </p>

                  {['em_execucao', 'em_pausa'].includes(editingOrder.status) && (
                    <div className="mt-4 space-y-4">
                      {partsError && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {partsError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Peca
                          </label>
                          <input
                            className="input mb-2"
                            placeholder="Pesquisar peca"
                            value={usagePartSearch}
                            onChange={(event) => setUsagePartSearch(event.target.value)}
                            disabled={partsLoading || !editingPermissions?.canOperateOrder}
                          />
                          <select
                            className="input"
                            value={usageForm.spare_part_id}
                            onChange={(event) =>
                              setUsageForm({ ...usageForm, spare_part_id: event.target.value })
                            }
                            disabled={partsLoading || !editingPermissions?.canOperateOrder}
                          >
                            <option value="">Selecionar...</option>
                            {filteredUsageParts.map((part) => (
                              <option key={part.id} value={part.id}>
                                {part.code} - {part.name}
                              </option>
                            ))}
                          </select>
                          {!partsLoading && filteredUsageParts.length === 0 && (
                            <p className="mt-2 text-xs theme-text-muted">
                              Nenhuma peca encontrada.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="input"
                            value={usageForm.quantity}
                            onChange={(event) =>
                              setUsageForm({
                                ...usageForm,
                                quantity: Number(event.target.value),
                              })
                            }
                            disabled={!editingPermissions?.canOperateOrder}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Custo unitario (opcional)
                          </label>
                          <input
                            className="input"
                            value={usageForm.unit_cost}
                            onChange={(event) =>
                              setUsageForm({ ...usageForm, unit_cost: event.target.value })
                            }
                            disabled={!editingPermissions?.canOperateOrder}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Notas (opcional)
                          </label>
                          <input
                            className="input"
                            value={usageForm.notes}
                            onChange={(event) =>
                              setUsageForm({ ...usageForm, notes: event.target.value })
                            }
                            disabled={!editingPermissions?.canOperateOrder}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="btn-primary"
                          onClick={handleAddUsedPart}
                          disabled={usageSaving || !editingPermissions?.canOperateOrder}
                        >
                          {usageSaving ? 'A registar...' : 'Registar peca usada'}
                        </button>
                        {usageMessage && (
                          <span className="text-xs theme-text-muted">{usageMessage}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                        Registos desta ordem
                      </p>
                      {orderMovements.length > 0 && (
                        <span className="text-xs font-semibold theme-text">
                          {orderMovements.length} movimentos
                        </span>
                      )}
                    </div>

                    {orderMovementsLoading && (
                      <p className="mt-3 text-xs theme-text-muted">A carregar movimentos...</p>
                    )}
                    {orderMovementsError && (
                      <p className="mt-3 text-xs text-rose-600">{orderMovementsError}</p>
                    )}
                    {!orderMovementsLoading &&
                      !orderMovementsError &&
                      orderMovements.length === 0 && (
                        <p className="mt-3 text-xs theme-text-muted">
                          Ainda nao ha pecas registadas nesta ordem.
                        </p>
                      )}

                    {orderMovements.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full divide-y divide-[color:var(--dash-border)] text-xs">
                          <thead className="bg-[color:var(--dash-panel)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-[color:var(--dash-muted)]">
                                Peca
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-[color:var(--dash-muted)]">
                                Quantidade
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-[color:var(--dash-muted)]">
                                Custo
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-[color:var(--dash-muted)]">
                                Data
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--dash-border)]">
                            {orderMovements.map((movement) => (
                              <tr key={movement.id}>
                                <td className="px-3 py-2 theme-text">
                                  {movement.spare_part
                                    ? `${movement.spare_part.code} - ${movement.spare_part.name}`
                                    : '-'}
                                </td>
                                <td className="px-3 py-2 theme-text">
                                  {movement.quantity}
                                </td>
                                <td className="px-3 py-2 theme-text">
                                  {movement.unit_cost ? `€ ${movement.unit_cost}` : '-'}
                                </td>
                                <td className="px-3 py-2 theme-text-muted">
                                  {formatShortDateTime(movement.created_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                  Acoes
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {['aberta', 'em_analise', 'em_pausa'].includes(editingOrder.status) &&
                    editingPermissions?.canAssumeOrder && (
                      <>
                        {editingOrder.status === 'aberta' && (
                          <button
                            onClick={handleAssignWait}
                            className="btn-secondary"
                            disabled={updating}
                          >
                            Em análise
                          </button>
                        )}
                        <button
                          onClick={handleStartOrder}
                          className="btn-primary"
                          disabled={updating}
                        >
                          {editingOrder.status === 'em_pausa' ? 'Retomar' : 'Iniciar'}
                        </button>
                      </>
                    )}
                  {editingOrder.status === 'em_execucao' &&
                    editingPermissions?.canOperateOrder && (
                      <>
                        <div className="w-full">
                          <label className="mb-1 block text-sm font-medium theme-text">
                            Motivo da pausa
                          </label>
                          <input
                            className="input"
                            value={updateForm.pause_reason}
                            onChange={(event) =>
                              setUpdateForm({ ...updateForm, pause_reason: event.target.value })
                            }
                            disabled={updating}
                            placeholder="Ex: aguardando peças"
                          />
                        </div>
                        <button
                          onClick={handlePauseOrder}
                          className="btn-secondary"
                          disabled={updating}
                        >
                          Pausar
                        </button>
                      </>
                    )}

                  {editingOrder.status === 'concluida' && (isAdmin || isManager) && (
                    <button
                      onClick={handleCloseOrder}
                      className="btn-primary"
                      disabled={updating}
                    >
                      Fechar ordem
                    </button>
                  )}
                  {!editingPermissions?.canAssumeOrder && (
                    <span className="text-xs theme-text-muted">
                      Esta ordem esta atribuida a outro utilizador.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {selectedPlant && (
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-center gap-3 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <Search className="h-4 w-4 text-emerald-600" />
                    <input
                      className="w-full bg-transparent text-sm text-[color:var(--dash-text)] placeholder:text-[color:var(--dash-muted)] focus:outline-none"
                      placeholder={
                        activeSection === 'orders'
                          ? 'Pesquisar por titulo, ativo ou descricao'
                          : 'Pesquisa indisponível nesta aba'
                      }
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      disabled={activeSection !== 'orders'}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-full border theme-border bg-[color:var(--dash-panel)] px-2 py-1">
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          activeSection === 'orders'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-[color:var(--dash-muted)] hover:text-[color:var(--dash-text)]'
                        }`}
                        onClick={() => setActiveSection('orders')}
                      >
                        Ordens
                      </button>
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          activeSection === 'preventive'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-[color:var(--dash-muted)] hover:text-[color:var(--dash-text)]'
                        }`}
                        onClick={() => {
                          setActiveSection('preventive');
                          setViewMode('table');
                          setPreventiveViewMode('table');
                        }}
                      >
                        Preventiva
                      </button>
                    </div>

                    {activeSection === 'orders' ? (
                      <>
                        <div className="inline-flex items-center gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-xs font-semibold theme-text-muted">
                          <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                          <select
                            className="bg-transparent text-xs font-semibold text-[color:var(--dash-text)] focus:outline-none"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1 rounded-full border theme-border bg-[color:var(--dash-panel)] px-2 py-1">
                          <button
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              viewMode === 'table'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'text-[color:var(--dash-muted)] hover:text-[color:var(--dash-text)]'
                            }`}
                            onClick={() => setViewMode('table')}
                          >
                            <List className="h-4 w-4" />
                          </button>
                          <button
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              viewMode === 'kanban'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'text-[color:var(--dash-muted)] hover:text-[color:var(--dash-text)]'
                            }`}
                            onClick={() => setViewMode('kanban')}
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-xs font-semibold theme-text-muted">
                          <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                          <select
                            className="bg-transparent text-xs font-semibold text-[color:var(--dash-text)] focus:outline-none"
                            value={preventiveStatusFilter}
                            onChange={(event) => setPreventiveStatusFilter(event.target.value)}
                          >
                            <option value="">Todos</option>
                            <option value="agendada">Agendada</option>
                            <option value="em_execucao">Em execução</option>
                            <option value="concluida">Concluída</option>
                            <option value="fechada">Fechada</option>
                            <option value="reagendada">Reagendada</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 rounded-full border theme-border bg-[color:var(--dash-panel)] px-2 py-1">
                          <button
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              preventiveViewMode === 'table'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'text-[color:var(--dash-muted)] hover:text-[color:var(--dash-text)]'
                            }`}
                            onClick={() => setPreventiveViewMode('table')}
                            aria-label="Vista tabela"
                            title="Tabela"
                          >
                            <List className="h-4 w-4" />
                          </button>
                          <button
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              preventiveViewMode === 'cards'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'text-[color:var(--dash-muted)] hover:text-[color:var(--dash-text)]'
                            }`}
                            onClick={() => setPreventiveViewMode('cards')}
                            aria-label="Vista cards"
                            title="Cards"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border theme-border theme-card shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex flex-col gap-2 border-b border-[color:var(--dash-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold theme-text">
                      {activeSection === 'orders' ? 'Ordens' : 'Preventiva'}
                    </h2>
                    <p className="text-sm theme-text-muted">
                      {activeSection === 'orders'
                        ? `${workOrders.length} registros`
                        : `${preventiveSchedules.length} registros`}
                    </p>
                  </div>
                  {activeSection === 'orders' &&
                    (alertSummary.overdue > 0 || alertSummary.dueSoon > 0) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {alertSummary.overdue > 0 && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {alertSummary.overdue} em atraso
                        </span>
                      )}
                      {alertSummary.dueSoon > 0 && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {alertSummary.dueSoon} a vencer
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {activeSection === 'orders' && loading && (
                  <div className="p-12 text-center">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin theme-text-muted" />
                    <p className="text-sm theme-text-muted">Carregando ordens...</p>
                  </div>
                )}

                {activeSection === 'orders' && !loading && error && (
                  <div className="p-12 text-center">
                    <AlertCircle className="mx-auto mb-4 h-8 w-8 text-rose-400" />
                    <p className="text-sm theme-text-muted">{error}</p>
                  </div>
                )}

                {activeSection === 'orders' && !loading && !error && viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
                      <thead className="bg-[color:var(--dash-surface)]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Ordem
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Ativo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Responsavel
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Registo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            SLA
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Prioridade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Abrir
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
                        {workOrders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center theme-text-muted">
                              Nenhuma ordem encontrada
                            </td>
                          </tr>
                        )}
                        {workOrders.map((order) => {
                          const slaDate = order.sla_deadline ? new Date(order.sla_deadline) : null;
                          const isOverdue = slaDate ? slaDate.getTime() < Date.now() : false;
                          const dueSoon = slaDate
                            ? slaDate.getTime() >= Date.now() &&
                              slaDate.getTime() <= Date.now() + 24 * 60 * 60 * 1000
                            : false;
                          const createdDate = order.created_at ? new Date(order.created_at) : null;
                          const responsibleDate =
                            order.started_at || order.updated_at || order.created_at || null;
                          const canEdit =
                            isAdmin || isManager || order.created_by === userId;
                          const canOperate = isAdmin || order.assigned_to === userId;
                          const isReadOnly = Boolean(
                            order.assigned_to && order.assigned_to !== userId && !canEdit && !canOperate,
                          );

                          return (
                            <tr
                              key={order.id}
                              className="group cursor-pointer transition-all duration-200 hover:bg-emerald-500/10 hover:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.45)] focus-within:bg-emerald-500/10"
                              role="button"
                              tabIndex={0}
                              onClick={() => handleStartEdit(order)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleStartEdit(order);
                                }
                              }}
                            >
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold theme-text">
                                  {order.title}
                                </div>
                                <div className="text-xs theme-text-muted">
                                  {order.description || 'Sem descricao'}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] theme-text-muted">
                                  <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3 text-emerald-600" />
                                    {order.createdByUser
                                      ? `${order.createdByUser.first_name} ${order.createdByUser.last_name}`
                                      : 'Nao informado'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 theme-text-muted">
                                    <Clock className="h-3 w-3" />
                                    {formatShortDateTime(order.created_at)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                {order.asset ? `${order.asset.code} - ${order.asset.name}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                <div className="flex flex-wrap items-center gap-3 text-[11px] theme-text-muted">
                                  <span className="inline-flex items-center gap-1">
                                    <UserCheck className="h-3 w-3 text-sky-600" />
                                    {order.assignedUser
                                      ? `${order.assignedUser.first_name} ${order.assignedUser.last_name}`
                                      : 'Nao atribuido'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 theme-text-muted">
                                    <Clock className="h-3 w-3" />
                                    {formatShortDateTime(responsibleDate)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                {formatShortDateTime(order.created_at)}
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                {slaDate ? (
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs ${
                                      isOverdue
                                        ? 'bg-rose-500/10 text-[color:var(--dash-text)]'
                                        : dueSoon
                                        ? 'bg-amber-500/10 text-[color:var(--dash-text)]'
                                        : 'bg-emerald-500/10 text-[color:var(--dash-text)]'
                                    }`}
                                  >
                                    {slaDate.toLocaleDateString()}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                {order.priority || 'n/a'}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                    statusBadgeClass[order.status] ||
                                    'border theme-border bg-[color:var(--dash-surface)] theme-text'
                                  }`}
                                >
                                  {statusLabels[order.status] || order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold theme-text-muted">
                                {isReadOnly ? 'Ver' : 'Clique para abrir'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeSection === 'preventive' && preventiveLoading && (
                  <div className="p-12 text-center">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin theme-text-muted" />
                    <p className="text-sm theme-text-muted">Carregando preventivas...</p>
                  </div>
                )}

                {activeSection === 'preventive' && !preventiveLoading && preventiveError && (
                  <div className="p-12 text-center">
                    <AlertCircle className="mx-auto mb-4 h-8 w-8 text-rose-400" />
                    <p className="text-sm theme-text-muted">{preventiveError}</p>
                  </div>
                )}

                {activeSection === 'preventive' && !preventiveLoading && !preventiveError && (
                  <>
                    {preventiveViewMode === 'table' ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
                          <thead className="bg-[color:var(--dash-surface)]">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                                Data
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                                Ativo
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                                Plano
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                                Estado
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                                Abrir
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
                            {preventiveSchedules.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-8 text-center theme-text-muted">
                                  Sem preventivas agendadas.
                                </td>
                              </tr>
                            )}
                            {preventiveSchedules.map((s) => (
                              <tr
                                key={s.id}
                                className="group cursor-pointer transition-all duration-200 hover:bg-emerald-500/10"
                                role="button"
                                tabIndex={0}
                                onClick={() => openPreventiveEditor(s)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openPreventiveEditor(s);
                                  }
                                }}
                                title="Clique para editar"
                              >
                                <td className="px-6 py-4 text-sm theme-text">
                                  {new Date(s.scheduled_for).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm theme-text">
                                  {s.asset_code
                                    ? `${s.asset_code} - ${s.asset_name || ''}`
                                    : s.asset_name || '—'}
                                </td>
                                <td className="px-6 py-4 text-sm theme-text">
                                  {s.plan_name || '—'}
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className="rounded-full border theme-border bg-[color:var(--dash-surface)] px-2 py-1 text-xs font-semibold theme-text"
                                  >
                                    {String(s.status)
                                      .replace('em_execucao', 'Em execução')
                                      .replace('concluida', 'Concluída')
                                      .replace('reagendada', 'Reagendada')
                                      .replace('agendada', 'Agendada')
                                      .replace('fechada', 'Fechada')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold theme-text-muted">
                                  Clique para editar
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                        {preventiveSchedules.length === 0 ? (
                          <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-8 text-center text-sm theme-text-muted">
                            Sem preventivas agendadas.
                          </div>
                        ) : (
                          preventiveSchedules.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => openPreventiveEditor(s)}
                              className="text-left rounded-2xl border theme-border theme-card p-4 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] focus:outline-none"
                              title="Clique para editar"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold theme-text">
                                    {s.plan_name || 'Plano'}
                                  </p>
                                  <p className="mt-1 text-xs theme-text-muted">
                                    {s.asset_code
                                      ? `${s.asset_code} - ${s.asset_name || ''}`
                                      : s.asset_name || '—'}
                                  </p>
                                </div>
                                <span className="rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs font-semibold theme-text">
                                  {String(s.status)
                                    .replace('em_execucao', 'Em execução')
                                    .replace('concluida', 'Concluída')
                                    .replace('reagendada', 'Reagendada')
                                    .replace('agendada', 'Agendada')
                                    .replace('fechada', 'Fechada')}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center gap-2 text-xs theme-text-muted">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(s.scheduled_for).toLocaleString()}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}

                {editingPreventive && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-black/40"
                      onClick={closePreventiveEditor}
                      aria-hidden="true"
                    />
                    <div className="relative w-[520px] max-w-[calc(100vw-2rem)] rounded-[28px] border theme-border theme-card p-6 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.65)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] theme-text-muted">
                            Preventiva
                          </p>
                          <h3 className="mt-2 text-lg font-semibold theme-text">
                            {editingPreventive.plan_name || 'Agendamento preventivo'}
                          </h3>
                          <p className="mt-1 text-xs theme-text-muted">
                            {editingPreventive.asset_code
                              ? `${editingPreventive.asset_code} - ${editingPreventive.asset_name || ''}`
                              : editingPreventive.asset_name || '—'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary h-9 px-3"
                          onClick={closePreventiveEditor}
                          disabled={preventiveSaving}
                        >
                          Fechar
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4">
                        <div>
                          <label className="text-xs font-semibold theme-text-muted">Data</label>
                          <input
                            type="datetime-local"
                            className="mt-1 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 text-sm theme-text"
                            value={preventiveEditForm.scheduled_for}
                            onChange={(e) =>
                              setPreventiveEditForm((p) => ({ ...p, scheduled_for: e.target.value }))
                            }
                            disabled={!canManagePreventive || preventiveSaving}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold theme-text-muted">Estado</label>
                          <select
                            className="mt-1 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 text-sm theme-text"
                            value={preventiveEditForm.status}
                            onChange={(e) =>
                              setPreventiveEditForm((p) => ({ ...p, status: e.target.value }))
                            }
                            disabled={!canManagePreventive || preventiveSaving}
                          >
                            <option value="agendada">Agendada</option>
                            <option value="reagendada">Reagendada</option>
                            <option value="em_execucao">Em execução</option>
                            <option value="concluida">Concluída</option>
                            <option value="fechada">Fechada</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold theme-text-muted">Notas</label>
                          <textarea
                            className="mt-1 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 text-sm theme-text"
                            rows={3}
                            value={preventiveEditForm.notes}
                            onChange={(e) =>
                              setPreventiveEditForm((p) => ({ ...p, notes: e.target.value }))
                            }
                            placeholder="Opcional"
                            disabled={!canManagePreventive || preventiveSaving}
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                        {!canManagePreventive ? (
                          <span className="text-xs theme-text-muted">Sem permissão para editar.</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary inline-flex items-center gap-2"
                            onClick={savePreventiveEdit}
                            disabled={preventiveSaving}
                          >
                            <Save className="h-4 w-4" />
                            {preventiveSaving ? 'A guardar...' : 'Guardar alterações'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!loading && !error && viewMode === 'kanban' && (
                  <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {Object.keys(statusLabels).map((statusKey) => (
                      <div
                        key={statusKey}
                        className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold theme-text">
                            {statusLabels[statusKey]}
                          </h3>
                          <span className="text-xs theme-text-muted">
                            {(groupedByStatus[statusKey] || []).length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {(groupedByStatus[statusKey] || []).map((order) => {
                            const slaDate = order.sla_deadline
                              ? new Date(order.sla_deadline)
                              : null;
                            const isOverdue = slaDate ? slaDate.getTime() < Date.now() : false;
                            const dueSoon = slaDate
                              ? slaDate.getTime() >= Date.now() &&
                                slaDate.getTime() <= Date.now() + 24 * 60 * 60 * 1000
                              : false;
                            const createdDate = order.created_at
                              ? new Date(order.created_at)
                              : null;
                            const responsibleDate =
                              order.started_at || order.updated_at || order.created_at || null;

                            return (
                              <div
                                key={order.id}
                                className="cursor-pointer rounded-2xl border theme-border theme-card p-4 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleStartEdit(order)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleStartEdit(order);
                                  }
                                }}
                              >
                                <p className="text-sm font-semibold theme-text">
                                  {order.title}
                                </p>
                                <p className="text-xs theme-text-muted">
                                  {order.asset
                                    ? `${order.asset.code} - ${order.asset.name}`
                                    : 'Sem ativo'}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] theme-text-muted">
                                  <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3 text-emerald-600" />
                                    {order.createdByUser
                                      ? `${order.createdByUser.first_name} ${order.createdByUser.last_name}`
                                      : 'Nao informado'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 theme-text-muted">
                                    <Clock className="h-3 w-3" />
                                    {formatShortDateTime(order.created_at)}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] theme-text-muted">
                                  <span className="inline-flex items-center gap-1">
                                    <UserCheck className="h-3 w-3 text-sky-600" />
                                    {order.assignedUser
                                      ? `${order.assignedUser.first_name} ${order.assignedUser.last_name}`
                                      : 'Nao atribuido'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 theme-text-muted">
                                    <Clock className="h-3 w-3" />
                                    {formatShortDateTime(responsibleDate)}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="rounded-full bg-[color:var(--dash-surface)] px-2 py-1 theme-text">
                                    {order.priority || 'n/a'}
                                  </span>
                                  {slaDate && (
                                    <span
                                      className={`rounded-full px-2 py-1 ${
                                        isOverdue
                                          ? 'bg-rose-500/10 text-[color:var(--dash-text)]'
                                          : dueSoon
                                          ? 'bg-amber-500/10 text-[color:var(--dash-text)]'
                                          : 'bg-emerald-500/10 text-[color:var(--dash-text)]'
                                      }`}
                                    >
                                      SLA {slaDate.toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-4 text-xs font-semibold theme-text-muted">
                                  Clique para abrir
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                <h3 className="text-sm font-semibold theme-text">Mapa de prioridades</h3>
                <div className="mt-4 space-y-3">
                  {Object.keys(prioritySummary).length === 0 && (
                    <p className="text-xs theme-text-muted">Sem dados suficientes.</p>
                  )}
                  {Object.entries(prioritySummary).map(([priority, count]) => (
                    <div key={priority} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold theme-text">
                        <span>{priority}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[color:var(--dash-surface)]">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.min((count / Math.max(1, workOrders.length)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border theme-border theme-card p-6 theme-text shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                <h3 className="text-sm font-semibold theme-text">Radar de SLA</h3>
                <p className="mt-2 text-xs theme-text-muted">
                  Controle rapido das ordens que podem comprometer disponibilidade.
                </p>
                <div className="mt-4 grid gap-3 text-xs">
                  <div className="flex items-center justify-between rounded-2xl border theme-border bg-[color:var(--dash-surface)] px-3 py-2">
                    <span className="font-semibold theme-text">Em atraso</span>
                    <span className="theme-text">{alertSummary.overdue}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border theme-border bg-[color:var(--dash-surface)] px-3 py-2">
                    <span className="font-semibold theme-text">A vencer</span>
                    <span className="theme-text">{alertSummary.dueSoon}</span>
                  </div>
                </div>
              </div>

              {templates.length > 0 && (
                <div className="rounded-[28px] border theme-border theme-card p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                  <h3 className="text-sm font-semibold theme-text">Templates guardados</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.name}
                        className="btn-secondary"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
