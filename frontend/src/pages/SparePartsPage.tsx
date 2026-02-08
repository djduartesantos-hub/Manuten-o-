import { useCallback, useEffect, useMemo, useState } from 'react';
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
  min_stock?: number | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  unit_cost?: string | null;
  created_at?: string;
  spare_part_id?: string | null;
  spare_part?: {
    code: string;
    name: string;
  } | null;
}

export function SparePartsPage() {
  const { selectedPlant } = useAppStore();
  const [activeView, setActiveView] = useState<'parts' | 'movements'>('parts');
  const [parts, setParts] = useState<SparePart[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [movementStartDate, setMovementStartDate] = useState('');
  const [movementEndDate, setMovementEndDate] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementMinQty, setMovementMinQty] = useState('');
  const [movementMaxQty, setMovementMaxQty] = useState('');
  const [movementMinCost, setMovementMinCost] = useState('');
  const [movementMaxCost, setMovementMaxCost] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [partSupplierSearch, setPartSupplierSearch] = useState('');
  const [partMinCost, setPartMinCost] = useState('');
  const [partMaxCost, setPartMaxCost] = useState('');
  const [partSort, setPartSort] = useState('name_asc');
  const [movementSort, setMovementSort] = useState('date_desc');
  const [partsVisibleCount, setPartsVisibleCount] = useState(20);
  const [movementsVisibleCount, setMovementsVisibleCount] = useState(20);

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

  const loadData = useCallback(async () => {
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
  }, [selectedPlant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMovements = useMemo(() => {
    const normalizedSearch = movementSearch.trim().toLowerCase();
    const minQty = movementMinQty ? Number(movementMinQty) : null;
    const maxQty = movementMaxQty ? Number(movementMaxQty) : null;
    const minCost = movementMinCost ? Number(movementMinCost) : null;
    const maxCost = movementMaxCost ? Number(movementMaxCost) : null;

    return movements.filter((movement) => {
      if (movementTypeFilter !== 'all' && movement.type !== movementTypeFilter) {
        return false;
      }

      if (normalizedSearch) {
        const partLabel = movement.spare_part
          ? `${movement.spare_part.code} ${movement.spare_part.name}`.toLowerCase()
          : '';
        if (!partLabel.includes(normalizedSearch)) {
          return false;
        }
      }

      if (minQty !== null && movement.quantity < minQty) return false;
      if (maxQty !== null && movement.quantity > maxQty) return false;

      const parsedCost = movement.unit_cost ? Number(movement.unit_cost) : null;
      if (minCost !== null && (parsedCost === null || parsedCost < minCost)) return false;
      if (maxCost !== null && (parsedCost === null || parsedCost > maxCost)) return false;

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
  }, [
    movementEndDate,
    movementMaxCost,
    movementMaxQty,
    movementMinCost,
    movementMinQty,
    movementSearch,
    movementStartDate,
    movementTypeFilter,
    movements,
  ]);

  const stockByPart = useMemo(() => {
    return movements.reduce<Record<string, number>>((acc, movement) => {
      if (!movement.spare_part_id) return acc;
      const current = acc[movement.spare_part_id] || 0;
      const delta =
        movement.type === 'entrada' || movement.type === 'ajuste'
          ? movement.quantity
          : -movement.quantity;
      acc[movement.spare_part_id] = current + delta;
      return acc;
    }, {});
  }, [movements]);

  const filteredParts = useMemo(() => {
    const normalizedSearch = partSearch.trim().toLowerCase();
    const normalizedSupplier = partSupplierSearch.trim().toLowerCase();
    const minCost = partMinCost ? Number(partMinCost) : null;
    const maxCost = partMaxCost ? Number(partMaxCost) : null;

    return parts.filter((part) => {
      if (normalizedSearch) {
        const label = `${part.code} ${part.name}`.toLowerCase();
        if (!label.includes(normalizedSearch)) return false;
      }

      if (normalizedSupplier) {
        const supplierLabel = (part.supplier_name || '').toLowerCase();
        if (!supplierLabel.includes(normalizedSupplier)) return false;
      }

      const parsedCost = part.unit_cost ? Number(part.unit_cost) : null;
      if (minCost !== null && (parsedCost === null || parsedCost < minCost)) return false;
      if (maxCost !== null && (parsedCost === null || parsedCost > maxCost)) return false;

      return true;
    });
  }, [partMaxCost, partMinCost, partSearch, partSupplierSearch, parts]);

  const sortedParts = useMemo(() => {
    const items = [...filteredParts];
    const numericCost = (value?: string | null) =>
      value === null || value === undefined || value === '' ? null : Number(value);

    switch (partSort) {
      case 'code_asc':
        return items.sort((a, b) => a.code.localeCompare(b.code));
      case 'code_desc':
        return items.sort((a, b) => b.code.localeCompare(a.code));
      case 'cost_asc':
        return items.sort((a, b) => {
          const aCost = numericCost(a.unit_cost) ?? Number.POSITIVE_INFINITY;
          const bCost = numericCost(b.unit_cost) ?? Number.POSITIVE_INFINITY;
          return aCost - bCost;
        });
      case 'cost_desc':
        return items.sort((a, b) => {
          const aCost = numericCost(a.unit_cost) ?? Number.NEGATIVE_INFINITY;
          const bCost = numericCost(b.unit_cost) ?? Number.NEGATIVE_INFINITY;
          return bCost - aCost;
        });
      case 'name_desc':
        return items.sort((a, b) => b.name.localeCompare(a.name));
      case 'name_asc':
      default:
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filteredParts, partSort]);

  const sortedMovements = useMemo(() => {
    const items = [...filteredMovements];
    const numericCost = (value?: string | null) =>
      value === null || value === undefined || value === '' ? null : Number(value);

    switch (movementSort) {
      case 'date_asc':
        return items.sort((a, b) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
        );
      case 'qty_desc':
        return items.sort((a, b) => b.quantity - a.quantity);
      case 'qty_asc':
        return items.sort((a, b) => a.quantity - b.quantity);
      case 'cost_desc':
        return items.sort((a, b) => {
          const aCost = numericCost(a.unit_cost) ?? Number.NEGATIVE_INFINITY;
          const bCost = numericCost(b.unit_cost) ?? Number.NEGATIVE_INFINITY;
          return bCost - aCost;
        });
      case 'cost_asc':
        return items.sort((a, b) => {
          const aCost = numericCost(a.unit_cost) ?? Number.POSITIVE_INFINITY;
          const bCost = numericCost(b.unit_cost) ?? Number.POSITIVE_INFINITY;
          return aCost - bCost;
        });
      case 'date_desc':
      default:
        return items.sort((a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
        );
    }
  }, [filteredMovements, movementSort]);

  const visibleParts = useMemo(
    () => sortedParts.slice(0, partsVisibleCount),
    [partsVisibleCount, sortedParts],
  );
  const visibleMovements = useMemo(
    () => sortedMovements.slice(0, movementsVisibleCount),
    [movementsVisibleCount, sortedMovements],
  );


  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_55%)] p-8 shadow-[0_28px_80px_-60px_rgba(59,130,246,0.35)]">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute right-10 top-10 h-2 w-20 rounded-full bg-sky-400/40" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Inventário
              </p>
              <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
                Peças & movimentos
              </h1>
              <p className="mt-2 max-w-2xl text-sm theme-text-muted">
                Consulte catálogo, stock calculado e histórico de movimentos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border theme-border bg-[color:var(--dash-panel)] p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveView('parts')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeView === 'parts'
                      ? 'bg-[color:var(--dash-surface)] theme-text'
                      : 'theme-text-muted hover:bg-[color:var(--dash-surface)]'
                  }`}
                >
                  Peças
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('movements')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeView === 'movements'
                      ? 'bg-[color:var(--dash-surface)] theme-text'
                      : 'theme-text-muted hover:bg-[color:var(--dash-surface)]'
                  }`}
                >
                  Movimentos
                </button>
              </div>
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
            <div className="rounded-[26px] border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <Boxes className="h-4 w-4 text-sky-600" />
                Peças no catálogo
              </div>
              <p className="mt-3 text-2xl font-semibold theme-text">{parts.length}</p>
              <p className="mt-1 text-xs theme-text-muted">Registos disponíveis</p>
            </div>
            <div className="rounded-[26px] border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                Entradas
              </div>
              <p className="mt-3 text-2xl font-semibold theme-text">
                {movementSummary.in}
              </p>
              <p className="mt-1 text-xs theme-text-muted">Movimentos recentes</p>
            </div>
            <div className="rounded-[26px] border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <ArrowDownCircle className="h-4 w-4 text-rose-600" />
                Saidas
              </div>
              <p className="mt-3 text-2xl font-semibold theme-text">
                {movementSummary.out}
              </p>
              <p className="mt-1 text-xs theme-text-muted">Consumo</p>
            </div>
            <div className="rounded-[26px] border theme-border theme-card p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <Wrench className="h-4 w-4 text-sky-600" />
                Ajustes
              </div>
              <p className="mt-3 text-2xl font-semibold theme-text">
                {movementSummary.adjust}
              </p>
              <p className="mt-1 text-xs theme-text-muted">Correcao de stock</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border theme-border bg-rose-500/10 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <p className="text-sm theme-text">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-[28px] border theme-border theme-card p-12 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin theme-text-muted" />
            <p className="text-sm theme-text-muted">Carregando peças...</p>
          </div>
        )}

        {!loading && (
          <>
            {!selectedPlant && (
              <div className="rounded-[28px] border theme-border bg-[color:var(--dash-surface)] p-6 text-sm theme-text-muted">
                Selecione uma planta no topo para consultar peças e movimentos.
              </div>
            )}

            {selectedPlant && activeView === 'parts' && (
              <section>
                <div className="rounded-[28px] border theme-border theme-card shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                  <div className="border-b border-[color:var(--dash-border)] p-5">
                    <h2 className="text-lg font-semibold theme-text">Peças cadastradas</h2>
                    <p className="text-sm theme-text-muted">{filteredParts.length} itens</p>
                  </div>
                  <div className="border-b border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Pesquisa
                        </p>
                        <input
                          className="input h-9"
                          placeholder="Código ou nome"
                          value={partSearch}
                          onChange={(event) => setPartSearch(event.target.value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Fornecedor
                        </p>
                        <input
                          className="input h-9"
                          placeholder="Nome do fornecedor"
                          value={partSupplierSearch}
                          onChange={(event) => setPartSupplierSearch(event.target.value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Custo mín.
                        </p>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          className="input h-9"
                          placeholder="€"
                          value={partMinCost}
                          onChange={(event) => setPartMinCost(event.target.value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Custo máx.
                        </p>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          className="input h-9"
                          placeholder="€"
                          value={partMaxCost}
                          onChange={(event) => setPartMaxCost(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        className="input h-9"
                        value={partSort}
                        onChange={(event) => setPartSort(event.target.value)}
                      >
                        <option value="name_asc">Nome (A-Z)</option>
                        <option value="name_desc">Nome (Z-A)</option>
                        <option value="code_asc">Código (A-Z)</option>
                        <option value="code_desc">Código (Z-A)</option>
                        <option value="cost_asc">Custo (baixo-alto)</option>
                        <option value="cost_desc">Custo (alto-baixo)</option>
                      </select>
                      <button
                        className="btn-secondary h-9"
                        onClick={() => {
                          setPartSearch('');
                          setPartSupplierSearch('');
                          setPartMinCost('');
                          setPartMaxCost('');
                          setPartSort('name_asc');
                          setPartsVisibleCount(20);
                        }}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
                      <thead className="bg-[color:var(--dash-surface)]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Código
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Custo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Mínimo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Fornecedor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
                        {filteredParts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-6 text-center theme-text-muted">
                              Nenhuma peça encontrada. Registe peças em Configurações → Gestão administrativa → Registar peças.
                            </td>
                          </tr>
                        )}
                        {visibleParts.map((part) => {
                          const currentStock = stockByPart[part.id] ?? 0;
                          const minStock = part.min_stock ?? 0;
                          const isLow = minStock > 0 && currentStock < minStock;

                          return (
                            <tr
                              key={part.id}
                              className="transition hover:bg-[color:var(--dash-surface)]"
                            >
                              <td className="px-6 py-4 text-sm font-medium theme-text">
                                {part.code}
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">{part.name}</td>
                              <td className="px-6 py-4 text-sm theme-text">
                                {part.unit_cost ? `€ ${part.unit_cost}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                <span className={isLow ? 'text-rose-600 font-semibold' : undefined}>
                                  {currentStock}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                {minStock || '-'}
                                {isLow && (
                                  <span className="ml-2 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--dash-text)]">
                                    Baixo
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm theme-text">
                                {part.supplier_name || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {sortedParts.length > visibleParts.length && (
                    <div className="border-t border-[color:var(--dash-border)] p-4">
                      <button
                        className="btn-secondary w-full"
                        onClick={() => setPartsVisibleCount((count) => count + 20)}
                      >
                        Carregar mais
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {selectedPlant && activeView === 'movements' && (
              <section>
                <div className="rounded-[28px] border theme-border theme-card shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                  <div className="border-b border-[color:var(--dash-border)] p-5">
                    <h2 className="text-lg font-semibold theme-text">Movimentos</h2>
                    <p className="text-sm theme-text-muted">{filteredMovements.length} registos</p>
                  </div>

                  <div className="border-b border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Pesquisa
                        </p>
                        <input
                          className="input h-9"
                          placeholder="Código ou nome da peça"
                          value={movementSearch}
                          onChange={(event) => setMovementSearch(event.target.value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Tipo
                        </p>
                        <select
                          className="input h-9"
                          value={movementTypeFilter}
                          onChange={(event) => setMovementTypeFilter(event.target.value)}
                        >
                          <option value="all">Todos</option>
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                          <option value="ajuste">Ajuste</option>
                        </select>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Data início
                        </p>
                        <input
                          type="date"
                          className="input h-9"
                          value={movementStartDate}
                          onChange={(event) => setMovementStartDate(event.target.value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                          Data fim
                        </p>
                        <input
                          type="date"
                          className="input h-9"
                          value={movementEndDate}
                          onChange={(event) => setMovementEndDate(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className="input h-9"
                        placeholder="Qtd mín"
                        value={movementMinQty}
                        onChange={(event) => setMovementMinQty(event.target.value)}
                      />
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className="input h-9"
                        placeholder="Qtd máx"
                        value={movementMaxQty}
                        onChange={(event) => setMovementMaxQty(event.target.value)}
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input h-9"
                        placeholder="Custo mín"
                        value={movementMinCost}
                        onChange={(event) => setMovementMinCost(event.target.value)}
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input h-9"
                        placeholder="Custo máx"
                        value={movementMaxCost}
                        onChange={(event) => setMovementMaxCost(event.target.value)}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        className="input h-9"
                        value={movementSort}
                        onChange={(event) => setMovementSort(event.target.value)}
                      >
                        <option value="date_desc">Data (recente)</option>
                        <option value="date_asc">Data (antigo)</option>
                        <option value="qty_desc">Quantidade (maior)</option>
                        <option value="qty_asc">Quantidade (menor)</option>
                        <option value="cost_desc">Custo (alto-baixo)</option>
                        <option value="cost_asc">Custo (baixo-alto)</option>
                      </select>
                      <button
                        className="btn-secondary h-9"
                        onClick={() => {
                          setMovementTypeFilter('all');
                          setMovementStartDate('');
                          setMovementEndDate('');
                          setMovementSearch('');
                          setMovementMinQty('');
                          setMovementMaxQty('');
                          setMovementMinCost('');
                          setMovementMaxCost('');
                          setMovementSort('date_desc');
                          setMovementsVisibleCount(20);
                        }}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
                      <thead className="bg-[color:var(--dash-surface)]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Peça
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Quantidade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Custo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium theme-text-muted uppercase">
                            Data
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
                        {filteredMovements.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-6 text-center theme-text-muted">
                              Nenhum movimento encontrado
                            </td>
                          </tr>
                        )}
                        {visibleMovements.map((movement) => (
                          <tr
                            key={movement.id}
                            className="transition hover:bg-[color:var(--dash-surface)]"
                          >
                            <td className="px-6 py-4 text-sm theme-text">
                              {movement.spare_part
                                ? `${movement.spare_part.code} - ${movement.spare_part.name}`
                                : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm theme-text capitalize">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  movement.type === 'entrada'
                                    ? 'bg-emerald-500/10 text-[color:var(--dash-text)]'
                                    : movement.type === 'saida'
                                    ? 'bg-rose-500/10 text-[color:var(--dash-text)]'
                                    : 'bg-[color:var(--dash-surface)] theme-text-muted'
                                }`}
                              >
                                {movement.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm theme-text">{movement.quantity}</td>
                            <td className="px-6 py-4 text-sm theme-text">
                              {movement.unit_cost ? `€ ${movement.unit_cost}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm theme-text">
                              {movement.created_at
                                ? new Date(movement.created_at).toLocaleString()
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sortedMovements.length > visibleMovements.length && (
                    <div className="border-t border-[color:var(--dash-border)] p-4">
                      <button
                        className="btn-secondary w-full"
                        onClick={() => setMovementsVisibleCount((count) => count + 20)}
                      >
                        Carregar mais
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
