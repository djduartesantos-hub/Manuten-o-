import React from 'react';
import { CalendarClock, Loader2, RefreshCcw, AlertCircle, Plus, Trash2, Download } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useProfileAccess } from '../hooks/useProfileAccess';
import { createPlannedDowntime, deletePlannedDowntime, listPlanner, type PlannerItem } from '../services/api';

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function endOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T23:59:59`).toISOString();
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function groupByDay(items: PlannerItem[]) {
  const groups = new Map<string, PlannerItem[]>();
  for (const item of items) {
    const dayKey = new Date(item.startAt).toISOString().slice(0, 10);
    const existing = groups.get(dayKey) || [];
    existing.push(item);
    groups.set(dayKey, existing);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function toCsvValue(value: any) {
  const raw = value === null || value === undefined ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvValue((row as any)[h])).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PlannerPage() {
  const { selectedPlant } = useAppStore();
  const { permissions, loading: permsLoading, isSuperAdmin } = useProfileAccess();

  const [startDate, setStartDate] = React.useState(() => toDateInputValue(new Date()));
  const [endDate, setEndDate] = React.useState(() => toDateInputValue(addDays(new Date(), 30)));

  const [items, setItems] = React.useState<PlannerItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [downtimeTitle, setDowntimeTitle] = React.useState('Paragem planeada');
  const [downtimeType, setDowntimeType] = React.useState<'total' | 'parcial'>('total');
  const [downtimeCategory, setDowntimeCategory] = React.useState<
    'producao' | 'seguranca' | 'energia' | 'pecas' | 'outras'
  >('producao');
  const [downtimeStart, setDowntimeStart] = React.useState(() => {
    const now = new Date();
    const iso = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    return iso.slice(0, 16);
  });
  const [downtimeEnd, setDowntimeEnd] = React.useState(() => {
    const now = new Date();
    const iso = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    return iso.slice(0, 16);
  });
  const [downtimeDescription, setDowntimeDescription] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const canWrite = isSuperAdmin || permissions.has('workorders:write');

  const load = React.useCallback(async () => {
    if (!selectedPlant) return;
    setLoading(true);
    setError(null);
    try {
      const start = startOfDayIso(startDate);
      const end = endOfDayIso(endDate);
      const res = await listPlanner(selectedPlant, { start, end });
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar o planeamento');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPlant, startDate, endDate]);

  React.useEffect(() => {
    if (!selectedPlant) return;
    load();
  }, [selectedPlant, load]);

  const handleCreateDowntime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlant) return;

    setCreating(true);
    setError(null);
    try {
      const start = new Date(downtimeStart).toISOString();
      const end = new Date(downtimeEnd).toISOString();
      await createPlannedDowntime(selectedPlant, {
        title: downtimeTitle,
        description: downtimeDescription.trim() ? downtimeDescription.trim() : null,
        start_at: start,
        end_at: end,
        downtime_type: downtimeType,
        downtime_category: downtimeCategory,
      });
      setDowntimeDescription('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar paragem planeada');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDowntime = async (downtimeId: string) => {
    if (!selectedPlant) return;
    const ok = window.confirm('Remover esta paragem planeada?');
    if (!ok) return;

    setError(null);
    try {
      await deletePlannedDowntime(selectedPlant, downtimeId);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao remover paragem planeada');
    }
  };

  const handleExport = () => {
    if (!items.length) return;
    const rows = items.map((item) => {
      const base: any = {
        kind: item.kind,
        title: item.title,
        startAt: item.startAt,
        endAt: item.endAt,
      };
      if (item.kind === 'preventive') {
        base.status = item.status || '';
      }
      if (item.kind === 'work_order') {
        base.status = item.status || '';
        base.priority = item.priority || '';
      }
      if (item.kind === 'downtime') {
        base.downtimeType = item.downtimeType;
        base.downtimeCategory = item.downtimeCategory;
        base.description = item.description || '';
      }
      return base;
    });
    downloadCsv(`planeamento_${startDate}_a_${endDate}.csv`, rows);
  };

  const groups = React.useMemo(() => groupByDay(items), [items]);

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border glass-panel p-8 shadow-sm">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -left-14 bottom-0 h-44 w-44 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border theme-border bg-[color:var(--dash-panel)] text-[color:var(--dash-accent)] shadow-sm">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
                  Sala de planeamento
                </p>
                <h1 className="mt-2 text-3xl font-semibold theme-text sm:text-4xl">
                  Planeamento
                </h1>
                <p className="mt-2 text-sm theme-text-muted">
                  Calendario unificado: preventivas, ordens e paragens planeadas.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={load}
                className="btn-secondary inline-flex items-center gap-2"
                disabled={loading || !selectedPlant}
                type="button"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Recarregar
              </button>
              <button
                onClick={handleExport}
                className="btn-primary inline-flex items-center gap-2"
                disabled={loading || !items.length}
                type="button"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border theme-border glass-panel p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">
                  Inicio
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input mt-2 w-full rounded-2xl"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">
                  Fim
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input mt-2 w-full rounded-2xl"
                />
              </label>
            </div>
            {error ? (
              <div className="flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ) : null}
          </div>
        </section>

        {canWrite ? (
          <section className="rounded-2xl border theme-border glass-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">
                  Planeamento
                </p>
                <h2 className="mt-2 text-lg font-semibold theme-text">Adicionar paragem planeada</h2>
              </div>
            </div>
            <form onSubmit={handleCreateDowntime} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium theme-text">Titulo</label>
                <input
                  value={downtimeTitle}
                  onChange={(e) => setDowntimeTitle(e.target.value)}
                  className="input mt-1 rounded-2xl"
                  placeholder="Ex: Manutenção elétrica"
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text">Tipo</label>
                <select
                  value={downtimeType}
                  onChange={(e) => setDowntimeType(e.target.value as any)}
                  className="input mt-1 rounded-2xl"
                >
                  <option value="total">Total</option>
                  <option value="parcial">Parcial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text">Categoria</label>
                <select
                  value={downtimeCategory}
                  onChange={(e) => setDowntimeCategory(e.target.value as any)}
                  className="input mt-1 rounded-2xl"
                >
                  <option value="producao">Produção</option>
                  <option value="seguranca">Segurança</option>
                  <option value="energia">Energia</option>
                  <option value="pecas">Peças</option>
                  <option value="outras">Outras</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium theme-text">Inicio</label>
                <input
                  type="datetime-local"
                  value={downtimeStart}
                  onChange={(e) => setDowntimeStart(e.target.value)}
                  className="input mt-1 rounded-2xl"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium theme-text">Fim</label>
                <input
                  type="datetime-local"
                  value={downtimeEnd}
                  onChange={(e) => setDowntimeEnd(e.target.value)}
                  className="input mt-1 rounded-2xl"
                />
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm font-medium theme-text">Descricao (opcional)</label>
                <input
                  value={downtimeDescription}
                  onChange={(e) => setDowntimeDescription(e.target.value)}
                  className="input mt-1 rounded-2xl"
                  placeholder="Detalhes / impacto / notas"
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={creating || permsLoading || !selectedPlant}
                  className="btn-primary w-full inline-flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Criar
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm theme-text">
            Nao tens permissoes para criar paragens planeadas.
          </div>
        )}

        <section className="rounded-2xl border theme-border glass-panel overflow-hidden">
          <div className="px-5 py-4 border-b theme-border bg-[color:var(--dash-surface)]">
            <h2 className="text-lg font-semibold theme-text">Itens</h2>
          </div>

          {loading ? (
            <div className="p-6 flex items-center gap-2 theme-text">
              <Loader2 className="h-5 w-5 animate-spin" />
              A carregar...
            </div>
          ) : groups.length === 0 ? (
            <div className="p-6 text-sm theme-text-muted">Sem itens no intervalo.</div>
          ) : (
            <div className="divide-y theme-border">
              {groups.map(([day, dayItems]) => (
                <div key={day} className="p-4">
                  <div className="text-sm font-semibold theme-text">{day}</div>
                  <div className="mt-3 space-y-2">
                    {dayItems
                      .slice()
                      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                      .map((item) => (
                        <div
                          key={`${item.kind}:${item.id}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium theme-text truncate">
                              {item.title}
                            </div>
                            <div className="text-xs theme-text-muted">
                              {formatDateTime(item.startAt)} → {formatDateTime(item.endAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full border theme-border bg-[color:var(--dash-surface)] theme-text-muted">
                              {item.kind === 'work_order'
                                ? 'Ordem'
                                : item.kind === 'preventive'
                                  ? 'Preventiva'
                                  : 'Paragem'}
                            </span>
                            {'status' in item && item.status ? (
                              <span className="text-xs px-2 py-1 rounded-full border theme-border bg-[color:var(--dash-surface)] theme-text-muted">
                                {item.status}
                              </span>
                            ) : null}
                            {item.kind === 'work_order' && item.priority ? (
                              <span className="text-xs px-2 py-1 rounded-full border theme-border bg-[color:var(--dash-surface)] theme-text-muted">
                                prioridade: {item.priority}
                              </span>
                            ) : null}
                            {item.kind === 'downtime' ? (
                              <span className="text-xs px-2 py-1 rounded-full border theme-border bg-[color:var(--dash-surface)] theme-text-muted">
                                {item.downtimeType} • {item.downtimeCategory}
                              </span>
                            ) : null}

                            {canWrite && item.kind === 'downtime' ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteDowntime(item.id)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border theme-border bg-[color:var(--dash-panel)] text-[color:var(--dash-muted)] hover:bg-[color:var(--dash-surface)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
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
