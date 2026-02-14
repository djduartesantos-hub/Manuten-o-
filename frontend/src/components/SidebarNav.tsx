import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  FileText,
  ClipboardList,
  LifeBuoy,
  CalendarClock,
  Package,
  Wrench,
  ClipboardCheck,
  Users,
  Settings,
  Shield,
  Building2,
  User,
  Bell,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import { useProfileAccess } from '../hooks/useProfileAccess';
import { canAccessPathByPermissions } from '../utils/routePermissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
}

function buildNavSections(options: {
  pathname: string;
  isSuperAdmin: boolean;
  permissions: Set<string>;
  loading: boolean;
  role?: string | null;
}): NavSection[] {
  const { pathname, isSuperAdmin, permissions, loading, role } = options;

  const roleKey = String(role || '').trim().toLowerCase();
  const roleTitleMap: Record<string, string> = {
    operador: 'Operador',
    tecnico: 'Tecnico',
    supervisor: 'Supervisor',
    gestor_manutencao: 'Gestor',
    admin_empresa: 'Admin Empresa',
  };
  const primaryTitle = roleTitleMap[roleKey] || 'Operacoes';

  const profileHomeItem: NavItem | null =
    roleKey === 'operador'
      ? {
          label: 'Minhas ordens',
          href: '/operador',
          icon: ClipboardList,
          active: pathname === '/operador',
        }
      : roleKey === 'tecnico'
        ? {
            label: 'Minhas ordens',
            href: '/tecnico',
            icon: ClipboardList,
            active: pathname === '/tecnico',
          }
        : null;

  const sections: NavSection[] = isSuperAdmin
    ? [
        {
          title: 'SuperAdmin',
          items: [
            {
              label: 'Dashboard',
              href: '/superadmin/dashboard',
              icon: Shield,
              active: pathname.startsWith('/superadmin/dashboard'),
            },
            {
              label: 'Empresas',
              href: '/superadmin/empresas',
              icon: Building2,
              active: pathname.startsWith('/superadmin/empresas'),
            },
            {
              label: 'Fabricas',
              href: '/superadmin/fabricas',
              icon: Building2,
              active: pathname.startsWith('/superadmin/fabricas'),
            },
            {
              label: 'Utilizadores',
              href: '/superadmin/utilizadores',
              icon: Users,
              active: pathname.startsWith('/superadmin/utilizadores'),
            },
            {
              label: 'Atualizacoes',
              href: '/superadmin/atualizacoes',
              icon: ClipboardCheck,
              active: pathname.startsWith('/superadmin/atualizacoes'),
            },
            {
              label: 'Suporte',
              href: '/superadmin/suporte',
              icon: LifeBuoy,
              active: pathname.startsWith('/superadmin/suporte'),
            },
            {
              label: 'Configuracoes',
              href: '/settings?panel=superadmin',
              icon: Settings,
              active: pathname.startsWith('/settings'),
            },
          ],
        },
        {
          title: 'Conta',
          items: [
            {
              label: 'Notificacoes',
              href: '/notifications',
              icon: Bell,
              active: pathname === '/notifications',
            },
            {
              label: 'Perfil',
              href: '/profile',
              icon: User,
              active: pathname === '/profile',
            },
          ],
        },
      ]
    : [
        {
          title: primaryTitle,
          items: [
            ...(profileHomeItem ? [profileHomeItem] : []),
            {
              label: 'Dashboard',
              href: '/dashboard',
              icon: LayoutDashboard,
              active: pathname === '/dashboard',
            },
            {
              label: 'Pesquisa',
              href: '/search',
              icon: Search,
              active: pathname === '/search',
            },
            {
              label: 'Ordens',
              href: '/work-orders',
              icon: ClipboardList,
              active: pathname === '/work-orders',
            },
            {
              label: 'Tickets',
              href: '/tickets',
              icon: LifeBuoy,
              active: pathname === '/tickets',
            },
            {
              label: 'Planeamento',
              href: '/planner',
              icon: CalendarClock,
              active: pathname === '/planner',
            },
          ],
        },
        {
          title: 'Inventario',
          items: [
            {
              label: 'Equipamentos',
              href: '/assets',
              icon: Wrench,
              active: pathname === '/assets',
            },
            {
              label: 'Pecas',
              href: '/spare-parts',
              icon: Package,
              active: pathname === '/spare-parts',
            },
            {
              label: 'Kits',
              href: '/maintenance-kits',
              icon: ClipboardCheck,
              active: pathname === '/maintenance-kits',
            },
            {
              label: 'Fornecedores',
              href: '/suppliers',
              icon: Users,
              active: pathname === '/suppliers',
            },
          ],
        },
        {
          title: 'Insights',
          items: [
            {
              label: 'Relatorios',
              href: '/reports',
              icon: FileText,
              active: pathname === '/reports',
            },
          ],
        },
        {
          title: 'Administracao',
          items: [
            {
              label: 'Configuracoes',
              href: '/settings',
              icon: Settings,
              active: pathname.startsWith('/settings'),
            },
            {
              label: 'Fabricas',
              href: '/plants',
              icon: Building2,
              active: pathname === '/plants',
            },
          ],
        },
        {
          title: 'Conta',
          items: [
            {
              label: 'Notificacoes',
              href: '/notifications',
              icon: Bell,
              active: pathname === '/notifications',
            },
            {
              label: 'Perfil',
              href: '/profile',
              icon: User,
              active: pathname === '/profile',
            },
          ],
        },
      ];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessPathByPermissions({
          path: item.href,
          isSuperAdmin,
          permissions,
          loading,
        }),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function SidebarNav({ open, onClose }: SidebarNavProps) {
  const { user } = useAuth();
  const { selectedPlant, plants, setSelectedPlant } = useAppStore();
  const { permissions, loading: permissionsLoading, isSuperAdmin } = useProfileAccess();
  const location = useLocation();
  const navigate = useNavigate();

  const navSections = React.useMemo(
    () =>
      buildNavSections({
        pathname: location.pathname,
        isSuperAdmin,
        permissions,
        loading: permissionsLoading,
        role: user?.role,
      }),
    [isSuperAdmin, permissions, permissionsLoading, location.pathname, user?.role],
  );

  return (
    <>
      <div
        className={
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden ' +
          (open ? 'opacity-100' : 'pointer-events-none opacity-0')
        }
        onClick={onClose}
      />
      <aside
        className={
          'group fixed left-0 top-0 z-50 h-full w-[280px] border-r theme-border glass-panel shadow-2xl transition-transform lg:static lg:translate-x-0 lg:shadow-none lg:w-20 lg:hover:w-[280px] lg:overflow-hidden lg:transition-all lg:duration-300 ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="flex h-full flex-col">
          <div className="px-5 pt-6">
            <button
              type="button"
              onClick={() => {
                navigate(isSuperAdmin ? '/superadmin/dashboard' : '/dashboard');
                onClose();
              }}
              className="flex items-center gap-3 lg:gap-0 lg:group-hover:gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,var(--dash-accent),var(--dash-accent-2))] text-sm font-semibold text-[#0b1020]">
                M
              </span>
              <div className="text-left transition lg:opacity-0 lg:translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0">
                <div className="text-base font-semibold theme-text">Manutencao</div>
                <div className="text-[11px] uppercase tracking-[0.3em] theme-text-muted">
                  Ops Studio
                </div>
              </div>
            </button>

            {!isSuperAdmin && plants.length > 0 && (
              <div className="mt-6 transition lg:opacity-0 lg:pointer-events-none lg:group-hover:opacity-100 lg:group-hover:pointer-events-auto">
                <label className="text-[10px] font-semibold uppercase tracking-[0.28em] theme-text-muted">
                  Fabrica ativa
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border theme-border bg-[color:var(--dash-panel-2)] px-3 py-2 text-sm font-semibold theme-text focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)]/30"
                  value={selectedPlant || ''}
                  onChange={(event) => setSelectedPlant(event.target.value)}
                >
                  {plants.map((plant) => (
                    <option key={plant.id} value={plant.id}>
                      {plant.code} - {plant.name}
                    </option>
                  ))}
                </select>
                {!selectedPlant ? (
                  <p className="mt-2 text-xs theme-text-muted">Selecione uma fabrica para carregar dados.</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-8 flex-1 overflow-y-auto px-4 pb-6">
            {navSections.map((section) => (
              <div key={section.title} className="mb-6">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.3em] theme-text-muted transition lg:opacity-0 lg:translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0">
                  {section.title}
                </div>
                <div className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        className={
                          'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition nav-link lg:justify-center lg:gap-0 lg:group-hover:justify-start lg:group-hover:gap-3 ' +
                          (item.active ? 'nav-link-active' : '')
                        }
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span className="transition lg:opacity-0 lg:translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
