import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { useAppStore } from '../context/store';
import { createWorkOrder, getAssets, getWorkOrders } from '../services/api';

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
  created_at?: string;
  asset?: {
    code: string;
    name: string;
  } | null;
  assignedUser?: {
    first_name: string;
    last_name: string;
  } | null;
}

export function WorkOrdersPage() {
  const { selectedPlant } = useAppStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    asset_id: '',
    title: '',
    description: '',
    priority: 'media',
    estimated_hours: '',
  });

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

      setWorkOrders(orders || []);
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
  }, [selectedPlant, statusFilter]);

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
      });

      setForm({
        asset_id: '',
        title: '',
        description: '',
        priority: 'media',
        estimated_hours: '',
      });
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar ordem');
    } finally {
      setCreating(false);
    }
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
          </div>
        </div>
      )}

      {selectedPlant && (
        <div className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ordens</h2>
              <p className="text-sm text-gray-500">{workOrders.length} registros</p>
            </div>

            <div className="flex items-center gap-2">
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

          {!loading && !error && (
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
                      Prioridade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                        Nenhuma ordem encontrada
                      </td>
                    </tr>
                  )}
                  {workOrders.map((order) => (
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
                        {order.priority || 'n/a'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
