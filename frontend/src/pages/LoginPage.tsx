import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin } from '../services/api';
import { AlertCircle, Eye, EyeOff, Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getHomeRouteForRole } from '../utils/homeRoute';

type LoginStyle = 'minimal' | 'split' | 'full';

function normalizeLoginStyle(value?: string | null): LoginStyle | undefined {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  if (v === 'minimal') return 'minimal';
  if (v === 'split') return 'split';
  if (v === 'full') return 'full';
  return undefined;
}

function resolveLoginStyle(search: string): LoginStyle {
  const qs = new URLSearchParams(search);
  const fromQuery = normalizeLoginStyle(qs.get('style'));
  const fromEnv = normalizeLoginStyle((import.meta as any)?.env?.VITE_LOGIN_STYLE);
  return fromQuery || fromEnv || 'full';
}

type DemoKey =
  | 'superadmin'
  | 'admin_empresa'
  | 'gestor_manutencao'
  | 'supervisor'
  | 'tecnico'
  | 'operador'
  | 'custom';

const DEMO_ACCOUNTS: Array<{ key: Exclude<DemoKey, 'custom'>; label: string; username: string; password: string }> = [
  { key: 'superadmin', label: 'SuperAdministrador', username: 'superadmin', password: 'SuperAdmin@123456' },
  { key: 'admin_empresa', label: 'Admin Empresa', username: 'admin', password: 'Admin@123456' },
  { key: 'gestor_manutencao', label: 'Gestor Fábrica', username: 'gestor', password: 'Gestor@123456' },
  { key: 'supervisor', label: 'Supervisor', username: 'supervisor', password: 'Supervisor@123456' },
  { key: 'tecnico', label: 'Técnico', username: 'tecnico', password: 'Tecnico@123456' },
  { key: 'operador', label: 'Operador', username: 'operador', password: 'Operador@123456' },
];

