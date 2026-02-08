import { MainLayout } from '../layouts/MainLayout';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import {
  createAsset,
  createAssetCategory,
  deleteAsset,
  getAssetCategories,
  getAssets,
  getApiHealth,
  updateAsset,
} from '../services/api';

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  location?: string | null;
  description?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  is_critical?: boolean | null;
  category_id?: string | null;
  category?: {
    id?: string;
    name: string;
  } | null;
}

interface AssetCategory {
  id: string;
  name: string;
  description?: string | null;
}

export function AssetsPage() {
  const { selectedPlant } = useAppStore();
  const diagnosticsEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('diag') === '1' || localStorage.getItem('diagnostics') === '1';
  }, []);
  const diagnosticsTimerRef = useRef<number | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
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
  const [form, setForm] = useState({
    code: '',
    name: '',
    category_id: '',
    status: 'operacional',
    location: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    is_critical: false,
  });

  const loadAssets = async (query: string) => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setAssets([]);
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
    setAssetsDiagnostics((prev) => ({
      ...prev,
      status: 'loading',
      lastError: '',
    }));
    const startedAt = performance.now();
    try {
      const data = await getAssets(selectedPlant, query || undefined);
      setAssets(data || []);
      setAssetsDiagnostics({
        status: 'ok',
        durationMs: Math.round(performance.now() - startedAt),
        lastUpdatedAt: new Date().toLocaleTimeString(),
        lastError: '',
      });
    } catch (err: any) {
      const message = err.message || 'Erro ao carregar equipamentos';
      setError(message);
      setAssetsDiagnostics({
        status: 'error',
        durationMs: Math.round(performance.now() - startedAt),
        lastUpdatedAt: new Date().toLocaleTimeString(),
        lastError: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setCategoryLoading(true);
    try {
      const data = await getAssetCategories();
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar categorias');
    } finally {
      setCategoryLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      category_id: '',
      status: 'operacional',
      location: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      is_critical: false,
    });
    setEditingAsset(null);
    setShowCategoryForm(false);
    setCategoryForm({ name: '', description: '' });
  };

  const handleSubmit = async () => {
    if (!selectedPlant) {
      setError('Selecione uma fabrica');
      return;
    }

    if (!form.code.trim() || !form.name.trim()) {
      setError('Preencha o codigo e o nome');
      return;
    }

    if (!form.category_id) {
      setError('Selecione uma categoria');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        category_id: form.category_id,
        status: form.status || undefined,
        location: form.location.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        model: form.model.trim() || undefined,
        serial_number: form.serial_number.trim() || undefined,
        is_critical: form.is_critical,
      };

      if (editingAsset) {
        await updateAsset(selectedPlant, editingAsset.id, payload);
      } else {
        await createAsset(selectedPlant, payload);
      }

      resetForm();
      setShowForm(false);
      await loadAssets(searchQuery);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar equipamento');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      code: asset.code || '',
      name: asset.name || '',
      category_id: asset.category?.id || asset.category_id || '',
      status: asset.status || 'operacional',
      location: asset.location || '',
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      is_critical: Boolean(asset.is_critical),
    });
    setShowForm(true);
  };

  const handleDelete = async (assetId: string) => {
    if (!selectedPlant) {
      setError('Selecione uma fabrica');
      return;
    }

    if (!window.confirm('Eliminar este equipamento?')) return;

    setSaving(true);
    setError(null);
    try {
      await deleteAsset(selectedPlant, assetId);
      await loadAssets(searchQuery);
    } catch (err: any) {
      setError(err.message || 'Erro ao eliminar equipamento');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError('Informe o nome da categoria');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createAssetCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      });
      setCategoryForm({ name: '', description: '' });
      setShowCategoryForm(false);
      await loadCategories();
      if (created?.id) {
        setForm((prev) => ({ ...prev, category_id: created.id }));
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    loadAssets(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, searchQuery]);

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
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant]);

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      if (!selectedPlant) return;
      loadAssets(searchQuery);
    };

    window.addEventListener('realtime:assets', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('realtime:assets', handleRealtimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, searchQuery]);

  const statusMeta = useMemo(
    () => ({
      operacional: {
        label: 'Operacional',
        badge: 'bg-emerald-100 text-emerald-800',
        icon: CheckCircle2,
      },
      manutencao: {
        label: 'Manutencao',
        badge: 'bg-amber-100 text-amber-800',
        icon: Wrench,
      },
      parado: {
        label: 'Parado',
        badge: 'bg-rose-100 text-rose-800',
        icon: Clock3,
      },
      inativo: {
        label: 'Inativo',
        badge: 'bg-slate-100 text-slate-700',
        icon: Clock3,
      },
    }),
    [],
  );

  const statusCounts = useMemo(() => {
    return assets.reduce<Record<string, number>>((acc, asset) => {
      const key = (asset.status || '').toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [assets]);

  const availableStatuses = useMemo(() => {
    const keys = Object.keys(statusCounts);
    return ['all', ...keys];
  }, [statusCounts]);

  const filteredAssets = useMemo(() => {
    if (statusFilter === 'all') return assets;
    return assets.filter(
      (asset) => (asset.status || '').toLowerCase() === statusFilter,
    );
  }, [assets, statusFilter]);

  const categoryStats = useMemo(() => {
    const counts = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.category?.name || 'Sem categoria';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [assets]);

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-amber-50 p-8 shadow-sm">
          <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-amber-200/50 blur-3xl" />
          <div className="absolute -left-14 bottom-0 h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Inventario de ativos
              </p>
              <h1
                className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl"
                onPointerDown={handleDiagnosticsPressStart}
                onPointerUp={handleDiagnosticsPressEnd}
                onPointerLeave={handleDiagnosticsPressEnd}
              >
                Equipamentos com visao operacional
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Acompanhe localizacao, categoria e status em tempo real para decidir
                o que precisa de atencao primeiro.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (!selectedPlant) {
                    setError('Selecione uma fabrica');
                    return;
                  }
                  if (!showForm) resetForm();
                  setShowForm((value) => !value);
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo equipamento
              </button>
              <button
                onClick={() => loadAssets(searchQuery)}
                className="btn-secondary inline-flex items-center gap-2"
                disabled={loading || !selectedPlant}
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                {assets.length} ativos mapeados
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Boxes className="h-4 w-4 text-[color:var(--assets-card-icon-total)]" />
                Total de equipamentos
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--assets-card-value)]">{assets.length}</p>
              <p className="mt-1 text-xs text-[color:var(--assets-card-updated)]">Atualizado agora</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Operacionais
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {statusCounts.operacional || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Prontos para uso</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Wrench className="h-4 w-4 text-amber-600" />
                Em manutencao
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {statusCounts.manutencao || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Acompanhamento ativo</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Clock3 className="h-4 w-4 text-rose-600" />
                Parados
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {statusCounts.parado || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Criticos para retorno</p>
            </div>
          </div>
        </section>

      {!selectedPlant && (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Selecione uma fabrica
          </h2>
          <p className="text-sm text-slate-600">
            Escolha uma fabrica no topo para visualizar os equipamentos disponiveis.
          </p>
        </div>
      )}

      {selectedPlant && loading && (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-slate-400" />
          <p className="text-sm text-slate-600">Carregando equipamentos...</p>
        </div>
      )}

      {selectedPlant && !loading && error && (
        <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-rose-500" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Erro</h2>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      )}

      {selectedPlant && diagnosticsEnabled && (
        <div className="mt-8">
          <DiagnosticsPanel
            title="Equipamentos"
            rows={[
              { label: 'Planta', value: selectedPlant || '-' },
              { label: 'Estado', value: assetsDiagnostics.status },
              { label: 'Tempo', value: `${assetsDiagnostics.durationMs}ms` },
              { label: 'Atualizado', value: assetsDiagnostics.lastUpdatedAt || '-' },
              {
                label: 'Online',
                value: typeof navigator !== 'undefined' && navigator.onLine ? 'sim' : 'nao',
              },
              { label: 'API', value: apiDiagnostics.status },
              { label: 'API msg', value: apiDiagnostics.lastMessage || '-' },
              { label: 'Erro', value: assetsDiagnostics.lastError || '-' },
            ]}
          />
        </div>
      )}

      {selectedPlant && !loading && (
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                      placeholder="Buscar por nome, codigo ou localizacao"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      <SlidersHorizontal className="h-4 w-4" />
                      <select
                        className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                      >
                        {availableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status === 'all' ? 'Todos os status' : status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => loadAssets(searchQuery)}
                      className="btn-secondary inline-flex items-center gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Sincronizar
                    </button>
                  </div>
                </div>
              </div>

              {showForm && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {editingAsset ? 'Editar equipamento' : 'Novo equipamento'}
                      </h2>
                      <p className="text-sm text-slate-600">
                        Cadastre dados essenciais para manter o inventario atualizado.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="btn-secondary"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Codigo
                      </label>
                      <input
                        className="input"
                        value={form.code}
                        onChange={(event) =>
                          setForm({ ...form, code: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nome
                      </label>
                      <input
                        className="input"
                        value={form.name}
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Categoria
                      </label>
                      <div className="flex gap-2">
                        <select
                          className="input"
                          value={form.category_id}
                          onChange={(event) =>
                            setForm({ ...form, category_id: event.target.value })
                          }
                        >
                          <option value="">
                            {categoryLoading
                              ? 'Carregando categorias...'
                              : 'Selecione uma categoria'}
                          </option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCategoryForm((value) => !value)}
                          className="btn-secondary"
                        >
                          Nova
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        className="input"
                        value={form.status}
                        onChange={(event) =>
                          setForm({ ...form, status: event.target.value })
                        }
                      >
                        <option value="operacional">Operacional</option>
                        <option value="manutencao">Manutencao</option>
                        <option value="parado">Parado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Localizacao
                      </label>
                      <input
                        className="input"
                        value={form.location}
                        onChange={(event) =>
                          setForm({ ...form, location: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fabricante
                      </label>
                      <input
                        className="input"
                        value={form.manufacturer}
                        onChange={(event) =>
                          setForm({ ...form, manufacturer: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Modelo
                      </label>
                      <input
                        className="input"
                        value={form.model}
                        onChange={(event) => setForm({ ...form, model: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Numero de serie
                      </label>
                      <input
                        className="input"
                        value={form.serial_number}
                        onChange={(event) =>
                          setForm({ ...form, serial_number: event.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        id="asset-critical"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        checked={form.is_critical}
                        onChange={(event) =>
                          setForm({ ...form, is_critical: event.target.checked })
                        }
                      />
                      <label htmlFor="asset-critical" className="text-sm text-slate-700">
                        Equipamento critico
                      </label>
                    </div>
                  </div>

                  {showCategoryForm && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-800">Nova categoria</h3>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Nome
                          </label>
                          <input
                            className="input"
                            value={categoryForm.name}
                            onChange={(event) =>
                              setCategoryForm({ ...categoryForm, name: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Descricao
                          </label>
                          <input
                            className="input"
                            value={categoryForm.description}
                            onChange={(event) =>
                              setCategoryForm({
                                ...categoryForm,
                                description: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="btn-primary"
                          disabled={saving}
                        >
                          Criar categoria
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCategoryForm(false)}
                          className="btn-secondary"
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSubmit}
                      className="btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? 'A guardar...'
                        : editingAsset
                          ? 'Atualizar equipamento'
                          : 'Criar equipamento'}
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="btn-secondary"
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {filteredAssets.length === 0 && (
                  <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Nenhum equipamento encontrado
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Ajuste os filtros ou tente outro termo de busca.
                    </p>
                  </div>
                )}
                {filteredAssets.map((asset) => {
                  const statusKey = (asset.status || '').toLowerCase();
                  const meta = statusMeta[statusKey as keyof typeof statusMeta];
                  const StatusIcon = meta?.icon || Clock3;
                  return (
                    <article
                      key={asset.id}
                      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {asset.code}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900">
                            {asset.name}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Tag className="h-3.5 w-3.5" />
                              {asset.category?.name || 'Sem categoria'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {asset.location || 'Local nao informado'}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            meta?.badge || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {meta?.label || asset.status || 'n/a'}
                        </span>
                      </div>
                      <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(asset)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Ultima atualizacao</span>
                            <span className="font-semibold text-slate-700">Agora</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Categorias em destaque</h2>
                <div className="mt-4 space-y-3">
                  {categoryStats.length === 0 && (
                    <p className="text-xs text-slate-500">Sem dados suficientes.</p>
                  )}
                  {categoryStats.map((category) => (
                    <div
                      key={category.name}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        {category.name}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                        {category.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-slate-800 shadow-sm">
                <h3 className="text-sm font-semibold">Proxima acao sugerida</h3>
                <p className="mt-2 text-xs text-slate-600">
                  Concentre os recursos nos equipamentos em manutencao e parados para
                  aumentar a disponibilidade.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-amber-700">
                    {statusCounts.manutencao || 0} em manutencao
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-rose-700">
                    {statusCounts.parado || 0} parados
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
