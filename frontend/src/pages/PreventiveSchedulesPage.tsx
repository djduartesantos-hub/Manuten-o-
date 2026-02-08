import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import { useAuth } from '../hooks/useAuth';
import {
  createPreventiveSchedule,
  getMaintenancePlans,
  getPreventiveSchedules,
  updatePreventiveSchedule,
} from '../services/api';

type PreventiveScheduleStatus =
  | 'planeada'
  | 'agendada'
  | 'confirmada'
  | 'em_execucao'
  | 'concluida'
  | 'fechada'
  | 'reagendada';

interface MaintenancePlanOption {
  id: string;
  name: string;
  asset_id: string;
  asset_name?: string | null;
  type?: string;
  is_active?: boolean;
}

interface PreventiveSchedule {
  id: string;
  plan_id: string;
  asset_id: string;
  scheduled_for: string;
  status: PreventiveScheduleStatus;
  notes?: string | null;
  plan_name?: string | null;
  asset_name?: string | null;
  asset_code?: string | null;
}

const statusMeta: Record<PreventiveScheduleStatus, { label: string; className: string }> = {
  planeada: { label: 'Planeada', className: 'bg-slate-100 text-slate-700' },
  agendada: { label: 'Agendada', className: 'bg-amber-100 text-amber-700' },
  confirmada: { label: 'Confirmada', className: 'bg-sky-100 text-sky-700' },
  em_execucao: { label: 'Em execução', className: 'bg-emerald-100 text-emerald-700' },
  concluida: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  fechada: { label: 'Fechada', className: 'bg-slate-100 text-slate-700' },
  reagendada: { label: 'Reagendada', className: 'bg-indigo-100 text-indigo-700' },
};

