import React, { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin } from '../services/api';
import { AlertCircle, Eye, EyeOff, Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getHomeRouteForRole } from '../utils/homeRoute';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('Admin@123456');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const isDark = theme.name === 'dark';

  const homeRoute = getHomeRouteForRole(user?.role);
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(homeRoute, { replace: true });
    }
  }, [homeRoute, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiLogin(username.trim().toLowerCase(), password);
      setAuth(result.user, result.token, result.refreshToken);
      navigate(getHomeRouteForRole(result.user?.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden theme-bg theme-text"
    >
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl auth-float" />
      <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl auth-float" />
      <div className="absolute left-1/3 top-10 h-2 w-24 rounded-full bg-[color:var(--dash-accent)] opacity-30" />

      <div className="absolute right-6 top-6 z-20">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          role="switch"
          aria-checked={isDark}
          aria-label="Alternar tema"
          className="relative h-11 w-[88px] rounded-full border theme-border theme-card shadow-sm"
        >
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">
            <Sun className="h-4 w-4" />
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400">
            <Moon className="h-4 w-4" />
          </span>
          <span
            className={
              "absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-[color:var(--dash-panel)] border theme-border shadow-sm transition-all " +
              (isDark ? "left-[46px]" : "left-1")
            }
          />
        </button>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:items-stretch">
        <div className="flex w-full flex-col justify-center lg:w-1/2">
          <div className="inline-flex items-center gap-2 rounded-full border theme-border theme-card px-4 py-2 text-xs uppercase tracking-[0.3em] theme-text-muted shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Maintenance Intelligence Suite
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold theme-text lg:text-5xl">
            CMMS Enterprise
          </h1>
          <p className="mt-4 text-base theme-text-muted">
            Operacoes de manutencao, ativos e equipas num unico cockpit. Entre com seu username e
            acompanhe a performance em tempo real.
          </p>
          <div className="mt-8 grid gap-4 text-sm theme-text-muted">
            <div className="rounded-2xl border theme-border theme-card px-4 py-3 shadow-sm">
              Dashboards com KPIs, alertas e backlog sempre atualizados.
            </div>
            <div className="rounded-2xl border theme-border theme-card px-4 py-3 shadow-sm">
              Plano, execute e revise ordens com equipas distribuidas.
            </div>
          </div>
        </div>

        <div className="flex w-full items-center lg:w-1/2">
          <div className="w-full overflow-hidden rounded-[32px] border theme-border theme-card shadow-[0_30px_70px_-45px_rgba(15,118,110,0.6)]">
            <div className="h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),var(--dash-accent-2))]" />
            <div className="p-8">
              <div className="mb-6">
                <h2 className="font-display text-2xl font-semibold theme-text">Entrar</h2>
                <p className="text-sm theme-text-muted">Indique as suas credenciais.</p>
              </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <p className="text-sm theme-text">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-medium uppercase tracking-[0.2em] theme-text-muted"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 text-sm text-[color:var(--dash-ink)] focus:border-emerald-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-[0.2em] theme-text-muted"
                >
                  Senha
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 pr-12 text-sm text-[color:var(--dash-ink)] focus:border-emerald-400 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-muted transition hover:theme-text"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-[color:var(--dash-accent)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs theme-text">
              <p className="font-semibold">Demo rapido</p>
              <p>Username: admin</p>
              <p>Senha: Admin@123456</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
