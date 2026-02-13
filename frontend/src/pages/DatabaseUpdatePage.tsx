import { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, CheckCircle, Database, RefreshCw, Server, Wrench } from 'lucide-react';
import {
  clearAllData,
  getSetupStatus,
  getSqlMigrationsStatus,
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
  pendingFilesBefore?: string[];
  pendingFilesAfter?: string[];
  executedFilesAll?: string[];
}

interface SqlMigrationsStatus {
  migrationsDir: string | null;
  availableFiles: string[];
  executedFiles: string[];
  pendingFiles: string[];
}

interface CorrectionsResult {
  migrations?: string[];
  patches?: string[];
}

interface DatabaseUpdatePageProps {
  embedded?: boolean;
}

type DbUpdatesSection = 'updates' | 'credentials' | 'danger';

export function DatabaseUpdatePage({ embedded = false }: DatabaseUpdatePageProps) {
  const [section, setSection] = useState<DbUpdatesSection>('updates');
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [sqlStatus, setSqlStatus] = useState<SqlMigrationsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [migrations, setMigrations] = useState<string[]>([]);
  const [patches, setPatches] = useState<string[]>([]);

  const sectionButtonClass = (key: DbUpdatesSection) =>
    key === section
      ? 'btn-primary inline-flex items-center gap-2'
      : 'btn-secondary inline-flex items-center gap-2';

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSetupStatus();
      setStatus(data);
      const mig = await getSqlMigrationsStatus();
      setSqlStatus(mig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao verificar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm('Deseja aplicar apenas as migracoes SQL pendentes?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const before = await getSqlMigrationsStatus();
      const result: MigrationResult = await runMigrations();
      const after = await getSqlMigrationsStatus();
      setSqlStatus(after);

      const files = result?.files || [];
      setMigrations(files);
      setPatches([]);

      const details = [
        `Pendentes antes: ${before?.pendingFiles?.length ?? 0}`,
        `Pendentes agora: ${after?.pendingFiles?.length ?? 0}`,
      ].join('\n');

      setSuccess(
        `${
          files.length > 0
            ? `Migracoes aplicadas: ${files.join(', ')}`
            : 'Nenhuma migracao pendente para executar.'
        }\n${details}`,
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
      const before = await getSqlMigrationsStatus();
      const result: CorrectionsResult = await applyDbCorrections();
      const after = await getSqlMigrationsStatus();
      setSqlStatus(after);

      const migrationsList = result?.migrations || [];
      const patchesList = result?.patches || [];

      const details = [
        `Migracoes executadas agora: ${migrationsList.length}`,
        `Pendentes antes: ${before?.pendingFiles?.length ?? 0}`,
        `Pendentes agora: ${after?.pendingFiles?.length ?? 0}`,
        patchesList.length > 0 ? `Patches aplicados: ${patchesList.join(', ')}` : 'Sem patches adicionais.',
      ].join('\n');

      setMigrations(migrationsList);
      setPatches(patchesList);
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

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection('updates')}
            className={sectionButtonClass('updates')}
          >
            <Wrench className="w-4 h-4" />
            Atualizacoes
          </button>
          <button
            type="button"
            onClick={() => setSection('credentials')}
            className={sectionButtonClass('credentials')}
          >
            <Database className="w-4 h-4" />
            Credenciais
          </button>
          <button
            type="button"
            onClick={() => setSection('danger')}
            className={sectionButtonClass('danger')}
          >
            <AlertCircle className="w-4 h-4" />
            Zona Perigosa
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

      {section === 'updates' && (
        <div className="space-y-6">
          <div className="rounded-3xl border theme-border theme-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold theme-text flex items-center gap-2">
                <Database className="w-6 h-6 text-[color:var(--dash-accent)]" />
                Estado
              </h2>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {status && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold theme-text">Migracoes SQL</p>
                <p className="text-xs theme-text-muted mt-1">
                  Executa apenas as migracoes pendentes em scripts/database/migrations.
                </p>
              </div>
              <button
                onClick={handleMigrate}
                disabled={loading || (sqlStatus?.pendingFiles?.length ?? 0) === 0}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Wrench className="w-4 h-4" />
                Executar Pendentes
              </button>
            </div>

            {sqlStatus && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-sm theme-text-muted mb-1">Pendentes</div>
                  <div className="text-2xl font-bold theme-text">{sqlStatus.pendingFiles.length}</div>
                </div>
                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-sm theme-text-muted mb-1">Executadas</div>
                  <div className="text-2xl font-bold theme-text">{sqlStatus.executedFiles.length}</div>
                </div>
                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 col-span-2">
                  <div className="text-sm theme-text-muted mb-1">Diretorio</div>
                  <div className="text-sm font-semibold theme-text break-all">{sqlStatus.migrationsDir ?? '—'}</div>
                </div>
              </div>
            )}

            {sqlStatus?.pendingFiles?.length ? (
              <div className="mt-4 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
                <div className="font-semibold theme-text mb-2">Pendentes</div>
                <ul className="space-y-1">
                  {sqlStatus.pendingFiles.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-4 text-xs theme-text-muted">Sem migracoes pendentes.</div>
            )}
          </div>

          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 shadow-sm">
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
                Aplicar
              </button>
            </div>

            {(migrations.length > 0 || patches.length > 0) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
                  <div className="font-semibold theme-text mb-2">Executado agora</div>
                  <div className="text-xs theme-text-muted mb-2">Migracoes</div>
                  {migrations.length > 0 ? (
                    <ul className="space-y-1">
                      {migrations.map((file) => (
                        <li key={file}>{file}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs theme-text-muted">Sem migracoes executadas.</div>
                  )}
                </div>

                <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
                  <div className="font-semibold theme-text mb-2">Executado agora</div>
                  <div className="text-xs theme-text-muted mb-2">Patches</div>
                  {patches.length > 0 ? (
                    <ul className="space-y-1">
                      {patches.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs theme-text-muted">Sem patches aplicados.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'credentials' && (
        <div className="rounded-3xl border theme-border theme-card p-6 shadow-sm">
          <div className="text-sm font-semibold theme-text">Credenciais demo</div>
          <p className="mt-1 text-xs theme-text-muted">
            Após “Carregar Dados Demo”, pode entrar com qualquer perfil.
          </p>
          <div className="mt-3 grid gap-2 text-xs theme-text">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">Super Administrador</span>
                <span className="theme-text-muted"> — superadmin (superadmin@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">SuperAdmin@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">Admin Empresa</span>
                <span className="theme-text-muted"> — admin (admin@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Admin@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">Gestor de Manutencao</span>
                <span className="theme-text-muted"> — gestor (gestor@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Gestor@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">Supervisor</span>
                <span className="theme-text-muted"> — supervisor (supervisor@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Supervisor@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">Tecnico</span>
                <span className="theme-text-muted"> — tecnico (tecnico@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Tecnico@123456</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold theme-text">Operador</span>
                <span className="theme-text-muted"> — operador (operador@cmms.com)</span>
              </div>
              <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">Operador@123456</div>
            </div>
          </div>
        </div>
      )}

      {section === 'danger' && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold theme-text">Zona Perigosa</p>
            <p className="text-xs theme-text-muted mt-1">
              Acoes destrutivas ou que alteram dados de forma significativa. Use com cuidado.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <button
              onClick={handleInitialize}
              disabled={loading}
              className="btn-secondary inline-flex w-full items-center justify-center gap-2 py-3 border-rose-500/30 bg-rose-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Server className="w-4 h-4" />
              Inicializar Tenant
            </button>

            <button
              onClick={handleSeedData}
              disabled={loading}
              className="btn-secondary inline-flex w-full items-center justify-center gap-2 py-3 border-rose-500/30 bg-rose-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
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
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
}
