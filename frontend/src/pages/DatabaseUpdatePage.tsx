import { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, CheckCircle, Database, RefreshCw, Server, Wrench } from 'lucide-react';
import {
  clearAllData,
  getSetupStatus,
  initializeDatabase,
  applyDbCorrections,
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

  const handleApplyCorrections = async () => {
    if (!confirm('Aplicar todas as atualizacoes gerais na base de dados?')) {
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
        <h1 className="text-3xl font-bold theme-text flex items-center gap-3">
          <Wrench className="w-8 h-8 text-[color:var(--dash-accent)]" />
          Atualizar Base de Dados
        </h1>
        <p className="theme-text-muted mt-2">
          Aplicar migracoes e gerir o estado da base de dados
        </p>
      </div>

      <div className="rounded-3xl border theme-border theme-card p-6 shadow-sm mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold theme-text flex items-center gap-2">
            <Database className="w-6 h-6 text-[color:var(--dash-accent)]" />
            Estado e Acoes
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMigrate}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Wrench className="w-4 h-4" />
              Executar Migracoes
            </button>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Estado
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm theme-text">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm theme-text whitespace-pre-line">{success}</div>
          </div>
        )}

        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
              <div className="text-sm theme-text-muted mb-1">Ligacao</div>
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
              <div className="text-sm theme-text-muted mb-1">Tabelas</div>
              <div className="text-2xl font-bold theme-text">{status.tablesCount}</div>
            </div>

            <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
              <div className="text-sm theme-text-muted mb-1">Utilizadores</div>
              <div className="text-2xl font-bold theme-text">{status.counts.users}</div>
            </div>

            <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
              <div className="text-sm theme-text-muted mb-1">Equipamentos</div>
              <div className="text-2xl font-bold theme-text">{status.counts.assets}</div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold theme-text">Atualizacoes gerais</p>
              <p className="text-xs theme-text-muted mt-1">
                Executa migracoes e patches recomendados para manter a estrutura atualizada.
              </p>
            </div>
            <button
              onClick={handleApplyCorrections}
              disabled={loading}
              className="btn-secondary inline-flex items-center gap-2 border-amber-500/30 bg-amber-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Wrench className="w-4 h-4" />
              Atualizacoes Gerais
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleInitialize}
            disabled={loading}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Server className="w-4 h-4" />
            Inicializar Tenant
          </button>

          <button
            onClick={handleSeedData}
            disabled={loading}
            className="btn-secondary inline-flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Database className="w-4 h-4" />
            Carregar Dados Demo
          </button>

          <button
            onClick={handleClearData}
            disabled={loading}
            className="btn-secondary inline-flex w-full items-center justify-center gap-2 py-3 border-rose-500/30 bg-rose-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <AlertCircle className="w-4 h-4" />
            Apagar Todos os Dados
          </button>

          {migrations.length > 0 && (
            <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
              <div className="font-semibold theme-text mb-2">Migracoes executadas</div>
              <ul className="space-y-1">
                {migrations.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
          <div className="text-sm font-semibold theme-text">Credenciais demo</div>
          <p className="mt-1 text-xs theme-text-muted">
            Após “Carregar Dados Demo”, pode entrar com qualquer role.
          </p>
          <div className="mt-3 grid gap-2 text-xs theme-text">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">admin_empresa</span>
                <span className="theme-text-muted"> — admin (admin@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Admin@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">gestor_manutencao</span>
                <span className="theme-text-muted"> — gestor (gestor@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Gestor@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">supervisor</span>
                <span className="theme-text-muted"> — supervisor (supervisor@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Supervisor@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">tecnico</span>
                <span className="theme-text-muted"> — tech (tech@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Tech@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">operador</span>
                <span className="theme-text-muted"> — operador (operador@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Operador@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">leitor</span>
                <span className="theme-text-muted"> — leitor (leitor@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Leitor@123456</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
}
