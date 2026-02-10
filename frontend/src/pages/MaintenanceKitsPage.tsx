import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import {
  createMaintenanceKit,
  getAssetCategories,
  getMaintenanceKitItems,
  getMaintenanceKits,
  getMaintenancePlans,
  getSpareParts,
  updateMaintenanceKit,
  upsertMaintenanceKitItems,
} from '../services/api';

interface MaintenanceKit {
  id: string;
  name: string;
  notes?: string | null;
  plan_id?: string | null;
  category_id?: string | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface AssetCategory {
  id: string;
  name: string;
}

interface MaintenancePlan {
  id: string;
  name: string;
}

interface SparePart {
  id: string;
  code: string;
  name: string;
}

interface MaintenanceKitItem {
  id: string;
  kit_id: string;
  spare_part_id: string;
  quantity: number;
  spare_part?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

type ItemDraft = {
  spare_part_id: string;
  quantity: string;
};

export function MaintenanceKitsPage({ embedded }: { embedded?: boolean }) {
  const { selectedPlant } = useAppStore();
  const [kits, setKits] = useState<MaintenanceKit[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [selectedKitId, setSelectedKitId] = useState<string>('');
  const [selectedKit, setSelectedKit] = useState<MaintenanceKit | null>(null);
  const [kitItems, setKitItems] = useState<MaintenanceKitItem[]>([]);
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceKit | null>(null);
  const [form, setForm] = useState({
    name: '',
    notes: '',
    plan_id: '',
    category_id: '',
    is_active: true,
  });

  const loadKits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMaintenanceKits();
      setKits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar kits');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      const [cats, planList, parts] = await Promise.all([
        getAssetCategories(),
        selectedPlant ? getMaintenancePlans(selectedPlant) : Promise.resolve([]),
        selectedPlant ? getSpareParts(selectedPlant) : Promise.resolve([]),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setPlans(Array.isArray(planList) ? planList : []);
      setSpareParts(Array.isArray(parts) ? parts : []);
    } catch {
      // lookups are optional for basic usage
    }
  }, [selectedPlant]);

  const resetForm = () => {
    setForm({ name: '', notes: '', plan_id: '', category_id: '', is_active: true });
    setEditing(null);
  };

  const openCreate = () => {
    setSuccess('');
    setError('');
    resetForm();
    setShowForm(true);
  };

  const openEdit = (kit: MaintenanceKit) => {
    setSuccess('');
    setError('');
    setEditing(kit);
    setForm({
      name: kit.name || '',
      notes: kit.notes || '',
      plan_id: kit.plan_id || '',
      category_id: kit.category_id || '',
      is_active: kit.is_active !== false,
    });
    setShowForm(true);
  };

