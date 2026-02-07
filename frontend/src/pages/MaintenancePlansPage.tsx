import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

    if (!selectedPlant || !selectedPlant.trim()) {
      setPlans([]);
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      const [plansResult, assetsResult] = await Promise.allSettled([
        getMaintenancePlans(selectedPlant),
        getAssets(selectedPlant),
      ]);

      if (plansResult.status === 'fulfilled') {
        setPlans(plansResult.value || []);
      } else {
        setPlans([]);
      }

      if (assetsResult.status === 'fulfilled') {
        setAssets(assetsResult.value || []);
      } else {
        setAssets([]);
      }

      if (plansResult.status === 'rejected' || assetsResult.status === 'rejected') {
        const planMessage =
          plansResult.status === 'rejected'
            ? plansResult.reason?.message || 'Erro ao carregar planos'
            : null;
        const assetMessage =
          assetsResult.status === 'rejected'
            ? assetsResult.reason?.message || 'Erro ao carregar equipamentos'
            : null;

        setError(planMessage || assetMessage);
      }
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

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (typeFilter !== 'all' && plan.type !== typeFilter) return false;
      if (statusFilter === 'active' && !plan.is_active) return false;
      if (statusFilter === 'inactive' && plan.is_active) return false;

      if (searchTerm) {
        const haystack = `${plan.name} ${plan.description || ''} ${plan.asset_name || ''}`
          .toLowerCase()
          .trim();
        if (!haystack.includes(searchTerm.toLowerCase())) return false;
      }

      return true;
    });
  }, [plans, searchTerm, typeFilter, statusFilter]);

  const planSummary = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((plan) => plan.is_active).length;
    const preventive = plans.filter((plan) => plan.type === 'preventiva').length;
    const corrective = plans.filter((plan) => plan.type === 'corretiva').length;
    return { total, active, preventive, corrective };
  }, [plans]);

  const assetHighlights = useMemo(() => {
    const counts = plans.reduce<Record<string, number>>((acc, plan) => {
      const key = plan.asset_name || 'Sem ativo';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [plans]);

  const frequencyLabel = (plan: MaintenancePlan) => {
    if (plan.frequency_type === 'days') return `${plan.frequency_value} dias`;
    if (plan.frequency_type === 'months') return `${plan.frequency_value} meses`;
    return `${plan.frequency_value} contagens`;
  };

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

    if (!selectedPlant) {
      setError('Selecione uma fábrica primeiro');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createMaintenancePlan(selectedPlant, {
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
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50 p-8 shadow-sm">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-lime-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Rotinas programadas
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Planos de manutencao em destaque
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Estruture frequencias, ativos e tipos de intervencao para garantir
                previsibilidade.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowCreate((value) => !value)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo plano
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
                <Layers className="h-4 w-4 text-emerald-600" />
                Total de planos
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {planSummary.total}
              </p>
              <p className="mt-1 text-xs text-slate-500">Visao geral</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Ativos
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {planSummary.active}
              </p>
              <p className="mt-1 text-xs text-slate-500">Em execucao</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CalendarClock className="h-4 w-4 text-amber-600" />
                Preventivos
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {planSummary.preventive}
              </p>
              <p className="mt-1 text-xs text-slate-500">Rotinas recorrentes</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Activity className="h-4 w-4 text-rose-600" />
                Corretivos
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {planSummary.corrective}
              </p>
              <p className="mt-1 text-xs text-slate-500">Sob demanda</p>
            </div>
          </div>
        </section>

        {!selectedPlant && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Selecione uma fabrica
            </h2>
            <p className="text-sm text-slate-600">
              Escolha uma fabrica no topo para visualizar os planos.
            </p>
          </div>
        )}

        {showCreate && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Novo plano</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequencia</label>
                <div className="flex gap-2">
                  <select
                    className="input"
                    value={form.frequency_type}
                    onChange={(event) =>
                      setForm({ ...form, frequency_type: event.target.value })
                    }
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descricao
                </label>
                <textarea
                  className="input min-h-[96px]"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
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
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-slate-400" />
            <p className="text-sm text-slate-600">Carregando planos...</p>
          </div>
        )}

        {!loading && selectedPlant && (
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                      placeholder="Buscar por nome, ativo ou descricao"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      <SlidersHorizontal className="h-4 w-4" />
                      <select
                        className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                      >
                        <option value="all">Todos os tipos</option>
                        <option value="preventiva">Preventiva</option>
                        <option value="corretiva">Corretiva</option>
                      </select>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      <Clock3 className="h-4 w-4" />
                      <select
                        className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                      >
                        <option value="all">Todos os status</option>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {filteredPlans.length === 0 && (
                  <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Nenhum plano encontrado
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Ajuste filtros ou termos para localizar planos.
                    </p>
                  </div>
                )}
                {filteredPlans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {plan.type}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">
                          {plan.name}
                        </h3>
                        <p className="mt-2 text-xs text-slate-500">
                          {plan.description || 'Sem descricao'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {plan.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {frequencyLabel(plan)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {plan.asset_name || 'Sem ativo'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Ativos com mais planos</h3>
                <div className="mt-4 space-y-3">
                  {assetHighlights.length === 0 && (
                    <p className="text-xs text-slate-500">Sem dados suficientes.</p>
                  )}
                  {assetHighlights.map((asset) => (
                    <div
                      key={asset.name}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        {asset.name}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                        {asset.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-800 shadow-sm">
                <h3 className="text-sm font-semibold">Dica de controle</h3>
                <p className="mt-2 text-xs text-slate-600">
                  Garanta que planos preventivos estejam ativos para reduzir paragens
                  nao planejadas.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-emerald-700">
                    {planSummary.preventive} preventivos
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-rose-700">
                    {planSummary.corrective} corretivos
                  </span>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
