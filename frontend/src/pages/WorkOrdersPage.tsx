import { useEffect, useMemo, useRef, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import {
  createWorkOrder,
  getAssets,
  getApiHealth,
  getWorkOrders,
  updateWorkOrder,
} from '../services/api';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';

interface AssetOption {
  id: string;
  code: string;
  name: string;
}

interface WorkOrder {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  estimated_hours?: string | null;
  actual_hours?: string | null;
  created_at?: string;
  sla_deadline?: string | null;
  scheduled_date?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  asset?: {
    code: string;
    name: string;
  } | null;
  assignedUser?: {
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
  notes: string;
  completed_at: string;
}

export function WorkOrdersPage() {
  const { selectedPlant } = useAppStore();
  const diagnosticsEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('diag') === '1' || localStorage.getItem('diagnostics') === '1';
  }, []);
  const diagnosticsTimerRef = useRef<number | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
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
    notes: '',
    completed_at: '',
  });
  const [templates, setTemplates] = useState<
    Array<{ name: string; data: WorkOrderFormState }>
  >([]);

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
    const handleRealtimeUpdate = () => {
      loadData();
    };

    window.addEventListener('realtime:work-orders', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('realtime:work-orders', handleRealtimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, statusFilter, searchTerm]);

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

  const handleStartEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setUpdateForm({
      status: order.status || 'aberta',
      priority: order.priority || 'media',
      scheduled_date: toDateTimeLocal(order.scheduled_date),
      actual_hours: order.actual_hours || '',
      notes: order.notes || '',
      completed_at: toDateTimeLocal(order.completed_at),
    });
  };

  const handleUpdate = async () => {
    if (!selectedPlant || !editingOrder) return;
    setUpdating(true);
    setError(null);

    try {
      await updateWorkOrder(selectedPlant, editingOrder.id, {
        status: updateForm.status,
        priority: updateForm.priority,
        scheduled_date: updateForm.scheduled_date || undefined,
        actual_hours: updateForm.actual_hours || undefined,
        notes: updateForm.notes || undefined,
        completed_at: updateForm.completed_at || undefined,
      });

      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar ordem');
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

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50 p-8 shadow-sm">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Fluxo de manutencao
              </p>
              <h1
                className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl"
                onPointerDown={handleDiagnosticsPressStart}
                onPointerUp={handleDiagnosticsPressEnd}
                onPointerLeave={handleDiagnosticsPressEnd}
              >
                Ordens de trabalho em tempo real
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Centralize solicitacoes, prioridades e SLAs com uma visao completa do
                andamento da equipe.
              </p>
            </div>

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

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <List className="h-4 w-4 text-sky-600" />
                Total de ordens
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {statusSummary.total}
              </p>
              <p className="mt-1 text-xs text-slate-500">Fila completa</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Abertas
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {statusSummary.aberta}
              </p>
              <p className="mt-1 text-xs text-slate-500">Aguardando inicio</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <RefreshCcw className="h-4 w-4 text-sky-600" />
                Em curso
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {statusSummary.em_curso}
              </p>
              <p className="mt-1 text-xs text-slate-500">Execucao ativa</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Concluidas
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {statusSummary.concluida}
              </p>
              <p className="mt-1 text-xs text-slate-500">Finalizadas</p>
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
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Selecione uma fabrica
            </h2>
            <p className="text-sm text-slate-600">
              Escolha uma fabrica no topo para visualizar as ordens.
            </p>
          </div>
        )}

        {selectedPlant && showCreate && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nova ordem</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ativo</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Titulo</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Horas estimadas
                </label>
                <input
                  className="input"
                  value={form.estimated_hours}
                  onChange={(event) => setForm({ ...form, estimated_hours: event.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Descricao</label>
                <textarea
                  className="input min-h-[96px]"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Atualizar ordem: {editingOrder.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  className="input"
                  value={updateForm.status}
                  onChange={(event) =>
                    setUpdateForm({ ...updateForm, status: event.target.value })
                  }
                >
                  <option value="aberta">Aberta</option>
                  <option value="atribuida">Atribuida</option>
                  <option value="em_curso">Em curso</option>
                  <option value="concluida">Concluida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                <select
                  className="input"
                  value={updateForm.priority}
                  onChange={(event) =>
                    setUpdateForm({ ...updateForm, priority: event.target.value })
                  }
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data e hora de conclusao
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={updateForm.completed_at}
                  onChange={(event) =>
                    setUpdateForm({ ...updateForm, completed_at: event.target.value })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea
                  className="input min-h-[96px]"
                  value={updateForm.notes}
                  onChange={(event) => setUpdateForm({ ...updateForm, notes: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={handleUpdate} className="btn-primary" disabled={updating}>
                {updating ? 'A atualizar...' : 'Guardar alteracoes'}
              </button>
              <button
                onClick={() => setEditingOrder(null)}
                className="btn-secondary"
                disabled={updating}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {selectedPlant && (
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                      placeholder="Pesquisar por titulo, ativo ou descricao"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="input text-xs font-semibold"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <button
                        className={`btn-secondary ${viewMode === 'table' ? 'bg-gray-200' : ''}`}
                        onClick={() => setViewMode('table')}
                      >
                        <List className="h-4 w-4" />
                      </button>
                      <button
                        className={`btn-secondary ${viewMode === 'kanban' ? 'bg-gray-200' : ''}`}
                        onClick={() => setViewMode('kanban')}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Ordens</h2>
                    <p className="text-sm text-slate-500">{workOrders.length} registros</p>
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
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-slate-400" />
                    <p className="text-sm text-slate-600">Carregando ordens...</p>
                  </div>
                )}

                {!loading && error && (
                  <div className="p-12 text-center">
                    <AlertCircle className="mx-auto mb-4 h-8 w-8 text-rose-400" />
                    <p className="text-sm text-slate-600">{error}</p>
                  </div>
                )}

                {!loading && !error && viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            Ordem
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            Ativo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            Responsavel
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            Registo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            SLA
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            Prioridade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                            Acoes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {workOrders.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
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

                          return (
                            <tr key={order.id}>
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-slate-900">
                                  {order.title}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {order.description || 'Sem descricao'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {order.asset ? `${order.asset.code} - ${order.asset.name}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {order.assignedUser
                                  ? `${order.assignedUser.first_name} ${order.assignedUser.last_name}`
                                  : 'Nao atribuido'}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {createdDate ? createdDate.toLocaleString() : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
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
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {order.priority || 'n/a'}
                              </td>
                              <td className="px-6 py-4">
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                  {statusLabels[order.status] || order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  className="btn-secondary inline-flex items-center gap-2"
                                  onClick={() => handleStartEdit(order)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Atualizar
                                </button>
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
                      <div key={statusKey} className="rounded-2xl bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-700">
                            {statusLabels[statusKey]}
                          </h3>
                          <span className="text-xs text-slate-500">
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

                            return (
                              <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                                <p className="text-sm font-semibold text-slate-900">
                                  {order.title}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {order.asset
                                    ? `${order.asset.code} - ${order.asset.name}`
                                    : 'Sem ativo'}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {createdDate ? createdDate.toLocaleString() : '-'}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
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
                                <button
                                  className="btn-secondary mt-4 inline-flex items-center gap-2"
                                  onClick={() => handleStartEdit(order)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Atualizar
                                </button>
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
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Prioridades</h3>
                <div className="mt-4 space-y-3">
                  {Object.keys(prioritySummary).length === 0 && (
                    <p className="text-xs text-slate-500">Sem dados suficientes.</p>
                  )}
                  {Object.entries(prioritySummary).map(([priority, count]) => (
                    <div
                      key={priority}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <span className="text-xs font-semibold text-slate-700">{priority}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-slate-800 shadow-sm">
                <h3 className="text-sm font-semibold">SLA em risco</h3>
                <p className="mt-2 text-xs text-slate-600">
                  Monitore ordens em atraso ou prestes a vencer para evitar impactos
                  na disponibilidade.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-rose-700">
                    {alertSummary.overdue} em atraso
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-amber-700">
                    {alertSummary.dueSoon} a vencer
                  </span>
                </div>
              </div>

              {templates.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Templates guardados</h3>
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