function DemoLoginSelector(props: {
  demoKey: DemoKey;
  setDemoKey: (k: DemoKey) => void;
  loading: boolean;
}) {
  const selected = props.demoKey === 'custom' ? null : DEMO_ACCOUNTS.find((a) => a.key === props.demoKey) || null;

  return (
    <div className="mt-6 rounded-2xl border theme-border theme-card p-4 text-xs theme-text">
      <p className="font-semibold">Demo rápido</p>
      <p className="mt-1 theme-text-muted">Escolha uma role para preencher as credenciais.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-[10px] font-medium uppercase tracking-[0.2em] theme-text-muted" htmlFor="demoRole">
          Role
        </label>
        <select
          id="demoRole"
          value={props.demoKey}
          onChange={(e) => props.setDemoKey(e.target.value as DemoKey)}
          disabled={props.loading}
          className="min-w-[220px] rounded-full border theme-border bg-[color:var(--dash-panel-2)] px-3 py-2 text-xs theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
        >
          {DEMO_ACCOUNTS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
          <option value="custom">Manual</option>
        </select>
      </div>

      {selected ? (
        <div className="mt-3 grid gap-1">
          <p>Username: {selected.username}</p>
          <p>Senha: {selected.password}</p>
        </div>
      ) : (
        <p className="mt-3 theme-text-muted">Modo manual ativo.</p>
      )}
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('Admin@123456');
  const [demoKey, setDemoKey] = React.useState<DemoKey>('admin_empresa');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const isDark = theme.name === 'dark';

  const loginStyle = React.useMemo(() => resolveLoginStyle(location.search), [location.search]);

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

  React.useEffect(() => {
    if (demoKey === 'custom') return;
    const selected = DEMO_ACCOUNTS.find((a) => a.key === demoKey);
    if (!selected) return;

    setUsername(selected.username);
    setPassword(selected.password);
  }, [demoKey]);

  return (
    <div className="relative min-h-screen overflow-hidden theme-bg theme-text">
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-[color:var(--dash-accent)] opacity-10 blur-3xl auth-float" />
      <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-[color:var(--dash-accent-2)] opacity-10 blur-3xl auth-float" />
      <div className="absolute left-1/3 top-10 h-2 w-24 rounded-full bg-[color:var(--dash-accent)] opacity-30" />

      <div className="absolute right-6 top-6 z-20">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          role="switch"
          aria-checked={isDark}
          aria-label="Alternar tema"
          className="relative h-11 w-[88px] rounded-full border theme-border theme-card shadow-sm transition"
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

      {loginStyle === 'minimal' ? (
        <div className="relative mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-14">
          <div className="mx-auto w-full">
            <div className="mb-8 text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border theme-border theme-card px-4 py-2 text-xs uppercase tracking-[0.3em] theme-text-muted shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--dash-accent)]" />
                Maintenance Intelligence Suite
              </div>
              <h1 className="mt-6 font-display text-4xl font-semibold theme-text">CMMS Enterprise</h1>
              <p className="mt-3 text-sm theme-text-muted">
                Inicie sessão para aceder ao cockpit de manutenção.
              </p>
            </div>

            <div className="w-full overflow-hidden rounded-[32px] border theme-border theme-card shadow-sm">
              <div className="h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),var(--dash-accent-2))]" />
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="font-display text-2xl font-semibold theme-text">Entrar</h2>
                  <p className="text-sm theme-text-muted">Indique as suas credenciais.</p>
                </div>

                {error && (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
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
                      onChange={(e) => {
                        setDemoKey('custom');
                        setUsername(e.target.value);
                      }}
                      autoComplete="username"
                      spellCheck={false}
                      disabled={loading}
                      className="mt-2 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 text-sm theme-text placeholder:theme-text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
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
                        onChange={(e) => {
                          setDemoKey('custom');
                          setPassword(e.target.value);
                        }}
                        autoComplete="current-password"
                        disabled={loading}
                        className="w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 pr-12 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-muted transition hover:theme-text disabled:opacity-60"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl bg-[color:var(--dash-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

                <DemoLoginSelector demoKey={demoKey} setDemoKey={setDemoKey} loading={loading} />
              </div>
            </div>
          </div>
        </div>
      ) : loginStyle === 'split' ? (
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:items-stretch">
          <div className="flex w-full flex-col justify-center lg:w-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border theme-border theme-card px-4 py-2 text-xs uppercase tracking-[0.3em] theme-text-muted shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--dash-accent)]" />
              Maintenance Intelligence Suite
            </div>
            <h1 className="mt-6 font-display text-4xl font-semibold theme-text lg:text-5xl">
              CMMS Enterprise
            </h1>
            <p className="mt-4 text-base theme-text-muted">
              Operações de manutenção, ativos e equipas num único cockpit. Entre com o seu username e
              acompanhe a performance em tempo real.
            </p>
            <div className="mt-8 grid gap-4 text-sm theme-text-muted">
              <div className="rounded-2xl border theme-border theme-card px-4 py-3 shadow-sm">
                Dashboards com KPIs, alertas e backlog sempre atualizados.
              </div>
              <div className="rounded-2xl border theme-border theme-card px-4 py-3 shadow-sm">
                Planeie, execute e reveja ordens com equipas distribuídas.
              </div>
            </div>
          </div>

          <div className="flex w-full items-center lg:w-1/2">
            <div className="w-full overflow-hidden rounded-[32px] border theme-border theme-card shadow-sm">
              <div className="h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),var(--dash-accent-2))]" />
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="font-display text-2xl font-semibold theme-text">Entrar</h2>
                  <p className="text-sm theme-text-muted">Indique as suas credenciais.</p>
                </div>

                {error && (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
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
                      onChange={(e) => {
                        setDemoKey('custom');
                        setUsername(e.target.value);
                      }}
                      autoComplete="username"
                      spellCheck={false}
                      disabled={loading}
                      className="mt-2 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 text-sm theme-text placeholder:theme-text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
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
                        onChange={(e) => {
                          setDemoKey('custom');
                          setPassword(e.target.value);
                        }}
                        autoComplete="current-password"
                        disabled={loading}
                        className="w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 pr-12 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-muted transition hover:theme-text disabled:opacity-60"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl bg-[color:var(--dash-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

                <DemoLoginSelector demoKey={demoKey} setDemoKey={setDemoKey} loading={loading} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-14">
          <div className="w-full overflow-hidden rounded-[32px] border theme-border theme-card shadow-sm">
            <div className="h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),var(--dash-accent-2))]" />
            <div className="grid gap-10 p-8 lg:grid-cols-2 lg:p-10">
              <div className="flex flex-col justify-center">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border theme-border theme-card px-4 py-2 text-xs uppercase tracking-[0.3em] theme-text-muted shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-[color:var(--dash-accent)]" />
                  Maintenance Intelligence Suite
                </div>
                <h1 className="mt-6 font-display text-4xl font-semibold theme-text lg:text-5xl">
                  CMMS Enterprise
                </h1>
                <p className="mt-4 text-base theme-text-muted">
                  Operações de manutenção, ativos e equipas num único cockpit. Entre para acompanhar a
                  operação em tempo real.
                </p>
                <div className="mt-8 grid gap-4 text-sm theme-text-muted">
                  <div className="rounded-2xl border theme-border theme-card px-4 py-3 shadow-sm">
                    KPIs, alertas e backlog sempre atualizados.
                  </div>
                  <div className="rounded-2xl border theme-border theme-card px-4 py-3 shadow-sm">
                    Ordens, ativos e equipas num só fluxo.
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="mb-6">
                  <h2 className="font-display text-2xl font-semibold theme-text">Entrar</h2>
                  <p className="text-sm theme-text-muted">Indique as suas credenciais.</p>
                </div>

                {error && (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
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
                      onChange={(e) => {
                        setDemoKey('custom');
                        setUsername(e.target.value);
                      }}
                      autoComplete="username"
                      spellCheck={false}
                      disabled={loading}
                      className="mt-2 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 text-sm theme-text placeholder:theme-text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
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
                        onChange={(e) => {
                          setDemoKey('custom');
                          setPassword(e.target.value);
                        }}
                        autoComplete="current-password"
                        disabled={loading}
                        className="w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-4 py-3 pr-12 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/25 disabled:opacity-70"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-muted transition hover:theme-text disabled:opacity-60"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl bg-[color:var(--dash-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

                <DemoLoginSelector demoKey={demoKey} setDemoKey={setDemoKey} loading={loading} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
