import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import { useSocket } from '../context/SocketContext';

interface NavItem {
  label: string;
  href: string;
  active: boolean;
}

export function Header() {
  const { user, logout } = useAuth();
  const { selectedPlant, plants, setSelectedPlant } = useAppStore();
  const { isConnected } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', active: location.pathname === '/dashboard' },
    { label: 'Ordens', href: '/work-orders', active: location.pathname === '/work-orders' },
    { label: 'Equipamentos', href: '/assets', active: location.pathname === '/assets' },
    { label: 'Pesquisa', href: '/search', active: location.pathname === '/search' },
    {
      label: 'Planos',
      href: '/maintenance-plans',
      active: location.pathname === '/maintenance-plans',
    },
    { label: 'Peças', href: '/spare-parts', active: location.pathname === '/spare-parts' },
    { label: 'Relatórios', href: '/reports', active: location.pathname === '/reports' },
    { label: 'Configurações', href: '/settings', active: location.pathname === '/settings' },
    ...(user?.role === 'superadmin'
      ? [{ label: '🔧 Setup BD', href: '/admin/setup', active: location.pathname === '/admin/setup' }]
      : []),
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚙️</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline text-gray-900">
              CMMS Enterprise
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  item.active
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Plant Selector */}
            {plants.length > 0 && (
              <div className="hidden sm:flex items-center text-sm text-gray-600">
                <select
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
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
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 rounded-full">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-600 font-medium">Desconectado</span>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                  item.active
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
