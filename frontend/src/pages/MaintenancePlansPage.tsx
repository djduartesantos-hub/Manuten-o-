import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import {
  getAssets,
  getApiHealth,
  getMaintenancePlans,
  createMaintenancePlan,
  updateMaintenancePlan,
  deleteMaintenancePlan,
} from '../services/api';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';

interface AssetOption {
  id: string;
  code: string;
  name: string;
}

interface MaintenancePlan {
  id: string;
  asset_id: string;
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
  const diagnosticsEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('diag') === '1' || localStorage.getItem('diagnostics') === '1';
  }, []);
  const diagnosticsTimerRef = useRef<number | null>(null);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [plansDiagnostics, setPlansDiagnostics] = useState({
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
  const [lastCreatedPlan, setLastCreatedPlan] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [apiDiagnostics, setApiDiagnostics] = useState({
    status: 'idle',
    lastUpdatedAt: '',
    lastMessage: '',
  });

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
  const showForm = showCreate || Boolean(editingPlan);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    if (!selectedPlant || !selectedPlant.trim()) {
      setPlans([]);
      setAssets([]);
      setPlansDiagnostics({
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
      setLoading(false);
      return;
    }

    try {
      setPlansDiagnostics((prev) => ({
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

      const [plansResult, assetsResult] = await Promise.all([
        measure(() => getMaintenancePlans(selectedPlant)),
        measure(() => getAssets(selectedPlant)),
      ]);

      if (plansResult.status === 'ok') {
        setPlans(plansResult.value || []);
        setPlansDiagnostics({
          status: 'ok',
          durationMs: plansResult.durationMs,
          lastUpdatedAt: new Date().toLocaleTimeString(),
          lastError: '',
        });
      } else {
        const message = plansResult.error?.message || 'Erro ao carregar planos';
        setPlans([]);
        setPlansDiagnostics({
          status: 'error',
          durationMs: plansResult.durationMs,
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

      if (plansResult.status === 'error' || assetsResult.status === 'error') {
        const planMessage =
          plansResult.status === 'error'
            ? plansResult.error?.message || 'Erro ao carregar planos'
            : null;
        const assetMessage =
          assetsResult.status === 'error'
            ? assetsResult.error?.message || 'Erro ao carregar equipamentos'
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
      const createdPlan = await createMaintenancePlan(selectedPlant, {
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
      if (createdPlan) {
        setLastCreatedPlan({
          id: createdPlan.id,
          name: createdPlan.name,
        });
        setPlans((prev) => {
          const exists = prev.some((plan) => plan.id === createdPlan.id);
          return exists ? prev : [createdPlan, ...prev];
        });
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar plano');
    } finally {
      setCreating(false);
    }
  };

  const handleEditStart = (plan: MaintenancePlan) => {
    setEditingPlan(plan);
    setShowCreate(false);
    setForm({
      asset_id: plan.asset_id,
      name: plan.name,
      description: plan.description || '',
      type: plan.type,
      frequency_type: plan.frequency_type,
      frequency_value: plan.frequency_value,
      meter_threshold: plan.meter_threshold || '',
      is_active: plan.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editingPlan || !selectedPlant) return;
    if (!form.asset_id || !form.name) {
      setError('Selecione o ativo e preencha o nome');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const updatedPlan = await updateMaintenancePlan(selectedPlant, editingPlan.id, {
        ...form,
        frequency_value: Number(form.frequency_value),
        meter_threshold: form.meter_threshold || undefined,
      });

      if (updatedPlan) {
        setPlans((prev) =>
          prev.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)),
        );
      }
      setEditingPlan(null);
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
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar plano');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (plan: MaintenancePlan) => {
    if (!selectedPlant) return;
    if (!window.confirm('Eliminar este plano de manutencao?')) return;

    setDeletingPlanId(plan.id);
    setError(null);

    try {
      await deleteMaintenancePlan(selectedPlant, plan.id);
      setPlans((prev) => prev.filter((item) => item.id !== plan.id));
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao eliminar plano');
    } finally {
      setDeletingPlanId(null);
    }
  };

  return (
    <MainLayout>
      <div
        className="relative space-y-10 font-display bg-[color:var(--dash-bg)] text-foreground"
      >
        <section className="relative overflow-hidden rounded-[32px] theme-border theme-card p-8 shadow-[0_28px_80px_-60px_rgba(15,118,110,0.55)]">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-emerald-200/60 blur-3xl plans-float" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-amber-200/50 blur-3xl plans-float" />
          <div className="absolute right-12 top-10 h-2 w-20 rounded-full bg-[color:var(--plans-accent)] opacity-50" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] theme-text">
                Rotinas programadas
              </p>
              <h1
                className="mt-3 text-3xl font-semibold theme-text sm:text-4xl lg:text-5xl"
                onPointerDown={handleDiagnosticsPressStart}
                onPointerUp={handleDiagnosticsPressEnd}
                onPointerLeave={handleDiagnosticsPressEnd}
              >
                Planos de manutencao em destaque
              </h1>
              <p className="mt-2 max-w-2xl text-sm theme-text-muted">
                Estruture frequencias, ativos e tipos de intervencao para garantir
                previsibilidade.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setShowCreate((value) => !value);
                  setEditingPlan(null);
                }}
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
            <div className="plans-reveal rounded-3xl theme-border theme-card p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] theme-text-muted">
                  total
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold theme-text">
                {planSummary.total}
              </p>
              <p className="mt-1 text-xs theme-text-muted">Visao geral</p>
            </div>
            <div className="plans-reveal plans-reveal-delay-1 rounded-3xl theme-border theme-card p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] theme-text-muted">
                  ativos
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold theme-text">
                {planSummary.active}
              </p>
              <p className="mt-1 text-xs theme-text-muted">Em execucao</p>
            </div>
            <div className="plans-reveal plans-reveal-delay-2 rounded-3xl theme-border theme-card p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] theme-text-muted">
                  preventivos
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold theme-text">
                {planSummary.preventive}
              </p>
              <p className="mt-1 text-xs theme-text-muted">Rotinas recorrentes</p>
            </div>
            <div className="plans-reveal plans-reveal-delay-3 rounded-3xl theme-border theme-card p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-[color:var(--plans-card-icon-bg-corrective)] p-2 text-[color:var(--plans-card-icon-corrective)]">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--plans-card-label)]">
                  corretivos
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold theme-text">
                {planSummary.corrective}
              </p>
              <p className="mt-1 text-xs theme-text-muted">Sob demanda</p>
            </div>
          </div>
        </section>

        {!selectedPlant && (
          <div className="relative overflow-hidden rounded-[28px] border border-dashed theme-border theme-surface p-10 text-center shadow-sm">
            <div className="absolute left-1/2 top-0 h-1 w-32 -translate-x-1/2 rounded-full bg-[color:var(--plans-accent)]/50" />
            <AlertCircle className="mx-auto mb-4 h-10 w-10 theme-text-muted" />
            <h2 className="mb-2 text-xl font-semibold theme-text">
              Selecione uma fabrica
            </h2>
            <p className="text-sm theme-text-muted">
              Escolha uma fabrica no topo para visualizar os planos.
            </p>
          </div>
        )}

        {showForm && (
          <div className="relative overflow-hidden rounded-[28px] theme-border theme-card p-6 shadow-[0_20px_60px_-45px_rgba(15,118,110,0.5)]">
            <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--plans-accent),var(--plans-accent-2))]" />
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
                Detalhes do plano
              </p>
              <h2 className="mt-2 text-lg font-semibold theme-text">
                {editingPlan ? 'Editar plano' : 'Novo plano'}
              </h2>
            </div>
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
              {editingPlan ? (
                <button
                  onClick={handleUpdate}
                  className="btn-primary"
                  disabled={updating}
                >
                  {updating ? 'A atualizar...' : 'Guardar alteracoes'}
                </button>
              ) : (
                <button onClick={handleCreate} className="btn-primary" disabled={creating}>
                  {creating ? 'A criar...' : 'Criar plano'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingPlan(null);
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
                }}
                className="btn-secondary"
                disabled={creating || updating}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

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

        {selectedPlant && diagnosticsEnabled && (
          <DiagnosticsPanel
            title="Planos e ativos"
            rows={[
              { label: 'Planta', value: selectedPlant || '-' },
              { label: 'Qtd planos', value: String(plans.length) },
              { label: 'Qtd ativos', value: String(assets.length) },
              {
                label: 'Ultimo criado',
                value: lastCreatedPlan
                  ? `${lastCreatedPlan.name} (${lastCreatedPlan.id})`
                  : '-',
              },
              { label: 'Planos', value: plansDiagnostics.status },
              { label: 'Tempo planos', value: `${plansDiagnostics.durationMs}ms` },
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
                value: plansDiagnostics.lastError || assetsDiagnostics.lastError || '-',
              },
            ]}
          />
        )}

        {loading && (
          <div className="rounded-[28px] border theme-border theme-card p-12 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin theme-text-muted" />
            <p className="text-sm theme-text-muted">Carregando planos...</p>
          </div>
        )}

        {!loading && selectedPlant && (
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-center gap-3 rounded-full border theme-border bg-[color:var(--dash-panel)] px-4 py-3">
                    <Search className="h-4 w-4 theme-text-muted" />
                    <input
                      className="w-full bg-transparent text-sm text-[color:var(--dash-text)] placeholder:text-[color:var(--dash-muted)] focus:outline-none"
                      placeholder="Buscar por nome, ativo ou descricao"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-panel)] px-4 py-2 text-xs font-semibold theme-text-muted">
                      <SlidersHorizontal className="h-4 w-4" />
                      <select
                        className="bg-transparent text-xs font-semibold text-[color:var(--dash-text)] focus:outline-none"
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                      >
                        <option value="all">Todos os tipos</option>
                        <option value="preventiva">Preventiva</option>
                        <option value="corretiva">Corretiva</option>
                      </select>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-panel)] px-4 py-2 text-xs font-semibold theme-text-muted">
                      <Clock3 className="h-4 w-4" />
                      <select
                        className="bg-transparent text-xs font-semibold text-[color:var(--dash-text)] focus:outline-none"
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
                  <div className="col-span-full rounded-[28px] border border-dashed theme-border bg-[linear-gradient(135deg,var(--dash-panel),var(--dash-panel-2))] p-10 text-center shadow-sm">
                    <p className="text-sm font-semibold theme-text">
                      Nenhum plano encontrado
                    </p>
                    <p className="mt-2 text-xs theme-text-muted">
                      Ajuste filtros ou termos para localizar planos.
                    </p>
                  </div>
                )}
                {filteredPlans.map((plan) => (
                  <article
                    key={plan.id}
                    className="group relative overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_18px_40px_-30px_rgba(15,118,110,0.35)] transition hover:-translate-y-1 hover:shadow-[0_25px_55px_-35px_rgba(15,118,110,0.55)]"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-[linear-gradient(180deg,var(--plans-accent),#34d399)]" />
                    <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-100/60 opacity-0 blur-2xl transition group-hover:opacity-100" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--plans-accent)]">
                          {plan.type}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold theme-text">
                          {plan.name}
                        </h3>
                        <p className="mt-2 text-sm theme-text-muted">
                          {plan.description || 'Sem descricao'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            plan.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-[color:var(--dash-surface)] text-[color:var(--dash-text)]'
                          }`}
                        >
                          {plan.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-secondary inline-flex items-center gap-2"
                            onClick={() => handleEditStart(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            className="btn-secondary inline-flex items-center gap-2 text-rose-600"
                            onClick={() => handleDelete(plan)}
                            disabled={deletingPlanId === plan.id}
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingPlanId === plan.id ? 'A eliminar...' : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3 text-xs theme-text-muted">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--dash-surface)] px-3 py-1 theme-text">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {frequencyLabel(plan)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border theme-border px-3 py-1 theme-text">
                        <Layers className="h-3.5 w-3.5" />
                        {plan.asset_name || 'Sem ativo'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="relative overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--plans-accent),#34d399)]" />
                <h3 className="text-sm font-semibold theme-text">Ativos com mais planos</h3>
                <div className="mt-4 space-y-3">
                  {assetHighlights.length === 0 && (
                    <p className="text-xs theme-text-muted">Sem dados suficientes.</p>
                  )}
                  {assetHighlights.map((asset) => (
                    <div
                      key={asset.name}
                      className="flex items-center justify-between rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] px-3 py-2"
                    >
                      <span className="text-xs font-semibold theme-text">
                        {asset.name}
                      </span>
                      <span className="rounded-full bg-[color:var(--dash-panel)] px-2 py-1 text-xs font-semibold theme-text-muted">
                        {asset.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border theme-border bg-[linear-gradient(135deg,var(--dash-panel),var(--dash-panel-2))] p-6 theme-text shadow-[0_20px_60px_-45px_rgba(16,185,129,0.6)]">
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-200/50 blur-2xl" />
                <h3 className="text-sm font-semibold">Dica de controle</h3>
                <p className="mt-2 text-xs theme-text-muted">
                  Garanta que planos preventivos estejam ativos para reduzir paragens
                  nao planejadas.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[color:var(--dash-panel)] px-3 py-1 font-semibold text-emerald-700">
                    {planSummary.preventive} preventivos
                  </span>
                  <span className="rounded-full bg-[color:var(--dash-panel)] px-3 py-1 font-semibold text-rose-700">
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
