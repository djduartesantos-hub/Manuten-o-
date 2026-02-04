import { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { useAppStore } from '../context/store';
import {
  createSparePart,
  createStockMovement,
  getSpareParts,
  getStockMovementsByPlant,
} from '../services/api';

interface SparePart {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  unit_cost?: string | null;
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
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [partForm, setPartForm] = useState({
    code: '',
    name: '',
    description: '',
    unit_cost: '',
  });

  const [movementForm, setMovementForm] = useState({
    spare_part_id: '',
    type: 'entrada',
    quantity: 1,
    unit_cost: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [partsData, movementsData] = await Promise.all([
        getSpareParts(),
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

  const handleCreatePart = async () => {
    if (!partForm.code || !partForm.name) {
      setError('Preencha o código e o nome');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await createSparePart({
        code: partForm.code,
        name: partForm.name,
        description: partForm.description || undefined,
        unit_cost: partForm.unit_cost || undefined,
      });
      setPartForm({ code: '', name: '', description: '', unit_cost: '' });
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar peça');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMovement = async () => {
    if (!selectedPlant) {
      setError('Selecione uma fábrica');
      return;
    }

    if (!movementForm.spare_part_id) {
      setError('Selecione a peça');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await createStockMovement({
        spare_part_id: movementForm.spare_part_id,
        plant_id: selectedPlant,
        type: movementForm.type as any,
        quantity: Number(movementForm.quantity),
        unit_cost: movementForm.unit_cost || undefined,
        notes: movementForm.notes || undefined,
      });
      setMovementForm({
        spare_part_id: '',
        type: 'entrada',
        quantity: 1,
        unit_cost: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar movimento');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Peças & Stock</h1>
          <p className="text-gray-600 mt-2">Controle peças sobressalentes e movimentos</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova peça
          </button>
          <button
            onClick={loadData}
            className="btn-secondary inline-flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova peça</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                className="input"
                value={partForm.code}
                onChange={(event) => setPartForm({ ...partForm, code: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                className="input"
                value={partForm.name}
                onChange={(event) => setPartForm({ ...partForm, name: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo unitário</label>
              <input
                className="input"
                value={partForm.unit_cost}
                onChange={(event) =>
                  setPartForm({ ...partForm, unit_cost: event.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                className="input min-h-[96px]"
                value={partForm.description}
                onChange={(event) =>
                  setPartForm({ ...partForm, description: event.target.value })
                }
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleCreatePart} className="btn-primary" disabled={creating}>
              {creating ? 'A criar...' : 'Criar peça'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-secondary"
              disabled={creating}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && (
        <div className="card p-12 text-center">
          <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Carregando peças...</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="card xl:col-span-2">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Peças cadastradas</h2>
              <p className="text-sm text-gray-500">{parts.length} itens</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Custo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                        Nenhuma peça encontrada
                      </td>
                    </tr>
                  )}
                  {parts.map((part) => (
                    <tr key={part.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {part.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{part.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {part.unit_cost ? `€ ${part.unit_cost}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Movimento de stock</h2>
              <p className="text-sm text-gray-500">Registrar entrada/saída</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peça</label>
                <select
                  className="input"
                  value={movementForm.spare_part_id}
                  onChange={(event) =>
                    setMovementForm({ ...movementForm, spare_part_id: event.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {parts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.code} - {part.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  className="input"
                  value={movementForm.type}
                  onChange={(event) =>
                    setMovementForm({ ...movementForm, type: event.target.value })
                  }
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input
                  type="number"
                  className="input"
                  value={movementForm.quantity}
                  onChange={(event) =>
                    setMovementForm({ ...movementForm, quantity: Number(event.target.value) })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo unitário</label>
                <input
                  className="input"
                  value={movementForm.unit_cost}
                  onChange={(event) =>
                    setMovementForm({ ...movementForm, unit_cost: event.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  className="input min-h-[96px]"
                  value={movementForm.notes}
                  onChange={(event) =>
                    setMovementForm({ ...movementForm, notes: event.target.value })
                  }
                />
              </div>

              <button onClick={handleCreateMovement} className="btn-primary w-full" disabled={creating}>
                {creating ? 'A registar...' : 'Registar movimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && movements.length > 0 && (
        <div className="card mt-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Movimentos recentes</h2>
            <p className="text-sm text-gray-500">Últimos registos da planta</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Peça
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {movement.spare_part
                        ? `${movement.spare_part.code} - ${movement.spare_part.name}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                      {movement.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {movement.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {movement.created_at ? new Date(movement.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
