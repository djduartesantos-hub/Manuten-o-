import { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useProfileAccess } from '../hooks/useProfileAccess';
import {
  createPurchaseOrder,
  createPurchaseRequest,
  getPurchaseOrder,
  getSpareParts,
  getSuppliers,
  listPurchaseOrders,
  listPurchaseRequests,
  receivePurchaseOrder,
  updatePurchaseRequest,
} from '../services/api';
import { Boxes, ClipboardList, PackagePlus, RefreshCcw, Truck } from 'lucide-react';

interface SparePartOption {
  id: string;
  code: string;
  name: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

export function PurchasesPage() {
  const { selectedPlant } = useAppStore();
  const access = useProfileAccess();
  const canRead = access.isSuperAdmin || access.permissions.has('purchases:read') || access.permissions.has('purchases:write');
  const canWrite = access.isSuperAdmin || access.permissions.has('purchases:write');

  const [activeTab, setActiveTab] = useState<'requests' | 'orders'>('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [parts, setParts] = useState<SparePartOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    priority: 'media',
    needed_by: '',
    items: [{ spare_part_id: '', quantity: 1, unit_cost: '' }],
  });

  const [orderForm, setOrderForm] = useState({
    supplier_id: '',
    request_id: '',
    expected_at: '',
    notes: '',
    items: [{ spare_part_id: '', quantity: 1, unit_cost: '' }],
  });

  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [receivingItems, setReceivingItems] = useState<Array<{ purchase_order_item_id: string; spare_part_label: string; remaining: number; quantity: number; unit_cost?: string }>>([]);

