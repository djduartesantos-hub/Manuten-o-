import { useState, type CSSProperties } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Search, ExternalLink, BadgeCheck, BadgeAlert } from 'lucide-react';
import { useAppStore } from '../context/store';
import { searchAll } from '../services/api';

interface SearchBucket {
  items: Array<any>;
  total: number;
}

interface SearchResult {
  orders: SearchBucket;
  assets: SearchBucket;
  page: number;
  limit: number;
}

export function SearchPage() {
  const { selectedPlant } = useAppStore();
  const basePath = '';
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'orders' | 'assets'>('all');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'score' | 'date_desc' | 'date_asc'>('score');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult>({
    orders: { items: [], total: 0 },
    assets: { items: [], total: 0 },
    page: 1,
    limit: 20,
  });
  const [lastQuery, setLastQuery] = useState('');

  const handleSearch = async (nextPage?: number) => {
    if (!query.trim()) {
      setError('Indique um termo de pesquisa');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const selectedPage = nextPage ?? page;
      const data = await searchAll(query.trim(), {
        type: type === 'all' ? undefined : type,
        plantId: selectedPlant || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        page: selectedPage,
        limit,
        sort,
      });
      setResults({
        orders: data?.orders || { items: [], total: 0 },
        assets: data?.assets || { items: [], total: 0 },
        page: data?.page || selectedPage,
        limit: data?.limit || limit,
      });
      setPage(selectedPage);
      setLastQuery(query.trim());
    } catch (err: any) {
      setError(err.message || 'Falha ao pesquisar');
    } finally {
      setLoading(false);
    }
  };

  const activeFilters = [
    type !== 'all' ? { label: `Tipo: ${type}`, onRemove: () => setType('all') } : null,
    status ? { label: `Status: ${status}`, onRemove: () => setStatus('') } : null,
    priority ? { label: `Prioridade: ${priority}`, onRemove: () => setPriority('') } : null,
    category ? { label: `Categoria: ${category}`, onRemove: () => setCategory('') } : null,
    sort !== 'score'
      ? {
          label: `Ordenação: ${sort === 'date_desc' ? 'Mais recentes' : 'Mais antigas'}`,
          onRemove: () => setSort('score'),
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; onRemove: () => void }>;

  const applyFilters = () => {
    if (lastQuery) {
      handleSearch(1);
    }
  };

  const highlight = (text: string) => {
    if (!lastQuery) return text;
    const parts = text.split(new RegExp(`(${lastQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === lastQuery.toLowerCase() ? (
            <mark key={index} className="bg-yellow-100 text-yellow-900 px-1 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </>
    );
  };

  return (
    <MainLayout>
      <div
        className="relative space-y-10 font-display bg-[color:var(--dash-bg)] text-[color:var(--search-ink)]"
      >
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,_#f3e8ff,_#ffffff_58%)] p-8 shadow-[0_28px_80px_-60px_rgba(124,58,237,0.4)]">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-violet-200/60 blur-3xl search-float" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-sky-200/50 blur-3xl search-float" />
          <div className="absolute right-12 top-10 h-2 w-20 rounded-full bg-[color:var(--search-accent)] opacity-40" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-700">
              Pesquisa inteligente
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
              Encontre ordens e ativos em segundos
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Combine filtros, prioridades e categorias para uma busca mais precisa.
            </p>
          </div>
        </section>

        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            <input
              className="input md:col-span-2"
              placeholder="Pesquisar por titulo, descricao, codigo..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch(1)}
            />
            <select
              className="input"
              value={type}
              onChange={(event) => setType(event.target.value as any)}
            >
              <option value="all">Tudo</option>
              <option value="orders">Ordens</option>
              <option value="assets">Equipamentos</option>
            </select>
            <select
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={type === 'assets'}
            >
              <option value="">Status (ordens)</option>
              <option value="aberta">Aberta</option>
              <option value="atribuida">Atribuida</option>
              <option value="em_curso">Em curso</option>
              <option value="concluida">Concluida</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <select
              className="input"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={type === 'assets'}
            >
              <option value="">Prioridade</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
            <input
              className="input"
              placeholder="Categoria (assets)"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={type === 'orders'}
            />
            <select
              className="input"
              value={sort}
              onChange={(event) => setSort(event.target.value as any)}
            >
              <option value="score">Ordenar por relevancia</option>
              <option value="date_desc">Mais recentes</option>
              <option value="date_asc">Mais antigas</option>
            </select>
            <button
              onClick={() => handleSearch(1)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--search-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Search className="h-4 w-4" />
              Pesquisar
            </button>
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 shadow-sm">
              {error}
            </div>
          )}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => {
                    filter.onRemove();
                    applyFilters();
                  }}
                  className="rounded-full border border-slate-200 bg-[color:var(--search-surface)] px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white"
                >
                  {filter.label} ×
                </button>
              ))}
            </div>
          )}
        </div>

        {(results.orders.total > 0 || results.assets.total > 0) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="search-reveal rounded-[26px] border border-[color:var(--search-summary-border)] bg-[color:var(--search-summary-bg)] p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--search-summary-label)]">
                  ordens
                </p>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--search-summary-value)]">
                  {results.orders.total}
                </p>
              </div>
              <div className="search-reveal search-reveal-delay-1 rounded-[26px] border border-[color:var(--search-summary-border)] bg-[color:var(--search-summary-bg)] p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--search-summary-label)]">
                  equipamentos
                </p>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--search-summary-value)]">
                  {results.assets.total}
                </p>
              </div>
              <div className="search-reveal search-reveal-delay-2 rounded-[26px] border border-[color:var(--search-summary-border)] bg-[color:var(--search-summary-bg)] p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--search-summary-label)]">
                  pesquisa
                </p>
                <p className="mt-3 text-sm font-semibold text-[color:var(--search-summary-value)]">{lastQuery}</p>
              </div>
          </div>
        )}

        {loading && (
          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 text-center text-slate-600 shadow-sm">
            A pesquisar...
          </div>
        )}

        {!loading && (results.orders.items.length > 0 || results.assets.items.length > 0) && (
          <div className="space-y-6">
            {(type === 'all' || type === 'orders') && (
              <div className="rounded-[28px] border border-slate-200 bg-white/95 shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Ordens</h2>
                    <a
                      className="inline-flex items-center gap-1 text-sm text-[color:var(--search-accent)]"
                      href={`${basePath}/work-orders`}
                    >
                      Ver ordens <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.orders.items.length === 0 && (
                    <div className="px-6 py-4 text-sm text-slate-500">Sem resultados</div>
                  )}
                  {results.orders.items.map((order) => (
                    <div key={order.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{highlight(order.title)}</p>
                          <p className="text-sm text-slate-600">
                            {order.description ? highlight(order.description) : '-'}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>ID: {order.id}</span>
                            {order.priority && (
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                                {order.priority}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-slate-500">
                            Score {order.score?.toFixed(2) || '-'}
                          </span>
                          <span className="text-xs text-slate-700">{order.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(type === 'all' || type === 'assets') && (
              <div className="rounded-[28px] border border-slate-200 bg-white/95 shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Equipamentos</h2>
                    <a
                      className="inline-flex items-center gap-1 text-sm text-[color:var(--search-accent)]"
                      href={`${basePath}/assets`}
                    >
                      Ver equipamentos <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.assets.items.length === 0 && (
                    <div className="px-6 py-4 text-sm text-slate-500">Sem resultados</div>
                  )}
                  {results.assets.items.map((asset) => (
                    <div key={asset.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{highlight(asset.name)}</p>
                          <p className="text-sm text-slate-600">{highlight(asset.code)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>ID: {asset.id}</span>
                            {asset.category && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                {asset.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-slate-500">
                            Score {asset.score?.toFixed(2) || '-'}
                          </span>
                          {asset.is_critical ? (
                            <BadgeAlert className="h-4 w-4 text-rose-500" />
                          ) : (
                            <BadgeCheck className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading &&
          results.orders.items.length === 0 &&
          results.assets.items.length === 0 &&
          query &&
          !error && (
            <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 text-center text-slate-500 shadow-sm">
              Sem resultados.
            </div>
          )}

        {(results.orders.total > 0 || results.assets.total > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white/95 p-4 text-sm text-slate-600 shadow-sm">
            <button
              className="btn-secondary"
              disabled={page <= 1 || loading}
              onClick={() => handleSearch(page - 1)}
            >
              Anterior
            </button>
            <div className="flex items-center gap-3">
              <span>Pagina {page}</span>
              <select
                className="input max-w-[110px]"
                value={limit}
                onChange={(event) => {
                  const nextLimit = Number(event.target.value);
                  setLimit(nextLimit);
                  handleSearch(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button
              className="btn-secondary"
              disabled={
                loading ||
                (type === 'orders'
                  ? page * limit >= results.orders.total
                  : type === 'assets'
                    ? page * limit >= results.assets.total
                    : page * limit >= results.orders.total + results.assets.total)
              }
              onClick={() => handleSearch(page + 1)}
            >
              Proxima
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