  const loadSelectedKitItems = useCallback(async (kitId: string) => {
    if (!kitId) {
      setKitItems([]);
      setItemDrafts([]);
      return;
    }

    setLoadingItems(true);
    setError('');
    try {
      const items = await getMaintenanceKitItems(kitId);
      const safeItems = Array.isArray(items) ? items : [];
      setKitItems(safeItems);
      setItemDrafts(
        safeItems.map((it) => ({
          spare_part_id: it.spare_part_id,
          quantity: String(it.quantity ?? ''),
        })),
      );
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar itens do kit');
      setKitItems([]);
      setItemDrafts([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    loadKits();
    loadLookups();
  }, [loadKits, loadLookups]);

  useEffect(() => {
    if (!selectedKitId) {
      setSelectedKit(null);
      setKitItems([]);
      setItemDrafts([]);
      return;
    }
    const kit = kits.find((k) => k.id === selectedKitId) || null;
    setSelectedKit(kit);
    loadSelectedKitItems(selectedKitId);
  }, [kits, loadSelectedKitItems, selectedKitId]);

  const handleSaveKit = async () => {
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Indique o nome do kit');
      return;
    }

    if (form.plan_id && form.category_id) {
      setError('Indique um plano OU uma categoria (não ambos)');
      return;
    }

    setSavingKit(true);
    try {
      if (editing) {
        await updateMaintenanceKit(editing.id, {
          name: form.name.trim(),
          notes: form.notes.trim() || undefined,
          plan_id: form.plan_id || null,
          category_id: form.category_id || null,
          is_active: Boolean(form.is_active),
        });
        setSuccess('Kit atualizado com sucesso.');
      } else {
        const created = await createMaintenanceKit({
          name: form.name.trim(),
          notes: form.notes.trim() || undefined,
          plan_id: form.plan_id || undefined,
          category_id: form.category_id || undefined,
          is_active: Boolean(form.is_active),
        });
        setSelectedKitId(created?.id || '');
        setSuccess('Kit criado com sucesso.');
      }

      setShowForm(false);
      resetForm();
      await loadKits();
    } catch (err: any) {
      setError(err?.message || 'Erro ao guardar kit');
    } finally {
      setSavingKit(false);
    }
  };

  const sparePartLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of spareParts) {
      map.set(p.id, `${p.code} - ${p.name}`);
    }
    return map;
  }, [spareParts]);

  const addItemDraft = () => {
    setItemDrafts((prev) => [...prev, { spare_part_id: '', quantity: '1' }]);
  };

  const removeItemDraft = (idx: number) => {
    setItemDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemDraft = (idx: number, patch: Partial<ItemDraft>) => {
    setItemDrafts((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleSaveItems = async () => {
    setError('');
    setSuccess('');

    if (!selectedKitId) {
      setError('Selecione um kit primeiro');
      return;
    }

    if (itemDrafts.length === 0) {
      setError('Indique pelo menos 1 item');
      return;
    }

    const normalized = itemDrafts
      .map((row) => ({
        spare_part_id: row.spare_part_id,
        quantity: Number(row.quantity),
      }))
      .filter((row) => row.spare_part_id);

    if (normalized.length === 0) {
      setError('Indique pelo menos 1 peça');
      return;
    }

    if (new Set(normalized.map((r) => r.spare_part_id)).size !== normalized.length) {
      setError('Não repita a mesma peça no kit');
      return;
    }

    for (const row of normalized) {
      if (!row.quantity || row.quantity <= 0) {
        setError('Quantidade inválida');
        return;
      }
    }

    setSavingItems(true);
    try {
      await upsertMaintenanceKitItems(selectedKitId, { items: normalized });
      setSuccess('Itens atualizados com sucesso.');
      await loadSelectedKitItems(selectedKitId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao guardar itens');
    } finally {
      setSavingItems(false);
    }
  };

  const header = (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-primary-600" />
        Kits de Manutenção
      </h1>
      <p className="text-gray-600 mt-2">Gerir kits (lista de peças) para tarefas recorrentes.</p>
    </div>
  );

  const content = (
    <div className={embedded ? 'max-w-6xl mx-auto' : 'p-6 max-w-6xl mx-auto'}>
      {header}

        {error && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Kits</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadKits}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                    title="Atualizar"
                  >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Novo
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> A carregar...
                </div>
              ) : kits.length === 0 ? (
                <p className="text-sm text-gray-600">Sem kits.</p>
              ) : (
                <div className="space-y-2">
                  {kits.map((kit) => (
                    <button
                      key={kit.id}
                      onClick={() => setSelectedKitId(kit.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                        selectedKitId === kit.id
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-900">{kit.name}</div>
                          {kit.notes ? (
                            <div className="text-xs text-gray-600 line-clamp-1">{kit.notes}</div>
                          ) : null}
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            kit.is_active === false
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {kit.is_active === false ? 'Inativo' : 'Ativo'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Detalhes</h2>
                {selectedKit ? (
                  <button
                    onClick={() => openEdit(selectedKit)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                  >
                    <Save className="w-4 h-4" />
                    Editar
                  </button>
                ) : null}
              </div>

              {!selectedKit ? (
                <p className="text-sm text-gray-600">Selecione um kit para ver/editar.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-600">Nome</div>
                    <div className="font-semibold text-gray-900">{selectedKit.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Estado</div>
                    <div className="font-semibold text-gray-900">
                      {selectedKit.is_active === false ? 'Inativo' : 'Ativo'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-600">Notas</div>
                    <div className="text-gray-900">{selectedKit.notes || '—'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Itens</h2>
                  <p className="text-xs text-gray-600 mt-1">Guardar substitui a lista inteira.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addItemDraft}
                    disabled={!selectedKitId}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                  <button
                    onClick={handleSaveItems}
                    disabled={!selectedKitId || savingItems}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition"
                  >
                    {savingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>

              {!selectedKitId ? (
                <p className="text-sm text-gray-600">Selecione um kit para editar itens.</p>
              ) : loadingItems ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> A carregar itens...
                </div>
              ) : (
                <div className="space-y-3">
                  {itemDrafts.length === 0 ? (
                    <p className="text-sm text-gray-600">Sem itens. Clique em “Adicionar”.</p>
                  ) : (
                    itemDrafts.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                        <div className="md:col-span-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Peça</label>
                          <select
                            value={row.spare_part_id}
                            onChange={(e) => updateItemDraft(idx, { spare_part_id: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          >
                            <option value="">Selecione...</option>
                            {spareParts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name}
                              </option>
                            ))}
                          </select>
                          {row.spare_part_id && !sparePartLabelById.get(row.spare_part_id) ? (
                            <div className="text-xs text-amber-700 mt-1">Peça não encontrada na lista atual.</div>
                          ) : null}
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Qtd</label>
                          <input
                            value={row.quantity}
                            onChange={(e) => updateItemDraft(idx, { quantity: e.target.value })}
                            type="number"
                            min={1}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            onClick={() => removeItemDraft(idx)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {showForm && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editing ? 'Editar kit' : 'Novo kit'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Ex.: Kit revisão motor"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                <select
                  value={form.is_active ? 'true' : 'false'}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'true' }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Plano (opcional)</label>
                <select
                  value={form.plan_id}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      plan_id: e.target.value,
                      category_id: e.target.value ? '' : p.category_id,
                    }))
                  }
                  disabled={!selectedPlant || !!form.category_id}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">—</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
                {!selectedPlant ? (
                  <div className="text-xs text-gray-600 mt-1">Selecione uma fábrica para listar planos.</div>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria (opcional)</label>
                <select
                  value={form.category_id}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      category_id: e.target.value,
                      plan_id: e.target.value ? '' : p.plan_id,
                    }))
                  }
                  disabled={!!form.plan_id}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">—</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  rows={3}
                  placeholder="Observações (opcional)"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveKit}
                disabled={savingKit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition"
              >
                {savingKit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        )}
    </div>
  );

  if (embedded) {
    return <div className="p-0">{content}</div>;
  }

  return (
    <MainLayout wide>
      {content}
    </MainLayout>
  );
}
