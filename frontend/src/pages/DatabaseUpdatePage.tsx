import { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, CheckCircle, Database, RefreshCw, Server, Wrench } from 'lucide-react';
import {
  clearAllData,
  getSetupStatus,
  initializeDatabase,
  applyDbCorrections,
  patchWorkOrders,
  patchWorkOrdersDowntimeRca,
  patchMaintenancePlansToleranceMode,
  patchMaintenancePlansScheduleAnchorMode,
  patchStockReservations,
  runMigrations,
  seedDemoData,
} from '../services/api';

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

interface MigrationResult {
  files?: string[];
}

interface CorrectionsResult {
  migrations?: string[];
  patches?: string[];
}

interface DatabaseUpdatePageProps {
  embedded?: boolean;
}

export function DatabaseUpdatePage({ embedded = false }: DatabaseUpdatePageProps) {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [migrations, setMigrations] = useState<string[]>([]);

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSetupStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao verificar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm('Deseja aplicar todas as migracoes SQL disponiveis?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result: MigrationResult = await runMigrations();
      const files = result?.files || [];
      setMigrations(files);
      setSuccess(
        files.length > 0
          ? `Migracoes aplicadas: ${files.join(', ')}`
          : 'Nenhuma migracao encontrada para executar.'
      );
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao executar migracoes');
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

  const handleWorkOrdersPatch = async () => {
    if (!confirm('Aplicar patch para corrigir ordens de trabalho?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await patchWorkOrders();
      setSuccess('Patch aplicado. A coluna work_performed foi verificada/adicionada.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar patch');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrdersDowntimeRcaPatch = async () => {
    if (!confirm('Aplicar patch para adicionar campos de paragem e causa raiz nas ordens?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await patchWorkOrdersDowntimeRca();
      setSuccess('Patch aplicado. Campos downtime_type/downtime_category/root_cause/corrective_action foram verificados/adicionados.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar patch');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenancePlansToleranceModePatch = async () => {
    if (!confirm('Aplicar patch para adicionar tolerance_mode nos planos de manutenção?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await patchMaintenancePlansToleranceMode();
      setSuccess('Patch aplicado. A coluna tolerance_mode foi verificada/adicionada em maintenance_plans.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar patch');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenancePlansScheduleAnchorModePatch = async () => {
    if (!confirm('Aplicar patch para adicionar schedule_anchor_mode nos planos de manutenção?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await patchMaintenancePlansScheduleAnchorMode();
      setSuccess('Patch aplicado. A coluna schedule_anchor_mode foi verificada/adicionada em maintenance_plans.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar patch');
    } finally {
      setLoading(false);
    }
  };

  const handleStockReservationsPatch = async () => {
    if (!confirm('Aplicar patch para criar a tabela de reservas de stock (por ordem)?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await patchStockReservations();
      setSuccess('Patch aplicado. A tabela stock_reservations foi verificada/criada.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar patch');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCorrections = async () => {
    if (!confirm('Aplicar todas as correcoes estruturais na base de dados?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result: CorrectionsResult = await applyDbCorrections();
      const migrationsList = result?.migrations || [];
      const patchesList = result?.patches || [];
      const details = [
        migrationsList.length > 0
          ? `Migracoes: ${migrationsList.join(', ')}`
          : 'Sem migracoes pendentes.',
        patchesList.length > 0
          ? `Patches: ${patchesList.join(', ')}`
          : 'Sem patches adicionais.',
      ].join('\n');
      setMigrations(migrationsList);
      setSuccess(`Correcoes aplicadas com sucesso.\n${details}`);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar correcoes');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('Deseja adicionar dados demo?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await seedDemoData();
      setSuccess('Dados demo processados com sucesso.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar dados demo');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Isto vai apagar TODOS os dados. Tem certeza?')) {
      return;
    }

    if (!confirm('Ultima confirmacao: deseja mesmo apagar tudo?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await clearAllData();
      setSuccess('Dados apagados com sucesso.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao apagar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const content = (
    <div className={embedded ? 'space-y-6 font-display' : 'p-6 max-w-5xl mx-auto'}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary-600" />
          Atualizar Base de Dados
        </h1>
        <p className="text-gray-600 mt-2">
          Aplicar migracoes e gerir o estado da base de dados
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            Estado e Acoes
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMigrate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Executar Migracoes
            </button>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Estado
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 whitespace-pre-line">{success}</div>
          </div>
        )}

        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Ligacao</div>
              <div className="flex items-center gap-2">
                {status.connected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-600">Conectado</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-600">Desconectado</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Tabelas</div>
              <div className="text-2xl font-bold text-gray-900">{status.tablesCount}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Utilizadores</div>
              <div className="text-2xl font-bold text-gray-900">{status.counts.users}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Equipamentos</div>
              <div className="text-2xl font-bold text-gray-900">{status.counts.assets}</div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Correcoes estruturais</p>
              <p className="text-xs text-amber-800 mt-1">
                Executa migracoes e patches recomendados para manter a estrutura atualizada.
              </p>
            </div>
            <button
              onClick={handleApplyCorrections}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:bg-gray-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Aplicar correcoes gerais
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-amber-800">
                Use o patch abaixo apenas para corrigir falhas nas ordens de trabalho.
              </p>
            </div>
            <button
              onClick={handleWorkOrdersPatch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Aplicar patch ordens
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-amber-800">
                Adiciona os novos campos de paragem e análise (causa raiz / ação corretiva) nas ordens.
              </p>
            </div>
            <button
              onClick={handleWorkOrdersDowntimeRcaPatch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Patch paragem / causa raiz
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-amber-800">
                Adiciona o modo de tolerância (soft/hard) nos planos de manutenção.
              </p>
            </div>
            <button
              onClick={handleMaintenancePlansToleranceModePatch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Patch tolerância (planos)
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-amber-800">
                Adiciona a âncora de cadência (fixo vs intervalo) nos planos de manutenção.
              </p>
            </div>
            <button
              onClick={handleMaintenancePlansScheduleAnchorModePatch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Patch âncora (planos)
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-amber-800">
                Cria a tabela de reservas de stock (por ordem) para permitir reservar peças.
              </p>
            </div>
            <button
              onClick={handleStockReservationsPatch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Patch reservas (stock)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleInitialize}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition"
          >
            <Server className="w-4 h-4" />
            Inicializar Tenant
          </button>

          <button
            onClick={handleSeedData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition"
          >
            <Database className="w-4 h-4" />
            Carregar Dados Demo
          </button>

          <button
            onClick={handleClearData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition"
          >
            <AlertCircle className="w-4 h-4" />
            Apagar Todos os Dados
          </button>

          {migrations.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
              <div className="font-semibold text-gray-900 mb-2">Migracoes executadas</div>
              <ul className="space-y-1">
                {migrations.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
}
