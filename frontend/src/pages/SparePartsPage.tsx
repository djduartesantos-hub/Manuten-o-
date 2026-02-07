import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  Loader2,
  RefreshCcw,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import {
  getSpareParts,
  getStockMovementsByPlant,
} from '../services/api';

interface SparePart {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  unit_cost?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  unit_cost?: string | null;
  created_at?: string;
  spare_part?: {
    code: string;
    name: string;
  } | null;
}

export function SparePartsPage() {
  const { selectedPlant } = useAppStore();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [movementStartDate, setMovementStartDate] = useState('');
  const [movementEndDate, setMovementEndDate] = useState('');

  const movementSummary = useMemo(() => {
    return movements.reduce(
      (acc, movement) => {
        if (movement.type === 'entrada') acc.in += 1;
        if (movement.type === 'saida') acc.out += 1;
        if (movement.type === 'ajuste') acc.adjust += 1;
        return acc;
      },
      { in: 0, out: 0, adjust: 0 },
    );
  }, [movements]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [partsData, movementsData] = await Promise.all([
        selectedPlant ? getSpareParts(selectedPlant) : Promise.resolve([]),
        selectedPlant ? getStockMovementsByPlant(selectedPlant) : Promise.resolve([]),
      ]);
      setParts(partsData || []);
      setMovements(movementsData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar peças');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant]);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      if (movementTypeFilter !== 'all' && movement.type !== movementTypeFilter) {
        return false;
      }

      if (!movement.created_at) return true;

      const movementDate = new Date(movement.created_at);

      if (movementStartDate) {
        const startDate = new Date(`${movementStartDate}T00:00:00`);
        if (movementDate < startDate) return false;
      }

      if (movementEndDate) {
        const endDate = new Date(`${movementEndDate}T23:59:59`);
        if (movementDate > endDate) return false;
      }

      return true;
    });
  }, [movementEndDate, movementStartDate, movementTypeFilter, movements]);


  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_60%)] p-8 shadow-[0_28px_80px_-60px_rgba(245,158,11,0.35)]">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-amber-200/50 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Inventario de pecas
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Pecas e stock sob controlo
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Consulte pecas, movimentos e quantidades para manter o
                abastecimento sempre visivel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadData}
                className="btn-secondary inline-flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Boxes className="h-4 w-4 text-amber-600" />
                Pecas cadastradas
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{parts.length}</p>
              <p className="mt-1 text-xs text-slate-500">Catalogo ativo</p>
            </div>
            <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                Entradas
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {movementSummary.in}
              </p>
              <p className="mt-1 text-xs text-slate-500">Movimentos recentes</p>
            </div>
            <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <ArrowDownCircle className="h-4 w-4 text-rose-600" />
                Saidas
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {movementSummary.out}
              </p>
              <p className="mt-1 text-xs text-slate-500">Consumo</p>
            </div>
            <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Wrench className="h-4 w-4 text-sky-600" />
                Ajustes
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {movementSummary.adjust}
              </p>
              <p className="mt-1 text-xs text-slate-500">Correcao de stock</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-12 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-slate-400" />
            <p className="text-sm text-slate-600">Carregando peças...</p>
          </div>
        )}

        {!loading && (
          <>
            <section>
              <div className="rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">Pecas cadastradas</h2>
                  <p className="text-sm text-slate-500">{parts.length} itens</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Custo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Fornecedor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parts.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-slate-500">
                            Nenhuma peça encontrada
                          </td>
                        </tr>
                      )}
                      {parts.map((part) => (
                        <tr key={part.id} className="transition hover:bg-amber-50/40">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {part.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{part.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {part.unit_cost ? `€ ${part.unit_cost}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {part.supplier_name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {movements.length > 0 && (
              <div className="rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                <div className="border-b border-slate-100 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Movimentos recentes
                      </h2>
                      <p className="text-sm text-slate-500">Ultimos registos da planta</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="input h-9"
                        value={movementTypeFilter}
                        onChange={(event) => setMovementTypeFilter(event.target.value)}
                      >
                        <option value="all">Todos</option>
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saida</option>
                        <option value="ajuste">Ajuste</option>
                      </select>
                      <input
                        type="date"
                        className="input h-9"
                        value={movementStartDate}
                        onChange={(event) => setMovementStartDate(event.target.value)}
                      />
                      <input
                        type="date"
                        className="input h-9"
                        value={movementEndDate}
                        onChange={(event) => setMovementEndDate(event.target.value)}
                      />
                      <button
                        className="btn-secondary h-9"
                        onClick={() => {
                          setMovementTypeFilter('all');
                          setMovementStartDate('');
                          setMovementEndDate('');
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Peça
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Quantidade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredMovements.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-slate-500">
                            Nenhum movimento encontrado
                          </td>
                        </tr>
                      )}
                      {filteredMovements.map((movement) => (
                        <tr key={movement.id} className="transition hover:bg-amber-50/40">
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {movement.spare_part
                              ? `${movement.spare_part.code} - ${movement.spare_part.name}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700 capitalize">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                movement.type === 'entrada'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : movement.type === 'saida'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {movement.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {movement.quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {movement.created_at
                              ? new Date(movement.created_at).toLocaleString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
