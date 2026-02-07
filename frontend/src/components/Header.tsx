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
  Building2,
  Database,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import { useSocket } from '../context/SocketContext';

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
        {
          label: 'Fornecedores',
          href: '/suppliers',
          active: location.pathname === '/suppliers',
          icon: Users,
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
        ...(user?.role === 'admin_empresa' || user?.role === 'superadmin'
          ? [
              {
                label: 'Plantas',
                href: '/plants',
                active: location.pathname === '/plants',
                icon: Building2,
              },
            ]
          : []),
        ...(user?.role === 'superadmin'
          ? [
              {
                label: 'Setup BD',
                href: '/admin/setup',
                active: location.pathname === '/admin/setup',
                icon: Database,
              },
              {
                label: 'Atualizar BD',
                href: '/admin/database',
                active: location.pathname === '/admin/database',
                icon: Database,
              },
            ]
          : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <span className="text-white font-bold text-xl">⚙️</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-gray-900">CMMS</span>
              <span className="block text-xs text-gray-500 -mt-1">Enterprise</span>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      hasActiveItem || isOpen
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                      className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              item.active
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {ItemIcon && (
                              <ItemIcon
                                className={`w-4 h-4 ${item.active ? 'text-primary-600' : 'text-gray-400'}`}
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
            {/* Plant Selector */}
            {plants.length > 0 && (
              <div className="hidden sm:flex items-center">
                <select
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-700 font-medium">Desconectado</span>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors"
                title="Terminar sessão"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200 bg-gray-50">
            {/* Mobile Plant Selector */}
            {plants.length > 0 && (
              <div className="mb-4 px-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Planta
                </label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-700 font-medium">Desconectado</span>
                </div>
              )}
            </div>

            {/* Mobile Menu Sections */}
            {navSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <div key={section.title} className="mb-4">
                  <div className="flex items-center gap-2 px-4 mb-2">
                    {SectionIcon && <SectionIcon className="w-4 h-4 text-gray-400" />}
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
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
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            item.active
                              ? 'bg-primary-100 text-primary-700 shadow-sm'
                              : 'text-gray-700 hover:bg-white hover:text-gray-900'
                          }`}
                        >
                          {ItemIcon && (
                            <ItemIcon
                              className={`w-4 h-4 ${item.active ? 'text-primary-600' : 'text-gray-400'}`}
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
