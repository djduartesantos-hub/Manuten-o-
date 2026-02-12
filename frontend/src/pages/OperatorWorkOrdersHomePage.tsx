import React from 'react';
import toast from 'react-hot-toast';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useAuth } from '../hooks/useAuth';
import { createWorkOrder, getAssets, getWorkOrders } from '../services/api';

type AssetRow = {
  id: string;
  code?: string | null;
  name?: string | null;
};

type WorkOrderRow = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  asset?: {
    code?: string | null;
    name?: string | null;
  } | null;
};

function formatWhen(value?: string | null) {
  if (!value) return '';
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return value;
  }
}

function labelStatus(value?: string | null) {
  const v = String(value || '').toLowerCase();
  if (v === 'aberta') return 'Aberta';
  if (v === 'em_analise') return 'Em análise';
  if (v === 'em_execucao') return 'Em execução';
  if (v === 'em_pausa') return 'Em pausa';
  if (v === 'concluida') return 'Concluída';
  if (v === 'fechada') return 'Fechada';
  if (v === 'cancelada') return 'Cancelada';
  return value || '—';
}

function badgeForStatus(value?: string | null) {
  const v = String(value || '').toLowerCase();
  if (v === 'aberta' || v === 'em_analise') return 'badge-warning';
  if (v === 'em_execucao') return 'badge-success';
  if (v === 'cancelada') return 'badge-danger';
  return 'badge-success';
}

function labelPriority(value?: string | null) {
  const v = String(value || '').toLowerCase();
  if (v === 'baixa') return 'Baixa';
  if (v === 'media') return 'Média';
  if (v === 'alta') return 'Alta';
  if (v === 'critica') return 'Crítica';
  return value || '—';
}

export function OperatorWorkOrdersHomePage() {
  const { selectedPlant } = useAppStore();
  const { user } = useAuth();

  const [assets, setAssets] = React.useState<AssetRow[]>([]);
  const [workOrders, setWorkOrders] = React.useState<WorkOrderRow[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    asset_id: '',
    title: '',
    description: '',
    priority: 'media',
  });

  const currentUserId = user?.id;

  const load = React.useCallback(async () => {
    if (!selectedPlant) {
      setError('Plant não selecionada');
      setAssets([]);
      setWorkOrders([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [assetsRows, orderRows] = await Promise.all([
        getAssets(selectedPlant),
        getWorkOrders(selectedPlant),
      ]);

      setAssets(Array.isArray(assetsRows) ? (assetsRows as AssetRow[]) : []);
      setWorkOrders(Array.isArray(orderRows) ? (orderRows as WorkOrderRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados');
      setAssets([]);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPlant]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const mine = React.useMemo(() => {
    if (!currentUserId) return [];
    return workOrders.filter((o) => String(o.created_by || '') === currentUserId);
  }, [currentUserId, workOrders]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlant) {
      toast.error('Selecione uma Plant');
      return;
    }

    const assetId = String(form.asset_id || '').trim();
    const title = String(form.title || '').trim();

    if (!assetId) {
      toast.error('Selecione um ativo');
      return;
    }

    if (!title) {
      toast.error('Indique um título');
      return;
    }

    setCreating(true);
    try {
      await createWorkOrder(selectedPlant, {
        asset_id: assetId,
        title,
        description: form.description,
        priority: form.priority,
      });

      toast.success('Ordem criada');
      setForm((prev) => ({ ...prev, title: '', description: '' }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar ordem');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">Operador</p>
          <h1 className="mt-2 text-2xl font-semibold theme-text">Criar e acompanhar ordens</h1>
          <p className="mt-1 text-sm theme-text-muted">Crie ordens e acompanhe as que foram criadas por si.</p>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full border theme-border theme-card px-4 py-2 text-sm font-semibold theme-text-muted shadow-sm transition hover:bg-[color:var(--dash-surface)] hover:theme-text disabled:opacity-50"
          disabled={loading || creating}
        >
          {loading ? 'A atualizar…' : 'Atualizar'}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm theme-text">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border theme-border theme-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold theme-text">Criar ordem</h2>
          <p className="mt-1 text-sm theme-text-muted">Preencha os dados mínimos.</p>

          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] theme-text-muted" htmlFor="asset_id">
                Ativo
              </label>
              <select
                id="asset_id"
                value={form.asset_id}
                onChange={(e) => setForm((p) => ({ ...p, asset_id: e.target.value }))}
                className="mt-2 w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
                disabled={loading || creating || !selectedPlant}
                required
              >
                <option value="">Selecionar…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.code ? `${a.code} - ` : '') + (a.name || a.id)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] theme-text-muted" htmlFor="title">
                Título
              </label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="mt-2 w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
                disabled={loading || creating || !selectedPlant}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] theme-text-muted" htmlFor="description">
                Descrição
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-2 w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
                disabled={loading || creating || !selectedPlant}
                rows={4}
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] theme-text-muted" htmlFor="priority">
                Prioridade
              </label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="mt-2 w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
                disabled={loading || creating || !selectedPlant}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creating || loading || !selectedPlant}
              className="w-full rounded-2xl bg-[color:var(--dash-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'A criar…' : 'Criar ordem'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border theme-border theme-card p-5 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold theme-text">Ordens criadas por mim</h2>
            <span className="text-xs theme-text-muted">{mine.length}</span>
          </div>

          {mine.length === 0 ? (
            <p className="text-sm theme-text-muted">Ainda não criou ordens.</p>
          ) : (
            <div className="space-y-3">
              {mine.map((o) => (
                <div key={o.id} className="rounded-2xl border theme-border theme-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold theme-text break-words">{o.title}</p>
                      {o.asset?.code || o.asset?.name ? (
                        <p className="mt-1 text-xs theme-text-muted">
                          {o.asset?.code ? `${o.asset.code} • ` : ''}
                          {o.asset?.name || ''}
                        </p>
                      ) : null}
                      {o.created_at ? (
                        <p className="mt-1 text-xs theme-text-muted">Criada: {formatWhen(o.created_at)}</p>
                      ) : null}
                      {o.priority ? (
                        <p className="mt-1 text-xs theme-text-muted">Prioridade: {labelPriority(o.priority)}</p>
                      ) : null}
                    </div>

                    <span className={badgeForStatus(o.status) + ' text-xs'}>{labelStatus(o.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