function toIsoFromDatetimeLocal(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function PreventiveSchedulesPage() {
  const { selectedPlant } = useAppStore();
  const { user } = useAuth();

  const canManage = useMemo(() => {
    const role = user?.role;
    return ['superadmin', 'admin_empresa', 'gestor_manutencao', 'supervisor'].includes(role || '');
  }, [user?.role]);

  const [plans, setPlans] = useState<MaintenancePlanOption[]>([]);
  const [schedules, setSchedules] = useState<PreventiveSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | PreventiveScheduleStatus>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    plan_id: '',
    scheduled_for: '',
    status: 'planeada' as PreventiveScheduleStatus,
    notes: '',
  });

  const loadData = async () => {
    if (!selectedPlant) return;
    setLoading(true);
    setError(null);

    try {
      const [plansResult, schedulesResult] = await Promise.all([
        getMaintenancePlans(selectedPlant),
        getPreventiveSchedules(selectedPlant),
      ]);

      const safePlans = Array.isArray(plansResult) ? plansResult : [];
      setPlans(safePlans);

      const safeSchedules = Array.isArray(schedulesResult) ? schedulesResult : [];
      setSchedules(safeSchedules);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar agendamentos');
      setSchedules([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant]);

  const filteredSchedules = useMemo(() => {
    if (statusFilter === 'all') return schedules;
    return schedules.filter((s) => s.status === statusFilter);
  }, [schedules, statusFilter]);

  const preventivePlans = useMemo(() => {
    return plans
      .filter((p) => (p.type ? p.type === 'preventiva' : true))
      .filter((p) => (p.is_active === undefined ? true : p.is_active));
  }, [plans]);

  const handleCreate = async () => {
    if (!selectedPlant) {
      setError('Selecione uma fábrica primeiro');
      return;
    }
    if (!form.plan_id || !form.scheduled_for) {
      setError('Selecione o plano e a data');
      return;
    }

    const scheduledIso = toIsoFromDatetimeLocal(form.scheduled_for);
    if (!scheduledIso) {
      setError('Data inválida');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createPreventiveSchedule(selectedPlant, {
        plan_id: form.plan_id,
        scheduled_for: scheduledIso,
        status: form.status,
        notes: form.notes || undefined,
      });

      setForm({ plan_id: '', scheduled_for: '', status: 'planeada', notes: '' });
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar agendamento');
    } finally {
      setCreating(false);
    }
  };

  const handleInlineStatusSave = async (scheduleId: string, status: PreventiveScheduleStatus) => {
    if (!selectedPlant) return;
    setSavingId(scheduleId);
    setError(null);

    try {
      await updatePreventiveSchedule(selectedPlant, scheduleId, { status });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar agendamento');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="relative space-y-8 font-display bg-[color:var(--dash-bg)]">
        <section className="relative overflow-hidden rounded-[32px] theme-border theme-card p-8 shadow-[0_28px_80px_-60px_rgba(15,118,110,0.55)]">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-emerald-200/60 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-amber-200/50 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] theme-text">
                Planeamento
              </p>
              <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
                Preventiva agendada
              </h1>
              <p className="mt-2 max-w-2xl text-sm theme-text-muted">
                Crie e acompanhe agendamentos preventivos sem alterar as ordens.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="btn-secondary inline-flex items-center gap-2"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>
              {canManage && (
                <button
                  className="btn-primary inline-flex items-center gap-2"
                  onClick={() => setShowCreate((v) => !v)}
                >
                  <Plus className="h-4 w-4" />
                  {showCreate ? 'Fechar' : 'Novo agendamento'}
                </button>
              )}
            </div>
          </div>
        </section>

        {!selectedPlant && (
          <div className="rounded-[28px] border border-dashed theme-border theme-surface p-10 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 theme-text-muted" />
            <p className="text-sm theme-text-muted">Selecione uma fábrica no topo.</p>
          </div>
        )}

        {selectedPlant && (
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <p className="text-sm text-rose-700">{error}</p>
                  </div>
                </div>
              )}

              <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-panel)] px-4 py-2 text-xs font-semibold theme-text-muted">
                    <CalendarClock className="h-4 w-4" />
                    <select
                      className="bg-transparent text-xs font-semibold text-[color:var(--dash-text)] focus:outline-none"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">Todos os estados</option>
                      {(
                        [
                          'planeada',
                          'agendada',
                          'confirmada',
                          'em_execucao',
                          'concluida',
                          'fechada',
                          'reagendada',
                        ] as PreventiveScheduleStatus[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {statusMeta[s].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs theme-text-muted">{filteredSchedules.length} itens</span>
                </div>
              </div>

              <div className="rounded-[28px] border theme-border theme-card shadow-sm">
                <div className="border-b theme-border p-5">
                  <h2 className="text-lg font-semibold theme-text">Agendamentos</h2>
                  <p className="text-sm theme-text-muted">Próximas rotinas e replaneamentos</p>
                </div>

                {loading && (
                  <div className="p-12 text-center">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin theme-text-muted" />
                    <p className="text-sm theme-text-muted">Carregando...</p>
                  </div>
                )}

                {!loading && filteredSchedules.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-sm theme-text-muted">Nenhum agendamento encontrado.</p>
                  </div>
                )}

                {!loading && filteredSchedules.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
                      <thead className="bg-[color:var(--dash-surface)]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Data
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Ativo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Plano
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                            Estado
                          </th>
                          {canManage && (
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-[color:var(--dash-muted)]">
                              Atualizar
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
                        {filteredSchedules.map((s) => (
                          <tr key={s.id} className="hover:bg-[color:var(--dash-surface)]">
                            <td className="px-6 py-4 text-sm theme-text">
                              {new Date(s.scheduled_for).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm theme-text">
                              {s.asset_code ? `${s.asset_code} - ${s.asset_name}` : s.asset_name || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm theme-text">
                              {s.plan_name || '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta[s.status].className}`}>
                                {statusMeta[s.status].label}
                              </span>
                            </td>
                            {canManage && (
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <select
                                    className="rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-xs font-semibold text-[color:var(--dash-text)]"
                                    value={s.status}
                                    onChange={(e) => {
                                      const next = e.target.value as PreventiveScheduleStatus;
                                      setSchedules((prev) =>
                                        prev.map((item) =>
                                          item.id === s.id ? { ...item, status: next } : item,
                                        ),
                                      );
                                    }}
                                  >
                                    {(
                                      [
                                        'planeada',
                                        'agendada',
                                        'confirmada',
                                        'em_execucao',
                                        'concluida',
                                        'fechada',
                                        'reagendada',
                                      ] as PreventiveScheduleStatus[]
                                    ).map((st) => (
                                      <option key={st} value={st}>
                                        {statusMeta[st].label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className="btn-secondary inline-flex items-center gap-2"
                                    onClick={() => handleInlineStatusSave(s.id, s.status)}
                                    disabled={savingId === s.id}
                                  >
                                    <Save className="h-4 w-4" />
                                    {savingId === s.id ? 'A guardar...' : 'Guardar'}
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[28px] border theme-border theme-card p-6 shadow-sm">
                <h3 className="text-sm font-semibold theme-text">Criar agendamento</h3>
                <p className="mt-2 text-xs theme-text-muted">
                  Selecione um plano preventivo ativo e uma data.
                </p>

                {!canManage && (
                  <div className="mt-4 rounded-2xl border border-dashed theme-border bg-[color:var(--dash-surface)] px-4 py-4 text-xs theme-text-muted">
                    Sem permissão para criar/editar agendamentos.
                  </div>
                )}

                {canManage && !showCreate && (
                  <button
                    className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Novo agendamento
                  </button>
                )}

                {canManage && showCreate && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold theme-text-muted">Plano</label>
                      <select
                        className="mt-1 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 text-sm theme-text"
                        value={form.plan_id}
                        onChange={(e) => setForm((p) => ({ ...p, plan_id: e.target.value }))}
                      >
                        <option value="">Selecione...</option>
                        {preventivePlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.asset_name ? `(${p.asset_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold theme-text-muted">Data</label>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 text-sm theme-text"
                        value={form.scheduled_for}
                        onChange={(e) => setForm((p) => ({ ...p, scheduled_for: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold theme-text-muted">Estado inicial</label>
                      <select
                        className="mt-1 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 text-sm theme-text"
                        value={form.status}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, status: e.target.value as PreventiveScheduleStatus }))
                        }
                      >
                        {(
                          ['planeada', 'agendada', 'confirmada', 'reagendada'] as PreventiveScheduleStatus[]
                        ).map((st) => (
                          <option key={st} value={st}>
                            {statusMeta[st].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold theme-text-muted">Notas</label>
                      <textarea
                        className="mt-1 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3 text-sm theme-text"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Opcional"
                      />
                    </div>

                    <button
                      className="btn-primary inline-flex w-full items-center justify-center gap-2"
                      onClick={handleCreate}
                      disabled={creating}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {creating ? 'A criar...' : 'Criar agendamento'}
                    </button>

                    <button
                      className="btn-secondary inline-flex w-full items-center justify-center gap-2"
                      onClick={() => setShowCreate(false)}
                      disabled={creating}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div className="relative overflow-hidden rounded-[28px] border theme-border bg-[linear-gradient(135deg,var(--dash-panel),var(--dash-panel-2))] p-6 theme-text shadow-sm">
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-200/50 blur-2xl" />
                <h3 className="text-sm font-semibold">Dica</h3>
                <p className="mt-2 text-xs theme-text-muted">
                  Use “Confirmada” quando a equipa validar a intervenção e “Reagendada” para alterar a data.
                </p>
              </div>
            </aside>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
