import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Search,
  FileText,
  ClipboardList,
  Calendar,
  CalendarClock,
  Package,
  Wrench,
  Users,
  Settings,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';

interface NavItem {
  label: string;
  href: string;
  active: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
  icon?: React.ComponentType<{ className?: string }>;
}

export function Header() {
  const { user, logout } = useAuth();
  const { selectedPlant, plants, setSelectedPlant } = useAppStore();
  const { isConnected } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const location = useLocation();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.trim() || 'U';
  const { theme, setTheme } = useTheme();
  const isDark = theme.name === 'dark';

  const navSections: NavSection[] = [
    {
      title: 'Visão Geral',
      icon: LayoutDashboard,
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          active: location.pathname === '/dashboard',
          icon: LayoutDashboard,
        },
        {
          label: 'Pesquisa',
          href: '/search',
          active: location.pathname === '/search',
          icon: Search,
        },
        {
          label: 'Relatórios',
          href: '/reports',
          active: location.pathname === '/reports',
          icon: FileText,
        },
      ],
    },
    {
      title: 'Operações',
      icon: ClipboardList,
      items: [
        {
          label: 'Ordens',
          href: '/work-orders',
          active: location.pathname === '/work-orders',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Inventário',
      icon: Package,
      items: [
        {
          label: 'Equipamentos',
          href: '/assets',
          active: location.pathname === '/assets',
          icon: Wrench,
        },
        {
          label: 'Peças',
          href: '/spare-parts',
          active: location.pathname === '/spare-parts',
          icon: Package,
        },
        {
          label: 'Kits',
          href: '/maintenance-kits',
          active: location.pathname === '/maintenance-kits',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Administração',
      icon: Settings,
      items: [
        {
          label: 'Configurações',
          href: '/settings',
          active: location.pathname === '/settings',
          icon: Settings,
        },
        ...(user?.role === 'superadmin' ? [] : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-50 border-b theme-border theme-card shadow-[0_10px_40px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#38bdf8)] text-white shadow-md transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <span className="text-base font-semibold tracking-tight">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-semibold theme-text">Manutencao</span>
                <span className="block text-xs uppercase tracking-[0.3em] theme-text-muted">
                  Ops Hub
                </span>
              </div>
            </Link>

            {/* Theme Selector (Desktop) */}
            <div className="hidden md:flex items-center">
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label="Alternar tema claro/escuro"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="relative inline-flex h-8 w-14 items-center rounded-full border theme-border bg-[color:var(--dash-surface-2)] px-1 shadow-inner transition-colors"
              >
                <span
                  className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--dash-panel)] shadow-sm transition-transform duration-300 ease-out will-change-transform ${
                    isDark ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  <Sun
                    className={`absolute h-4 w-4 text-[color:var(--dash-accent)] transition-all duration-300 ${
                      isDark ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                    }`}
                  />
                  <Moon
                    className={`absolute h-4 w-4 text-[color:var(--dash-ink)] transition-all duration-300 ${
                      isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navSections.map((section) => {
                const SectionIcon = section.icon;
                const hasActiveItem = section.items.some((item) => item.active);
                const isOpen = openDropdown === section.title;

                return (
                  <div key={section.title} className="relative">
                    <button
                      onClick={() => setOpenDropdown(isOpen ? null : section.title)}
                      onMouseEnter={() => setOpenDropdown(section.title)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        hasActiveItem || isOpen
                          ? 'bg-[color:var(--dash-surface-2)] text-[color:var(--dash-ink)]'
                          : 'text-[color:var(--dash-muted)] hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-ink)]'
                      }`}
                    >
                      {SectionIcon && <SectionIcon className="w-4 h-4" />}
                      <span>{section.title}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div
                        className="absolute top-full left-0 mt-2 w-56 rounded-2xl border theme-border theme-card py-2 shadow-xl backdrop-blur"
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        <div className="mx-3 mb-2 h-1 rounded-full bg-[linear-gradient(90deg,#0f766e,#38bdf8)]" />
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setOpenDropdown(null)}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                item.active
                                  ? 'bg-[color:var(--dash-surface)] text-emerald-700 font-semibold'
                                  : 'text-[color:var(--dash-muted)] hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-ink)]'
                              }`}
                            >
                              {ItemIcon && (
                                <ItemIcon
                                  className={`w-4 h-4 ${
                                    item.active
                                      ? 'text-emerald-600'
                                      : 'text-[color:var(--dash-muted)]'
                                  }`}
                                />
                              )}
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Plant Selector */}
            {plants.length > 0 && (
              <div className="hidden sm:flex items-center">
                <select
                  className="rounded-full border theme-border theme-card px-3 py-2 text-sm font-semibold text-[color:var(--dash-ink)] shadow-sm transition hover:bg-[color:var(--dash-panel)] focus:outline-none focus:ring-2 focus:ring-emerald-200"
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

            {/* Socket Connection Status */}
            <div className="hidden sm:flex items-center">
              {isConnected ? (
                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2">
                  <WifiOff className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-700">Desconectado</span>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3 border-l theme-border pl-3">
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1 transition hover:bg-[color:var(--dash-surface)]"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full theme-surface text-sm font-semibold theme-text">
                    {initials}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold theme-text">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs capitalize theme-text-muted">
                      {user?.role?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <ChevronDown
                    className={
                      'w-4 h-4 theme-text-muted transition-transform ' +
                      (userMenuOpen ? 'rotate-180' : '')
                    }
                  />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl border theme-border theme-card py-2 shadow-xl backdrop-blur"
                    onMouseLeave={() => setUserMenuOpen(false)}
                    role="menu"
                  >
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[color:var(--dash-muted)] transition-colors hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-ink)]"
                      role="menuitem"
                    >
                      <span>Perfil</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[color:var(--dash-muted)] transition-colors hover:bg-[color:var(--dash-surface)] hover:text-rose-600"
                      role="menuitem"
                    >
                      <span>Terminar sessão</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="rounded-full border border-transparent p-2 theme-text-muted transition hover:border-[color:var(--dash-border)] hover:bg-[color:var(--dash-surface)] hover:text-rose-600"
                title="Terminar sessão"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-full p-2 transition-colors hover:bg-[color:var(--dash-surface)]"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 theme-text" />
              ) : (
                <Menu className="w-5 h-5 theme-text" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t theme-border theme-card py-4">
            {/* Mobile Theme Selector */}
            <div className="mb-4 px-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider theme-text-muted">
                Tema
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label="Alternar tema claro/escuro"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="relative inline-flex h-8 w-14 items-center rounded-full border theme-border bg-[color:var(--dash-surface-2)] px-1 shadow-inner transition-colors"
              >
                <span
                  className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--dash-panel)] shadow-sm transition-transform duration-300 ease-out will-change-transform ${
                    isDark ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  <Sun
                    className={`absolute h-4 w-4 text-[color:var(--dash-accent)] transition-all duration-300 ${
                      isDark ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                    }`}
                  />
                  <Moon
                    className={`absolute h-4 w-4 text-[color:var(--dash-ink)] transition-all duration-300 ${
                      isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* Mobile Plant Selector */}
            {plants.length > 0 && (
              <div className="mb-4 px-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider theme-text-muted">
                  Planta
                </label>
                <select
                  className="w-full rounded-full border theme-border theme-card px-3 py-2 text-sm font-semibold text-[color:var(--dash-ink)] focus:outline-none focus:ring-2 focus:ring-emerald-200"
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

            {/* Mobile Connection Status */}
            <div className="px-4 mb-4">
              {isConnected ? (
                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2">
                  <WifiOff className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-700">Desconectado</span>
                </div>
              )}
            </div>

            {/* Mobile User Actions */}
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full theme-surface text-sm font-semibold theme-text">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold theme-text">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs capitalize theme-text-muted">
                    {user?.role?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl border theme-border theme-card px-4 py-3 text-sm font-semibold theme-text transition hover:bg-[color:var(--dash-surface)]"
                >
                  Perfil
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl border theme-border theme-card px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-[color:var(--dash-surface)]"
                >
                  Terminar sessão
                </button>
              </div>
            </div>

            {/* Mobile Menu Sections */}
            {navSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <div key={section.title} className="mb-4">
                  <div className="flex items-center gap-2 px-4 mb-2">
                    {SectionIcon && (
                      <SectionIcon className="w-4 h-4 text-[color:var(--dash-muted)]" />
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wider theme-text-muted">
                      {section.title}
                    </p>
                  </div>
                  <div className="space-y-1 px-2">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                            item.active
                              ? 'bg-[color:var(--dash-surface-2)] text-emerald-700 shadow-sm'
                              : 'text-[color:var(--dash-muted)] hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-ink)]'
                          }`}
                        >
                          {ItemIcon && (
                            <ItemIcon
                              className={`w-4 h-4 ${
                                item.active ? 'text-emerald-600' : 'text-[color:var(--dash-muted)]'
                              }`}
                            />
                          )}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
