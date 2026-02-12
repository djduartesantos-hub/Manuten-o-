import { useState } from 'react';
import { AlertCircle, CheckCircle, Database, Loader2 } from 'lucide-react';
import { bootstrapDatabase } from '../services/api';

interface BootstrapResult {
  tenantId: string;
  loginUrl: string;
  migrations: string[];
  seed: {
    added: {
      users: number;
      plants: number;
      assets: number;
      maintenancePlans: number;
      workOrders: number;
      spareParts: number;
    };
    note: string;
  };
  adminUsername: string;
  adminEmail: string;
  passwordHint: string;
  demoUsers?: Array<{ role: string; username: string; email: string; passwordHint: string }>;
}

interface SetupInitPageProps {
  embedded?: boolean;
}

export function SetupInitPage({ embedded = false }: SetupInitPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BootstrapResult | null>(null);

  const handleBootstrap = async () => {
    if (!confirm('Isto vai APAGAR TODOS os dados e recriar a base de dados. Continuar?')) {
      return;
    }

    if (!confirm('Confirmacao final: deseja mesmo apagar tudo e executar o setup?')) {
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await bootstrapDatabase();
      setResult(data as BootstrapResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? '' : 'min-h-screen theme-bg px-6 py-12'}>
      <div className={embedded ? 'max-w-3xl' : 'mx-auto max-w-3xl'}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Database className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold theme-text">Setup Inicial da Base de Dados</h1>
          <p className="mt-2 text-sm theme-text-muted">
            Esta pagina apaga todos os dados existentes, executa migracoes e carrega dados demo.
          </p>
        </div>

        <div className="rounded-3xl border theme-border theme-card p-6 shadow-sm">
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBootstrap}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Executar Setup
            </button>
            <div className="text-xs theme-text-muted">
              Sem login. O setup apaga todos os dados antes de recriar.
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm theme-text">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm theme-text">
              <div className="flex items-center gap-2 font-semibold theme-text">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Setup concluido
              </div>
              <div className="mt-3 grid gap-2 text-sm theme-text">
                <div>Login: {result.loginUrl}</div>
                <div>Admin: {result.adminUsername}</div>
                <div>Email: {result.adminEmail}</div>
                <div>Senha: {result.passwordHint}</div>
              </div>

              {Array.isArray(result.demoUsers) && result.demoUsers.length > 0 ? (
                <div className="mt-4 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                  <div className="text-sm font-semibold theme-text">Credenciais demo</div>
                  <div className="mt-3 grid gap-2 text-xs theme-text">
                    {result.demoUsers.map((u) => (
                      <div key={u.role} className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold theme-text">{u.role}</span>
                          <span className="theme-text-muted"> — {u.username} ({u.email})</span>
                        </div>
                        <div className="shrink-0 rounded-full border theme-border theme-card px-3 py-1 font-semibold">
                          {u.passwordHint}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 text-xs theme-text-muted">
                Migracoes executadas: {result.migrations.length > 0 ? result.migrations.join(', ') : 'nenhuma'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
