import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin } from '../services/api';
import { AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuth();
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('Admin@123456');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiLogin(username.trim().toLowerCase(), password);
      setAuth(result.user, result.token, result.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-slate-900 relative overflow-hidden">
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-amber-200/60 blur-3xl" />
      <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-teal-200/70 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:items-stretch">
        <div className="flex w-full flex-col justify-center lg:w-1/2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Maintenance Intelligence Suite
          </div>
          <h1 className="mt-6 text-4xl font-semibold text-slate-900 font-display lg:text-5xl">
            CMMS Enterprise
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Operacoes de manutencao, ativos e equipas num unico cockpit. Entre com seu username e
            acompanhe a performance em tempo real.
          </p>
          <div className="mt-8 grid gap-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              Dashboards com KPIs, alertas e backlog sempre atualizados.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              Plano, execute e revise ordens com equipas distribuídas.
            </div>
          </div>
        </div>

        <div className="flex w-full items-center lg:w-1/2">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 font-display">Entrar</h2>
              <p className="text-sm text-slate-500">Indique as suas credenciais.</p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-slate-500 uppercase tracking-[0.2em]">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-500 uppercase tracking-[0.2em]">
                  Senha
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-amber-400 focus:outline-none pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-amber-200/60 bg-amber-50/70 p-4 text-xs text-amber-900">
              <p className="font-semibold">Demo rapido</p>
              <p>Username: admin</p>
              <p>Senha: Admin@123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
