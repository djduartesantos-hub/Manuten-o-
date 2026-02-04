import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  AlertCircle,
  AlertTriangle,
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
import { createWorkOrder, getAssets, getWorkOrders, updateWorkOrder } from '../services/api';

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
    if (!selectedPlant) return;
    setLoading(true);
    setError(null);
    try {
      const [orders, assetsData] = await Promise.all([
        getWorkOrders(selectedPlant, statusFilter || undefined),
        getAssets(selectedPlant),
      ]);

      const normalizedOrders = (orders || []).filter((order: WorkOrder) => {
        if (!searchTerm) return true;
        const haystack = `${order.title} ${order.description || ''} ${order.asset?.code || ''} ${order.asset?.name || ''}`.toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      });

      setWorkOrders(normalizedOrders);
      setAssets(assetsData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar ordens de trabalho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ordens de Trabalho</h1>
          <p className="text-gray-600 mt-2">Pedidos e acompanhamento da manutenção</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova ordem
          </button>
          <button
            onClick={exportCsv}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={loadData}
            className="btn-secondary inline-flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {!selectedPlant && (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Selecione uma fábrica</h2>
          <p className="text-gray-600">Escolha uma fábrica no topo para ver as ordens</p>
        </div>
      )}

      {selectedPlant && showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova ordem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ativo</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                className="input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select
                className="input"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas estimadas
              </label>
              <input
                className="input"
                value={form.estimated_hours}
                onChange={(event) => setForm({ ...form, estimated_hours: event.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                className="input min-h-[96px]"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCreate}
              className="btn-primary"
              disabled={creating}
            >
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
              <Save className="w-4 h-4" />
              Guardar template
            </button>
          </div>

          {templates.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Templates guardados</p>
              <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {selectedPlant && editingOrder && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Atualizar ordem: {editingOrder.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input"
                value={updateForm.status}
                onChange={(event) => setUpdateForm({ ...updateForm, status: event.target.value })}
              >
                <option value="aberta">Aberta</option>
                <option value="atribuida">Atribuída</option>
                <option value="em_curso">Em curso</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select
                className="input"
                value={updateForm.priority}
                onChange={(event) => setUpdateForm({ ...updateForm, priority: event.target.value })}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data e hora de conclusão
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                className="input min-h-[96px]"
                value={updateForm.notes}
                onChange={(event) => setUpdateForm({ ...updateForm, notes: event.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleUpdate} className="btn-primary" disabled={updating}>
              {updating ? 'A atualizar...' : 'Guardar alterações'}
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
        <div className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ordens</h2>
              <p className="text-sm text-gray-500">{workOrders.length} registros</p>
              {(alertSummary.overdue > 0 || alertSummary.dueSoon > 0) && (
                <div className="mt-2 flex items-center gap-3 text-sm">
                  {alertSummary.overdue > 0 && (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      {alertSummary.overdue} em atraso
                    </span>
                  )}
                  {alertSummary.dueSoon > 0 && (
                    <span className="inline-flex items-center gap-1 text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      {alertSummary.dueSoon} a vencer
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                className="input"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <label className="text-sm text-gray-600">Status</label>
              <select
                className="input"
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
                  <List className="w-4 h-4" />
                </button>
                <button
                  className={`btn-secondary ${viewMode === 'kanban' ? 'bg-gray-200' : ''}`}
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Carregando ordens...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
            </div>
          )}

          {!loading && !error && viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ordem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ativo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Registo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SLA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Prioridade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6 text-center text-gray-500">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.title}</div>
                          <div className="text-xs text-gray-500">
                            {order.description || 'Sem descrição'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {order.asset ? `${order.asset.code} - ${order.asset.name}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {order.assignedUser
                            ? `${order.assignedUser.first_name} ${order.assignedUser.last_name}`
                            : 'Não atribuído'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {createdDate ? createdDate.toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {slaDate ? (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                isOverdue
                                  ? 'bg-red-100 text-red-700'
                                  : dueSoon
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {slaDate.toLocaleDateString()}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {order.priority || 'n/a'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            className="btn-secondary inline-flex items-center gap-2"
                            onClick={() => handleStartEdit(order)}
                          >
                            <Pencil className="w-4 h-4" />
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
                <div key={statusKey} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {statusLabels[statusKey]}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {(groupedByStatus[statusKey] || []).length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(groupedByStatus[statusKey] || []).map((order) => {
                      const slaDate = order.sla_deadline ? new Date(order.sla_deadline) : null;
                      const isOverdue = slaDate ? slaDate.getTime() < Date.now() : false;
                      const dueSoon = slaDate
                        ? slaDate.getTime() >= Date.now() &&
                          slaDate.getTime() <= Date.now() + 24 * 60 * 60 * 1000
                        : false;
                      const createdDate = order.created_at ? new Date(order.created_at) : null;

                      return (
                        <div key={order.id} className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-sm font-semibold text-gray-900">{order.title}</p>
                          <p className="text-xs text-gray-500">
                            {order.asset ? `${order.asset.code} - ${order.asset.name}` : 'Sem ativo'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {createdDate ? createdDate.toLocaleString() : '-'}
                          </p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                              {order.priority || 'n/a'}
                            </span>
                            {slaDate && (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  isOverdue
                                    ? 'bg-red-100 text-red-700'
                                    : dueSoon
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                SLA {slaDate.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <button
                            className="btn-secondary mt-3 inline-flex items-center gap-2"
                            onClick={() => handleStartEdit(order)}
                          >
                            <Pencil className="w-4 h-4" />
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
      )}
    </MainLayout>
  );
}
