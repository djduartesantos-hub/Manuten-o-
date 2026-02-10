import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ClipboardList, Loader2, RefreshCcw } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import {
  getAssetCategories,
  getMaintenanceKitItems,
  getMaintenanceKits,
  getMaintenancePlans,
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

interface MaintenancePlan {
  id: string;
  name: string;
}

interface AssetCategory {
  id: string;
  name: string;
}

interface MaintenanceKitItem {
  id: string;
  kit_id: string;
  spare_part_id: string;
  quantity: number;
  spare_part?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
}

export function MaintenanceKitsListPage() {
  const { selectedPlant } = useAppStore();
  const [kits, setKits] = useState<MaintenanceKit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState('');
  const [selectedKit, setSelectedKit] = useState<MaintenanceKit | null>(null);
  const [kitItems, setKitItems] = useState<MaintenanceKitItem[]>([]);

  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);

  const [loadingKits, setLoadingKits] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plans) map.set(p.id, p.name);
    return map;
  }, [plans]);

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const loadKits = useCallback(async () => {
    setLoadingKits(true);
    setError(null);
    try {
      const data = await getMaintenanceKits();
      const safe = Array.isArray(data) ? (data as MaintenanceKit[]) : [];
      setKits(safe);

      // keep selection if possible
      if (safe.length > 0) {
        const stillExists = selectedKitId && safe.some((k) => k.id === selectedKitId);
        if (!stillExists) setSelectedKitId(safe[0].id);
      } else {
        setSelectedKitId('');
        setSelectedKit(null);
        setKitItems([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar kits');
      setKits([]);
    } finally {
      setLoadingKits(false);
    }
  }, [selectedKitId]);

  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    setError(null);

    try {
      const cats = await getAssetCategories();
      setCategories(Array.isArray(cats) ? (cats as AssetCategory[]) : []);

      if (selectedPlant) {
        const ps = await getMaintenancePlans(selectedPlant);
        setPlans(Array.isArray(ps) ? (ps as MaintenancePlan[]) : []);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar listas de apoio');
    } finally {
      setLoadingLookups(false);
    }
  }, [selectedPlant]);

  const loadItems = useCallback(async (kitId: string) => {
    if (!kitId) {
      setKitItems([]);
      return;
    }

    setLoadingItems(true);
    setError(null);
    try {
      const data = await getMaintenanceKitItems(kitId);
      setKitItems(Array.isArray(data) ? (data as MaintenanceKitItem[]) : []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar itens do kit');
      setKitItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadKits();
  }, [loadKits]);

  useEffect(() => {
    const kit = kits.find((k) => k.id === selectedKitId) || null;
    setSelectedKit(kit);

    if (selectedKitId) {
      void loadItems(selectedKitId);
    } else {
      setKitItems([]);
    }
  }, [kits, loadItems, selectedKitId]);

  const header = (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-primary-600" />
        Kits
      </h1>
      <p className="text-gray-600 mt-2">Lista de kits (peças + quantidades). Para editar, use Configurações → Kits.</p>
    </div>
  );

  return (
    <MainLayout wide>
      <div className="p-6 max-w-6xl mx-auto">
        {header}

        {error && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Kits</h2>
                <button
                  onClick={loadKits}
                  disabled={loadingKits}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                  title="Atualizar"
                >
                  <RefreshCcw className={`w-4 h-4 ${loadingKits ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingKits ? (
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
                {(loadingLookups || loadingItems) && (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> a carregar…
                  </div>
                )}
              </div>

              {!selectedKit ? (
                <p className="text-sm text-gray-600">Selecione um kit para ver detalhes.</p>
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
                  <div>
                    <div className="text-xs text-gray-600">Plano</div>
                    <div className="text-gray-900">
                      {selectedKit.plan_id
                        ? planLabelById.get(selectedKit.plan_id) || selectedKit.plan_id
                        : '—'}
                    </div>
                    {!selectedPlant && selectedKit.plan_id ? (
                      <div className="text-xs text-gray-500 mt-1">Selecione uma fábrica para mostrar o nome do plano.</div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Categoria</div>
                    <div className="text-gray-900">
                      {selectedKit.category_id
                        ? categoryLabelById.get(selectedKit.category_id) || selectedKit.category_id
                        : '—'}
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
                  <p className="text-xs text-gray-600 mt-1">Lista de peças e quantidades deste kit.</p>
                </div>
              </div>

              {!selectedKitId ? (
                <p className="text-sm text-gray-600">Selecione um kit para ver itens.</p>
              ) : loadingItems ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> A carregar itens...
                </div>
              ) : kitItems.length === 0 ? (
                <p className="text-sm text-gray-600">Sem itens.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-600 border-b">
                        <th className="py-2 pr-3">Peça</th>
                        <th className="py-2 pr-3">Qtd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kitItems.map((item) => {
                        const label = item.spare_part
                          ? `${item.spare_part.code || '—'} - ${item.spare_part.name || '—'}`
                          : item.spare_part_id;
                        return (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 text-gray-900">{label}</td>
                            <td className="py-2 pr-3 font-semibold text-gray-900">{item.quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
