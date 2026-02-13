import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useProfileAccess } from '../hooks/useProfileAccess';
import { createSparePart, getSuppliers } from '../services/api';

interface SupplierOption {
  id: string;
  name: string;
}

export function SparePartRegisterPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { selectedPlant } = useAppStore();
  const access = useProfileAccess();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [supplierSearch, setSupplierSearch] = useState('');

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    unit_cost: '',
    min_stock: '',
    supplier_id: '',
  });

  const canViewCosts = useMemo(() => {
    if (access.isSuperAdmin) return true;
    return access.permissions.has('stock:costs:read');
  }, [access.isSuperAdmin, access.permissions]);

  const loadSuppliers = useCallback(async () => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setSuppliers([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getSuppliers(selectedPlant);
      setSuppliers((data || []).map((item: any) => ({ id: item.id, name: item.name })));
    } catch (err: any) {
      setSuppliers([]);
      setError(err.message || 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }, [selectedPlant]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const supplierOptions = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();
    const items = query
      ? suppliers.filter((supplier) => supplier.name.toLowerCase().includes(query))
      : [...suppliers];
    return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [supplierSearch, suppliers]);

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      description: '',
      unit_cost: '',
      min_stock: '',
      supplier_id: '',
    });
    setSupplierSearch('');
  };

  const handleSubmit = async () => {
    if (!selectedPlant) return;

    setError(null);
    setSuccess(null);

    if (!form.code.trim()) {
      setError('Indique o código da peça');
      return;
    }

    if (!form.name.trim()) {
      setError('Indique o nome da peça');
      return;
    }

    const minStockValue = form.min_stock.trim() ? Number(form.min_stock) : undefined;
    if (form.min_stock.trim() && (Number.isNaN(minStockValue) || minStockValue! < 0)) {
      setError('Stock mínimo inválido');
      return;
    }

    if (canViewCosts) {
      const decimalRegex = /^\d+(\.\d{1,2})?$/;
      if (form.unit_cost.trim() && !decimalRegex.test(form.unit_cost.trim())) {
        setError('Custo unitário inválido. Use formato decimal, ex: 12.50');
        return;
      }
    }

    setSaving(true);
    try {
      await createSparePart(selectedPlant, {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unit_cost: canViewCosts ? form.unit_cost.trim() || undefined : undefined,
        min_stock: minStockValue,
        supplier_id: form.supplier_id || undefined,
      });

      setSuccess('Peça registada com sucesso.');
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Erro ao registar peça');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-8 font-display">
      <section className="relative overflow-hidden rounded-[32px] border theme-border bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_55%)] p-8 shadow-[0_28px_80px_-60px_rgba(245,158,11,0.35)]">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute right-10 top-10 h-2 w-20 rounded-full bg-amber-400/40" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Catálogo
            </p>
            <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
              Registar peças
            </h1>
            <p className="mt-2 max-w-2xl text-sm theme-text-muted">
              Crie novas peças no catálogo (código, nome, fornecedor e stock mínimo).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadSuppliers}
              className="btn-secondary inline-flex items-center gap-2"
              disabled={loading || saving}
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {!selectedPlant && (
        <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-700">
          Selecione uma planta no topo para registar peças.
        </div>
      )}

      {selectedPlant && (
        <div className="rounded-[28px] border theme-border theme-card p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold theme-text">Nova peça</h2>
              <p className="text-sm theme-text-muted">
                Registe a peça e depois use “Stock de peças” para fazer entradas.
              </p>
            </div>
            <Boxes className="h-5 w-5 text-amber-600" />
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

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium theme-text">Código *</label>
              <input
                className="input"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium theme-text">Nome *</label>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium theme-text">Fornecedor (opcional)</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.4fr]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-text-muted" />
                  <input
                    className="input pl-9"
                    placeholder="Pesquisar fornecedor"
                    value={supplierSearch}
                    onChange={(event) => setSupplierSearch(event.target.value)}
                    disabled={loading || saving}
                  />
                </div>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-text-muted" />
                  <select
                    className="input pl-9"
                    value={form.supplier_id}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, supplier_id: event.target.value }))
                    }
                    disabled={loading || saving}
                  >
                    <option value="">Sem fornecedor</option>
                    {supplierOptions.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {loading && (
                <p className="mt-2 text-xs theme-text-muted inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar fornecedores...
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium theme-text">Stock mínimo (opcional)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.min_stock}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, min_stock: event.target.value }))
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
                <p className="mt-2 text-xs theme-text-muted">Formato decimal (ex: 10 ou 10.50)</p>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium theme-text">Descrição (opcional)</label>
              <textarea
                className="input min-h-[96px]"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                disabled={saving}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              className="btn-primary inline-flex items-center gap-2"
              disabled={saving || !selectedPlant}
            >
              <Plus className="h-4 w-4" />
              {saving ? 'A registar...' : 'Registar peça'}
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
