import React from 'react';
import toast from 'react-hot-toast';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useAuth } from '../hooks/useAuth';
import { getWorkOrders, updateWorkOrder } from '../services/api';

type WorkOrderRow = {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  assigned_to?: string | null;
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

export function TechnicianWorkOrdersHomePage() {
  const { selectedPlant } = useAppStore();
  const { user } = useAuth();

  const [workOrders, setWorkOrders] = React.useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [assigningId, setAssigningId] = React.useState<string | null>(null);

  const currentUserId = user?.id;

  const load = React.useCallback(async () => {
    if (!selectedPlant) {
      setError('Plant não selecionada');
      setWorkOrders([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const rows = (await getWorkOrders(selectedPlant)) as any[];
      setWorkOrders(Array.isArray(rows) ? (rows as WorkOrderRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar ordens');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPlant]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const assignedToMe = React.useMemo(() => {
    if (!currentUserId) return [];
    return workOrders.filter((o) => String(o.assigned_to || '') === currentUserId);
  }, [currentUserId, workOrders]);

  const available = React.useMemo(() => {
    return workOrders.filter((o) => !o.assigned_to && String(o.status || '').toLowerCase() === 'aberta');
  }, [workOrders]);

  const assignToMe = async (workOrderId: string) => {
    if (!selectedPlant) {
      toast.error('Plant não selecionada');
      return;
    }

    if (!currentUserId) {
      toast.error('Utilizador não autenticado');
      return;
    }

    setAssigningId(workOrderId);
    try {
      await updateWorkOrder(selectedPlant, workOrderId, {
        assigned_to: currentUserId,
      });

      setWorkOrders((prev) =>
        prev.map((o) => (o.id === workOrderId ? { ...o, assigned_to: currentUserId } : o)),
      );
      toast.success('Ordem assumida');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao assumir a ordem');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">Técnico</p>
          <h1 className="mt-2 text-2xl font-semibold theme-text">Ordens de trabalho</h1>
          <p className="mt-1 text-sm theme-text-muted">Primeiro as atribuídas a si, depois as disponíveis.</p>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full border theme-border theme-card px-4 py-2 text-sm font-semibold theme-text-muted shadow-sm transition hover:bg-[color:var(--dash-surface)] hover:theme-text disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'A atualizar…' : 'Atualizar'}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm theme-text">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border theme-border theme-card p-5 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold theme-text">Atribuídas a mim</h2>
            <span className="text-xs theme-text-muted">{assignedToMe.length}</span>
          </div>

          {assignedToMe.length === 0 ? (
            <p className="text-sm theme-text-muted">Sem ordens atribuídas neste momento.</p>
          ) : (
            <div className="space-y-3">
              {assignedToMe.map((o) => (
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
                    </div>

                    <span className={badgeForStatus(o.status) + ' text-xs'}>{labelStatus(o.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border theme-border theme-card p-5 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold theme-text">Disponíveis</h2>
            <span className="text-xs theme-text-muted">{available.length}</span>
          </div>

          {available.length === 0 ? (
            <p className="text-sm theme-text-muted">Sem ordens disponíveis.</p>
          ) : (
            <div className="space-y-3">
              {available.map((o) => (
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
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={badgeForStatus(o.status) + ' text-xs'}>{labelStatus(o.status)}</span>
                      <button
                        type="button"
                        onClick={() => void assignToMe(o.id)}
                        disabled={loading || assigningId === o.id}
                        className="rounded-full bg-[color:var(--dash-accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {assigningId === o.id ? 'A assumir…' : 'Assumir'}
                      </button>
                    </div>
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
