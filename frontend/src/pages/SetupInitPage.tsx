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
      spareParts: number;
    };
    note: string;
  };
  adminUsername: string;
  adminEmail: string;
  passwordHint: string;
}

export function SetupInitPage() {
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
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Database className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Setup Inicial da Base de Dados</h1>
          <p className="mt-2 text-sm text-slate-600">
            Esta pagina apaga todos os dados existentes, executa migracoes e carrega dados demo.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBootstrap}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:bg-slate-400"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Executar Setup
            </button>
            <div className="text-xs text-slate-500">
              Sem login. O setup apaga todos os dados antes de recriar.
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="h-5 w-5" />
                Setup concluido
              </div>
              <div className="mt-3 grid gap-2 text-sm text-emerald-900">
                <div>Login: {result.loginUrl}</div>
                <div>Admin: {result.adminUsername}</div>
                <div>Email: {result.adminEmail}</div>
                <div>Senha: {result.passwordHint}</div>
              </div>
              <div className="mt-3 text-xs text-emerald-800">
                Migracoes executadas: {result.migrations.length > 0 ? result.migrations.join(', ') : 'nenhuma'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
