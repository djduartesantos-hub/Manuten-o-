import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle, Trash2, RefreshCw, Server } from 'lucide-react';
import { getSetupStatus, seedDemoData, clearAllData } from '../services/api';

interface DatabaseStatus {
  connected: boolean;
  tablesCount: number;
  hasData: {
    users: boolean;
    plants: boolean;
    assets: boolean;
  };
  counts: {
    users: number;
    plants: number;
    assets: number;
  };
}

export function AdminSetupPage() {
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
    if (!confirm('Deseja adicionar dados demonstrativos? Isto irá adicionar utilizadores, equipamentos e outros dados de exemplo.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await seedDemoData();
      setSuccess('Dados demonstrativos adicionados com sucesso!');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed data');
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Server className="w-8 h-8 text-primary-600" />
          Configuração da Base de Dados
        </h1>
        <p className="text-gray-600 mt-2">
          Gerir a base de dados e dados demonstrativos do sistema
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            Estado da Base de Dados
          </h2>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
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
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        {status && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Ligação</div>
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

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Estado dos Dados:</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  {status.hasData.users ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-sm text-gray-700">Utilizadores</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.hasData.plants ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-sm text-gray-700">Fábricas</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.hasData.assets ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-sm text-gray-700">Equipamentos</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações Disponíveis</h2>
        
        <div className="space-y-4">
          {/* Seed Demo Data */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Adicionar Dados Demonstrativos</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Preenche a base de dados com dados de exemplo: utilizadores, fábricas, equipamentos, planos de manutenção e peças sobressalentes.
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 2 utilizadores (Admin e Técnico)</li>
                  <li>• 1 fábrica (Fábrica Principal)</li>
                  <li>• 5 equipamentos de exemplo</li>
                  <li>• 3 planos de manutenção preventiva</li>
                  <li>• 5 peças sobressalentes</li>
                </ul>
              </div>
              <button
                onClick={handleSeedData}
                disabled={loading}
                className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium whitespace-nowrap"
              >
                Adicionar Dados
              </button>
            </div>
          </div>

          {/* Clear All Data */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Limpar Todos os Dados
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong className="text-red-700">⚠️ ATENÇÃO:</strong> Esta ação irá apagar TODOS os dados da base de dados de forma permanente. Esta operação não pode ser revertida!
                </p>
                <p className="text-xs text-red-600">
                  Use apenas para testes ou antes de reiniciar o sistema do zero.
                </p>
              </div>
              <button
                onClick={handleClearData}
                disabled={loading}
                className="ml-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition font-medium whitespace-nowrap flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-900">
          <strong>Nota:</strong> Estas operações requerem permissões de superadmin. Certifique-se de que está autenticado como administrador do sistema.
        </p>
      </div>
    </div>
  );
}
