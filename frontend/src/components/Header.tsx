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
  Package,
  Wrench,
  Users,
  Settings,
  ChevronDown,
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
  const location = useLocation();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.trim() || 'U';
  const { theme, setTheme } = useTheme();

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
        {
          label: 'Planos',
          href: '/maintenance-plans',
          active: location.pathname === '/maintenance-plans',
          icon: Calendar,
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
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#38bdf8)] text-white shadow-md transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <span className="text-base font-semibold tracking-tight">M</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-semibold text-slate-900">Manutencao</span>
              <span className="block text-xs uppercase tracking-[0.3em] text-slate-400">
                Ops Hub
              </span>
            </div>
          </Link>

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
                        ? 'bg-[color:var(--nav-accent,rgba(15,118,110,0.12))] text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                      className="absolute top-full left-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white/95 py-2 shadow-xl backdrop-blur"
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
                                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            {ItemIcon && (
                              <ItemIcon
                                className={`w-4 h-4 ${
                                  item.active ? 'text-emerald-600' : 'text-slate-400'
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

          {/* Right Side */}
          <div className="flex items-center gap-3">
                        {/* Theme Selector */}
                        <div className="hidden sm:flex items-center">
                          <select
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={theme.name}
                            onChange={e => setTheme(e.target.value as any)}
                            style={{ minWidth: 120 }}
                          >
                            <option value="dashboard">Dashboard</option>
                            <option value="light">Claro</option>
                          </select>
                        </div>
            {/* Plant Selector */}
            {plants.length > 0 && (
              <div className="hidden sm:flex items-center">
                <select
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  {initials}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                  {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    {user?.role?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-full border border-transparent p-2 text-slate-500 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                title="Terminar sessão"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-full p-2 transition-colors hover:bg-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-700" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-200 bg-white/90 py-4">
            {/* Mobile Plant Selector */}
            {plants.length > 0 && (
              <div className="mb-4 px-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Planta
                </label>
                <select
                  className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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

            {/* Mobile Menu Sections */}
            {navSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <div key={section.title} className="mb-4">
                  <div className="flex items-center gap-2 px-4 mb-2">
                    {SectionIcon && <SectionIcon className="w-4 h-4 text-slate-400" />}
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                              ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          {ItemIcon && (
                            <ItemIcon
                              className={`w-4 h-4 ${
                                item.active ? 'text-emerald-600' : 'text-slate-400'
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
