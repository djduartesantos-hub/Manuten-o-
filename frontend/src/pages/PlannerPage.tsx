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
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <CalendarClock className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Planeamento</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Calendário unificado: preventivas, ordens e paragens planeadas.
              </p>
            </div>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            disabled={loading || !selectedPlant}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Recarregar
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            disabled={loading || !items.length}
            type="button"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full sm:w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full sm:w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
          {error ? (
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </div>

        {canWrite ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adicionar paragem planeada</h2>
            <form onSubmit={handleCreateDowntime} className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Título</label>
                <input
                  value={downtimeTitle}
                  onChange={(e) => setDowntimeTitle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Ex: Manutenção elétrica"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tipo</label>
                <select
                  value={downtimeType}
                  onChange={(e) => setDowntimeType(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="total">Total</option>
                  <option value="parcial">Parcial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Categoria</label>
                <select
                  value={downtimeCategory}
                  onChange={(e) => setDowntimeCategory(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="producao">Produção</option>
                  <option value="seguranca">Segurança</option>
                  <option value="energia">Energia</option>
                  <option value="pecas">Peças</option>
                  <option value="outras">Outras</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Início</label>
                <input
                  type="datetime-local"
                  value={downtimeStart}
                  onChange={(e) => setDowntimeStart(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Fim</label>
                <input
                  type="datetime-local"
                  value={downtimeEnd}
                  onChange={(e) => setDowntimeEnd(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Descrição (opcional)</label>
                <input
                  value={downtimeDescription}
                  onChange={(e) => setDowntimeDescription(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Detalhes / impacto / notas"
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={creating || permsLoading || !selectedPlant}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Criar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
            Não tens permissões para criar paragens planeadas.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Itens</h2>
          </div>

          {loading ? (
            <div className="p-6 flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              A carregar...
            </div>
          ) : groups.length === 0 ? (
            <div className="p-6 text-gray-600 dark:text-gray-300">Sem itens no intervalo.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {groups.map(([day, dayItems]) => (
                <div key={day} className="p-4">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{day}</div>
                  <div className="mt-3 space-y-2">
                    {dayItems
                      .slice()
                      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                      .map((item) => (
                        <div
                          key={`${item.kind}:${item.id}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              {formatDateTime(item.startAt)} → {formatDateTime(item.endAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                              {item.kind === 'work_order'
                                ? 'Ordem'
                                : item.kind === 'preventive'
                                  ? 'Preventiva'
                                  : 'Paragem'}
                            </span>
                            {'status' in item && item.status ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                {item.status}
                              </span>
                            ) : null}
                            {item.kind === 'work_order' && item.priority ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                prioridade: {item.priority}
                              </span>
                            ) : null}
                            {item.kind === 'downtime' ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                {item.downtimeType} • {item.downtimeCategory}
                              </span>
                            ) : null}

                            {canWrite && item.kind === 'downtime' ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteDowntime(item.id)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
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
        </div>
      </div>
    </MainLayout>
  );
}
