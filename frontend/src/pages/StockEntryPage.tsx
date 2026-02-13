import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, Boxes, CheckCircle2, Loader2, Plus, RefreshCcw, Search, XCircle } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useProfileAccess } from '../hooks/useProfileAccess';
import { createStockMovement, getSpareParts } from '../services/api';

interface SparePartOption {
  id: string;
  code: string;
  name: string;
  unit_cost?: string | null;
}

export function StockEntryPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { selectedPlant } = useAppStore();
  const access = useProfileAccess();
  const [parts, setParts] = useState<SparePartOption[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [partSearch, setPartSearch] = useState('');
  const [form, setForm] = useState({
    spare_part_id: '',
    quantity: 1,
    unit_cost: '',
    notes: '',
  });

  const canViewCosts = useMemo(() => {
    if (access.isSuperAdmin) return true;
    return access.permissions.has('stock:costs:read');
  }, [access.isSuperAdmin, access.permissions]);

  const loadParts = useCallback(async () => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setParts([]);
      return;
    }

    setLoadingParts(true);
    setError(null);
    try {
      const data = await getSpareParts(selectedPlant);
      setParts(data || []);
    } catch (err: any) {
      setParts([]);
      setError(err.message || 'Erro ao carregar peças');
    } finally {
      setLoadingParts(false);
    }
  }, [selectedPlant]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const filteredParts = useMemo(() => {
    const query = partSearch.trim().toLowerCase();
    if (!query) return parts;
    return parts.filter((part) => {
      const label = `${part.code} ${part.name}`.toLowerCase();
      return label.includes(query);
    });
  }, [parts, partSearch]);

  const selectedPart = useMemo(
    () => parts.find((part) => part.id === form.spare_part_id) || null,
    [form.spare_part_id, parts],
  );

  const resetForm = () => {
    setForm({
      spare_part_id: '',
      quantity: 1,
      unit_cost: '',
      notes: '',
    });
    setPartSearch('');
  };

  const handleSubmit = async () => {
    if (!selectedPlant) return;

    setSuccess(null);
    setError(null);

    if (!form.spare_part_id) {
      setError('Selecione a peça');
      return;
    }

    const qty = Number(form.quantity);
    if (!qty || qty <= 0) {
      setError('Indique uma quantidade válida');
      return;
    }

    setSaving(true);
    try {
      await createStockMovement(selectedPlant, {
        spare_part_id: form.spare_part_id,
        type: 'entrada',
        quantity: qty,
        unit_cost: canViewCosts ? form.unit_cost || undefined : undefined,
        notes: form.notes.trim() || undefined,
      });

      setSuccess('Entrada de stock registada com sucesso.');
      resetForm();
      await loadParts();
    } catch (err: any) {
      setError(err.message || 'Erro ao registar entrada de stock');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-8 font-display">
      <section className="relative overflow-hidden rounded-[32px] border theme-border bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_55%)] p-8 shadow-[0_28px_80px_-60px_rgba(16,185,129,0.35)]">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute right-10 top-10 h-2 w-20 rounded-full bg-emerald-400/40" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Stock
            </p>
            <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
              Adicionar peças ao stock
            </h1>
            <p className="mt-2 max-w-2xl text-sm theme-text-muted">
              Registe entradas de inventário (compras, reposição, devoluções).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadParts}
              className="btn-secondary inline-flex items-center gap-2"
              disabled={loadingParts || saving}
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {!selectedPlant && (
        <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-700">
          Selecione uma planta no topo para gerir o stock.
        </div>
      )}

      {selectedPlant && (
        <div className="rounded-[28px] border theme-border theme-card p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold theme-text">Nova entrada</h2>
              <p className="text-sm theme-text-muted">
                Selecione a peça e indique a quantidade recebida.
              </p>
            </div>
            <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
          </div>

          {(error || success) && (
            <div
              className={`mt-4 rounded-2xl border p-4 text-sm shadow-sm ${
                error
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-700'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {error ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <p className="theme-text">{error || success}</p>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium theme-text">Peça</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-text-muted" />
                  <input
                    className="input pl-9"
                    placeholder="Pesquisar (código ou nome)"
                    value={partSearch}
                    onChange={(event) => setPartSearch(event.target.value)}
                    disabled={loadingParts || saving}
                  />
                </div>
                <select
                  className="input"
                  value={form.spare_part_id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, spare_part_id: event.target.value }))
                  }
                  disabled={loadingParts || saving}
                >
                  <option value="">Selecionar...</option>
                  {filteredParts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.code} - {part.name}
                    </option>
                  ))}
                </select>
              </div>
              {loadingParts && (
                <p className="mt-2 text-xs theme-text-muted inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar peças...
                </p>
              )}
              {!loadingParts && parts.length === 0 && (
                <p className="mt-2 text-xs theme-text-muted">
                  Nenhuma peça encontrada nesta planta.
                </p>
              )}
              {selectedPart && (
                <div className="mt-3 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 text-xs theme-text-muted">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-amber-600" />
                      {selectedPart.code} · {selectedPart.name}
                    </span>
                    {canViewCosts && (
                      <span>
                        Custo base: {selectedPart.unit_cost ? `€ ${selectedPart.unit_cost}` : '-'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium theme-text">Quantidade</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))
                }
                disabled={saving}
              />
            </div>

            {canViewCosts && (
              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Custo unitário (opcional)
                </label>
                <input
                  className="input"
                  value={form.unit_cost}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, unit_cost: event.target.value }))
                  }
                  placeholder="ex: 12.50"
                  disabled={saving}
                />
              </div>
            )}

            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium theme-text">Notas (opcional)</label>
              <textarea
                className="input min-h-[96px]"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                disabled={saving}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              className="btn-primary inline-flex items-center gap-2"
              disabled={saving || loadingParts || !selectedPlant}
            >
              <Plus className="h-4 w-4" />
              {saving ? 'A registar...' : 'Registar entrada'}
            </button>
            <button
              onClick={() => {
                setError(null);
                setSuccess(null);
                resetForm();
              }}
              className="btn-secondary"
              disabled={saving}
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
}
