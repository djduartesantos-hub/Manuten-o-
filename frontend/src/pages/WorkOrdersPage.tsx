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
  getWorkOrder,
  getWorkOrderAuditLogs,
  getSpareParts,
  getStockMovementsByPlant,
  getWorkOrders,
  addWorkOrderTask,
  updateWorkOrderTask,
  updateWorkOrder,
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
  assigned_to?: string | null;
  created_by?: string | null;
  priority?: string | null;
  estimated_hours?: string | null;
  actual_hours?: string | null;
  created_at?: string;
  updated_at?: string;
  sla_deadline?: string | null;
  scheduled_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
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
  priority: string;
  scheduled_date: string;
  actual_hours: string;
  work_performed: string;
  notes: string;
  completed_at: string;
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
    priority: 'media',
    scheduled_date: '',
    actual_hours: '',
    work_performed: '',
    notes: '',
    completed_at: '',
  });
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
      { value: 'atribuida', label: 'Atribuída' },
      { value: 'em_curso', label: 'Em curso' },
      { value: 'concluida', label: 'Concluída' },
      { value: 'cancelada', label: 'Cancelada' },
    ],
    [],
  );

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
        const normalizedOrders = (ordersResult.value || []).filter((order: WorkOrder) => {
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
        estimated_hours: form.estimated_hours || undefined,
        scheduled_date: form.scheduled_date || undefined,
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

  const formatAuditUser = (log: AuditLog) => {
    if (!log.user) return 'Sistema';
    const name = `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim();
    return name || log.user.id || 'Utilizador';
  };

  const formatAuditFields = (log: AuditLog) => {
    const fields = Object.keys(log.new_values || {});
    if (fields.length === 0) return 'Sem detalhes';
    return `Campos: ${fields.join(', ')}`;
  };

  const handleStartEdit = (order: WorkOrder) => {
    setEditingOrder(order);
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
      priority: order.priority || 'media',
      scheduled_date: toDateTimeLocal(order.scheduled_date),
      actual_hours: order.actual_hours || '',
      work_performed: order.work_performed || '',
      notes: order.notes || '',
      completed_at: toDateTimeLocal(order.completed_at),
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
        priority: workOrder.priority || 'media',
        scheduled_date: toDateTimeLocal(workOrder.scheduled_date),
        actual_hours: workOrder.actual_hours || '',
        work_performed: workOrder.work_performed || '',
        notes: workOrder.notes || '',
        completed_at: toDateTimeLocal(workOrder.completed_at),
      });
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
    if (!editingPermissions?.canOperateOrder) {
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
    if (editingOrder.status !== 'em_curso') {
      setUsageMessage('Apenas ordens em curso podem registar pecas usadas.');
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
    const canOperateOrder = isAdmin || editingOrder.assigned_to === userId;

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
      }
      if (canOperateOrder) {
        payload.actual_hours = updateForm.actual_hours || undefined;
        payload.work_performed = updateForm.work_performed || undefined;
        payload.notes = updateForm.notes || undefined;
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
        status: 'atribuida',
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
        status: 'em_curso',
        assigned_to: editingOrder.assigned_to || userId,
        started_at: new Date().toISOString(),
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
      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: 'atribuida',
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

    if (!updateForm.work_performed.trim()) {
      setError('Indique o trabalho realizado antes de terminar a ordem');
      return;
    }

    if (orderTasks.some((task) => !task.is_completed)) {
      setError('Conclua todas as tarefas antes de terminar a ordem');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: 'concluida',
        completed_at: new Date().toISOString(),
      });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao terminar ordem');
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
      const slaTime = new Date(order.sla_deadline).getTime();
      if (slaTime < now) overdue += 1;
      else if (slaTime <= soon) dueSoon += 1;
    });

    return { overdue, dueSoon };
  }, [workOrders]);

  const statusLabels: Record<string, string> = {
    aberta: 'Aberta',
    atribuida: 'Atribuída',
    em_curso: 'Em curso',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };
  const statusBadgeClass: Record<string, string> = {
    aberta: 'bg-amber-100 text-amber-800',
    atribuida: 'bg-blue-100 text-blue-700',
    em_curso: 'bg-emerald-100 text-emerald-700',
    concluida: 'bg-slate-200 text-slate-700',
    cancelada: 'bg-rose-100 text-rose-700',
  };

  const statusSummary = useMemo(() => {
    const counts = {
      total: workOrders.length,
      aberta: 0,
      em_curso: 0,
      concluida: 0,
    };

    workOrders.forEach((order) => {
      if (order.status === 'aberta') counts.aberta += 1;
      if (order.status === 'em_curso') counts.em_curso += 1;
      if (order.status === 'concluida') counts.concluida += 1;
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
    const canOperateOrder = isAdmin || isAssignedToUser;
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
      (editingOrder.status === 'em_curso' ||
        editingOrder.status === 'concluida' ||
        Boolean(editingOrder.started_at)),
  );

  const canShowEditForm = Boolean(
    editingOrder &&
      (editingOrder.status === 'concluida'
        ? editingPermissions?.canOperateOrder
        : editingPermissions?.canEditOrder || editingPermissions?.canOperateOrder),
  );

  const canShowChecklist = Boolean(
    editingOrder && (editingPermissions?.canOperateOrder || editingPermissions?.canEditOrder),
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
                  Em curso
                </div>
                <p className="mt-3 text-2xl font-semibold theme-text">
                  {statusSummary.em_curso}
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

              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Horas estimadas
                </label>
                <input
                  className="input"
                  value={form.estimated_hours}
                  onChange={(event) => setForm({ ...form, estimated_hours: event.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Data e hora planeada
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.scheduled_date}
                  onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })}
                />
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
                        statusBadgeClass[editingOrder.status] || 'bg-slate-100 text-slate-700'
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
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
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
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">Prioridade</p>
                      <p className="mt-1">{updateForm.priority}</p>
                    </div>
                  </div>
                </div>

              {canShowEditForm && (
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Atualizacao da ordem
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Data e hora planeada
                      </label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={updateForm.scheduled_date}
                        onChange={(event) =>
                          setUpdateForm({ ...updateForm, scheduled_date: event.target.value })
                        }
                        disabled={!editingPermissions?.canEditOrder}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Horas reais
                      </label>
                      <input
                        className="input"
                        value={updateForm.actual_hours}
                        onChange={(event) =>
                          setUpdateForm({ ...updateForm, actual_hours: event.target.value })
                        }
                        disabled={!editingPermissions?.canOperateOrder}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Trabalho realizado
                      </label>
                      <textarea
                        className="input min-h-[96px]"
                        value={updateForm.work_performed}
                        onChange={(event) =>
                          setUpdateForm({ ...updateForm, work_performed: event.target.value })
                        }
                        disabled={!editingPermissions?.canOperateOrder}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
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
                    <button onClick={handleUpdate} className="btn-primary" disabled={updating}>
                      {updating ? 'A atualizar...' : 'Guardar alteracoes'}
                    </button>
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
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Checklist
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Marque as tarefas concluídas antes de finalizar a ordem.
                  </p>

                  {tasksError && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {tasksError}
                    </div>
                  )}

                  {tasksLoading && (
                    <p className="mt-4 text-xs text-slate-500">A carregar tarefas...</p>
                  )}

                  {!tasksLoading && orderTasks.length === 0 && (
                    <p className="mt-4 text-xs text-slate-500">
                      Ainda nao ha tarefas registadas nesta ordem.
                    </p>
                  )}

                  {orderTasks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {orderTasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                        >
                          <input
                            type="checkbox"
                            checked={task.is_completed}
                            onChange={() => handleToggleTask(task)}
                            disabled={tasksSaving || !editingPermissions?.canOperateOrder}
                          />
                          <span
                            className={
                              task.is_completed
                                ? 'text-slate-400 line-through'
                                : 'text-slate-700'
                            }
                          >
                            {task.description}
                          </span>
                          {task.completed_at && (
                            <span className="ml-auto text-[11px] text-slate-400">
                              {formatShortDateTime(task.completed_at)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {editingPermissions?.canOperateOrder && (
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

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Historico de alteracoes
                </p>
                {auditError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {auditError}
                  </div>
                )}
                {auditLoading && (
                  <p className="mt-4 text-xs text-slate-500">A carregar historico...</p>
                )}
                {!auditLoading && auditLogs.length === 0 && (
                  <p className="mt-4 text-xs text-slate-500">
                    Sem alteracoes registadas ainda.
                  </p>
                )}
                {auditLogs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-700">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatShortDateTime(log.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatAuditUser(log)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatAuditFields(log)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canShowPartsSection && (
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Pecas utilizadas
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Registe as pecas consumidas nesta ordem para atualizar o stock.
                  </p>

                  {editingOrder.status === 'em_curso' && (
                    <div className="mt-4 space-y-4">
                      {partsError && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {partsError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
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
                            <p className="mt-2 text-xs text-slate-500">
                              Nenhuma peca encontrada.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">
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
                          <span className="text-xs text-slate-500">{usageMessage}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Registos desta ordem
                      </p>
                      {orderMovements.length > 0 && (
                        <span className="text-xs font-semibold text-slate-600">
                          {orderMovements.length} movimentos
                        </span>
                      )}
                    </div>

                    {orderMovementsLoading && (
                      <p className="mt-3 text-xs text-slate-500">A carregar movimentos...</p>
                    )}
                    {orderMovementsError && (
                      <p className="mt-3 text-xs text-rose-600">{orderMovementsError}</p>
                    )}
                    {!orderMovementsLoading &&
                      !orderMovementsError &&
                      orderMovements.length === 0 && (
                        <p className="mt-3 text-xs text-slate-500">
                          Ainda nao ha pecas registadas nesta ordem.
                        </p>
                      )}

                    {orderMovements.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">
                                Peca
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">
                                Quantidade
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">
                                Custo
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">
                                Data
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {orderMovements.map((movement) => (
                              <tr key={movement.id}>
                                <td className="px-3 py-2 text-slate-700">
                                  {movement.spare_part
                                    ? `${movement.spare_part.code} - ${movement.spare_part.name}`
                                    : '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {movement.quantity}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {movement.unit_cost ? `€ ${movement.unit_cost}` : '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-500">
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

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Acoes
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(editingOrder.status === 'aberta' || editingOrder.status === 'atribuida') &&
                    editingPermissions?.canAssumeOrder && (
                      <>
                        {editingOrder.status === 'aberta' && (
                          <button
                            onClick={handleAssignWait}
                            className="btn-secondary"
                            disabled={updating}
                          >
                            Aguardar
                          </button>
                        )}
                        <button
                          onClick={handleStartOrder}
                          className="btn-primary"
                          disabled={updating}
                        >
                          Iniciar
                        </button>
                      </>
                    )}
                  {editingOrder.status === 'em_curso' &&
                    editingPermissions?.canOperateOrder && (
                      <>
                        <button
                          onClick={handlePauseOrder}
                          className="btn-secondary"
                          disabled={updating}
                        >
                          Pausar
                        </button>
                        <button
                          onClick={handleFinishOrder}
                          className="btn-primary"
                          disabled={updating}
                        >
                          Terminar
                        </button>
                      </>
                    )}
                  {!editingPermissions?.canAssumeOrder && (
                    <span className="text-xs text-slate-500">
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
                      placeholder="Pesquisar por titulo, ativo ou descricao"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
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
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border theme-border theme-card shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex flex-col gap-2 border-b border-[color:var(--dash-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold theme-text">Ordens</h2>
                    <p className="text-sm theme-text-muted">{workOrders.length} registros</p>
                  </div>
                  {(alertSummary.overdue > 0 || alertSummary.dueSoon > 0) && (
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

                {loading && (
                  <div className="p-12 text-center">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin theme-text-muted" />
                    <p className="text-sm theme-text-muted">Carregando ordens...</p>
                  </div>
                )}

                {!loading && error && (
                  <div className="p-12 text-center">
                    <AlertCircle className="mx-auto mb-4 h-8 w-8 text-rose-400" />
                    <p className="text-sm theme-text-muted">{error}</p>
                  </div>
                )}

                {!loading && !error && viewMode === 'table' && (
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
                                        ? 'bg-rose-100 text-rose-700'
                                        : dueSoon
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-emerald-100 text-emerald-700'
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
                                    statusBadgeClass[order.status] || 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {statusLabels[order.status] || order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold text-emerald-700">
                                {isReadOnly ? 'Ver' : 'Clique para abrir'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                                          ? 'bg-rose-100 text-rose-700'
                                          : dueSoon
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      SLA {slaDate.toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-4 text-xs font-semibold text-emerald-700">
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

              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-slate-800 shadow-[0_18px_40px_-30px_rgba(120,53,15,0.35)]">
                <h3 className="text-sm font-semibold">Radar de SLA</h3>
                <p className="mt-2 text-xs theme-text-muted">
                  Controle rapido das ordens que podem comprometer disponibilidade.
                </p>
                <div className="mt-4 grid gap-3 text-xs">
                  <div className="flex items-center justify-between rounded-2xl bg-[color:var(--dash-panel)] px-3 py-2">
                    <span className="font-semibold text-rose-700">Em atraso</span>
                    <span className="text-rose-700">{alertSummary.overdue}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-[color:var(--dash-panel)] px-3 py-2">
                    <span className="font-semibold text-amber-700">A vencer</span>
                    <span className="text-amber-700">{alertSummary.dueSoon}</span>
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
