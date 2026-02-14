import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  LogOut,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { getSuperadminDbStatus, getSuperadminTenants, logout as apiLogout } from '../services/api';
import { useProfileAccess } from '../hooks/useProfileAccess';
import { canAccessPathByPermissions } from '../utils/routePermissions';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const { selectedPlant, plants, setSelectedPlant } = useAppStore();
  const { isConnected, unreadCount } = useSocket();
  const { permissions, loading: permissionsLoading } = useProfileAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme.name === 'dark';
  const role = String(user?.role || '').trim().toLowerCase();
  const isSuperAdmin = role === 'superadmin';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.trim() || 'U';
  const canAccessSettings = canAccessPathByPermissions({
    path: '/settings',
    isSuperAdmin,
    permissions,
    loading: permissionsLoading,
  });

  const superAdminHome = '/superadmin/dashboard';

  const [superadminTenants, setSuperadminTenants] = React.useState<
    Array<{ id: string; name: string; slug: string; is_active: boolean }>
  >([]);
  const [loadingSuperadminTenants, setLoadingSuperadminTenants] = React.useState(false);
  const [superadminTenantId, setSuperadminTenantId] = React.useState<string>('');

  const [dbStatusLabel, setDbStatusLabel] = React.useState<string>('—');
  const [loadingDbStatus, setLoadingDbStatus] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isSuperAdmin) return;

    const stored = localStorage.getItem('superadminTenantId');
    setSuperadminTenantId(stored && stored.trim().length > 0 ? stored.trim() : '');

    let cancelled = false;
    setLoadingSuperadminTenants(true);
    (async () => {
      try {
        const data = await getSuperadminTenants();
        const safe = Array.isArray(data) ? data : [];
        if (cancelled) return;
        setSuperadminTenants(safe);

        const storedId = stored && stored.trim().length > 0 ? stored.trim() : '';
        const exists = storedId ? safe.some((t) => String((t as any)?.id) === storedId) : false;
        const nextId = exists ? storedId : (safe[0]?.id ? String(safe[0].id) : '');
        if (nextId) {
          setSuperadminTenantId(nextId);
          localStorage.setItem('superadminTenantId', nextId);
          window.dispatchEvent(new Event('superadmin-tenant-changed'));
        } else {
          if (storedId) localStorage.removeItem('superadminTenantId');
          setSuperadminTenantId('');
          window.dispatchEvent(new Event('superadmin-tenant-changed'));
        }
      } catch {
        if (!cancelled) setSuperadminTenants([]);
      } finally {
        if (!cancelled) setLoadingSuperadminTenants(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  React.useEffect(() => {
    if (!isSuperAdmin) return;

    const handleExternalChange = () => {
      const stored = localStorage.getItem('superadminTenantId');
      setSuperadminTenantId(stored && stored.trim().length > 0 ? stored.trim() : '');
    };

    window.addEventListener('superadmin-tenant-changed', handleExternalChange);
    return () => window.removeEventListener('superadmin-tenant-changed', handleExternalChange);
  }, [isSuperAdmin]);

  React.useEffect(() => {
    if (!isSuperAdmin) return;

    let cancelled = false;
    setLoadingDbStatus(true);
    (async () => {
      try {
        const status = await getSuperadminDbStatus(1);
        if (cancelled) return;
        setDbStatusLabel(status?.dbOk ? 'Online' : 'Erro');
      } catch {
        if (!cancelled) setDbStatusLabel('Erro');
      } finally {
        if (!cancelled) setLoadingDbStatus(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, superadminTenantId, location.pathname]);

  const activeTenantName = React.useMemo(() => {
    if (!superadminTenantId) return '—';
    const match = superadminTenants.find((t) => t.id === superadminTenantId);
    return match?.name || 'Empresa';
  }, [superadminTenantId, superadminTenants]);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore - local logout still clears session client-side
    } finally {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b theme-border glass-panel backdrop-blur relative">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,var(--dash-accent),var(--dash-accent-2),var(--dash-accent))]" />
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6 relative">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border theme-border bg-[color:var(--dash-panel)] text-[color:var(--dash-ink)] shadow-sm transition hover:bg-[color:var(--dash-surface)] lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to={isSuperAdmin ? superAdminHome : '/dashboard'} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,var(--dash-accent),var(--dash-accent-2))] text-sm font-semibold text-[#0b1020]">
            M
          </span>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold theme-text">Manutencao</div>
            <div className="text-[10px] uppercase tracking-[0.32em] theme-text-muted">
              Ops Studio
            </div>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {!isSuperAdmin && plants.length > 0 && (
            <div className="hidden md:flex items-center">
              <select
                className="rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-3 py-2 text-sm font-semibold theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/30"
                value={selectedPlant || ''}
                onChange={(event) => setSelectedPlant(event.target.value)}
              >
                {plants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.code} - {plant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isSuperAdmin && (
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-emerald-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-rose-600" />
                )}
                <div className="text-xs font-semibold text-[color:var(--dash-muted)]">
                  {isConnected ? 'Online' : 'Offline'}
                </div>
              </div>

              <select
                className="rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-3 py-2 text-sm font-semibold theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/30"
                value={superadminTenantId}
                onChange={(e) => {
                  const next = String(e.target.value || '').trim();
                  if (!next) return;
                  setSuperadminTenantId(next);
                  localStorage.setItem('superadminTenantId', next);
                  window.dispatchEvent(new Event('superadmin-tenant-changed'));
                  if (!location.pathname.startsWith('/superadmin')) {
                    navigate(superAdminHome);
                  }
                }}
                disabled={loadingSuperadminTenants}
                title={loadingSuperadminTenants ? 'A carregar empresas...' : activeTenantName}
              >
                <option value="" disabled>
                  {loadingSuperadminTenants
                    ? 'A carregar...'
                    : superadminTenants.length === 0
                      ? 'Sem empresas'
                      : 'Selecionar empresa'}
                </option>
                {superadminTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug}){t.is_active ? '' : ' — inativa'}
                  </option>
                ))}
              </select>

              <div
                className={
                  'rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-sm font-semibold ' +
                  (dbStatusLabel === 'Online'
                    ? 'text-emerald-700'
                    : dbStatusLabel === 'Erro'
                      ? 'text-rose-700'
                      : 'text-[color:var(--dash-ink)]')
                }
                title={superadminTenantId ? `Empresa: ${activeTenantName}` : 'Sem empresa selecionada'}
              >
                {loadingDbStatus ? '…' : dbStatusLabel}
              </div>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="hidden lg:flex items-center">
              {isConnected ? (
                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1">
                  <WifiOff className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-700">Desconectado</span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-2xl border theme-border theme-card text-[color:var(--dash-ink)] shadow-sm transition hover:bg-[color:var(--dash-surface)]"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            to="/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border theme-border theme-card text-[color:var(--dash-ink)] shadow-sm transition hover:bg-[color:var(--dash-surface)]"
            title="Notificacoes"
            aria-label="Notificacoes"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--dash-accent)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-2xl border theme-border theme-card px-2 py-1 shadow-sm transition hover:bg-[color:var(--dash-surface)]"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full theme-surface text-sm font-semibold theme-text">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold theme-text">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] uppercase tracking-[0.22em] theme-text-muted">
                  {user?.role?.replace(/_/g, ' ')}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 theme-text-muted" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl border theme-border theme-card py-2 shadow-xl"
                onMouseLeave={() => setUserMenuOpen(false)}
                role="menu"
              >
                <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] theme-text-muted">
                  Conta
                </div>
                <Link
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[color:var(--dash-muted)] transition-colors hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-ink)]"
                  role="menuitem"
                >
                  <span>Perfil</span>
                </Link>
                {canAccessSettings && (
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[color:var(--dash-muted)] transition-colors hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-ink)]"
                    role="menuitem"
                  >
                    <span>Configuracoes</span>
                  </Link>
                )}
                {isSuperAdmin && (
                  <Link
                    to={superAdminHome}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[color:var(--dash-muted)] transition-colors hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-ink)]"
                    role="menuitem"
                  >
                    <span>SuperAdmin</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border theme-border theme-card text-[color:var(--dash-muted)] shadow-sm transition hover:bg-[color:var(--dash-surface)] hover:text-rose-600"
            title="Terminar sessao"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
