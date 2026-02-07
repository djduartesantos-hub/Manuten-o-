import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Database, RefreshCw, Server, Wrench } from 'lucide-react';
import {
  clearAllData,
  getSetupStatus,
  initializeDatabase,
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

export function DatabaseUpdatePage() {
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
}