  const loadBaseData = useCallback(async () => {
    if (!selectedPlant || !canRead) return;
    setLoading(true);
    setError(null);
    try {
      const [partsData, suppliersData] = await Promise.all([
        getSpareParts(selectedPlant),
        getSuppliers(selectedPlant),
      ]);
      setParts(partsData || []);
      setSuppliers(suppliersData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados base');
    } finally {
      setLoading(false);
    }
  }, [selectedPlant, canRead]);

  const loadRequests = useCallback(async () => {
    if (!selectedPlant || !canRead) return;
    try {
      const data = await listPurchaseRequests(selectedPlant);
      setRequests(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar requisicoes');
    }
  }, [selectedPlant, canRead]);

  const loadOrders = useCallback(async () => {
    if (!selectedPlant || !canRead) return;
    try {
      const data = await listPurchaseOrders(selectedPlant);
      setOrders(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar compras');
    }
  }, [selectedPlant, canRead]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    loadRequests();
    loadOrders();
  }, [loadRequests, loadOrders]);

  const handleCreateRequest = async () => {
    if (!selectedPlant || !canWrite) return;
    setError(null);
    setSuccess(null);

    if (!requestForm.title.trim()) {
      setError('Titulo e obrigatorio');
      return;
    }

    const items = requestForm.items.filter((item) => item.spare_part_id && item.quantity > 0);
    if (items.length === 0) {
      setError('Adicione pelo menos uma linha');
      return;
    }

    setLoading(true);
    try {
      await createPurchaseRequest(selectedPlant, {
        title: requestForm.title,
        description: requestForm.description || undefined,
        priority: requestForm.priority,
        needed_by: requestForm.needed_by || undefined,
        items,
      });
      setRequestForm({
        title: '',
        description: '',
        priority: 'media',
        needed_by: '',
        items: [{ spare_part_id: '', quantity: 1, unit_cost: '' }],
      });
      await loadRequests();
      setSuccess('Requisicao criada com sucesso');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar requisicao');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestStatus = async (requestId: string, status: string) => {
    if (!selectedPlant || !canWrite) return;
    setLoading(true);
    setError(null);
    try {
      await updatePurchaseRequest(selectedPlant, requestId, { status });
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar requisicao');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedPlant || !canWrite) return;
    setError(null);
    setSuccess(null);

    if (!orderForm.supplier_id) {
      setError('Selecione o fornecedor');
      return;
    }

    const items = orderForm.request_id
      ? []
      : orderForm.items.filter((item) => item.spare_part_id && item.quantity > 0);

    if (!orderForm.request_id && items.length === 0) {
      setError('Adicione pelo menos uma linha de compra');
      return;
    }

    setLoading(true);
    try {
      await createPurchaseOrder(selectedPlant, {
        supplier_id: orderForm.supplier_id,
        request_id: orderForm.request_id || undefined,
        expected_at: orderForm.expected_at || undefined,
        notes: orderForm.notes || undefined,
        items: items.length > 0 ? items : undefined,
      });
      setOrderForm({
        supplier_id: '',
        request_id: '',
        expected_at: '',
        notes: '',
        items: [{ spare_part_id: '', quantity: 1, unit_cost: '' }],
      });
      await loadOrders();
      await loadRequests();
      setSuccess('Compra criada com sucesso');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar compra');
    } finally {
      setLoading(false);
    }
  };

  const openReceive = async (orderId: string) => {
    if (!selectedPlant) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPurchaseOrder(selectedPlant, orderId);
      const items = (data as any)?.items || [];
      const rows = items.map((item: any) => {
        const remaining = Math.max(0, Number(item.quantity || 0) - Number(item.received_quantity || 0));
        return {
          purchase_order_item_id: item.id,
          spare_part_label: `${item.spare_part_code || ''} ${item.spare_part_name || ''}`.trim(),
          remaining,
          quantity: remaining > 0 ? remaining : 0,
          unit_cost: item.unit_cost || '',
        };
      });
      setReceivingItems(rows);
      setReceivingOrderId(orderId);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar compra');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!selectedPlant || !receivingOrderId) return;
    const items = receivingItems.filter((item) => item.quantity > 0);
    if (items.length === 0) {
      setError('Indique quantidades a receber');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await receivePurchaseOrder(selectedPlant, receivingOrderId, {
        items: items.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost || undefined,
        })),
      });
      setReceivingOrderId(null);
      setReceivingItems([]);
      await loadOrders();
      setSuccess('Rececao registada com sucesso');
    } catch (err: any) {
      setError(err.message || 'Erro ao receber compra');
    } finally {
      setLoading(false);
    }
  };

  const requestOptions = useMemo(() => {
    return requests.filter((req) => ['submitted', 'approved'].includes(String(req.status)));
  }, [requests]);

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_55%)] p-8 shadow-[0_28px_80px_-60px_rgba(59,130,246,0.35)]">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Compras</p>
              <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">Requisicoes e compras</h1>
              <p className="mt-2 max-w-2xl text-sm theme-text-muted">
                Registe pedidos internos, compras a fornecedores e rececoes de stock.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  loadRequests();
                  loadOrders();
                }}
                className="btn-secondary inline-flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {!canRead && (
          <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-700">
            Sem permissao para ver requisicoes e compras.
          </div>
        )}

        {canRead && !selectedPlant && (
          <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-700">
            Selecione uma planta no topo para gerir compras.
          </div>
        )}

        {canRead && selectedPlant && (
          <div className="space-y-6">
            {(error || success) && (
              <div
                className={`rounded-2xl border p-4 text-sm shadow-sm ${
                  error
                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-700'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
                }`}
              >
                {error || success}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('requests')}
                className={activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}
              >
                <ClipboardList className="h-4 w-4" />
                Requisicoes
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}
              >
                <Truck className="h-4 w-4" />
                Compras
              </button>
            </div>

            {activeTab === 'requests' && (
              <section className="rounded-[28px] border theme-border theme-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold theme-text">Nova requisicao</h2>
                    <p className="text-sm theme-text-muted">Pedido interno para aprovacao e compra.</p>
                  </div>
                  <Boxes className="h-5 w-5 text-sky-600" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    className="input"
                    placeholder="Titulo"
                    value={requestForm.title}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={!canWrite || loading}
                  />
                  <input
                    className="input"
                    placeholder="Data necessaria (YYYY-MM-DD)"
                    value={requestForm.needed_by}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, needed_by: e.target.value }))}
                    disabled={!canWrite || loading}
                  />
                  <select
                    className="input"
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, priority: e.target.value }))}
                    disabled={!canWrite || loading}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                  <input
                    className="input"
                    placeholder="Descricao"
                    value={requestForm.description}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={!canWrite || loading}
                  />
                </div>

                <div className="space-y-3">
                  {requestForm.items.map((item, idx) => (
                    <div key={idx} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
                      <select
                        className="input"
                        value={item.spare_part_id}
                        onChange={(e) => {
                          const next = [...requestForm.items];
                          next[idx] = { ...next[idx], spare_part_id: e.target.value };
                          setRequestForm((prev) => ({ ...prev, items: next }));
                        }}
                        disabled={!canWrite || loading}
                      >
                        <option value="">Selecionar peça...</option>
                        {parts.map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.code} - {part.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...requestForm.items];
                          next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                          setRequestForm((prev) => ({ ...prev, items: next }));
                        }}
                        disabled={!canWrite || loading}
                      />
                      <input
                        className="input"
                        placeholder="Custo unitario"
                        value={item.unit_cost}
                        onChange={(e) => {
                          const next = [...requestForm.items];
                          next[idx] = { ...next[idx], unit_cost: e.target.value };
                          setRequestForm((prev) => ({ ...prev, items: next }));
                        }}
                        disabled={!canWrite || loading}
                      />
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          const next = requestForm.items.filter((_, i) => i !== idx);
                          setRequestForm((prev) => ({ ...prev, items: next.length > 0 ? next : prev.items }));
                        }}
                        disabled={!canWrite || loading || requestForm.items.length === 1}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      setRequestForm((prev) => ({
                        ...prev,
                        items: [...prev.items, { spare_part_id: '', quantity: 1, unit_cost: '' }],
                      }))
                    }
                    disabled={!canWrite || loading}
                  >
                    <PackagePlus className="h-4 w-4" />
                    Adicionar linha
                  </button>
                </div>

                <button
                  onClick={handleCreateRequest}
                  className="btn-primary"
                  disabled={!canWrite || loading}
                >
                  Criar requisicao
                </button>

                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold theme-text">Requisicoes recentes</h3>
                  {requests.length === 0 && (
                    <p className="text-sm theme-text-muted">Sem requisicoes.</p>
                  )}
                  {requests.map((req) => (
                    <div key={req.id} className="rounded-2xl border theme-border theme-card p-4 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold theme-text">{req.title}</p>
                          <p className="text-xs theme-text-muted">Estado: {req.status}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {req.status === 'draft' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleRequestStatus(req.id, 'submitted')}
                              disabled={!canWrite || loading}
                            >
                              Submeter
                            </button>
                          )}
                          {req.status === 'submitted' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleRequestStatus(req.id, 'approved')}
                              disabled={!canWrite || loading}
                            >
                              Aprovar
                            </button>
                          )}
                          {['submitted', 'approved'].includes(req.status) && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleRequestStatus(req.id, 'rejected')}
                              disabled={!canWrite || loading}
                            >
                              Rejeitar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'orders' && (
              <section className="rounded-[28px] border theme-border theme-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold theme-text">Nova compra</h2>
                    <p className="text-sm theme-text-muted">Crie compras a partir de requisicoes ou manualmente.</p>
                  </div>
                  <Truck className="h-5 w-5 text-emerald-600" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    className="input"
                    value={orderForm.supplier_id}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, supplier_id: e.target.value }))}
                    disabled={!canWrite || loading}
                  >
                    <option value="">Selecionar fornecedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={orderForm.request_id}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, request_id: e.target.value }))}
                    disabled={!canWrite || loading}
                  >
                    <option value="">Requisicao (opcional)</option>
                    {requestOptions.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.title}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    placeholder="Data esperada (YYYY-MM-DD)"
                    value={orderForm.expected_at}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, expected_at: e.target.value }))}
                    disabled={!canWrite || loading}
                  />
                  <input
                    className="input"
                    placeholder="Notas"
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                    disabled={!canWrite || loading}
                  />
                </div>

                {!orderForm.request_id && (
                  <div className="space-y-3">
                    {orderForm.items.map((item, idx) => (
                      <div key={idx} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
                        <select
                          className="input"
                          value={item.spare_part_id}
                          onChange={(e) => {
                            const next = [...orderForm.items];
                            next[idx] = { ...next[idx], spare_part_id: e.target.value };
                            setOrderForm((prev) => ({ ...prev, items: next }));
                          }}
                          disabled={!canWrite || loading}
                        >
                          <option value="">Selecionar peça...</option>
                          {parts.map((part) => (
                            <option key={part.id} value={part.id}>
                              {part.code} - {part.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...orderForm.items];
                            next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                            setOrderForm((prev) => ({ ...prev, items: next }));
                          }}
                          disabled={!canWrite || loading}
                        />
                        <input
                          className="input"
                          placeholder="Custo unitario"
                          value={item.unit_cost}
                          onChange={(e) => {
                            const next = [...orderForm.items];
                            next[idx] = { ...next[idx], unit_cost: e.target.value };
                            setOrderForm((prev) => ({ ...prev, items: next }));
                          }}
                          disabled={!canWrite || loading}
                        />
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            const next = orderForm.items.filter((_, i) => i !== idx);
                            setOrderForm((prev) => ({ ...prev, items: next.length > 0 ? next : prev.items }));
                          }}
                          disabled={!canWrite || loading || orderForm.items.length === 1}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setOrderForm((prev) => ({
                          ...prev,
                          items: [...prev.items, { spare_part_id: '', quantity: 1, unit_cost: '' }],
                        }))
                      }
                      disabled={!canWrite || loading}
                    >
                      <PackagePlus className="h-4 w-4" />
                      Adicionar linha
                    </button>
                  </div>
                )}

                <button
                  onClick={handleCreateOrder}
                  className="btn-primary"
                  disabled={!canWrite || loading}
                >
                  Criar compra
                </button>

                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold theme-text">Compras recentes</h3>
                  {orders.length === 0 && <p className="text-sm theme-text-muted">Sem compras.</p>}
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border theme-border theme-card p-4 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold theme-text">{order.supplier_name || 'Fornecedor'}</p>
                          <p className="text-xs theme-text-muted">Estado: {order.status}</p>
                        </div>
                        <button
                          className="btn-secondary"
                          onClick={() => openReceive(order.id)}
                          disabled={!canWrite || loading}
                        >
                          Receber
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {receivingOrderId && (
                  <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 space-y-3">
                    <h4 className="text-sm font-semibold theme-text">Rececao</h4>
                    {receivingItems.map((item) => (
                      <div key={item.purchase_order_item_id} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                        <div className="text-sm theme-text">{item.spare_part_label}</div>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={item.remaining}
                          value={item.quantity}
                          onChange={(e) => {
                            const next = receivingItems.map((row) =>
                              row.purchase_order_item_id === item.purchase_order_item_id
                                ? { ...row, quantity: Number(e.target.value) }
                                : row,
                            );
                            setReceivingItems(next);
                          }}
                        />
                        <input
                          className="input"
                          placeholder="Custo unitario"
                          value={item.unit_cost || ''}
                          onChange={(e) => {
                            const next = receivingItems.map((row) =>
                              row.purchase_order_item_id === item.purchase_order_item_id
                                ? { ...row, unit_cost: e.target.value }
                                : row,
                            );
                            setReceivingItems(next);
                          }}
                        />
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-primary" onClick={handleReceive} disabled={loading}>
                        Confirmar rececao
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setReceivingOrderId(null);
                          setReceivingItems([]);
                        }}
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
