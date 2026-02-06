import { MainLayout } from '../layouts/MainLayout';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Tag,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import { getAssets } from '../services/api';

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  location?: string | null;
  category?: {
    name: string;
  } | null;
}

export function AssetsPage() {
  const { selectedPlant } = useAppStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadAssets = async (query: string) => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setAssets([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAssets(selectedPlant, query || undefined);
      setAssets(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar equipamentos');
    } finally {
      setLoading(false);
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
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Equipamentos com visao operacional
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Acompanhe localizacao, categoria e status em tempo real para decidir
                o que precisa de atencao primeiro.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
                <Boxes className="h-4 w-4 text-amber-600" />
                Total de equipamentos
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{assets.length}</p>
              <p className="mt-1 text-xs text-slate-500">Atualizado agora</p>
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
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Erro ao carregar</h2>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      )}

        {selectedPlant && !loading && !error && (
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
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <span>Ultima atualizacao</span>
                        <span className="font-semibold text-slate-700">Agora</span>
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
