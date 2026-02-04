import { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { useAppStore } from '../context/store';
import { getAssets, getMaintenancePlans, createMaintenancePlan } from '../services/api';

interface AssetOption {
  id: string;
  code: string;
  name: string;
}

interface MaintenancePlan {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  frequency_type: string;
  frequency_value: number;
  meter_threshold?: string | null;
  is_active: boolean;
  asset_name?: string | null;
  created_at?: string;
}

export function MaintenancePlansPage() {
  const { selectedPlant } = useAppStore();
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    asset_id: '',
    name: '',
    description: '',
    type: 'preventiva',
    frequency_type: 'days',
    frequency_value: 30,
    meter_threshold: '',
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, assetsData] = await Promise.all([
        getMaintenancePlans(),
        selectedPlant ? getAssets(selectedPlant) : Promise.resolve([]),
      ]);
      setPlans(plansData || []);
      setAssets(assetsData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant]);

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      loadData();
    };

    window.addEventListener('realtime:maintenance-plans', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('realtime:maintenance-plans', handleRealtimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant]);

  const handleCreate = async () => {
    if (!form.asset_id || !form.name) {
      setError('Selecione o ativo e preencha o nome');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createMaintenancePlan({
        ...form,
        frequency_value: Number(form.frequency_value),
        meter_threshold: form.meter_threshold || undefined,
      });

      setForm({
        asset_id: '',
        name: '',
        description: '',
        type: 'preventiva',
        frequency_type: 'days',
        frequency_value: 30,
        meter_threshold: '',
        is_active: true,
      });
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar plano');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planos de Manutenção</h1>
          <p className="text-gray-600 mt-2">Configure rotinas preventivas e corretivas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo plano
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

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo plano</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="input"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
              <div className="flex gap-2">
                <select
                  className="input"
                  value={form.frequency_type}
                  onChange={(event) => setForm({ ...form, frequency_type: event.target.value })}
                >
                  <option value="days">Dias</option>
                  <option value="months">Meses</option>
                  <option value="meter">Contador</option>
                </select>
                <input
                  type="number"
                  className="input"
                  value={form.frequency_value}
                  onChange={(event) =>
                    setForm({ ...form, frequency_value: Number(event.target.value) })
                  }
                />
              </div>
            </div>

            {form.frequency_type === 'meter' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite do contador
                </label>
                <input
                  className="input"
                  value={form.meter_threshold}
                  onChange={(event) =>
                    setForm({ ...form, meter_threshold: event.target.value })
                  }
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                className="input min-h-[96px]"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleCreate} className="btn-primary" disabled={creating}>
              {creating ? 'A criar...' : 'Criar plano'}
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && (
        <div className="card p-12 text-center">
          <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      )}

      {!loading && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ativo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Frequência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      Nenhum plano encontrado
                    </td>
                  </tr>
                )}
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-500">
                        {plan.description || 'Sem descrição'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {plan.asset_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                      {plan.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {plan.frequency_value} {plan.frequency_type}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          plan.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {plan.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
