import { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Database, AlertCircle, CheckCircle, Trash2, RefreshCw, Server } from 'lucide-react';
import { getSetupStatus, seedDemoData, clearAllData, initializeDatabase } from '../services/api';

interface DatabaseStatus {
  connected: boolean;
  tablesCount: number;
  tables?: string[];
  hasData: {
    tenants: boolean;
    users: boolean;
    plants: boolean;
    assets: boolean;
    maintenancePlans: boolean;
    maintenanceTasks: boolean;
    spareParts: boolean;
    stockMovements: boolean;
    workOrders: boolean;
    categories: boolean;
    suppliers: boolean;
  };
  counts: {
    tenants: number;
    users: number;
    plants: number;
    assets: number;
    maintenancePlans: number;
    maintenanceTasks: number;
    spareParts: number;
    stockMovements: number;
    workOrders: number;
    categories: number;
    suppliers: number;
  };
}

interface AdminSetupPageProps {
  embedded?: boolean;
}

export function AdminSetupPage({ embedded = false }: AdminSetupPageProps) {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSetupStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('Deseja adicionar dados demonstrativos? Isto pode adicionar novos dados de exemplo ou informar se já existem.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result: any = await seedDemoData();
      
      // Check if data was added or already existed
      if (result?.added) {
        const { users, plants, assets, maintenancePlans, workOrders, spareParts } = result.added;
        const totalAdded =
          users + plants + assets + maintenancePlans + workOrders + spareParts;
        
        if (totalAdded > 0) {
          setSuccess(
            `✅ Dados adicionados com sucesso!\n` +
            `• ${users} utilizador(es)\n` +
            `• ${plants} fábrica(s)\n` +
            `• ${assets} equipamento(s)\n` +
            `• ${maintenancePlans} plano(s) de manutenção\n` +
            `• ${workOrders} ordem(ns) de trabalho\n` +
            `• ${spareParts} peça(s) sobressalente(s)`
          );
        } else {
          setSuccess('ℹ️ Dados demonstrativos já existem. Nenhuma alteração foi feita.');
        }
      } else {
        setSuccess('Dados demonstrativos processados com sucesso!');
      }
      
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed data');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!confirm('Deseja inicializar a base de dados para este tenant?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await initializeDatabase();
      setSuccess('Base de dados inicializada com sucesso.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao inicializar');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isto irá APAGAR TODOS os dados da base de dados! Esta ação não pode ser revertida. Tem certeza?')) {
      return;
    }

    if (!confirm('Última confirmação: Tem ABSOLUTA CERTEZA que deseja apagar todos os dados?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await clearAllData();
      setSuccess('Todos os dados foram apagados com sucesso!');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const content = (
    <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_60%)] p-8 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.35)]">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Administracao
              </p>
              <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
                Configuracao da base de dados
              </h1>
              <p className="mt-2 text-sm theme-text-muted">
                Gerencie a base de dados, seeds e estado operacional do sistema.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleInitialize}
                disabled={loading}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Server className="w-4 h-4" />
                Inicializar
              </button>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {/* Status Card */}
        <div className="relative overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,#10b981,#38bdf8)]" />
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
              <Database className="w-5 h-5 text-[color:var(--dash-accent)]" />
              Estado da Base de Dados
            </h2>
            <div className="text-xs theme-text-muted">Atualize para ver o estado real</div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm theme-text">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm theme-text whitespace-pre-line">{success}</div>
            </div>
          )}

          {status && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Ligacao</div>
                  <div className="flex items-center gap-2">
                    {status.connected ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="font-semibold text-emerald-500">Conectado</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                        <span className="font-semibold text-rose-500">Desconectado</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Tabelas</div>
                  <div className="text-2xl font-semibold theme-text">{status.tablesCount}</div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Utilizadores</div>
                  <div className="text-2xl font-semibold theme-text">{status.counts.users}</div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Equipamentos</div>
                  <div className="text-2xl font-semibold theme-text">{status.counts.assets}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Planos</div>
                  <div className="text-2xl font-semibold theme-text">
                    {status.counts.maintenancePlans}
                  </div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Tarefas</div>
                  <div className="text-2xl font-semibold theme-text">
                    {status.counts.maintenanceTasks}
                  </div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Pecas</div>
                  <div className="text-2xl font-semibold theme-text">
                    {status.counts.spareParts}
                  </div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Movimentos</div>
                  <div className="text-2xl font-semibold theme-text">
                    {status.counts.stockMovements}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Ordens</div>
                  <div className="text-2xl font-semibold theme-text">
                    {status.counts.workOrders}
                  </div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Categorias</div>
                  <div className="text-2xl font-semibold theme-text">
                    {status.counts.categories}
                  </div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Fornecedores</div>
                  <div className="text-2xl font-semibold theme-text">
                    {status.counts.suppliers}
                  </div>
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs theme-text-muted mb-1">Plantas</div>
                  <div className="text-2xl font-semibold theme-text">{status.counts.plants}</div>
                </div>
              </div>

              <div className="border-t theme-border pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.25em] theme-text-muted mb-3">
                  Estado dos dados
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                    <div className="text-xs theme-text-muted mb-1">Tenants</div>
                    <div className="text-2xl font-semibold theme-text">
                      {status.counts.tenants}
                    </div>
                  </div>
                  {(
                    [
                      { key: 'users', label: 'Utilizadores' },
                      { key: 'plants', label: 'Fabricas' },
                      { key: 'assets', label: 'Equipamentos' },
                      { key: 'maintenancePlans', label: 'Planos' },
                      { key: 'maintenanceTasks', label: 'Tarefas' },
                      { key: 'spareParts', label: 'Pecas' },
                      { key: 'stockMovements', label: 'Movimentos' },
                      { key: 'workOrders', label: 'Ordens' },
                      { key: 'categories', label: 'Categorias' },
                      { key: 'suppliers', label: 'Fornecedores' },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2"
                    >
                      {status.hasData[item.key] ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-xs theme-text">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {status.tables && status.tables.length > 0 && (
                <div className="border-t theme-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.25em] theme-text-muted mb-3">
                    Tabelas detectadas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {status.tables.map((table) => (
                      <span
                        key={table}
                        className="rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs theme-text-muted"
                      >
                        {table}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Card */}
        <div className="rounded-[28px] border theme-border theme-card p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
          <h2 className="text-lg font-semibold theme-text mb-4">Acoes disponiveis</h2>

          <div className="space-y-4">
          {/* Seed Demo Data */}
            <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 p-4">
              <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold theme-text mb-2">Adicionar Dados Demonstrativos</h3>
                <p className="text-sm theme-text-muted mb-3">
                  Preenche a base de dados com dados de exemplo: utilizadores, fábricas, equipamentos, planos, peças, fornecedores, kits e reservas.
                  <span className="block mt-1 text-xs text-sky-700 font-medium">
                    ✓ Seguro: Pode executar múltiplas vezes (não cria duplicatas)
                  </span>
                </p>
                <ul className="text-xs theme-text-muted space-y-1">
                  <li>• 2 utilizadores (Admin e Técnico)</li>
                  <li>• 1 fábrica (Fábrica Principal)</li>
                  <li>• 5 equipamentos de exemplo</li>
                  <li>• 1 categoria de ativos</li>
                  <li>• 3 planos de manutenção preventiva + tarefas</li>
                  <li>• 5 peças sobressalentes com stock inicial</li>
                  <li>• 1 fornecedor de exemplo</li>
                  <li>• 1 kit de manutenção + itens</li>
                  <li>• 1 reserva de stock associada a uma ordem</li>
                </ul>
              </div>
              <button
                onClick={handleSeedData}
                disabled={loading}
                className="btn-primary whitespace-nowrap"
              >
                Adicionar Dados
              </button>
            </div>
          </div>

          {/* Clear All Data */}
            <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-4">
              <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold theme-text mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  Limpar Todos os Dados
                </h3>
                <p className="text-sm theme-text-muted mb-2">
                  <strong className="text-rose-700">⚠️ ATENÇÃO:</strong> Esta ação irá apagar TODOS os dados da base de dados de forma permanente. Esta operação não pode ser revertida!
                </p>
                <p className="text-xs text-rose-600">
                  Use apenas para testes ou antes de reiniciar o sistema do zero.
                </p>
              </div>
              <button
                onClick={handleClearData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Info Footer */}
        <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm theme-text">
            <strong>Nota:</strong> Estas operações requerem permissões de superadmin. Certifique-se de que está autenticado como administrador do sistema.
          </p>
        </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
}
