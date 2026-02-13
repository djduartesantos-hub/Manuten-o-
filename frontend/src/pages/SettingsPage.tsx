import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useAuth } from '../hooks/useAuth';
import {
  apiCall,
  createSuperadminTenant,
  downloadSuperadminDbStatusJson,
  downloadSuperadminDiagnosticsBundle,
  downloadSuperadminIntegrityChecks,
  downloadSuperadminPlantsMetrics,
  downloadSuperadminRbacDrift,
  downloadSetupRunsExport,
  downloadSuperadminAudit,
  downloadSuperadminTenantsActivity,
  downloadSuperadminTenantsMetrics,
  downloadSuperadminUserSecurity,
  getSuperadminAudit,
  getSuperadminDashboardMetrics,
  getSuperadminTenantsActivity,
  getSuperadminHealth,
  getSuperadminDbStatus,
  getSuperadminPlantsMetrics,
  getSuperadminIntegrityChecks,
  getSuperadminTenantDiagnostics,
  getSuperadminTenantsMetrics,
  updateSuperadminTenant,
  purgeSuperadminAudit,
  createAdminRole,
  createAdminUser,
  deactivateAdminPlant,
  getAdminPlants,
  getAdminPermissions,
  getAdminRolePermissions,
  getAdminRoleHomes,
  getAdminRoles,
  getAdminUsers,
  getAssets,
  getSuperadminTenants,
  getUserPlants,
  getSuperadminUserAnomalies,
  getSuperadminRbacDrift,
  getSuperadminUserSecurityInsights,
  resetSuperadminUserPassword,
  searchSuperadminUsers,
  setAdminRolePermissions,
  setAdminRoleHomes,
  createPreventiveSchedule,
  getPreventiveSchedules,
  skipPreventiveSchedule,
  updatePreventiveSchedule,
  getNotificationRules,
  updateAdminPlant,
  updateAdminRole,
  updateAdminUser,
  updateNotificationRules,
  applyRbacPatch,
} from '../services/api';
import {
  Bell,
  Cog,
  FileText,
  AlertTriangle,
  Shield,
  Building2,
  Boxes,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Settings as SettingsIcon,
  Database,
  Server,
  Wrench,
  LifeBuoy,
  RefreshCw,
  Download,
  KeyRound,
} from 'lucide-react';
import { AdminSetupPage } from './AdminSetupPage';
import { DatabaseUpdatePage } from './DatabaseUpdatePage';
import { SetupInitPage } from './SetupInitPage';
import { PlantsPage } from './PlantsPage';
import { SuppliersPage } from './SuppliersPage';
import { StockEntryPage } from './StockEntryPage';
import { SparePartRegisterPage } from './SparePartRegisterPage';
import { MaintenanceKitsPage } from './MaintenanceKitsPage';

type SettingTab =
  | 'general'
  | 'alerts'
  | 'notifications'
  | 'preventive'
  | 'kits'
  | 'warnings'
  | 'documents'
  | 'permissions'
  | 'management'
  | 'superadmin';

export function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<SettingTab | null>(null);
  const [preventiveSub, setPreventiveSub] = useState<'plans' | 'schedules' | null>(null);

  const isTenantAdmin = ['admin_empresa', 'superadmin'].includes(String(user?.role || ''));

  const tabs: { id: SettingTab; label: string; icon: React.ReactNode; description: string }[] =
    [
      {
        id: 'alerts',
        label: 'Alertas & Notificações',
        icon: <Bell className="w-5 h-5" />,
        description: 'Configure thresholds e notificações de alertas',
      },
      {
        id: 'notifications',
        label: 'Notificações do sistema',
        icon: <Server className="w-5 h-5" />,
        description: 'Regras para eventos e destinatários',
      },
      {
        id: 'preventive',
        label: 'Manutenção Preventiva',
        icon: <Cog className="w-5 h-5" />,
        description: 'Planos e agendamentos preventivos',
      },
      {
        id: 'kits',
        label: 'Kits',
        icon: <Boxes className="w-5 h-5" />,
        description: 'Configurar kits de manutencao (pecas e quantidades)',
      },
      {
        id: 'warnings',
        label: 'Alertas Preditivos',
        icon: <AlertTriangle className="w-5 h-5" />,
        description: 'Análise histórica e avisos de risco',
      },
      {
        id: 'documents',
        label: 'Biblioteca de Documentos',
        icon: <FileText className="w-5 h-5" />,
        description: 'Manuais, esquemas e certificados',
      },
      ...(isTenantAdmin
        ? [
            {
              id: 'permissions' as const,
              label: 'Permissões & Roles',
              icon: <Shield className="w-5 h-5" />,
              description: 'Gerir acesso por role',
            },
            {
              id: 'management' as const,
              label: 'Gestão administrativa',
              icon: <Users className="w-5 h-5" />,
              description: 'Plantas, utilizadores, roles e equipamentos',
            },
          ]
        : []),
      ...(String(user?.role || '') === 'superadmin'
        ? [
            {
              id: 'superadmin' as const,
              label: 'SuperAdministrador',
              icon: <Shield className="w-5 h-5" />,
              description: 'Gestão do projeto (empresas, bases de dados e RBAC)',
            },
          ]
        : []),
    ];

  const activeMeta = tabs.find((tab) => tab.id === activePanel) || null;

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const panel = params.get('panel') as SettingTab | null;
    const sub = params.get('sub');

    if (panel && tabs.some((t) => t.id === panel)) {
      setActivePanel(panel);
      if (panel === 'preventive') {
        if (sub === 'schedules' || sub === 'plans') setPreventiveSub(sub);
      } else {
        setPreventiveSub(null);
      }
    } else if (String(user?.role || '') === 'superadmin') {
      // SuperAdmin should land directly in the management panel
      setActivePanel('superadmin');
      setPreventiveSub(null);
      navigate('/settings?panel=superadmin', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const openPanel = (panel: SettingTab) => {
    setActivePanel(panel);

    const params = new URLSearchParams(location.search);
    params.set('panel', panel);
    if (panel !== 'preventive') params.delete('sub');
    if (panel !== 'superadmin') params.delete('step');

    navigate(`/settings?${params.toString()}`, { replace: true });
  };

  const closePanel = () => {
    setActivePanel(null);
    setPreventiveSub(null);
    if (location.search) {
      navigate('/settings', { replace: true });
    }
  };

  return (
    <MainLayout>
      <div
        className="relative space-y-10 font-display theme-text"
      >
        <section className="relative overflow-hidden rounded-[32px] border border-[color:var(--dash-border)] bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_55%)] p-8 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.35)]">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-[color:var(--dash-panel-2)] blur-3xl opacity-50" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-[color:var(--dash-surface)] blur-3xl opacity-40" />
          <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center">
            <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-3 shadow-sm">
              <SettingsIcon className="h-6 w-6 text-[color:var(--dash-accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
                Centro de controle
              </p>
              <h1 className="mt-2 text-3xl font-semibold theme-text sm:text-4xl lg:text-5xl">
                Configuracoes
              </h1>
              <p className="mt-2 text-sm theme-text-muted">
                Gerencie alertas, manutencao preventiva e documentos em um unico lugar.
              </p>
            </div>
          </div>
        </section>

        {!activePanel && (
          <section className="rounded-[32px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
                  Secoes
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[color:var(--dash-ink)]">
                  Escolha o que quer configurar
                </h2>
                <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                  Layout por cards para ficar mais limpo e objetivo.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => openPanel(tab.id)}
                  className="group rounded-[26px] border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-5 text-left shadow-[0_12px_28px_-22px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:bg-[color:var(--dash-surface-2)] hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--dash-ink)] truncate">
                        {tab.label}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--dash-muted)]">
                        {tab.description}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] text-[color:var(--dash-accent)] shadow-sm">
                      {tab.icon}
                    </span>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-[color:var(--dash-accent)]">
                    Abrir
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {activePanel && (
          <section className="rounded-[32px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-6 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--dash-muted)]">
                  Painel de configuracao
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--dash-ink)] truncate">
                  {activeMeta?.label}
                </h3>
                {activeMeta?.description && (
                  <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                    {activeMeta.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn-secondary h-9 px-3"
                onClick={closePanel}
              >
                Voltar
              </button>
            </div>

            <div className="p-6">
              {activePanel === 'alerts' && <AlertsSettings />}
              {activePanel === 'notifications' && <NotificationSettings />}
              {activePanel === 'preventive' && (
                <PreventiveMaintenanceSettings initialSection={preventiveSub || undefined} />
              )}
              {activePanel === 'kits' && <MaintenanceKitsPage embedded />}
              {activePanel === 'warnings' && <PredictiveWarningsSettings />}
              {activePanel === 'documents' && <DocumentsLibrarySettings />}
              {activePanel === 'permissions' && <PermissionsSettings />}
              {activePanel === 'management' && <ManagementSettings />}
              {activePanel === 'superadmin' && <SuperAdminSettings />}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export function SuperAdminSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedPlant, plants, setPlants, setSelectedPlant } = useAppStore();
  const [tenants, setTenants] = React.useState<
    Array<{ id: string; name: string; slug: string; is_active: boolean }>
  >([]);
  const [tenantMetrics, setTenantMetrics] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [success, setSuccess] = React.useState<string>('');

  const [selectedTenantId, setSelectedTenantId] = React.useState<string>(() => {
    const stored = localStorage.getItem('superadminTenantId');
    return stored && stored.trim().length > 0 ? stored.trim() : '';
  });

  React.useEffect(() => {
    const onTenantChanged = () => {
      const stored = localStorage.getItem('superadminTenantId');
      setSelectedTenantId(stored && stored.trim().length > 0 ? stored.trim() : '');
    };
    onTenantChanged();
    window.addEventListener('superadmin-tenant-changed', onTenantChanged);
    return () => window.removeEventListener('superadmin-tenant-changed', onTenantChanged);
  }, []);

  const [newTenant, setNewTenant] = React.useState({ name: '', slug: '' });
  const [creatingTenant, setCreatingTenant] = React.useState(false);

  const [dbStatus, setDbStatus] = React.useState<any | null>(null);
  const [loadingDbStatus, setLoadingDbStatus] = React.useState(false);
  const [dbRunsLimit, setDbRunsLimit] = React.useState<number>(10);

  const [dashboardMetrics, setDashboardMetrics] = React.useState<any | null>(null);
  const [dashboardAudit, setDashboardAudit] = React.useState<any[]>([]);
  const [dashboardActivity, setDashboardActivity] = React.useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = React.useState(false);

  const [plantMetrics, setPlantMetrics] = React.useState<any[]>([]);
  const [loadingPlantMetrics, setLoadingPlantMetrics] = React.useState(false);

  const [userAnomalies, setUserAnomalies] = React.useState<any | null>(null);
  const [loadingUserAnomalies, setLoadingUserAnomalies] = React.useState(false);

  type SuperAdminUsersSection = 'diagnostics' | 'rolePermissions' | 'users';
  const [usersSection, setUsersSection] = React.useState<SuperAdminUsersSection>('rolePermissions');
  const [patchingRbac, setPatchingRbac] = React.useState(false);

  const [rbacDrift, setRbacDrift] = React.useState<any | null>(null);
  const [integrityChecks, setIntegrityChecks] = React.useState<any | null>(null);
  const [securityInsights, setSecurityInsights] = React.useState<any | null>(null);

  const [rbacMatrix, setRbacMatrix] = React.useState<{ roles: any[]; permissions: any[]; byRole: Record<string, Set<string>> } | null>(null);
  const [loadingRbacMatrix, setLoadingRbacMatrix] = React.useState(false);

  type SuperAdminNav = 'dashboard' | 'tenants' | 'plants' | 'users' | 'db' | 'support';

  const superadminSub = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('sub') || '').trim().toLowerCase();
    const allowed: SuperAdminNav[] = ['dashboard', 'tenants', 'plants', 'users', 'db', 'support'];
    return (allowed as string[]).includes(raw) ? (raw as SuperAdminNav) : 'dashboard';
  }, [location.search]);

  const [activeSub, setActiveSub] = React.useState<SuperAdminNav>(superadminSub);

  React.useEffect(() => {
    setActiveSub(superadminSub);
  }, [superadminSub]);

  const openSub = (next: SuperAdminNav) => {
    setActiveSub(next);
    const params = new URLSearchParams(location.search);
    if (location.pathname === '/settings') params.set('panel', 'superadmin');
    params.set('sub', next);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const navItems: Array<{
    id: SuperAdminNav;
    label: string;
    icon: React.ReactNode;
    requiresTenant?: boolean;
    description: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Shield className="h-4 w-4" />,
      description: 'Visão geral e exports do sistema',
    },
    {
      id: 'tenants',
      label: 'Empresas',
      icon: <Building2 className="h-4 w-4" />,
      description: 'Criar e gerir empresas',
    },
    {
      id: 'plants',
      label: 'Fábricas',
      icon: <Wrench className="h-4 w-4" />,
      requiresTenant: true,
      description: 'Gestão e métricas por fábrica',
    },
    {
      id: 'users',
      label: 'Utilizadores & RBAC',
      icon: <Users className="h-4 w-4" />,
      requiresTenant: true,
      description: 'Permissões, roles e utilizadores',
    },
    {
      id: 'db',
      label: 'Base de Dados',
      icon: <Database className="h-4 w-4" />,
      requiresTenant: true,
      description: 'Setup/atualizações e reparação',
    },
    {
      id: 'support',
      label: 'Suporte',
      icon: <LifeBuoy className="h-4 w-4" />,
      description: 'Diagnósticos e auditoria',
    },
  ];

  const slugifyTenantSlug = (value: string) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    try {
      const ascii = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
      return ascii
        .replace(/[^a-z0-9\s_-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    } catch {
      return raw
        .replace(/[^a-z0-9\s_-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  };

  const normalizeStringList = (value: any): string[] => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v)).filter((v) => v.trim().length > 0);
        }
      } catch {
        // ignore
      }
      return [trimmed];
    }
    return [];
  };

  const loadTenants = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await getSuperadminTenants();
      const safe = Array.isArray(data) ? data : [];
      setTenants(safe);

      // Select tenant context:
      // - prefer last chosen (localStorage)
      // - otherwise first tenant in list
      const stored = localStorage.getItem('superadminTenantId');
      const storedId = stored && stored.trim().length > 0 ? stored.trim() : '';
      const exists = storedId ? safe.some((t) => String((t as any)?.id) === storedId) : false;
      const nextId = exists ? storedId : (safe[0]?.id ? String(safe[0].id) : '');
      if (nextId && nextId !== selectedTenantId) {
        setSelectedTenantId(nextId);
        localStorage.setItem('superadminTenantId', nextId);
        window.dispatchEvent(new Event('superadmin-tenant-changed'));
      } else if (!nextId) {
        if (storedId) localStorage.removeItem('superadminTenantId');
        if (selectedTenantId) {
          setSelectedTenantId('');
          window.dispatchEvent(new Event('superadmin-tenant-changed'));
        }
      }

      try {
        const metrics = await getSuperadminTenantsMetrics();
        setTenantMetrics(Array.isArray(metrics) ? metrics : []);
      } catch {
        setTenantMetrics([]);
      }
    } catch (err: any) {
      setTenants([]);
      setTenantMetrics([]);
      setError(err?.message || 'Falha ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = React.useCallback(async () => {
    setLoadingDashboard(true);
    setError('');
    try {
      const [metrics, audit, activity] = await Promise.all([
        getSuperadminDashboardMetrics(),
        getSuperadminAudit({ limit: 10, offset: 0 }),
        getSuperadminTenantsActivity(30, 5),
      ]);
      setDashboardMetrics(metrics || null);
      setDashboardAudit(Array.isArray(audit) ? audit : []);
      setDashboardActivity(Array.isArray(activity) ? activity : []);
    } catch (err: any) {
      setDashboardMetrics(null);
      setDashboardAudit([]);
      setDashboardActivity([]);
      setError(err?.message || 'Falha ao carregar dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const loadPlantMetrics = React.useCallback(async () => {
    if (!selectedTenantId) {
      setPlantMetrics([]);
      return;
    }
    setLoadingPlantMetrics(true);
    setError('');
    try {
      const rows = await getSuperadminPlantsMetrics();
      setPlantMetrics(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setPlantMetrics([]);
      setError(err?.message || 'Falha ao carregar métricas de fábricas');
    } finally {
      setLoadingPlantMetrics(false);
    }
  }, [selectedTenantId]);

  const loadUserDiagnostics = React.useCallback(async () => {
    if (!selectedTenantId) {
      setUserAnomalies(null);
      setRbacMatrix(null);
      setRbacDrift(null);
      setIntegrityChecks(null);
      setSecurityInsights(null);
      return;
    }

    setLoadingUserAnomalies(true);
    setLoadingRbacMatrix(true);
    setError('');

    try {
      const [anoms, rolesData, permsData, drift, integrity, security] = await Promise.all([
        getSuperadminUserAnomalies(),
        getAdminRoles(),
        getAdminPermissions(),
        getSuperadminRbacDrift(),
        getSuperadminIntegrityChecks(),
        getSuperadminUserSecurityInsights(30, 5),
      ]);

      const roles = Array.isArray(rolesData) ? rolesData : [];
      const permissions = Array.isArray(permsData) ? permsData : [];

      const permsByRole: Record<string, Set<string>> = {};
      await Promise.all(
        roles.map(async (r: any) => {
          try {
            const list = await getAdminRolePermissions(String(r.key));
            const keys = Array.isArray(list) ? list.map((x) => String(x)) : [];
            permsByRole[String(r.key)] = new Set(keys);
          } catch {
            permsByRole[String(r.key)] = new Set();
          }
        }),
      );

      setUserAnomalies(anoms || null);
      setRbacMatrix({ roles, permissions, byRole: permsByRole });
      setRbacDrift(drift || null);
      setIntegrityChecks(integrity || null);
      setSecurityInsights(security || null);
    } catch (err: any) {
      setUserAnomalies(null);
      setRbacMatrix(null);
      setRbacDrift(null);
      setIntegrityChecks(null);
      setSecurityInsights(null);
      setError(err?.message || 'Falha ao carregar diagnósticos de utilizadores/RBAC');
    } finally {
      setLoadingUserAnomalies(false);
      setLoadingRbacMatrix(false);
    }
  }, [selectedTenantId]);

  const handlePatchRbac = React.useCallback(async () => {
    if (!selectedTenantId) return;
    setPatchingRbac(true);
    setError('');
    setSuccess('');
    try {
      await applyRbacPatch();
      setSuccess('RBAC reparado/seed aplicado com sucesso');
      await loadUserDiagnostics();
    } catch (err: any) {
      setError(err?.message || 'Falha ao aplicar patch RBAC');
    } finally {
      setPatchingRbac(false);
    }
  }, [loadUserDiagnostics, selectedTenantId]);

  const reloadPlantsForSelectedTenant = async () => {
    try {
      const plants = await getUserPlants();
      const safePlants = Array.isArray(plants) ? plants : [];
      setPlants(safePlants);
      if (safePlants.length > 0) {
        setSelectedPlant(safePlants[0].id);
      } else {
        setSelectedPlant('');
      }
    } catch {
      setPlants([]);
      setSelectedPlant('');
    }
  };

  React.useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDbStatus = async (limitOverride?: number) => {
    setLoadingDbStatus(true);
    try {
      const data = await getSuperadminDbStatus(limitOverride ?? dbRunsLimit);
      setDbStatus(data || null);
    } catch (err: any) {
      setDbStatus(null);
      setError(err?.message || 'Falha ao carregar estado da base de dados');
    } finally {
      setLoadingDbStatus(false);
    }
  };

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId) || null;

  const handleSelectTenant = async (id: string) => {
    const nextId = String(id || '').trim();
    if (!nextId) return;

    setSelectedTenantId(nextId);
    setError('');
    setSuccess('');
    localStorage.setItem('superadminTenantId', nextId);
    window.dispatchEvent(new Event('superadmin-tenant-changed'));

    // Changing tenant means plant list must be reloaded.
    // This keeps admin/plant-scoped widgets aligned.
    await reloadPlantsForSelectedTenant();
  };

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    void loadDbStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, dbRunsLimit]);

  React.useEffect(() => {
    if (!selectedTenantId) return;
    void loadPlantMetrics();
    void loadUserDiagnostics();
  }, [loadPlantMetrics, loadUserDiagnostics, selectedTenantId]);

  const [supportHealth, setSupportHealth] = React.useState<any | null>(null);
  const [supportDiagnostics, setSupportDiagnostics] = React.useState<any | null>(null);
  const [supportAudit, setSupportAudit] = React.useState<any[]>([]);
  const [loadingSupport, setLoadingSupport] = React.useState(false);
  const [auditPurging, setAuditPurging] = React.useState(false);
  const [auditExporting, setAuditExporting] = React.useState<'csv' | 'json' | null>(null);
  const [runsExporting, setRunsExporting] = React.useState<'csv' | 'json' | null>(null);

  const [userSearchQ, setUserSearchQ] = React.useState('');
  const [userSearchResults, setUserSearchResults] = React.useState<any[]>([]);
  const [userSearching, setUserSearching] = React.useState(false);
  const [resettingUserId, setResettingUserId] = React.useState<string | null>(null);
  const [oneTimePassword, setOneTimePassword] = React.useState<string>('');
  const [runsExportLimit, setRunsExportLimit] = React.useState<number>(200);

  const loadSupportData = React.useCallback(async () => {
    setLoadingSupport(true);
    setError('');
    try {
      const [health, diagnostics, audit] = await Promise.all([
        getSuperadminHealth(),
        getSuperadminTenantDiagnostics(5),
        getSuperadminAudit({ limit: 20, offset: 0 }),
      ]);
      setSupportHealth(health || null);
      setSupportDiagnostics(diagnostics || null);
      setSupportAudit(Array.isArray(audit) ? audit : []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados de suporte');
      setSupportHealth(null);
      setSupportDiagnostics(null);
      setSupportAudit([]);
    } finally {
      setLoadingSupport(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSupportData();
  }, [loadSupportData]);

  const handleCreateTenant = async () => {
    const name = newTenant.name.trim();
    const slug = slugifyTenantSlug(newTenant.slug);
    if (!name || !slug) {
      setError('Nome e slug são obrigatórios');
      return;
    }

    setCreatingTenant(true);
    setError('');
    setSuccess('');
    try {
      await createSuperadminTenant({ name, slug });
      setSuccess('Empresa criada com sucesso.');
      setNewTenant({ name: '', slug: '' });
      await loadTenants();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar empresa');
    } finally {
      setCreatingTenant(false);
    }
  };

  const toggleTenantActive = async (tenantId: string, nextActive: boolean) => {
    setError('');
    setSuccess('');
    try {
      await updateSuperadminTenant(tenantId, { is_active: nextActive });
      setSuccess('Estado da empresa atualizado.');
      await loadTenants();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar empresa');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          <div className="overflow-hidden rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
            <div className="h-2 w-full bg-[color:var(--dash-accent)]" />
            <div className="p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
                Super Admin
              </div>
              <div className="mt-2 text-base font-semibold text-[color:var(--dash-ink)]">
                Centro de controlo
              </div>
              <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                Empresa ativa: <span className="font-semibold text-[color:var(--dash-ink)]">{selectedTenant ? selectedTenant.name : '—'}</span>
                {selectedTenant ? <span className="ml-1">({selectedTenant.slug})</span> : null}
              </div>
            </div>
          </div>

          <nav className="rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const disabled = Boolean(item.requiresTenant && !selectedTenantId);
                const active = item.id === activeSub;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => openSub(item.id)}
                    className={
                      active
                        ? 'w-full rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-3 py-3 text-left transition'
                        : 'w-full rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-[color:var(--dash-border)] hover:bg-[color:var(--dash-panel)]'
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] text-[color:var(--dash-muted)]">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-[color:var(--dash-ink)] truncate">{item.label}</div>
                          {disabled ? (
                            <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800">
                              Precisa empresa
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-[color:var(--dash-muted)] truncate">{item.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">Super Admin</p>
              <h4 className="mt-2 text-lg font-semibold text-[color:var(--dash-ink)]">Navegação</h4>
              <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                Escolha uma categoria para gerir a instalação, dados e suporte.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                Contexto
              </div>
              <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-4 py-3 text-sm text-[color:var(--dash-muted)]">
                Empresa ativa:{' '}
                <span className="font-semibold text-[color:var(--dash-ink)]">
                  {selectedTenant ? selectedTenant.name : '—'}
                </span>
                {selectedTenant ? <span className="ml-2 text-xs">({selectedTenant.slug})</span> : null}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:hidden">
            {navItems.map((item) => {
              const disabled = Boolean(item.requiresTenant && !selectedTenantId);
              const active = item.id === activeSub;
              return (
                <button
                  key={`card-${item.id}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => openSub(item.id)}
                  className={
                    active
                      ? 'rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-4 text-left transition'
                      : 'rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4 text-left transition hover:bg-[color:var(--dash-panel)]'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] text-[color:var(--dash-muted)]">
                          {item.icon}
                        </div>
                        <div className="font-semibold text-[color:var(--dash-ink)] truncate">{item.label}</div>
                      </div>
                      <div className="mt-2 text-sm text-[color:var(--dash-muted)]">
                        {item.description}
                      </div>
                    </div>
                    {disabled ? (
                      <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800">
                        Selecionar empresa
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {(error || success) && (
            <div className="mt-4 space-y-2">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-800">
                  {success}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {!selectedTenantId && tenants.length > 0 && (
            <section className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-800">
              Selecione uma empresa para ver dados por contexto.
            </section>
          )}

          {tenants.length === 0 && (
            <section className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-800">
              Ainda não existem empresas. Crie uma para começar.
            </section>
          )}

          {activeSub === 'dashboard' && (
            <section className="overflow-hidden rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
              <div className="h-2 w-full bg-[color:var(--dash-accent)]" />
              <div className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
                      Super Admin
                    </div>
                    <h4 className="mt-2 text-lg font-semibold text-[color:var(--dash-ink)]">Dashboard</h4>
                    <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                      Resumo do sistema e do contexto selecionado.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">Empresas</div>
                        <div className="mt-2 text-2xl font-semibold text-[color:var(--dash-ink)]">
                          {dashboardMetrics?.totals?.tenants != null ? String(dashboardMetrics.totals.tenants) : String(tenants.length)}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                          Ativas {dashboardMetrics?.totals?.tenantsActive != null ? String(dashboardMetrics.totals.tenantsActive) : String(tenants.filter((t) => t.is_active).length)}
                          {' '}• Inativas {dashboardMetrics?.totals?.tenants != null && dashboardMetrics?.totals?.tenantsActive != null ? String(Math.max(0, Number(dashboardMetrics.totals.tenants) - Number(dashboardMetrics.totals.tenantsActive))) : String(tenants.filter((t) => !t.is_active).length)}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                          24h: +{dashboardMetrics?.last24h?.tenantsCreated != null ? String(dashboardMetrics.last24h.tenantsCreated) : '—'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                        <Building2 className="h-5 w-5 text-[color:var(--dash-muted)]" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">Empresa ativa</div>
                        <div className="mt-2 text-base font-semibold text-[color:var(--dash-ink)] truncate">
                          {selectedTenant ? selectedTenant.name : '—'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                        <Users className="h-5 w-5 text-[color:var(--dash-muted)]" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">Estado da BD</div>
                        <div className="mt-2 text-2xl font-semibold text-[color:var(--dash-ink)]">
                            {loadingDbStatus ? '…' : dbStatus ? (dbStatus.dbOk ? 'Online' : 'Erro') : '—'}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                          {(() => {
                            const scope = String(dbStatus?.scope || (selectedTenantId ? 'tenant' : 'global'));
                            const scopeLabel = scope === 'tenant' ? 'Empresa' : 'Sistema';
                            if (dbStatus?.dbTime) return `Âmbito: ${scopeLabel} • Hora BD: ${String(dbStatus.dbTime)}`;
                            return `Âmbito: ${scopeLabel}`;
                          })()}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                        <Database className="h-5 w-5 text-[color:var(--dash-muted)]" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">Registos</div>
                        <div className="mt-2 text-sm text-[color:var(--dash-muted)]">
                          Users total:{' '}
                          <span className="font-semibold text-[color:var(--dash-ink)]">
                            {dashboardMetrics?.totals?.users != null ? String(dashboardMetrics.totals.users) : '—'}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-[color:var(--dash-muted)]">
                          Fábricas total:{' '}
                          <span className="font-semibold text-[color:var(--dash-ink)]">
                            {dashboardMetrics?.totals?.plants != null ? String(dashboardMetrics.totals.plants) : '—'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                          24h: +users {dashboardMetrics?.last24h?.usersCreated != null ? String(dashboardMetrics.last24h.usersCreated) : '—'} • logins {dashboardMetrics?.last24h?.logins != null ? String(dashboardMetrics.last24h.logins) : '—'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                        <Server className="h-5 w-5 text-[color:var(--dash-muted)]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                          Últimos eventos (SuperAdmin)
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                          Top 10 auditoria
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3 inline-flex items-center"
                        onClick={() => void loadDashboard()}
                        disabled={loadingDashboard}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Atualizar
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {dashboardAudit.length === 0 ? (
                        <div className="text-sm text-[color:var(--dash-muted)]">
                          {loadingDashboard ? 'A carregar...' : 'Sem eventos.'}
                        </div>
                      ) : (
                        dashboardAudit.map((row: any) => (
                          <div
                            key={String(row.id)}
                            className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[color:var(--dash-ink)] truncate">
                                  {String(row.action)}
                                </div>
                                <div className="text-xs text-[color:var(--dash-muted)] truncate">
                                  {String(row.entity_type)} • {String(row.entity_id)}
                                </div>
                              </div>
                              <div className="text-xs whitespace-nowrap text-[color:var(--dash-muted)]">
                                {row.created_at ? String(row.created_at) : '—'}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                          Top empresas por atividade (30d)
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--dash-muted)]">Export do sistema</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary h-9 px-3 inline-flex items-center"
                          onClick={async () => {
                            setError('');
                            try {
                              await downloadSuperadminTenantsActivity('csv', 30, 200);
                            } catch (err: any) {
                              setError(err?.message || 'Falha ao exportar CSV');
                            }
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Exportar CSV
                        </button>
                        <button
                          type="button"
                          className="btn-secondary h-9 px-3 inline-flex items-center"
                          onClick={async () => {
                            setError('');
                            try {
                              await downloadSuperadminTenantsActivity('json', 30, 200);
                            } catch (err: any) {
                              setError(err?.message || 'Falha ao exportar JSON');
                            }
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Exportar JSON
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {dashboardActivity.length === 0 ? (
                        <div className="text-sm text-[color:var(--dash-muted)]">
                          {loadingDashboard ? 'A carregar...' : 'Sem dados.'}
                        </div>
                      ) : (
                        dashboardActivity.map((row: any) => (
                          <div key={String(row?.tenant?.id || row?.tenantId || Math.random())} className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[color:var(--dash-ink)] truncate">{String(row?.tenant?.name || 'Empresa')}</div>
                                <div className="text-xs text-[color:var(--dash-muted)] truncate">{String(row?.tenant?.slug || '')}</div>
                              </div>
                              <div className="text-xs text-[color:var(--dash-muted)] whitespace-nowrap">
                                logins={String(row?.logins ?? 0)} • concl={String(row?.preventiveCompleted ?? 0)}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                              atraso(abertas)={String(row?.preventiveOverdueOpen ?? 0)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {selectedTenantId && dbStatus?.lastSetupRun ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">Última execução</div>
                        <div className="mt-2 text-sm text-[color:var(--dash-muted)]">
                          Tipo:{' '}
                          <span className="font-semibold text-[color:var(--dash-ink)]">{String(dbStatus.lastSetupRun.run_type || '-')}</span>
                          {dbStatus.lastSetupRun.created_at ? <span> • {String(dbStatus.lastSetupRun.created_at)}</span> : null}
                        </div>
                      </div>
                      <button type="button" className="btn-secondary h-9 px-3" onClick={() => void loadDbStatus()} disabled={loadingDbStatus}>
                        Recarregar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {activeSub === 'tenants' && (
            <section className="rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-5">
              <h4 className="text-lg font-semibold text-[color:var(--dash-ink)]">Empresas</h4>
              <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                Criar e ativar/desativar empresas.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary h-9 px-3 inline-flex items-center"
                  onClick={async () => {
                    setError('');
                    try {
                      await downloadSuperadminTenantsMetrics('csv');
                    } catch (err: any) {
                      setError(err?.message || 'Falha ao exportar CSV');
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </button>
                <button
                  type="button"
                  className="btn-secondary h-9 px-3 inline-flex items-center"
                  onClick={async () => {
                    setError('');
                    try {
                      await downloadSuperadminTenantsMetrics('json');
                    } catch (err: any) {
                      setError(err?.message || 'Falha ao exportar JSON');
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar JSON
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  className="h-10 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] px-3 text-sm"
                  placeholder="Nome da empresa"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant((s) => ({ ...s, name: e.target.value }))}
                />
                <div>
                  <input
                    className="h-10 w-full rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] px-3 text-sm"
                    placeholder="slug (ex: acme industria)"
                    value={newTenant.slug}
                    onChange={(e) => setNewTenant((s) => ({ ...s, slug: e.target.value }))}
                  />
                  <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                    Espaços e acentos serão normalizados (ex: “Minha Empresa” → “minha-empresa”).
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary h-10"
                  onClick={() => void handleCreateTenant()}
                  disabled={creatingTenant}
                >
                  Criar empresa
                </button>
              </div>

              <div className="mt-5 space-y-2">
                {(tenantMetrics.length > 0 ? tenantMetrics : tenants).map((t: any) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[color:var(--dash-ink)] truncate">{t.name}</div>
                      <div className="text-xs text-[color:var(--dash-muted)] truncate">{t.slug}</div>
                      {'users' in t || 'plants' in t || 'last_login' in t ? (
                        <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                          users={String((t as any).users ?? '—')} • fábricas={String((t as any).plants ?? '—')} • último login={
                            (t as any).last_login ? String((t as any).last_login) : '—'
                          }
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={
                          String(t.id) === String(selectedTenantId)
                            ? 'btn-primary h-9 px-3'
                            : 'btn-secondary h-9 px-3'
                        }
                        onClick={() => void handleSelectTenant(t.id)}
                      >
                        {String(t.id) === String(selectedTenantId) ? 'Selecionada' : 'Selecionar'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={() => void toggleTenantActive(t.id, !t.is_active)}
                      >
                        {t.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSub === 'plants' && selectedTenantId && (
            <section className="rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-5">
              <h4 className="text-lg font-semibold text-[color:var(--dash-ink)]">Fábricas</h4>
              <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                Gestão de fábricas para a empresa selecionada.
              </p>

              <div className="mt-4 rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Saúde por fábrica
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                      ativos, preventivas em atraso e taxa de conclusão (30 dias)
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3 inline-flex items-center"
                      onClick={() => void loadPlantMetrics()}
                      disabled={loadingPlantMetrics}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3 inline-flex items-center"
                      onClick={async () => {
                        setError('');
                        try {
                          await downloadSuperadminPlantsMetrics('csv');
                        } catch (err: any) {
                          setError(err?.message || 'Falha ao exportar CSV');
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </button>
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3 inline-flex items-center"
                      onClick={async () => {
                        setError('');
                        try {
                          await downloadSuperadminPlantsMetrics('json');
                        } catch (err: any) {
                          setError(err?.message || 'Falha ao exportar JSON');
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar JSON
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {plantMetrics.length === 0 ? (
                    <div className="text-sm text-[color:var(--dash-muted)]">
                      {loadingPlantMetrics ? 'A carregar...' : 'Sem dados.'}
                    </div>
                  ) : (
                    plantMetrics.map((p: any) => (
                      <div key={String(p.id)} className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-[color:var(--dash-ink)] truncate">{String(p.name)}</div>
                            <div className="text-xs text-[color:var(--dash-muted)]">
                              {String(p.code)} • assets={String(p.assets)} • atraso={String(p.overdue)} • próximos 7d={String(p.next_7d ?? 0)} • 14d={String(p.next_14d ?? 0)}
                            </div>
                          </div>
                          <div className="text-xs text-[color:var(--dash-muted)]">
                            30d: {String(p.completed_30d)} / {String(p.scheduled_30d)} ({p.completion_rate_30d == null ? '—' : `${Math.round(Number(p.completion_rate_30d) * 100)}%`})
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6">
                <PlantsPage embedded key={`plants-${selectedTenantId}`} />
              </div>
            </section>
          )}

          {activeSub === 'users' && selectedTenantId && (
            <section className="rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-5">
              <h4 className="text-lg font-semibold text-[color:var(--dash-ink)]">Utilizadores & RBAC</h4>
              <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                Permissões, roles e utilizadores para a empresa selecionada.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setUsersSection('diagnostics')}
                  className={
                    usersSection === 'diagnostics'
                      ? 'rounded-[20px] border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4 text-left transition'
                      : 'rounded-[20px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-4 text-left transition hover:bg-[color:var(--dash-surface)]'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--dash-ink)]">Diagnósticos</div>
                      <div className="mt-1 text-xs text-[color:var(--dash-muted)]">Anomalias e matriz (read-only)</div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-2 text-[color:var(--dash-muted)]">
                      <RefreshCw className="h-4 w-4" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUsersSection('rolePermissions')}
                  className={
                    usersSection === 'rolePermissions'
                      ? 'rounded-[20px] border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4 text-left transition'
                      : 'rounded-[20px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-4 text-left transition hover:bg-[color:var(--dash-surface)]'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--dash-ink)]">Permissões dos roles</div>
                      <div className="mt-1 text-xs text-[color:var(--dash-muted)]">Configurar acesso por role</div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-2 text-[color:var(--dash-muted)]">
                      <Shield className="h-4 w-4" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUsersSection('users')}
                  className={
                    usersSection === 'users'
                      ? 'rounded-[20px] border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4 text-left transition'
                      : 'rounded-[20px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-4 text-left transition hover:bg-[color:var(--dash-surface)]'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--dash-ink)]">Utilizadores</div>
                      <div className="mt-1 text-xs text-[color:var(--dash-muted)]">Criar, editar e gerir acessos</div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-2 text-[color:var(--dash-muted)]">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              </div>

              {usersSection === 'diagnostics' && (
              <>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                        Detecções
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                        utilizadores sem fábrica / role inválida
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={() => void loadUserDiagnostics()}
                        disabled={loadingUserAnomalies || loadingRbacMatrix || patchingRbac}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Atualizar
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={() => void handlePatchRbac()}
                        disabled={!selectedTenantId || patchingRbac}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Reparar RBAC
                      </button>
                    </div>
                  </div>

                  {userAnomalies ? (
                    <div className="mt-3 space-y-2 text-sm text-[color:var(--dash-muted)]">
                      <div>
                        Sem fábrica: <span className="font-semibold text-[color:var(--dash-ink)]">{String(userAnomalies.usersWithoutPlants?.length ?? 0)}</span>
                      </div>
                      <div>
                        Sem role: <span className="font-semibold text-[color:var(--dash-ink)]">{String(userAnomalies.usersWithoutRole?.length ?? 0)}</span>
                      </div>
                      <div>
                        Role desconhecida: <span className="font-semibold text-[color:var(--dash-ink)]">{String(userAnomalies.usersWithUnknownRole?.length ?? 0)}</span>
                      </div>

                      {(userAnomalies.usersWithoutPlants || []).slice(0, 5).length > 0 ? (
                        <div className="mt-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                            Exemplos (sem fábrica)
                          </div>
                          <div className="mt-2 space-y-2">
                            {(userAnomalies.usersWithoutPlants || []).slice(0, 5).map((u: any) => (
                              <div key={String(u.id)} className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                                <div className="text-sm font-semibold text-[color:var(--dash-ink)] truncate">{String(u.username)}</div>
                                <div className="text-xs text-[color:var(--dash-muted)] truncate">{String(u.email)} • role={String(u.role ?? '—')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-[color:var(--dash-muted)]">
                      {loadingUserAnomalies ? 'A carregar...' : 'Sem dados.'}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                    Matriz de permissões (read-only)
                  </div>
                  <div className="mt-3 text-sm text-[color:var(--dash-muted)]">
                    {loadingRbacMatrix ? 'A carregar...' : rbacMatrix ? (
                      <div className="max-h-[320px] overflow-auto rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
                        <table className="min-w-full text-left text-xs">
                          <thead className="sticky top-0 bg-[color:var(--dash-surface)]">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-[color:var(--dash-ink)]">Permissão</th>
                              {rbacMatrix.roles.slice(0, 6).map((r: any) => (
                                <th key={String(r.key)} className="px-3 py-2 font-semibold text-[color:var(--dash-ink)]">{String(r.key)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rbacMatrix.permissions.slice(0, 30).map((p: any) => (
                              <tr key={String(p.key)} className="border-t border-[color:var(--dash-border)]">
                                <td className="px-3 py-2 text-[color:var(--dash-muted)]">{String(p.key)}</td>
                                {rbacMatrix.roles.slice(0, 6).map((r: any) => {
                                  const has = rbacMatrix.byRole[String(r.key)]?.has(String(p.key));
                                  return (
                                    <td key={`${String(p.key)}-${String(r.key)}`} className="px-3 py-2">
                                      <span className={has ? 'font-semibold text-[color:var(--dash-ink)]' : 'text-[color:var(--dash-muted)]'}>
                                        {has ? '✓' : '—'}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : 'Sem dados.'}
                    {rbacMatrix ? (
                      <div className="mt-2 text-xs text-[color:var(--dash-muted)]">
                        Mostra até 6 roles e 30 permissões (para manter leve).
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                        RBAC drift
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--dash-muted)]">Export (tenant)</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={async () => {
                          setError('');
                          try {
                            await downloadSuperadminRbacDrift('csv');
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar CSV');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={async () => {
                          setError('');
                          try {
                            await downloadSuperadminRbacDrift('json');
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar JSON');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar JSON
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-[color:var(--dash-muted)]">
                    Roles sem permissões:{' '}
                    <span className="font-semibold text-[color:var(--dash-ink)]">
                      {rbacDrift?.rolesWithNoPermissions ? String(rbacDrift.rolesWithNoPermissions.length) : '—'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--dash-muted)]">
                    Permissões não usadas:{' '}
                    <span className="font-semibold text-[color:var(--dash-ink)]">
                      {rbacDrift?.permissionsUnused ? String(rbacDrift.permissionsUnused.length) : '—'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                        Integridade
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--dash-muted)]">Export (tenant)</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={async () => {
                          setError('');
                          try {
                            await downloadSuperadminIntegrityChecks('csv');
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar CSV');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={async () => {
                          setError('');
                          try {
                            await downloadSuperadminIntegrityChecks('json');
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar JSON');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar JSON
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(integrityChecks?.checks || []).slice(0, 5).map((c: any) => (
                      <div key={String(c.key)} className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-3 py-2">
                        <div className="text-xs text-[color:var(--dash-muted)] truncate">{String(c.label)}</div>
                        <div className="text-sm font-semibold text-[color:var(--dash-ink)]">{String(c.count ?? 0)}</div>
                      </div>
                    ))}
                    {!integrityChecks ? <div className="text-sm text-[color:var(--dash-muted)]">—</div> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                        Segurança (30d)
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--dash-muted)]">Export (tenant)</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3 inline-flex items-center"
                        onClick={async () => {
                          setError('');
                          try {
                            await downloadSuperadminUserSecurity('csv', 30, 200);
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar CSV');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3 inline-flex items-center"
                        onClick={async () => {
                          setError('');
                          try {
                            await downloadSuperadminUserSecurity('json', 30, 200);
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar JSON');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar JSON
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(securityInsights?.topPasswordResets || []).length === 0 ? (
                      <div className="text-sm text-[color:var(--dash-muted)]">Sem resets.</div>
                    ) : (
                      (securityInsights?.topPasswordResets || []).slice(0, 5).map((r: any) => (
                        <div key={String(r.userId)} className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                          <div className="text-sm font-semibold text-[color:var(--dash-ink)] truncate">{String(r.user?.username || r.userId)}</div>
                          <div className="text-xs text-[color:var(--dash-muted)]">resets={String(r.resetCount)} • último={r.lastResetAt ? String(r.lastResetAt) : '—'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              </>
              )}

              {usersSection === 'rolePermissions' && (
                <div className="mt-6">
                  <PermissionsSettings key={`perm-${selectedTenantId}`} />
                </div>
              )}

              {usersSection === 'users' && (
                <div className="mt-6">
                  <ManagementSettings mode="usersOnly" key={`mgmt-${selectedTenantId}`} />
                </div>
              )}
            </section>
          )}

          {activeSub === 'db' && selectedTenantId && (
            <section className="rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-5">
              <h4 className="text-lg font-semibold text-[color:var(--dash-ink)]">Atualizações & Base de dados</h4>
              <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                Estas ferramentas operam sobre a empresa selecionada.
              </p>

              <div className="mt-4 rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Checklist de setup
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--dash-muted)]">
                      validações rápidas para suporte
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3 inline-flex items-center"
                      onClick={async () => {
                        setError('');
                        try {
                          await downloadSuperadminDbStatusJson(dbRunsLimit);
                        } catch (err: any) {
                          setError(err?.message || 'Falha ao exportar status');
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar status (JSON)
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  {[
                    { label: 'DB OK', ok: Boolean(dbStatus?.dbOk) },
                    { label: 'Migrações OK', ok: Boolean(dbStatus?.drizzleMigrations?.table) },
                    { label: 'Última run', ok: Boolean(dbStatus?.lastSetupRun) },
                    { label: 'Scope = Empresa', ok: String(dbStatus?.scope || '') === 'tenant' },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">{c.label}</div>
                      <div className="mt-2 text-sm font-semibold text-[color:var(--dash-ink)]">{c.ok ? 'OK' : '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Estado da BD
                    </div>
                    <div className="mt-2 text-sm text-[color:var(--dash-muted)]">
                      Contexto:{' '}
                      <span className="font-semibold text-[color:var(--dash-ink)]">{selectedTenant?.name || selectedTenantId}</span>
                    </div>
                    {dbStatus ? (
                      <div className="mt-2 text-sm text-[color:var(--dash-muted)]">
                        {dbStatus.scope ? (
                          <div>
                            Âmbito:{' '}
                            <span className="font-semibold text-[color:var(--dash-ink)]">
                              {String(dbStatus.scope) === 'tenant' ? 'Empresa' : 'Sistema'}
                            </span>
                          </div>
                        ) : null}
                        <div>
                          DB:{' '}
                          <span className="font-semibold text-[color:var(--dash-ink)]">
                            {dbStatus.dbOk ? 'Online' : 'Erro'}
                          </span>
                        </div>
                        {dbStatus.dbTime ? <div>Hora BD: {String(dbStatus.dbTime)}</div> : null}
                        {dbStatus.serverTime ? <div>Hora servidor: {String(dbStatus.serverTime)}</div> : null}
                        {dbStatus.counts ? (
                          <div>
                            Registos (tenant): users={String(dbStatus.counts.users ?? '-')}, plants={String(dbStatus.counts.plants ?? '-')}
                          </div>
                        ) : null}
                        {dbStatus.drizzleMigrations?.table ? (
                          <div>
                            Migrações:{' '}
                            <span className="font-semibold">{String(dbStatus.drizzleMigrations.table)}</span>
                          </div>
                        ) : null}
                        {dbStatus.lastSetupRun ? (
                          <div className="mt-3 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                              Última execução
                            </div>
                            <div className="mt-2">
                              Tipo:{' '}
                              <span className="font-semibold text-[color:var(--dash-ink)]">
                                {String(dbStatus.lastSetupRun.run_type || '-')}
                              </span>
                            </div>
                            {dbStatus.lastSetupRun.created_at ? (
                              <div>Data: {String(dbStatus.lastSetupRun.created_at)}</div>
                            ) : null}
                            {(() => {
                              const migrations = normalizeStringList(dbStatus.lastSetupRun.migrations);
                              const patches = normalizeStringList(dbStatus.lastSetupRun.patches);
                              if (migrations.length === 0 && patches.length === 0) return null;
                              return (
                                <div className="mt-2">
                                  {migrations.length > 0 ? <div>Migrações: {migrations.join(', ')}</div> : null}
                                  {patches.length > 0 ? <div>Patches: {patches.join(', ')}</div> : null}
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}

                        {Array.isArray((dbStatus as any).setupRuns) && (dbStatus as any).setupRuns.length > 0 ? (
                          <div className="mt-3 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                              Histórico (últimas {(dbStatus as any).setupRuns.length} / {dbRunsLimit})
                            </div>
                            <div className="mt-2 space-y-2">
                              {(dbStatus as any).setupRuns.map((run: any, idx: number) => {
                                const migrations = normalizeStringList(run?.migrations);
                                const patches = normalizeStringList(run?.patches);
                                return (
                                  <div
                                    key={String(run?.id || `${run?.created_at || 'run'}-${idx}`)}
                                    className="rounded-lg border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-2"
                                  >
                                    <div>
                                      <span className="font-semibold text-[color:var(--dash-ink)]">{String(run?.run_type || '-')}</span>
                                      {run?.created_at ? <span> · {String(run.created_at)}</span> : null}
                                    </div>
                                    {migrations.length > 0 ? <div className="text-xs">Migrações: {migrations.join(', ')}</div> : null}
                                    {patches.length > 0 ? <div className="text-xs">Patches: {patches.join(', ')}</div> : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-[color:var(--dash-muted)]">
                        {loadingDbStatus ? 'A carregar...' : 'Sem dados de estado.'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-stretch gap-2">
                    <label className="text-xs font-semibold text-[color:var(--dash-muted)]">Histórico</label>
                    <select
                      className="h-9 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-3 text-sm text-[color:var(--dash-ink)]"
                      value={String(dbRunsLimit)}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setDbRunsLimit(Number.isFinite(next) ? next : 10);
                      }}
                      disabled={loadingDbStatus}
                    >
                      <option value="10">Últimas 10</option>
                      <option value="25">Últimas 25</option>
                      <option value="50">Últimas 50</option>
                    </select>

                    <button
                      type="button"
                      className="btn-secondary h-9 px-3"
                      onClick={() => void loadDbStatus()}
                      disabled={loadingDbStatus}
                    >
                      Recarregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-8">
                <DatabaseUpdatePage embedded />
                <AdminSetupPage embedded />
                <SetupInitPage embedded />
              </div>
            </section>
          )}

          {activeSub === 'support' && (
            <section className="overflow-hidden rounded-[24px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
              <div className="h-2 w-full bg-[color:var(--dash-accent)]" />
              <div className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
                      <LifeBuoy className="h-4 w-4" />
                      Suporte
                    </div>
                    <h4 className="mt-2 text-lg font-semibold text-[color:var(--dash-ink)]">Ferramentas & Diagnóstico</h4>
                    <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
                      Saúde do sistema, auditoria e ações de suporte.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3 inline-flex items-center"
                      onClick={() => loadSupportData()}
                      disabled={loadingSupport}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar
                    </button>

                    <button
                      type="button"
                      className="btn-secondary h-9 px-3 inline-flex items-center"
                      onClick={async () => {
                        setError('');
                        try {
                          await downloadSuperadminDiagnosticsBundle({ format: 'json', auditLimit: 100 });
                        } catch (err: any) {
                          setError(err?.message || 'Falha ao gerar bundle');
                        }
                      }}
                      title="Download: health + db status + diagnostics + audit"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Bundle diagnóstico
                    </button>

                    <button
                      type="button"
                      className="btn-secondary h-9 px-3 inline-flex items-center"
                      onClick={async () => {
                        setError('');
                        try {
                          await downloadSuperadminDiagnosticsBundle({ format: 'zip', auditLimit: 100 });
                        } catch (err: any) {
                          setError(err?.message || 'Falha ao gerar ZIP');
                        }
                      }}
                      title="Download ZIP (vários ficheiros)"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      ZIP
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Saúde do sistema
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-[color:var(--dash-muted)]">
                      <div>
                        API:{' '}
                        <span className="font-semibold text-[color:var(--dash-ink)]">
                          {supportHealth?.apiOk ? 'Online' : 'Erro'}
                        </span>
                      </div>
                      <div>
                        BD:{' '}
                        <span className="font-semibold text-[color:var(--dash-ink)]">
                          {supportHealth?.dbOk ? 'Online' : 'Erro'}
                        </span>
                      </div>
                      <div>
                        Uptime:{' '}
                        <span className="font-semibold text-[color:var(--dash-ink)]">
                          {supportHealth?.uptimeSeconds != null ? `${String(supportHealth.uptimeSeconds)}s` : '—'}
                        </span>
                      </div>
                      <div>
                        Versão:{' '}
                        <span className="font-semibold text-[color:var(--dash-ink)]">
                          {supportHealth?.version ? String(supportHealth.version) : '—'}
                        </span>
                      </div>
                      {supportHealth?.config ? (
                        <div className="mt-3 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                            Config (read-only)
                          </div>
                          <div className="mt-1 text-xs">
                            env={String(supportHealth.config.nodeEnv ?? '—')} • tz={String(supportHealth.config.timezone ?? '—')}
                          </div>
                          <div className="mt-1 text-xs">
                            node={String(supportHealth.config.nodeVersion ?? '—')} • {String(supportHealth.config.platform ?? '—')}/{String(supportHealth.config.arch ?? '—')}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Diagnóstico multi-tenant
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-[color:var(--dash-muted)]">
                      {(supportDiagnostics?.warnings || []).length === 0 ? (
                        <div className="text-[color:var(--dash-muted)]">Sem avisos.</div>
                      ) : (
                        (supportDiagnostics?.warnings || []).slice(0, 5).map((w: any, idx: number) => (
                          <div key={idx} className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                            <div className="font-semibold text-[color:var(--dash-ink)] truncate">
                              {String(w?.tenant?.name || 'Empresa')}
                            </div>
                            <div className="text-xs">
                              {String(w.type)} • users={String(w.users)} • plants={String(w.plants)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Auditoria (SuperAdmin)
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3 inline-flex items-center"
                        disabled={auditExporting !== null}
                        onClick={async () => {
                          setAuditExporting('csv');
                          setError('');
                          try {
                            await downloadSuperadminAudit('csv', 200);
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar CSV');
                          } finally {
                            setAuditExporting(null);
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3 inline-flex items-center"
                        disabled={auditExporting !== null}
                        onClick={async () => {
                          setAuditExporting('json');
                          setError('');
                          try {
                            await downloadSuperadminAudit('json', 200);
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao exportar JSON');
                          } finally {
                            setAuditExporting(null);
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar JSON
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3 inline-flex items-center"
                        disabled={auditPurging}
                        onClick={async () => {
                          setAuditPurging(true);
                          setError('');
                          try {
                            const r = await purgeSuperadminAudit();
                            setSuccess(`Auditoria: removidos ${String(r.deleted)} registos.`);
                            await loadSupportData();
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao limpar auditoria');
                          } finally {
                            setAuditPurging(false);
                          }
                        }}
                        title="Remove registos antigos (retenção por env)"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar
                      </button>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-[color:var(--dash-muted)]">
                      {supportAudit.length === 0 ? (
                        <div className="text-[color:var(--dash-muted)]">Sem registos.</div>
                      ) : (
                        supportAudit.slice(0, 6).map((row: any) => (
                          <div key={String(row.id)} className="rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-semibold text-[color:var(--dash-ink)] truncate">{String(row.action)}</div>
                                <div className="text-xs truncate">{String(row.entity_type)} • {String(row.entity_id)}</div>
                              </div>
                              <div className="text-xs whitespace-nowrap">{row.created_at ? String(row.created_at) : '—'}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Reset password (suporte)
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--dash-muted)]">
                      Pesquisa por username/email/nome. O sistema gera uma password temporária.
                    </p>

                    <div className="mt-3 flex gap-2">
                      <input
                        value={userSearchQ}
                        onChange={(e) => setUserSearchQ(e.target.value)}
                        placeholder="Pesquisar utilizador..."
                        className="w-full rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-3 py-2 text-sm text-[color:var(--dash-ink)]"
                      />
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3 inline-flex items-center"
                        disabled={userSearching}
                        onClick={async () => {
                          const q = String(userSearchQ || '').trim();
                          if (q.length < 2) {
                            setError('Digite pelo menos 2 caracteres.');
                            return;
                          }
                          setUserSearching(true);
                          setError('');
                          setOneTimePassword('');
                          try {
                            const rows = await searchSuperadminUsers(q);
                            setUserSearchResults(Array.isArray(rows) ? rows : []);
                          } catch (err: any) {
                            setUserSearchResults([]);
                            setError(err?.message || 'Falha na pesquisa');
                          } finally {
                            setUserSearching(false);
                          }
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Buscar
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {userSearchResults.length === 0 ? (
                        <div className="text-sm text-[color:var(--dash-muted)]">Sem resultados.</div>
                      ) : (
                        userSearchResults.map((u: any) => (
                          <div key={String(u.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[color:var(--dash-ink)] truncate">
                                {String(u.first_name || '')} {String(u.last_name || '')}
                              </div>
                              <div className="text-xs text-[color:var(--dash-muted)] truncate">
                                {String(u.username)} • {String(u.email)}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-secondary h-9 px-3 inline-flex items-center"
                              disabled={resettingUserId === String(u.id)}
                              onClick={async () => {
                                setResettingUserId(String(u.id));
                                setError('');
                                setSuccess('');
                                setOneTimePassword('');
                                try {
                                  const r = await resetSuperadminUserPassword(String(u.id));
                                  setOneTimePassword(String(r.oneTimePassword || ''));
                                  setSuccess(`Password temporária gerada para ${String(r.username)}.`);
                                } catch (err: any) {
                                  setError(err?.message || 'Falha ao resetar password');
                                } finally {
                                  setResettingUserId(null);
                                }
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {oneTimePassword ? (
                      <div className="mt-3 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface-2)] p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                          Password temporária
                        </div>
                        <div className="mt-2 font-mono text-sm text-[color:var(--dash-ink)] break-all">
                          {oneTimePassword}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--dash-muted)]">
                      Export (setup runs)
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--dash-muted)]">
                      Exporta o histórico de runs/migrações da empresa selecionada.
                    </p>

                    {!selectedTenantId ? (
                      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800">
                        Selecione uma empresa no topo para exportar.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-[color:var(--dash-muted)]">Limite</label>
                          <input
                            type="number"
                            value={runsExportLimit}
                            min={1}
                            max={1000}
                            onChange={(e) => setRunsExportLimit(Number(e.target.value || 200))}
                            className="w-28 rounded-xl border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-3 py-2 text-sm text-[color:var(--dash-ink)]"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-secondary h-9 px-3 inline-flex items-center"
                            disabled={runsExporting !== null}
                            onClick={async () => {
                              setRunsExporting('csv');
                              setError('');
                              try {
                                await downloadSetupRunsExport('csv', runsExportLimit);
                              } catch (err: any) {
                                setError(err?.message || 'Falha ao exportar CSV');
                              } finally {
                                setRunsExporting(null);
                              }
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar CSV
                          </button>
                          <button
                            type="button"
                            className="btn-secondary h-9 px-3 inline-flex items-center"
                            disabled={runsExporting !== null}
                            onClick={async () => {
                              setRunsExporting('json');
                              setError('');
                              try {
                                await downloadSetupRunsExport('json', runsExportLimit);
                              } catch (err: any) {
                                setError(err?.message || 'Falha ao exportar JSON');
                              } finally {
                                setRunsExporting(null);
                              }
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar JSON
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== COMPONENT STUBS =====================

function AlertsSettings() {
  const { selectedPlant } = useAppStore();
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingAlert, setEditingAlert] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({
    asset_id: '',
    alert_type: 'sla_critical',
    threshold: 1,
    time_unit: 'hours',
    notify_roles: ['admin', 'manager'],
    notify_email: true,
    notify_push: false,
    escalate_after_hours: 4,
    description: '',
  });

  React.useEffect(() => {
    fetchAlerts();
    fetchAssets();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/alerts/configurations');
      setAlerts(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      if (!selectedPlant) {
        setAssets([]);
        return;
      }
      const data = await getAssets(selectedPlant);
      setAssets(data || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingAlert ? 'PUT' : 'POST';
      const url = editingAlert
        ? `/api/alerts/configurations/${editingAlert.id}`
        : '/api/alerts/configurations';

      await apiCall(url.replace('/api', ''), {
        method,
        body: JSON.stringify(formData),
      });

      setShowForm(false);
      setEditingAlert(null);
      setFormData({
        asset_id: '',
        alert_type: 'sla_critical',
        threshold: 1,
        time_unit: 'hours',
        notify_roles: ['admin', 'manager'],
        notify_email: true,
        notify_push: false,
        escalate_after_hours: 4,
        description: '',
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!window.confirm('Eliminar este alerta?')) return;
    try {
      await apiCall(`/alerts/configurations/${alertId}`, {
        method: 'DELETE',
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleTestAlert = async (alertId: string) => {
    try {
      setTestingId(alertId);
      await apiCall(`/alerts/configurations/${alertId}/test`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to test alert:', error);
    } finally {
      setTestingId(null);
    }
  };

  const handleEdit = (alert: any) => {
    setEditingAlert(alert);
    setFormData({
      asset_id: alert.asset_id,
      alert_type: alert.alert_type,
      threshold: alert.threshold,
      time_unit: alert.time_unit,
      notify_roles: alert.notify_roles || [],
      notify_email: alert.notify_email ?? true,
      notify_push: alert.notify_push ?? false,
      escalate_after_hours: alert.escalate_after_hours || 4,
      description: alert.description || '',
    });
    setShowForm(true);
  };

  const alertTypes = [
    { value: 'sla_critical', label: '🔴 SLA Crítico' },
    { value: 'high_failure_rate', label: '⚠️ Taxa Falha Alta' },
    { value: 'stock_low', label: '📦 Stock Baixo' },
    { value: 'maintenance_overdue', label: '⏰ Manutenção Vencida' },
  ];

  const roles = [
    'superadmin',
    'admin_empresa',
    'gestor_manutencao',
    'supervisor',
    'tecnico',
    'operador',
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
            Alertas inteligentes
          </p>
          <h2 className="mt-2 text-2xl font-semibold theme-text">
            Alertas & Notificacoes
          </h2>
          <p className="mt-1 text-sm theme-text-muted">
            Configure limites e canais de notificacao.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingAlert(null);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--settings-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo alerta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 overflow-hidden rounded-[24px] border theme-border theme-card shadow-sm">
          <div className="h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset */}
              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Equipamento
                </label>
                <select
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  required
                  className="input"
                >
                  <option value="">Selecionar...</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Alert Type */}
              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Tipo de Alerta
                </label>
                <select
                  value={formData.alert_type}
                  onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                  className="input"
                >
                  {alertTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold */}
              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Limite
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, threshold: parseInt(e.target.value) })
                  }
                  className="input"
                />
              </div>

              {/* Time Unit */}
              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Unidade
                </label>
                <select
                  value={formData.time_unit}
                  onChange={(e) => setFormData({ ...formData, time_unit: e.target.value })}
                  className="input"
                >
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                  <option value="cycles">Ciclos</option>
                </select>
              </div>

              {/* Escalate After Hours */}
              <div>
                <label className="mb-1 block text-sm font-medium theme-text">
                  Escalar após (horas)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.escalate_after_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, escalate_after_hours: parseInt(e.target.value) })
                  }
                  className="input"
                />
              </div>
            </div>

            {/* Notify Roles */}
            <div>
              <label className="mb-2 block text-sm font-medium theme-text">
                Notificar Roles
              </label>
              <div className="flex flex-wrap gap-4">
                {roles.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={formData.notify_roles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            notify_roles: [...formData.notify_roles, role],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            notify_roles: formData.notify_roles.filter((r) => r !== role),
                          });
                        }
                      }}
                      className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                    />
                    <span className="capitalize text-xs theme-text">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notification Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={formData.notify_email}
                  onChange={(e) => setFormData({ ...formData, notify_email: e.target.checked })}
                  className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                />
                <span className="text-xs theme-text">Email</span>
              </label>
              <label className="flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={formData.notify_push}
                  onChange={(e) => setFormData({ ...formData, notify_push: e.target.checked })}
                  className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                />
                <span className="text-xs theme-text">Push</span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium theme-text">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="input min-h-[96px]"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--settings-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                {editingAlert ? 'Atualizar' : 'Criar'} alerta
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAlert(null);
                }}
                className="inline-flex items-center justify-center rounded-full border theme-border px-4 py-2 text-sm font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border theme-border theme-card py-10 text-center text-sm theme-text-muted">
            Carregando...
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed theme-border bg-[color:var(--dash-surface)] p-10 text-center text-sm theme-text-muted">
            Nenhum alerta configurado ainda
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
                className="relative overflow-hidden rounded-2xl border theme-border theme-card p-4 shadow-sm"
            >
                <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold theme-text">
                      {alertTypes.find((t) => t.value === alert.alert_type)?.label}
                    </span>
                    <span className="text-sm theme-text-muted">
                      {alert.asset?.name} ({alert.asset?.code})
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm theme-text-muted sm:grid-cols-2">
                    <div>
                      <span className="font-medium">Limite:</span> {alert.threshold}{' '}
                      {alert.time_unit}
                    </div>
                    <div>
                      <span className="font-medium">Escalar apos:</span>{' '}
                      {alert.escalate_after_hours}h
                    </div>
                    <div>
                      <span className="font-medium">Notificacoes:</span>{' '}
                      {[alert.notify_email && 'Email', alert.notify_push && 'Push']
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    <div>
                      <span className="font-medium">Roles:</span>{' '}
                      {alert.notify_roles?.join(', ')}
                    </div>
                  </div>
                  {alert.description && (
                    <p className="mt-2 text-sm theme-text-muted italic">"{alert.description}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestAlert(alert.id)}
                    disabled={testingId === alert.id}
                    className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)] disabled:opacity-60"
                  >
                    {testingId === alert.id ? 'Testando…' : 'Testar'}
                  </button>
                  <button
                    onClick={() => handleEdit(alert)}
                    className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-[color:var(--dash-surface)]"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

function NotificationSettings() {
  const [notificationRules, setNotificationRules] = React.useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [notificationsSaving, setNotificationsSaving] = React.useState(false);
  const [notificationsError, setNotificationsError] = React.useState('');

  React.useEffect(() => {
    fetchNotificationRules();
  }, []);

  const fetchNotificationRules = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError('');
      const data = await getNotificationRules();
      const rules = Array.isArray(data) ? data : (data?.data || []);
      const merged = notificationEvents.map((event) =>
        rules.find((rule: any) => rule.event_type === event.value) || {
          event_type: event.value,
          channels: ['in_app', 'socket'],
          recipients: ['assigned', 'creator', 'managers', 'plant_users'],
          is_active: true,
        },
      );
      setNotificationRules(merged);
    } catch (error) {
      console.error('Failed to fetch notification rules:', error);
      setNotificationsError('Falha ao carregar regras de notificacao');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const updateRule = (eventType: string, patch: Record<string, any>) => {
    setNotificationRules((prev) =>
      prev.some((rule: any) => rule.event_type === eventType)
        ? prev.map((rule: any) =>
            rule.event_type === eventType ? { ...rule, ...patch } : rule,
          )
        : [...prev, { event_type: eventType, channels: ['in_app'], recipients: [], is_active: true, ...patch }],
    );
  };

  const toggleRuleArrayValue = (eventType: string, key: 'channels' | 'recipients', value: string) => {
    setNotificationRules((prev) =>
      prev.some((rule: any) => rule.event_type === eventType)
        ? prev.map((rule: any) => {
            if (rule.event_type !== eventType) return rule;
            const list = Array.isArray(rule[key]) ? rule[key] : [];
            const next = list.includes(value)
              ? list.filter((item: string) => item !== value)
              : [...list, value];
            return { ...rule, [key]: next };
          })
        : [...prev, { event_type: eventType, channels: key === 'channels' ? [value] : ['in_app'], recipients: key === 'recipients' ? [value] : [], is_active: true }],
    );
  };

  const handleSaveNotificationRules = async () => {
    try {
      setNotificationsSaving(true);
      setNotificationsError('');
      await updateNotificationRules(notificationRules);
    } catch (error) {
      console.error('Failed to save notification rules:', error);
      setNotificationsError('Falha ao salvar regras de notificacao');
    } finally {
      setNotificationsSaving(false);
    }
  };

  const notificationEvents = [
    {
      value: 'work_order_status_changed',
      label: 'Mudanca de estado da ordem',
      description: 'Quando a ordem muda de status',
    },
    {
      value: 'work_order_assigned',
      label: 'Atribuicao de responsavel',
      description: 'Quando uma ordem recebe responsavel',
    },
    {
      value: 'sla_overdue',
      label: 'Atraso de SLA',
      description: 'Quando uma ordem passa o prazo de SLA',
    },
    {
      value: 'stock_low',
      label: 'Stock minimo',
      description: 'Quando o stock fica abaixo do minimo',
    },
    {
      value: 'preventive_overdue',
      label: 'Preventiva em atraso',
      description: 'Quando um agendamento preventivo passa a data prevista',
    },
    {
      value: 'asset_critical',
      label: 'Falha crítica',
      description: 'Quando um equipamento crítico entra em estado parado/manutencao',
    },
  ];

  const channelOptions = [
    { value: 'in_app', label: 'In-app' },
    { value: 'socket', label: 'Socket' },
  ];

  const recipientOptions = [
    { value: 'assigned', label: 'Responsavel' },
    { value: 'creator', label: 'Criador' },
    { value: 'managers', label: 'Gestores e admins' },
    { value: 'plant_users', label: 'Utilizadores da planta' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
            Notificacoes do sistema
          </p>
          <h2 className="mt-2 text-2xl font-semibold theme-text">Regras operacionais</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Ajuste eventos, canais e destinatarios das notificacoes.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--settings-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          onClick={handleSaveNotificationRules}
          disabled={notificationsSaving || notificationsLoading}
        >
          {notificationsSaving ? 'A guardar...' : 'Guardar regras'}
        </button>
      </div>

      {notificationsError && (
        <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
          <span className="badge-danger mr-2 text-xs">Erro</span>
          {notificationsError}
        </div>
      )}

      {notificationsLoading ? (
        <div className="mt-6 rounded-2xl border theme-border theme-card py-10 text-center text-sm theme-text-muted">
          A carregar regras...
        </div>
      ) : (
        <div className="space-y-4">
          {notificationEvents.map((event) => {
            const rule = notificationRules.find(
              (item: any) => item.event_type === event.value,
            ) || {
              event_type: event.value,
              channels: ['in_app', 'socket'],
              recipients: ['assigned', 'creator', 'managers', 'plant_users'],
              is_active: true,
            };

            return (
              <div
                key={event.value}
                className="relative overflow-hidden rounded-[22px] border theme-border theme-card p-4 shadow-sm"
              >
                <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold theme-text">{event.label}</p>
                    <p className="mt-1 text-xs theme-text-muted">{event.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold theme-text-muted">
                    <input
                      type="checkbox"
                      checked={rule.is_active !== false}
                      onChange={(e) => updateRule(event.value, { is_active: e.target.checked })}
                      className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                    />
                    Ativo
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                      Canais
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {channelOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs theme-text-muted"
                        >
                          <input
                            type="checkbox"
                            checked={rule.channels?.includes(option.value)}
                            onChange={() => toggleRuleArrayValue(event.value, 'channels', option.value)}
                            className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                      Destinatarios
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recipientOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs theme-text-muted"
                        >
                          <input
                            type="checkbox"
                            checked={rule.recipients?.includes(option.value)}
                            onChange={() => toggleRuleArrayValue(event.value, 'recipients', option.value)}
                            className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type PreventiveSection = 'plans' | 'schedules';

function toIsoFromDatetimeLocal(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function PreventiveMaintenanceSettings({
  initialSection,
}: {
  initialSection?: PreventiveSection;
}) {
  const { selectedPlant } = useAppStore();

  const planTemplates = React.useMemo(
    () =>
      [
        {
          id: 'factory-pump-weekly-lube',
          label: 'Bomba (fábrica) • Lubrificação semanal',
          data: {
            name: 'Lubrificação semanal',
            description: 'Rotina de lubrificação e inspeção visual.',
            frequency_value: 7,
            frequency_unit: 'days',
            auto_schedule: true,
            schedule_basis: 'completion',
            tolerance_unit: 'days',
            tolerance_before_value: 1,
            tolerance_after_value: 2,
            tasks: [
              'Verificar ruídos/vibração anormal',
              'Verificar fugas e aperto de conexões',
              'Lubrificar pontos conforme manual',
              'Limpar zona e registar observações',
            ],
          },
        },
        {
          id: 'factory-compressor-monthly-check',
          label: 'Compressor (fábrica) • Inspeção mensal',
          data: {
            name: 'Inspeção mensal do compressor',
            description: 'Inspeção preventiva mensal (pressão, filtros, purga).',
            frequency_value: 1,
            frequency_unit: 'months',
            auto_schedule: true,
            schedule_basis: 'scheduled',
            tolerance_unit: 'days',
            tolerance_before_value: 3,
            tolerance_after_value: 5,
            tasks: [
              'Inspecionar filtros e substituir se necessário',
              'Verificar fugas (ar/óleo) e apertos',
              'Testar válvula de segurança',
              'Drenar condensado e verificar purgadores',
            ],
          },
        },
        {
          id: 'factory-conveyor-weekly-check',
          label: 'Transportador (fábrica) • Inspeção semanal',
          data: {
            name: 'Inspeção semanal do transportador',
            description: 'Inspeção de correias, roletes e alinhamento.',
            frequency_value: 7,
            frequency_unit: 'days',
            auto_schedule: true,
            schedule_basis: 'completion',
            tolerance_unit: 'days',
            tolerance_before_value: 1,
            tolerance_after_value: 1,
            tasks: [
              'Verificar tensão e alinhamento da correia',
              'Inspecionar roletes e ruídos',
              'Verificar proteções e sensores',
              'Limpar acumulações e registar anomalias',
            ],
          },
        },
        {
          id: 'factory-daily-rounds',
          label: 'Ronda (fábrica) • Checklist diária',
          data: {
            name: 'Ronda diária (checklist)',
            description: 'Checklist rápida para detetar anomalias cedo.',
            frequency_value: 1,
            frequency_unit: 'days',
            auto_schedule: true,
            schedule_basis: 'scheduled',
            tolerance_unit: 'hours',
            tolerance_before_value: 6,
            tolerance_after_value: 12,
            tasks: [
              'Verificar alarmes/avisos e registar ocorrências',
              'Verificar níveis e fugas visíveis (óleo/água/ar)',
              'Verificar segurança: proteções e área limpa',
            ],
          },
        },
      ] as const,
    [],
  );

  const [section, setSection] = React.useState<PreventiveSection>(initialSection || 'plans');
  const [plans, setPlans] = React.useState<any[]>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [scheduleLoading, setScheduleLoading] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);
  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [scheduleFilter, setScheduleFilter] = React.useState<'all' | string>('all');
  const [creatingSchedule, setCreatingSchedule] = React.useState(false);
  const [scheduleForm, setScheduleForm] = React.useState({
    plan_id: '',
    scheduled_for: '',
    status: 'agendada',
    notes: '',
  });
  const [nextOnCompleteValue, setNextOnCompleteValue] = React.useState('');
  const [nextOnCompleteUnit, setNextOnCompleteUnit] = React.useState<'days' | 'hours' | 'months'>(
    'days',
  );

  const [pendingReschedule, setPendingReschedule] = React.useState<
    | null
    | {
        scheduleId: string;
        mode: 'delay' | 'skip';
        scheduled_for_local: string;
        reason: string;
      }
  >(null);

  React.useEffect(() => {
    if (initialSection && (initialSection === 'plans' || initialSection === 'schedules')) {
      setSection(initialSection);
    }
  }, [initialSection]);
  const [formData, setFormData] = React.useState({
    asset_id: '',
    name: '',
    frequency_value: 1,
    frequency_unit: 'days',
    description: '',
    auto_schedule: true,
    schedule_basis: 'completion' as 'completion' | 'scheduled',
    schedule_anchor_mode: 'interval' as 'interval' | 'fixed',
    tolerance_unit: 'days' as 'days' | 'hours',
    tolerance_before_value: 0,
    tolerance_after_value: 0,
    tolerance_mode: 'soft' as 'soft' | 'hard',
    tasks: [] as string[],
  });

  const toDatetimeLocalFromIso = (value: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const computeNextPreview = React.useCallback(
    (plan: any) => {
      if (!plan) return '';

      const overrideValue = Number(nextOnCompleteValue);
      const hasOverride = nextOnCompleteValue.trim() && Number.isFinite(overrideValue) && overrideValue > 0;
      const now = new Date();

      const freqValue = Number(plan.frequency_value || 0);
      const freqType = String(plan.frequency_type || plan.frequency_unit || '').toLowerCase();
      const basis = String(plan.schedule_basis || 'completion');

      const baseForPlan =
        basis === 'scheduled'
          ? new Date(toIsoFromDatetimeLocal(scheduleForm.scheduled_for) || now.toISOString())
          : now;

      const base = hasOverride ? now : baseForPlan;
      const next = new Date(base);

      if (hasOverride) {
        const unit = nextOnCompleteUnit;
        if (unit === 'hours') next.setHours(next.getHours() + overrideValue);
        if (unit === 'days') next.setDate(next.getDate() + overrideValue);
        if (unit === 'months') next.setMonth(next.getMonth() + overrideValue);
      } else {
        if (!freqValue) return '';
        if (freqType === 'hours') next.setHours(next.getHours() + freqValue);
        else if (freqType === 'days') next.setDate(next.getDate() + freqValue);
        else next.setMonth(next.getMonth() + freqValue);
      }

      return next.toLocaleString();
    },
    [nextOnCompleteUnit, nextOnCompleteValue, scheduleForm.scheduled_for],
  );

  React.useEffect(() => {
    fetchPlans();
    fetchAssets();
  }, [selectedPlant]);

  React.useEffect(() => {
    if (section !== 'schedules') return;
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, selectedPlant]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      if (!selectedPlant) {
        setPlans([]);
        return;
      }
      const data = await apiCall(`/${selectedPlant}/plans`);
      setPlans(data || []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    if (!selectedPlant) {
      setSchedules([]);
      return;
    }

    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const data = await getPreventiveSchedules(selectedPlant);
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setScheduleError(err?.message || 'Erro ao carregar agendamentos');
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      if (!selectedPlant) {
        setAssets([]);
        return;
      }
      const data = await getAssets(selectedPlant);
      setAssets(data || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedPlant) return;

      const method = editingPlan ? 'PATCH' : 'POST';
      const url = editingPlan
        ? `/${selectedPlant}/plans/${editingPlan.id}`
        : `/${selectedPlant}/plans`;

      await apiCall(url, {
        method,
        body: JSON.stringify({
          asset_id: formData.asset_id,
          name: formData.name,
          description: formData.description || undefined,
          frequency_type: formData.frequency_unit,
          frequency_value: Number(formData.frequency_value),
          auto_schedule: formData.auto_schedule,
          schedule_basis: formData.schedule_basis,
          schedule_anchor_mode: formData.schedule_anchor_mode,
          tolerance_unit: formData.tolerance_unit,
          tolerance_before_value: Number(formData.tolerance_before_value) || 0,
          tolerance_after_value: Number(formData.tolerance_after_value) || 0,
          tolerance_mode: formData.tolerance_mode,
          tasks: (formData.tasks || []).map((t) => t.trim()).filter(Boolean),
        }),
      });

      setShowForm(false);
      setEditingPlan(null);
      setFormData({
        asset_id: '',
        name: '',
        frequency_value: 1,
        frequency_unit: 'days',
        description: '',
        auto_schedule: true,
        schedule_basis: 'completion',
        schedule_anchor_mode: 'interval',
        tolerance_unit: 'days',
        tolerance_before_value: 0,
        tolerance_after_value: 0,
        tolerance_mode: 'soft',
        tasks: [],
      });
      setSelectedTemplateId('');
      fetchPlans();
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Eliminar este plano?')) return;
    try {
      if (!selectedPlant) return;
      await apiCall(`/${selectedPlant}/plans/${planId}`, {
        method: 'DELETE',
      });
      fetchPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      asset_id: plan.asset_id,
      name: plan.name,
      frequency_value: plan.frequency_value,
      frequency_unit: plan.frequency_type || plan.frequency_unit || 'days',
      description: plan.description || '',
      auto_schedule: plan.auto_schedule !== false,
      schedule_basis: plan.schedule_basis || 'completion',
      schedule_anchor_mode: (plan.schedule_anchor_mode as any) || 'interval',
      tolerance_unit: plan.tolerance_unit || 'days',
      tolerance_before_value: Number(plan.tolerance_before_value || 0),
      tolerance_after_value: Number(plan.tolerance_after_value || 0),
      tolerance_mode: (plan.tolerance_mode as any) || 'soft',
      tasks: plan.tasks || [],
    });
    setSelectedTemplateId('');
    setShowForm(true);
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, ''],
    });
  };

  const updateTask = (index: number, value: string) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = value;
    setFormData({ ...formData, tasks: newTasks });
  };

  const removeTask = (index: number) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index),
    });
  };

  const visibleSchedules = React.useMemo(() => {
    if (scheduleFilter === 'all') return schedules;
    return schedules.filter((s) => s.status === scheduleFilter);
  }, [schedules, scheduleFilter]);

  const handleCreateSchedule = async () => {
    if (!selectedPlant) {
      setScheduleError('Selecione uma fábrica primeiro');
      return;
    }
    if (!scheduleForm.plan_id || !scheduleForm.scheduled_for) {
      setScheduleError('Selecione o plano e a data');
      return;
    }
    const scheduledIso = toIsoFromDatetimeLocal(scheduleForm.scheduled_for);
    if (!scheduledIso) {
      setScheduleError('Data inválida');
      return;
    }

    setCreatingSchedule(true);
    setScheduleError(null);
    try {
      await createPreventiveSchedule(selectedPlant, {
        plan_id: scheduleForm.plan_id,
        scheduled_for: scheduledIso,
        status: scheduleForm.status,
        notes: scheduleForm.notes || undefined,
      });

      setScheduleForm({ plan_id: '', scheduled_for: '', status: 'agendada', notes: '' });
      await fetchSchedules();
    } catch (err: any) {
      setScheduleError(err?.message || 'Erro ao criar agendamento');
    } finally {
      setCreatingSchedule(false);
    }
  };

  const handleScheduleStatusChange = async (schedule: any, status: string) => {
    if (!selectedPlant) return;
    setScheduleError(null);
    try {
      if (status === 'reagendada') {
        setPendingReschedule({
          scheduleId: schedule.id,
          mode: 'delay',
          scheduled_for_local: toDatetimeLocalFromIso(schedule.scheduled_for),
          reason: '',
        });
        return;
      }

      if (pendingReschedule?.scheduleId === schedule.id) {
        setPendingReschedule(null);
      }

      const patch: any = { status };
      const parsedNext = Number(nextOnCompleteValue);
      if (status === 'concluida' && nextOnCompleteValue.trim() && Number.isFinite(parsedNext) && parsedNext > 0) {
        patch.next_interval_value = parsedNext;
        patch.next_interval_unit = nextOnCompleteUnit;
      }
      await updatePreventiveSchedule(selectedPlant, schedule.id, patch);
      await fetchSchedules();
    } catch (err: any) {
      setScheduleError(err?.message || 'Erro ao atualizar agendamento');
    }
  };

  const confirmReschedule = async () => {
    if (!selectedPlant || !pendingReschedule) return;
    const reason = pendingReschedule.reason.trim();
    setScheduleError(null);
    try {
      if (!reason) {
        setScheduleError(
          pendingReschedule.mode === 'skip'
            ? 'Motivo é obrigatório ao fazer skip'
            : 'Motivo é obrigatório ao reagendar',
        );
        return;
      }

      if (pendingReschedule.mode === 'skip') {
        await skipPreventiveSchedule(selectedPlant, pendingReschedule.scheduleId, reason);
      } else {
        const scheduledIso = toIsoFromDatetimeLocal(pendingReschedule.scheduled_for_local);
        if (!scheduledIso) {
          setScheduleError('Data inválida para reagendar');
          return;
        }
        await updatePreventiveSchedule(selectedPlant, pendingReschedule.scheduleId, {
          status: 'reagendada',
          scheduled_for: scheduledIso,
          reschedule_reason: reason,
        });
      }
      setPendingReschedule(null);
      await fetchSchedules();
    } catch (err: any) {
      setScheduleError(err?.message || (pendingReschedule.mode === 'skip' ? 'Erro ao fazer skip' : 'Erro ao reagendar'));
    }
  };

  const selectedSchedulePlan = React.useMemo(() => {
    if (!scheduleForm.plan_id) return null;
    return plans.find((p) => p.id === scheduleForm.plan_id) || null;
  }, [plans, scheduleForm.plan_id]);

  const formatFrequency = (value: any, unit: any) => {
    const safeValue = Number(value);
    const safeUnit = String(unit || '').toLowerCase();
    if (!safeValue || !safeUnit) return '';
    if (safeUnit === 'days') return `${safeValue} dia(s)`;
    if (safeUnit === 'months') return `${safeValue} mês(es)`;
    if (safeUnit === 'hours') return `${safeValue} hora(s)`;
    if (safeUnit === 'meter') return `${safeValue} (contador)`;
    return `${safeValue} ${safeUnit}`;
  };

  const getPlanForSchedule = (schedule: any) =>
    plans.find((p) => p.id === (schedule.plan_id || schedule.planId)) || null;

  const suggestSkipToNextCycleLocal = (schedule: any) => {
    const plan = getPlanForSchedule(schedule);
    const now = new Date();
    const currentIso = schedule?.scheduled_for || schedule?.scheduledFor || '';
    const baseRaw = currentIso ? new Date(currentIso) : now;
    const base = new Date(Math.max(now.getTime(), baseRaw.getTime()));

    const freqValue = Number(plan?.frequency_value || plan?.frequencyValue || 0);
    const freqUnit = String(plan?.frequency_type || plan?.frequency_unit || plan?.frequencyUnit || '').toLowerCase();

    const next = new Date(base);
    if (Number.isFinite(freqValue) && freqValue > 0) {
      if (freqUnit === 'hours') next.setHours(next.getHours() + freqValue);
      else if (freqUnit === 'days') next.setDate(next.getDate() + freqValue);
      else next.setMonth(next.getMonth() + freqValue);
    } else {
      next.setDate(next.getDate() + 7);
    }

    return toDatetimeLocalFromIso(next.toISOString());
  };

  const openReschedule = (schedule: any, mode: 'delay' | 'skip') => {
    const fallbackLocal = toDatetimeLocalFromIso(schedule.scheduled_for);
    const suggestedLocal = mode === 'skip' ? suggestSkipToNextCycleLocal(schedule) : fallbackLocal;
    setPendingReschedule({
      scheduleId: schedule.id,
      mode,
      scheduled_for_local: suggestedLocal,
      reason: '',
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
            Manutenção preventiva
          </p>
          <h2 className="mt-2 text-2xl font-semibold theme-text">
            Planos e preventivas agendadas
          </h2>
          <p className="mt-1 text-sm theme-text-muted">
            Gerencie rotinas por equipamento e agendamentos preventivos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-full border theme-border theme-card p-1">
          <button
            type="button"
            onClick={() => setSection('plans')}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
              section === 'plans'
                ? 'bg-[color:var(--settings-accent)] text-white'
                : 'theme-text-muted hover:theme-text'
            }`}
          >
            Planos
          </button>
          <button
            type="button"
            onClick={() => setSection('schedules')}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
              section === 'schedules'
                ? 'bg-[color:var(--settings-accent)] text-white'
                : 'theme-text-muted hover:theme-text'
            }`}
          >
            Agendadas
          </button>
        </div>
      </div>

      {section === 'plans' && (
        <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
            Rotinas programadas
          </p>
          <h2 className="mt-2 text-2xl font-semibold theme-text">
            Planos de Manutencao Preventiva
          </h2>
          <p className="mt-1 text-sm theme-text-muted">
            Crie e gerencie planos de manutencao por equipamento.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingPlan(null);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--settings-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo plano
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 overflow-hidden rounded-[24px] border theme-border theme-card shadow-sm">
          <div className="h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!editingPlan && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium theme-text mb-1">
                    Template (opcional)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedTemplateId(next);
                      const tpl = planTemplates.find((t) => t.id === next);
                      if (!tpl) return;
                      setFormData((prev) => ({
                        ...prev,
                        name: tpl.data.name,
                        description: tpl.data.description,
                        frequency_value: tpl.data.frequency_value,
                        frequency_unit: tpl.data.frequency_unit,
                        auto_schedule: tpl.data.auto_schedule,
                        schedule_basis: tpl.data.schedule_basis as any,
                        schedule_anchor_mode: (tpl.data as any).schedule_anchor_mode || 'interval',
                        tolerance_unit: tpl.data.tolerance_unit as any,
                        tolerance_before_value: tpl.data.tolerance_before_value,
                        tolerance_after_value: tpl.data.tolerance_after_value,
                        tolerance_mode: (tpl.data as any).tolerance_mode || 'soft',
                        tasks: [...tpl.data.tasks],
                      }));
                    }}
                    className="input"
                  >
                    <option value="">Selecionar…</option>
                    {planTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs theme-text-muted">
                    Preenche nome, frequência, base, tolerância e tarefas.
                  </p>
                </div>
              )}
              {/* Asset */}
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Equipamento
                </label>
                <select
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  required
                  className="input"
                >
                  <option value="">Selecionar...</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Name */}
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="ex: Manutencao mensal"
                  className="input"
                />
              </div>

              {/* Frequency Value */}
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Frequência
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.frequency_value}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency_value: parseInt(e.target.value) })
                  }
                  className="input"
                />
              </div>

              {/* Frequency Unit */}
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Unidade
                </label>
                <select
                  value={formData.frequency_unit}
                  onChange={(e) => setFormData({ ...formData, frequency_unit: e.target.value })}
                  className="input"
                >
                  <option value="days">Dias</option>
                  <option value="hours">Horas de funcionamento</option>
                  <option value="months">Meses</option>
                  <option value="meter">Ciclos / Contador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Base do próximo agendamento
                </label>
                <select
                  value={formData.schedule_basis}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule_basis: e.target.value as any,
                    })
                  }
                  className="input"
                >
                  <option value="completion">A partir da conclusão</option>
                  <option value="scheduled">Manter cadência (data programada)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Âncora de cadência
                </label>
                <select
                  value={formData.schedule_anchor_mode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule_anchor_mode: e.target.value as any,
                    })
                  }
                  className="input"
                >
                  <option value="interval">Intervalo (usa data atual)</option>
                  <option value="fixed">Fixo (evita drift após reagendar)</option>
                </select>
                <p className="mt-1 text-xs theme-text-muted">
                  Em “Fixo”, a cadência usa a primeira data programada mesmo após reagendamentos.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Tolerância (informativo)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm theme-text-muted">−</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.tolerance_before_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tolerance_before_value: Number(e.target.value || 0),
                      })
                    }
                    className="input h-10 w-24 py-1"
                  />
                  <span className="text-sm theme-text-muted">/ +</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.tolerance_after_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tolerance_after_value: Number(e.target.value || 0),
                      })
                    }
                    className="input h-10 w-24 py-1"
                  />
                  <select
                    value={formData.tolerance_unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tolerance_unit: e.target.value as any,
                      })
                    }
                    className="input h-10 py-1"
                  >
                    <option value="days">dias</option>
                    <option value="hours">horas</option>
                  </select>
                </div>
                <p className="mt-1 text-xs theme-text-muted">
                  Define a janela aceitável antes/depois da data.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Modo de tolerância
                </label>
                <select
                  value={formData.tolerance_mode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tolerance_mode: e.target.value as any,
                    })
                  }
                  className="input"
                >
                  <option value="soft">Soft (não exige justificação)</option>
                  <option value="hard">Hard (exige justificação fora da janela)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[18px] border theme-border bg-[color:var(--dash-surface)] p-4">
              <div>
                <p className="text-sm font-semibold theme-text">Auto agendamento</p>
                <p className="mt-1 text-xs theme-text-muted">
                  Ao concluir uma preventiva, criar o próximo agendamento automaticamente.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold theme-text">
                <input
                  type="checkbox"
                  checked={!!formData.auto_schedule}
                  onChange={(e) => setFormData({ ...formData, auto_schedule: e.target.checked })}
                  className="h-4 w-4 rounded border theme-border accent-[color:var(--settings-accent)]"
                />
                Ativo
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium theme-text mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="input min-h-[96px]"
              />
            </div>

            {/* Tasks */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium theme-text">Tarefas</label>
                <button
                  type="button"
                  onClick={addTask}
                  className="rounded-full border theme-border px-3 py-1 text-xs font-semibold theme-text transition hover:bg-[color:var(--dash-surface)]"
                >
                  + Adicionar tarefa
                </button>
              </div>
              <div className="space-y-2">
                {formData.tasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => updateTask(idx, e.target.value)}
                      placeholder="Descrever tarefa..."
                      className="input"
                    />
                    <button
                      type="button"
                      onClick={() => removeTask(idx)}
                      className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--settings-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                {editingPlan ? 'Atualizar' : 'Criar'} plano
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPlan(null);
                }}
                className="inline-flex items-center justify-center rounded-full border theme-border px-4 py-2 text-sm font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border theme-border theme-card py-10 text-center text-sm theme-text-muted">
            Carregando...
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed theme-border bg-[color:var(--dash-surface)] p-10 text-center text-sm theme-text-muted">
            Nenhum plano de manutencao ainda
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="relative overflow-hidden rounded-2xl border theme-border theme-card p-4 shadow-sm"
            >
              <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold theme-text">{plan.name}</span>
                    <span className="text-sm theme-text-muted">
                      {plan.asset?.name} ({plan.asset?.code})
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm theme-text-muted sm:grid-cols-2">
                    <div>
                      <span className="font-medium">Frequencia:</span> A cada{' '}
                      {plan.frequency_value} {plan.frequency_type || plan.frequency_unit}
                    </div>
                    <div>
                      <span className="font-medium">Tarefas:</span> {plan.tasks?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">Base:</span>{' '}
                      {String(plan.schedule_basis || 'completion') === 'scheduled'
                        ? 'cadência (programado)'
                        : 'conclusão'}
                    </div>
                    <div>
                      <span className="font-medium">Janela:</span>{' '}
                      −{Number(plan.tolerance_before_value || 0)}/+{Number(plan.tolerance_after_value || 0)}{' '}
                      {String(plan.tolerance_unit || 'days') === 'hours' ? 'horas' : 'dias'}
                    </div>
                  </div>
                  {plan.description && (
                    <p className="mt-2 text-sm theme-text-muted italic">"{plan.description}"</p>
                  )}
                  {plan.tasks && plan.tasks.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {plan.tasks.map((task: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm theme-text-muted">
                          <span className="text-[color:var(--dash-accent)]">•</span>
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-[color:var(--dash-surface)]"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}

      {section === 'schedules' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
                Agendamentos
              </p>
              <h3 className="mt-2 text-xl font-semibold theme-text">Preventivas agendadas</h3>
              <p className="mt-1 text-sm theme-text-muted">
                Crie e acompanhe agendamentos preventivos sem alterar as ordens.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={fetchSchedules}
              disabled={scheduleLoading}
            >
              Atualizar
            </button>
          </div>

          {scheduleError && (
            <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {scheduleError}
            </div>
          )}

          <div className="overflow-hidden rounded-[24px] border theme-border theme-card shadow-sm">
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium theme-text mb-1">Plano</label>
                  <select
                    value={scheduleForm.plan_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, plan_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Selecionar...</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                  {selectedSchedulePlan && (
                    <p className="mt-2 text-xs theme-text-muted">
                      Tipo: <span className="font-semibold theme-text">{selectedSchedulePlan.type || 'preventiva'}</span>
                      {' • '}Frequência:{' '}
                      <span className="font-semibold theme-text">
                        {formatFrequency(
                          selectedSchedulePlan.frequency_value,
                          selectedSchedulePlan.frequency_type || selectedSchedulePlan.frequency_unit,
                        ) || '—'}
                      </span>
                      {' • '}Auto: <span className="font-semibold theme-text">{selectedSchedulePlan.auto_schedule === false ? 'desligado' : 'ligado'}</span>
                      {' • '}Base:{' '}
                      <span className="font-semibold theme-text">
                        {String(selectedSchedulePlan.schedule_basis || 'completion') === 'scheduled'
                          ? 'cadência'
                          : 'conclusão'}
                      </span>
                      {' • '}Janela:{' '}
                      <span className="font-semibold theme-text">
                        −{Number(selectedSchedulePlan.tolerance_before_value || 0)}/+{Number(selectedSchedulePlan.tolerance_after_value || 0)}{' '}
                        {String(selectedSchedulePlan.tolerance_unit || 'days') === 'hours' ? 'h' : 'd'}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text mb-1">Data</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.scheduled_for}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, scheduled_for: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text mb-1">Status</label>
                  <select
                    value={scheduleForm.status}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, status: e.target.value })}
                    className="input"
                  >
                    <option value="agendada">Agendada</option>
                    <option value="reagendada">Reagendada</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="concluida">Concluída</option>
                    <option value="fechada">Fechada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text mb-1">Notas / justificação</label>
                  <input
                    type="text"
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    placeholder="Obrigatório se plano estiver em hard e estiver fora da janela"
                    className="input"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium theme-text">Filtrar:</label>
                  <select
                    value={scheduleFilter}
                    onChange={(e) => setScheduleFilter(e.target.value)}
                    className="input h-10 py-1"
                  >
                    <option value="all">Todos</option>
                    <option value="agendada">Agendada</option>
                    <option value="reagendada">Reagendada</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="concluida">Concluída</option>
                    <option value="fechada">Fechada</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium theme-text">Ao concluir, próximo em:</span>
                  <input
                    type="number"
                    min="1"
                    value={nextOnCompleteValue}
                    onChange={(e) => setNextOnCompleteValue(e.target.value)}
                    placeholder="(usa plano)"
                    className="input h-10 w-28 py-1"
                  />
                  <select
                    value={nextOnCompleteUnit}
                    onChange={(e) => setNextOnCompleteUnit(e.target.value as any)}
                    className="input h-10 py-1"
                  >
                    <option value="days">dias</option>
                    <option value="hours">horas</option>
                    <option value="months">meses</option>
                  </select>
                  {selectedSchedulePlan && (
                    <span className="text-xs theme-text-muted">
                      Prévia: <span className="font-semibold theme-text">{computeNextPreview(selectedSchedulePlan) || '—'}</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCreateSchedule}
                  disabled={creatingSchedule}
                  className="inline-flex items-center gap-2 rounded-full bg-[color:var(--settings-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Criar agendamento
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border theme-border theme-card shadow-sm">
            <div className="p-5">
              {scheduleLoading ? (
                <p className="text-sm theme-text-muted">Carregando agendamentos...</p>
              ) : visibleSchedules.length === 0 ? (
                <p className="text-sm theme-text-muted">Sem agendamentos.</p>
              ) : (
                <div className="space-y-3">
                  {visibleSchedules.map((schedule: any) => (
                    <div
                      key={schedule.id}
                      className="flex flex-col gap-2 rounded-[18px] border theme-border bg-[color:var(--dash-surface)] p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold theme-text truncate">
                          {schedule.plan_name || schedule.planName || schedule.plan_id}
                        </p>
                        <p className="text-xs theme-text-muted">
                          {schedule.asset_name || schedule.assetName ? `Equip.: ${schedule.asset_name || schedule.assetName} • ` : ''}
                          {schedule.scheduled_for ? new Date(schedule.scheduled_for).toLocaleString() : '—'}
                        </p>
                        {schedule.notes && (
                          <p className="mt-1 text-xs theme-text-muted truncate">{schedule.notes}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={
                            pendingReschedule?.scheduleId === schedule.id
                              ? 'reagendada'
                              : schedule.status || 'agendada'
                          }
                          onChange={(e) => handleScheduleStatusChange(schedule, e.target.value)}
                          className="input h-9 py-1"
                        >
                          <option value="agendada">Agendada</option>
                          <option value="reagendada">Reagendada</option>
                          <option value="em_execucao">Em Execução</option>
                          <option value="concluida">Concluída</option>
                          <option value="fechada">Fechada</option>
                        </select>

                        {!(schedule.status === 'concluida' || schedule.status === 'fechada') && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openReschedule(schedule, 'delay')}
                              className="inline-flex items-center justify-center rounded-full border theme-border px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
                            >
                              Adiar
                            </button>
                            <button
                              type="button"
                              onClick={() => openReschedule(schedule, 'skip')}
                              className="inline-flex items-center justify-center rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold theme-text transition hover:bg-[color:var(--dash-surface)]"
                            >
                              Skip ciclo
                            </button>
                          </div>
                        )}

                        {pendingReschedule && pendingReschedule.scheduleId === schedule.id && (
                          <div className="flex flex-col gap-2 rounded-[16px] border theme-border bg-[color:var(--dash-panel)] p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {pendingReschedule.mode !== 'skip' && (
                                <div>
                                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                                    Nova data
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={pendingReschedule.scheduled_for_local}
                                    onChange={(e) =>
                                      setPendingReschedule((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              scheduled_for_local: e.target.value,
                                            }
                                          : prev,
                                      )
                                    }
                                    className="input h-9 py-1"
                                  />
                                </div>
                              )}
                              <div>
                                <label className="block text-xs font-semibold theme-text-muted mb-1">
                                  Motivo
                                </label>
                                <input
                                  type="text"
                                  value={pendingReschedule.reason}
                                  onChange={(e) =>
                                    setPendingReschedule((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            reason: e.target.value,
                                          }
                                        : prev,
                                    )
                                  }
                                  placeholder="ex: sem peças / produção crítica"
                                  className="input h-9 py-1"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={confirmReschedule}
                                className="inline-flex items-center justify-center rounded-full bg-[color:var(--settings-accent)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingReschedule(null)}
                                className="inline-flex items-center justify-center rounded-full border theme-border px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PredictiveWarningsSettings() {
  const { selectedPlant } = useAppStore();
  const [warnings, setWarnings] = React.useState<any[]>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<string>('');

  React.useEffect(() => {
    fetchAssets();
  }, [selectedPlant]);

  React.useEffect(() => {
    if (selectedAsset) {
      fetchWarnings(selectedAsset);
    }
  }, [selectedAsset]);

  const fetchAssets = async () => {
    try {
      if (!selectedPlant) {
        setAssets([]);
        setSelectedAsset('');
        setWarnings([]);
        return;
      }
      const data = await getAssets(selectedPlant);
      const nextAssets = data || [];
      setAssets(nextAssets);

      if (nextAssets.length === 0) {
        setSelectedAsset('');
        setWarnings([]);
        return;
      }

      const stillExists = selectedAsset && nextAssets.some((a: any) => a.id === selectedAsset);
      if (!stillExists) {
        setSelectedAsset(nextAssets[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchWarnings = async (assetId: string) => {
    try {
      setLoading(true);
      const data = await apiCall(`/alerts/warnings/${assetId}`);
      setWarnings(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Failed to fetch warnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      default:
        return '🟢';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { label: 'Critico', className: 'badge-danger' };
      case 'high':
        return { label: 'Alto', className: 'badge-warning' };
      case 'medium':
        return { label: 'Medio', className: 'badge-warning' };
      default:
        return { label: 'Baixo', className: 'badge-success' };
    }
  };

  const toPercent = (value: any): number | null => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n <= 1 && n >= 0) return Math.round(n * 100);
    return Math.round(n);
  };

  const toNumber = (value: any): number | null => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const metrics = React.useMemo(() => {
    const total = warnings.length;
    const critical = warnings.filter((w) => w.severity === 'critical').length;
    const high = warnings.filter((w) => w.severity === 'high').length;
    const medium = warnings.filter((w) => w.severity === 'medium').length;
    const low = Math.max(0, total - critical - high - medium);

    const confidences = warnings
      .map((w) => toPercent(w.confidence))
      .filter((v): v is number => typeof v === 'number');
    const failureRates = warnings
      .map((w) => toPercent(w.failure_rate))
      .filter((v): v is number => typeof v === 'number');
    const mtbfHours = warnings
      .map((w) => toNumber(w.mtbf))
      .filter((v): v is number => typeof v === 'number');

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    return {
      total,
      critical,
      high,
      medium,
      low,
      avgConfidence: avg(confidences),
      avgFailureRate: avg(failureRates),
      avgMtbfHours: avg(mtbfHours),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warnings]);

  const MetricBar = ({
    label,
    value,
    max,
    suffix,
  }: {
    label: string;
    value: number | null;
    max: number;
    suffix?: string;
  }) => {
    const safe = value == null ? null : Math.max(0, Math.min(max, value));
    const pct = safe == null ? 0 : (safe / max) * 100;

    return (
      <div className="rounded-2xl border theme-border theme-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide theme-text-muted">{label}</div>
          <div className="text-sm font-semibold theme-text">
            {value == null ? '—' : `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}${suffix || ''}`}
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[color:var(--dash-border)]">
          <div
            className="h-full rounded-full bg-[color:var(--settings-accent)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const SeverityStack = () => {
    if (!metrics.total) return null;
    const pct = (n: number) => (metrics.total ? (n / metrics.total) * 100 : 0);
    return (
      <div className="rounded-2xl border theme-border theme-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Distribuição</div>
          <div className="text-sm font-semibold theme-text">{metrics.total} avisos</div>
        </div>

        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[color:var(--dash-border)]">
          <div className="flex h-full w-full">
            {metrics.critical > 0 && (
              <div
                className="h-full bg-[color:var(--settings-accent)]"
                style={{ width: `${pct(metrics.critical)}%` }}
                title={`Críticos: ${metrics.critical}`}
              />
            )}
            {metrics.high > 0 && (
              <div
                className="h-full bg-[color:var(--settings-accent-2)]"
                style={{ width: `${pct(metrics.high)}%` }}
                title={`Altos: ${metrics.high}`}
              />
            )}
            {metrics.medium > 0 && (
              <div
                className="h-full bg-[color:var(--dash-accent)]"
                style={{ width: `${pct(metrics.medium)}%` }}
                title={`Médios: ${metrics.medium}`}
              />
            )}
            {metrics.low > 0 && (
              <div
                className="h-full bg-[color:var(--dash-muted)]"
                style={{ width: `${pct(metrics.low)}%` }}
                title={`Baixos: ${metrics.low}`}
              />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {metrics.critical > 0 && <span className="badge-danger text-xs">Críticos: {metrics.critical}</span>}
          {metrics.high > 0 && <span className="badge-warning text-xs">Altos: {metrics.high}</span>}
          {metrics.medium > 0 && <span className="badge-warning text-xs">Médios: {metrics.medium}</span>}
          {metrics.low > 0 && <span className="badge-success text-xs">Baixos: {metrics.low}</span>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
          Saude operacional
        </p>
        <h2 className="mt-2 text-2xl font-semibold theme-text">Alertas preditivos</h2>
        <p className="mt-1 text-sm theme-text-muted">
          Analise automatica de historico para avisos de risco.
        </p>
      </div>

      {/* Asset Selector */}
      {!selectedPlant && (
        <div className="mb-6 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
          <span className="badge-warning mr-2 text-xs">Atencao</span>
          Selecione uma planta para analisar equipamentos.
        </div>
      )}

      <div className="relative mb-6 overflow-hidden rounded-[24px] border theme-border theme-card p-4 shadow-sm">
        <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
        <label className="block text-sm font-medium theme-text mb-2">
          Selecionar equipamento
        </label>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="input"
          disabled={!selectedPlant || assets.length === 0}
        >
          <option value="">-- Selecionar --</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.code})
            </option>
          ))}
        </select>
      </div>

      {/* Warnings Display */}
      {loading ? (
        <div className="rounded-2xl border theme-border theme-card py-10 text-center text-sm theme-text-muted">
          Analisando historico...
        </div>
      ) : warnings.length === 0 ? (
        <div className="rounded-[24px] border theme-border theme-card p-10 text-center shadow-sm">
          <div className="text-3xl">✅</div>
          <p className="mt-3 text-sm font-semibold theme-text">Nenhum risco detectado</p>
          <p className="mt-1 text-xs theme-text-muted">
            Este equipamento esta a funcionar normalmente.
          </p>
          <div className="mt-4">
            <span className="badge-success text-xs">Saudavel</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {warnings.map((warning, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-[22px] border theme-border theme-card p-4 shadow-sm"
            >
              <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getSeverityIcon(warning.severity)}</div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold theme-text">{warning.message}</div>
                    <span className={`${getSeverityBadge(warning.severity).className} text-xs`}>
                      {getSeverityBadge(warning.severity).label}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    {warning.pattern && (
                      <div>
                        <span className="font-medium theme-text">Padrao detectado:</span>{' '}
                        <span className="theme-text-muted">{warning.pattern}</span>
                      </div>
                    )}
                    {warning.mtbf && (
                      <div>
                        <span className="font-medium theme-text">MTBF:</span>{' '}
                        <span className="theme-text-muted">{warning.mtbf} horas</span>
                      </div>
                    )}
                    {warning.failure_rate && (
                      <div>
                        <span className="font-medium theme-text">Taxa falha:</span>{' '}
                        <span className="theme-text-muted">{warning.failure_rate}%</span>
                      </div>
                    )}
                    {warning.confidence && (
                      <div>
                        <span className="font-medium theme-text">Confianca:</span>{' '}
                        <span className="theme-text-muted">{warning.confidence}%</span>
                      </div>
                    )}
                  </div>

                  {(toPercent(warning.confidence) != null || toPercent(warning.failure_rate) != null) && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {toPercent(warning.confidence) != null && (
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide theme-text-muted">
                            <span>Confiança</span>
                            <span className="theme-text">{toPercent(warning.confidence)}%</span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--dash-border)]">
                            <div
                              className="h-full rounded-full bg-[color:var(--settings-accent)]"
                              style={{ width: `${Math.max(0, Math.min(100, toPercent(warning.confidence) || 0))}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {toPercent(warning.failure_rate) != null && (
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide theme-text-muted">
                            <span>Taxa falha</span>
                            <span className="theme-text">{toPercent(warning.failure_rate)}%</span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--dash-border)]">
                            <div
                              className="h-full rounded-full bg-[color:var(--settings-accent-2)]"
                              style={{ width: `${Math.max(0, Math.min(100, toPercent(warning.failure_rate) || 0))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {warning.recommendation && (
                    <div className="mt-3 rounded-2xl border theme-border bg-[color:var(--dash-panel)] p-3 text-sm theme-text">
                      <span className="font-medium">Recomendacao:</span> {warning.recommendation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analysis Summary */}
      {selectedAsset && warnings.length > 0 && (
        <div className="mt-8">
          <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[20px] border theme-border theme-card p-4 text-center shadow-sm">
            <div className="text-2xl font-semibold theme-text">
              {warnings.filter((w) => w.severity === 'critical').length}
            </div>
            <div className="mt-2">
              <span className="badge-danger text-xs">Criticos</span>
            </div>
          </div>
          <div className="rounded-[20px] border theme-border theme-card p-4 text-center shadow-sm">
            <div className="text-2xl font-semibold theme-text">
              {warnings.filter((w) => w.severity === 'high').length}
            </div>
            <div className="mt-2">
              <span className="badge-warning text-xs">Altos</span>
            </div>
          </div>
          <div className="rounded-[20px] border theme-border theme-card p-4 text-center shadow-sm">
            <div className="text-2xl font-semibold theme-text">
              {warnings.filter((w) => w.severity === 'medium').length}
            </div>
            <div className="mt-2">
              <span className="badge-warning text-xs">Medios</span>
            </div>
          </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <SeverityStack />
            <MetricBar label="Confiança média" value={metrics.avgConfidence} max={100} suffix="%" />
            <MetricBar label="Taxa falha média" value={metrics.avgFailureRate} max={100} suffix="%" />
            <MetricBar label="MTBF médio" value={metrics.avgMtbfHours} max={Math.max(1, Math.ceil((metrics.avgMtbfHours || 0) * 1.5))} suffix="h" />
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsLibrarySettings() {
  const { selectedPlant } = useAppStore();
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<string>('');
  const [documentType, setDocumentType] = React.useState('manual');
  const [expandedDoc, setExpandedDoc] = React.useState<string | null>(null);
  const [versionsByDocId, setVersionsByDocId] = React.useState<Record<string, any[]>>({});
  const [versionsLoadingId, setVersionsLoadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchAssets();
  }, [selectedPlant]);

  React.useEffect(() => {
    if (selectedAsset) {
      fetchDocuments(selectedAsset);
    }
  }, [selectedAsset]);

  const fetchAssets = async () => {
    try {
      if (!selectedPlant) {
        setAssets([]);
        return;
      }
      const data = await getAssets(selectedPlant);
      setAssets(data || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchDocuments = async (assetId: string) => {
    try {
      setLoading(true);
      const data = await apiCall(`/alerts/documents?asset_id=${assetId}`);
      setDocuments(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAsset) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('asset_id', selectedAsset);
      formData.append('document_type', documentType);
      formData.append('title', file.name);
      formData.append('file', file);

      const token = localStorage.getItem('token');

      const response = await fetch('/api/alerts/documents', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      fetchDocuments(selectedAsset);
      e.target.value = '';
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
    }
  };

  const fetchVersions = async (docId: string) => {
    try {
      setVersionsLoadingId(docId);
      const data = await apiCall(`/alerts/documents/${docId}/versions`);
      const rows = Array.isArray(data) ? data : (data?.data || []);
      setVersionsByDocId((prev) => ({ ...prev, [docId]: rows }));
    } catch (error) {
      console.error('Failed to fetch document versions:', error);
      setVersionsByDocId((prev) => ({ ...prev, [docId]: [] }));
    } finally {
      setVersionsLoadingId(null);
    }
  };

  const handleUploadNewVersion = async (doc: any, file: File) => {
    if (!file || !selectedAsset) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('asset_id', selectedAsset);
      formData.append('document_type', doc.document_type);
      formData.append('title', doc.title);
      formData.append('file', file);

      const token = localStorage.getItem('token');

      const response = await fetch('/api/alerts/documents', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      await fetchDocuments(selectedAsset);
      await fetchVersions(doc.id);
    } catch (error) {
      console.error('Failed to upload new version:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Eliminar este documento?')) return;
    try {
      await apiCall(`/alerts/documents/${docId}`, {
        method: 'DELETE',
      });
      if (selectedAsset) {
        fetchDocuments(selectedAsset);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return '📖';
      case 'schema':
        return '🔧';
      case 'certificate':
        return '📜';
      case 'warranty':
        return '🛡️';
      default:
        return '📄';
    }
  };

  const isExpiring = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const days = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    return days <= 30 && days > 0;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
          Documentacao tecnica
        </p>
        <h2 className="mt-2 text-2xl font-semibold theme-text">
          Biblioteca de documentos
        </h2>
        <p className="mt-1 text-sm theme-text-muted">
          Manuais, esquemas, certificados e garantias.
        </p>
      </div>

      {/* Asset Selector */}
      {!selectedPlant && (
        <div className="mb-6 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
          <span className="badge-warning mr-2 text-xs">Atencao</span>
          Selecione uma planta para ver e carregar documentos.
        </div>
      )}

      <div className="relative mb-6 overflow-hidden rounded-[24px] border theme-border theme-card p-4 shadow-sm">
        <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
        <label className="block text-sm font-medium theme-text mb-2">
          Selecionar equipamento
        </label>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="input"
          disabled={!selectedPlant || assets.length === 0}
        >
          <option value="">-- Selecionar --</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.code})
            </option>
          ))}
        </select>
      </div>

      {/* Upload Area */}
      {selectedAsset && (
        <div className="relative mb-6 overflow-hidden rounded-[24px] border-2 border-dashed border-[color:var(--dash-border)] bg-[color:var(--dash-surface)]/80 p-6">
          <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium theme-text mb-3">
                Tipo de documento
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="input mb-4"
              >
                <option value="manual">📖 Manual</option>
                <option value="schema">🔧 Esquema</option>
                <option value="certificate">📜 Certificado</option>
                <option value="warranty">🛡️ Garantia</option>
              </select>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full text-sm theme-text-muted file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--settings-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
                />
              </div>
              {uploading && (
                <p className="mt-2 text-sm text-[color:var(--dash-accent)]">Enviando...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border theme-border theme-card py-10 text-center text-sm theme-text-muted">
            Carregando...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed theme-border bg-[color:var(--dash-surface)] p-10 text-center">
            <div className="text-sm theme-text-muted">
              {selectedAsset ? 'Nenhum documento para este equipamento' : 'Selecione um equipamento'}
            </div>
            {!selectedAsset && selectedPlant && (
              <div className="mt-4">
                <span className="badge-warning text-xs">Selecao necessaria</span>
              </div>
            )}
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="overflow-hidden rounded-2xl border theme-border theme-card shadow-sm"
            >
              <button
                onClick={() => {
                  const next = expandedDoc === doc.id ? null : doc.id;
                  setExpandedDoc(next);
                  if (next) {
                    void fetchVersions(doc.id);
                  }
                }}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-[color:var(--dash-surface)]"
              >
                <div className="flex flex-1 items-center gap-3">
                  <span className="text-2xl">{getDocumentIcon(doc.document_type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium theme-text truncate">{doc.title}</div>
                    <div className="text-xs theme-text-muted">
                      v{doc.version_number} •{' '}
                      {new Date(doc.created_at).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                  {isExpired(doc.expires_at) && (
                    <span className="ml-2 badge-danger text-xs">Expirado</span>
                  )}
                  {isExpiring(doc.expires_at) && (
                    <span className="ml-2 badge-warning text-xs">Expira em breve</span>
                  )}
                </div>
                <ChevronRight
                  className={`h-5 w-5 theme-text-muted transition-transform ${
                    expandedDoc === doc.id ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Expanded Details */}
              {expandedDoc === doc.id && (
                <div className="space-y-3 border-t border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                  {/* Preview */}
                  <div className="rounded-2xl border theme-border bg-[color:var(--dash-panel)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold theme-text">Pré-visualização</div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border theme-border px-3 py-1 text-xs font-semibold theme-text transition hover:bg-[color:var(--dash-surface)]"
                      >
                        Abrir
                      </a>
                    </div>

                    {(() => {
                      const ext = String(doc.file_extension || '').toLowerCase();
                      const isPdf = ext === 'pdf' || String(doc.file_url || '').toLowerCase().includes('.pdf');
                      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);

                      if (isPdf) {
                        return (
                          <iframe
                            src={doc.file_url}
                            className="mt-3 h-[360px] w-full rounded-2xl border theme-border bg-white"
                            title={`Preview-${doc.id}`}
                          />
                        );
                      }

                      if (isImage) {
                        return (
                          <img
                            src={doc.file_url}
                            alt={doc.title}
                            className="mt-3 max-h-[360px] w-full rounded-2xl border theme-border bg-white object-contain"
                          />
                        );
                      }

                      return (
                        <div className="mt-3 text-sm theme-text-muted">
                          Pré-visualização indisponível para este formato.
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <span className="font-medium theme-text">Tamanho:</span>
                      <p className="theme-text-muted">{(doc.file_size_mb || 0).toFixed(2)} MB</p>
                    </div>
                    <div>
                      <span className="font-medium theme-text">Formato:</span>
                      <p className="theme-text-muted">{doc.file_extension?.toUpperCase()}</p>
                    </div>
                    {doc.expires_at && (
                      <div>
                        <span className="font-medium theme-text">Expira em:</span>
                        <p className="theme-text-muted">
                          {new Date(doc.expires_at).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    )}
                    {doc.tags && doc.tags.length > 0 && (
                      <div>
                        <span className="font-medium theme-text">Tags:</span>
                        <p className="theme-text-muted">{doc.tags.join(', ')}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={doc.file_url}
                      download
                      className="rounded-full border theme-border px-3 py-1 text-xs font-semibold theme-text transition hover:bg-[color:var(--dash-panel)]"
                    >
                      Download
                    </a>

                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-[color:var(--dash-surface)]"
                    >
                      Eliminar
                    </button>
                  </div>

                  {/* Versions */}
                  <div className="rounded-2xl border theme-border bg-[color:var(--dash-panel)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold theme-text">Versões</div>
                      <button
                        onClick={() => fetchVersions(doc.id)}
                        disabled={versionsLoadingId === doc.id}
                        className="rounded-full border theme-border px-3 py-1 text-xs font-semibold theme-text transition hover:bg-[color:var(--dash-surface)] disabled:opacity-60"
                      >
                        {versionsLoadingId === doc.id ? 'A carregar…' : 'Atualizar'}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(versionsByDocId[doc.id] || []).length === 0 ? (
                        <div className="text-sm theme-text-muted">Sem histórico disponível.</div>
                      ) : (
                        (versionsByDocId[doc.id] || []).map((v: any) => (
                          <div
                            key={v.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border theme-border bg-[color:var(--dash-surface)] px-3 py-2"
                          >
                            <div className="text-sm theme-text">
                              <span className="font-semibold">v{v.version_number}</span>
                              <span className="theme-text-muted">
                                {' '}
                                • {new Date(v.created_at).toLocaleDateString('pt-PT')}
                              </span>
                            </div>
                            <a
                              href={v.file_url}
                              download
                              className="rounded-full border theme-border px-3 py-1 text-xs font-semibold theme-text transition hover:bg-[color:var(--dash-panel)]"
                            >
                              Download
                            </a>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-semibold uppercase tracking-wide theme-text-muted">
                        Carregar nova versão
                      </label>
                      <input
                        type="file"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          void handleUploadNewVersion(doc, f);
                          e.target.value = '';
                        }}
                        className="mt-2 block w-full text-sm theme-text-muted file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--settings-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PermissionsSettings() {
  const [roles, setRoles] = React.useState<
    Array<{ value: string; label: string; description?: string | null; is_system?: boolean }>
  >([]);
  const [permissions, setPermissions] = React.useState<any[]>([]);
  const [activeRole, setActiveRole] = React.useState<string>('');
  const [rolePerms, setRolePerms] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savingRole, setSavingRole] = React.useState(false);
  const [creatingRole, setCreatingRole] = React.useState(false);
  const [plants, setPlants] = React.useState<Array<{ id: string; name: string }>>([]);
  const [homeScopePlantId, setHomeScopePlantId] = React.useState<string | null>(null);
  const [homeByRole, setHomeByRole] = React.useState<Record<string, string>>({});
  const [suggestedHomeByRole, setSuggestedHomeByRole] = React.useState<Record<string, string>>({});
  const [loadingHomes, setLoadingHomes] = React.useState(false);
  const [savingHomes, setSavingHomes] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [roleMeta, setRoleMeta] = React.useState({ name: '', description: '' });
  const [newRole, setNewRole] = React.useState({ key: '', name: '', description: '' });

  const isProtectedRole = String(activeRole || '').trim().toLowerCase() === 'superadmin';

  const loadBase = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([getAdminRoles(), getAdminPermissions()]);
      setRoles(rolesData || []);
      setPermissions(permsData || []);
      if (!activeRole && Array.isArray(rolesData) && rolesData.length > 0) {
        setActiveRole(rolesData[0].value);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar RBAC');
    } finally {
      setLoading(false);
    }
  };

  const loadPlants = async () => {
    try {
      const plantsData = await getAdminPlants();
      const safe = Array.isArray(plantsData) ? plantsData : [];
      setPlants(safe.map((p: any) => ({ id: String(p.id), name: String(p.name || p.code || p.id) })));
    } catch {
      setPlants([]);
    }
  };

  const loadRoleHomes = async (plantId: string | null) => {
    setLoadingHomes(true);
    setError(null);
    try {
      const rows = await getAdminRoleHomes(plantId);
      const map: Record<string, string> = {};
      const suggested: Record<string, string> = {};

      for (const r of Array.isArray(rows) ? rows : []) {
        const key = String((r as any)?.role_key || '');
        const home = String((r as any)?.home_path || '');
        const sug = String((r as any)?.suggested_home || '');
        if (key) {
          if (home) map[key] = home;
          if (sug) suggested[key] = sug;
        }
      }

      setHomeByRole(map);
      setSuggestedHomeByRole(suggested);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar home pages');
      setHomeByRole({});
      setSuggestedHomeByRole({});
    } finally {
      setLoadingHomes(false);
    }
  };

  const loadRolePerms = async (roleKey: string) => {
    if (!roleKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminRolePermissions(roleKey);
      setRolePerms(new Set((data || []).map((p: any) => String(p))));
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar permissões do role');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBase();
    loadPlants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (roles.length === 0) return;
    loadRoleHomes(homeScopePlantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeScopePlantId, roles.length]);

  React.useEffect(() => {
    if (activeRole) loadRolePerms(activeRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole]);

  React.useEffect(() => {
    const selected = roles.find((r) => r.value === activeRole);
    setRoleMeta({
      name: String(selected?.label || ''),
      description: String(selected?.description || ''),
    });
  }, [activeRole, roles]);

  const togglePerm = (key: string) => {
    if (isProtectedRole) return;
    setRolePerms((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!activeRole) return;
    if (isProtectedRole) {
      setError('SuperAdministrador é protegido: permissões não podem ser alteradas.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setAdminRolePermissions(activeRole, Array.from(rolePerms));
    } catch (err: any) {
      setError(err.message || 'Falha ao guardar permissões');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoleMeta = async () => {
    if (!activeRole) return;
    if (isProtectedRole) {
      setError('SuperAdministrador é protegido: este role não pode ser alterado.');
      return;
    }
    const name = String(roleMeta.name || '').trim();
    const description = String(roleMeta.description || '').trim();

    if (!name) {
      setError('Nome do role é obrigatório');
      return;
    }

    setSavingRole(true);
    setError(null);
    try {
      await updateAdminRole(activeRole, {
        name,
        description: description ? description : null,
      });
      await loadBase();
    } catch (err: any) {
      setError(err.message || 'Falha ao guardar role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleCreateRole = async () => {
    const key = String(newRole.key || '').trim().toLowerCase();
    const name = String(newRole.name || '').trim();
    const description = String(newRole.description || '').trim();

    if (!key || !/^[a-z0-9_]+$/.test(key)) {
      setError('Chave inválida. Use apenas a-z, 0-9 e _');
      return;
    }

    if (!name) {
      setError('Nome do role é obrigatório');
      return;
    }

    setCreatingRole(true);
    setError(null);
    try {
      await createAdminRole({
        key,
        name,
        description: description ? description : null,
      });
      setNewRole({ key: '', name: '', description: '' });
      await loadBase();
      setActiveRole(key);
    } catch (err: any) {
      setError(err.message || 'Falha ao criar role');
    } finally {
      setCreatingRole(false);
    }
  };

  const grouped = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    const group = p.group_name || 'geral';
    acc[group] = acc[group] || [];
    acc[group].push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
          Controlo de acesso
        </p>
        <h2 className="mt-2 text-2xl font-semibold theme-text">Permissões & Roles</h2>
        <p className="mt-1 text-sm theme-text-muted">
          Configure permissões por role (por tenant). Roles por fábrica são atribuídos em Gestão administrativa.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border theme-border theme-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold theme-text-muted uppercase tracking-wide">Role</span>
          <select
            className="input h-10"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            disabled={loading}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || loading || !activeRole || isProtectedRole}
        >
          Guardar permissões
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border theme-border theme-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] theme-text-muted">
            Editar role
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Chave
              </label>
              <input className="input mt-2 h-10" value={activeRole || ''} disabled />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Nome
              </label>
              <input
                className="input mt-2 h-10"
                value={roleMeta.name}
                onChange={(e) => setRoleMeta((p) => ({ ...p, name: e.target.value }))}
                disabled={loading || savingRole || !activeRole || isProtectedRole}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Descrição
              </label>
              <textarea
                className="input mt-2 min-h-[90px]"
                value={roleMeta.description}
                onChange={(e) => setRoleMeta((p) => ({ ...p, description: e.target.value }))}
                disabled={loading || savingRole || !activeRole || isProtectedRole}
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={handleSaveRoleMeta}
              disabled={loading || savingRole || !activeRole || isProtectedRole}
              type="button"
            >
              {savingRole ? 'A guardar…' : 'Guardar role'}
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border theme-border theme-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] theme-text-muted">
            Criar role
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Chave (ex: operador_turno)
              </label>
              <input
                className="input mt-2 h-10"
                value={newRole.key}
                onChange={(e) => setNewRole((p) => ({ ...p, key: e.target.value }))}
                disabled={loading || creatingRole}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Nome
              </label>
              <input
                className="input mt-2 h-10"
                value={newRole.name}
                onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                disabled={loading || creatingRole}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Descrição
              </label>
              <textarea
                className="input mt-2 min-h-[90px]"
                value={newRole.description}
                onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))}
                disabled={loading || creatingRole}
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={handleCreateRole}
              disabled={loading || creatingRole}
              type="button"
            >
              {creatingRole ? 'A criar…' : 'Criar role'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border theme-border theme-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] theme-text-muted">
              Página inicial por role
            </p>
            <p className="mt-1 text-sm theme-text-muted">
              Empresa define a base; por fábrica (Plant) pode sobrescrever.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input h-10"
              value={homeScopePlantId || ''}
              onChange={(e) => setHomeScopePlantId(e.target.value ? e.target.value : null)}
              disabled={loadingHomes || savingHomes}
            >
              <option value="">Empresa (base)</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                setSavingHomes(true);
                setError(null);
                try {
                  const entries = roles.map((r) => ({
                    role_key: r.value,
                    home_path:
                      homeByRole[r.value] || suggestedHomeByRole[r.value] || '/dashboard',
                  })).filter((e) => String((e as any)?.role_key || '').toLowerCase() !== 'superadmin');
                  await setAdminRoleHomes(homeScopePlantId, entries);
                  await loadRoleHomes(homeScopePlantId);
                } catch (err: any) {
                  setError(err.message || 'Falha ao guardar home pages');
                } finally {
                  setSavingHomes(false);
                }
              }}
              disabled={loadingHomes || savingHomes || roles.length === 0}
            >
              {savingHomes ? 'A guardar…' : 'Guardar homes'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {roles.map((r) => {
            const current = homeByRole[r.value] || suggestedHomeByRole[r.value] || '/dashboard';
            const suggested = suggestedHomeByRole[r.value] || '';
            return (
              <div key={r.value} className="rounded-2xl border theme-border theme-card p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold theme-text truncate">{r.label}</div>
                  <div className="text-xs theme-text-muted truncate">{r.value}</div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                    Home
                  </label>
                  <select
                    className="input mt-2 h-10"
                    value={current}
                    onChange={(e) =>
                      setHomeByRole((prev) => ({ ...prev, [r.value]: e.target.value }))
                    }
                    disabled={loadingHomes || savingHomes || String(r.value).toLowerCase() === 'superadmin'}
                  >
                    <option value="/dashboard">Dashboard</option>
                    <option value="/tecnico">Técnico</option>
                    <option value="/operador">Operador</option>
                    <option value="/settings">Definições</option>
                  </select>
                  {suggested ? (
                    <p className="mt-2 text-xs theme-text-muted">Sugerido: {suggested}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading && permissions.length === 0 ? (
          <p className="text-sm theme-text-muted">A carregar permissões...</p>
        ) : (
          Object.keys(grouped)
            .sort()
            .map((group) => (
              <div key={group} className="rounded-[24px] border theme-border theme-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] theme-text-muted">
                  {group}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {grouped[group]
                    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
                    .map((p: any) => (
                      <label
                        key={p.key}
                        className="flex items-start gap-3 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3"
                      >
                        <input
                          type="checkbox"
                          checked={rolePerms.has(String(p.key))}
                          onChange={() => togglePerm(String(p.key))}
                          className="mt-1 rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                          disabled={saving || isProtectedRole}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold theme-text truncate">{p.label}</div>
                          <div className="text-xs theme-text-muted truncate">{p.key}</div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

type ManagementSettingsMode = 'full' | 'usersOnly';

function ManagementSettings({ mode = 'full' }: { mode?: ManagementSettingsMode }) {
  const { selectedPlant } = useAppStore();
  const usersOnly = mode === 'usersOnly';
  const [plants, setPlants] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [roles, setRoles] = React.useState<Array<{ value: string; label: string }>>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [activeDbTool, setActiveDbTool] = React.useState<'setup' | 'migrations' | 'bootstrap' | null>(null);
  const [activeAdminPanel, setActiveAdminPanel] = React.useState<'plants' | 'suppliers' | 'spareparts' | 'stock' | null>(null);
  const [plantModalOpen, setPlantModalOpen] = React.useState(false);
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [userModalMode, setUserModalMode] = React.useState<'create' | 'edit'>('create');
  const [plantUsersModalOpen, setPlantUsersModalOpen] = React.useState(false);
  const [plantUsersPlant, setPlantUsersPlant] = React.useState<any | null>(null);
  const [plantUsersSelection, setPlantUsersSelection] = React.useState<string[]>([]);
  const [plantUsersSaving, setPlantUsersSaving] = React.useState(false);
  const [editingPlantId, setEditingPlantId] = React.useState<string | null>(null);
  const [plantForm, setPlantForm] = React.useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: '',
    is_active: true,
  });

  const [newUser, setNewUser] = React.useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'tecnico',
    plant_ids: [] as string[],
  });
  const [generateUserPassword, setGenerateUserPassword] = React.useState(false);
  const [oneTimePassword, setOneTimePassword] = React.useState('');
  const [oneTimePasswordUsername, setOneTimePasswordUsername] = React.useState('');
  const [newUserPlantRoles, setNewUserPlantRoles] = React.useState<Record<string, string>>({});
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [userForm, setUserForm] = React.useState({
    first_name: '',
    last_name: '',
    role: 'tecnico',
    is_active: true,
    plant_ids: [] as string[],
  });
  const [userFormPlantRoles, setUserFormPlantRoles] = React.useState<Record<string, string>>({});

  const buildPlantRolesPayload = (plantIds: string[], defaultRole: string, roleMap: Record<string, string>) =>
    plantIds.map((plantId) => ({
      plant_id: plantId,
      role: roleMap[plantId] || defaultRole,
    }));

  const togglePlantSelection = (ids: string[], plantId: string) =>
    ids.includes(plantId) ? ids.filter((id) => id !== plantId) : [...ids, plantId];

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plantsData, usersData, rolesData] = await Promise.all([
        getAdminPlants(),
        getAdminUsers(),
        getAdminRoles(),
      ]);
      setPlants(plantsData || []);
      setUsers(usersData || []);
      setRoles(rolesData || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados de gestão');
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    if (!selectedPlant) {
      setAssets([]);
      return;
    }

    try {
      const data = await getAssets(selectedPlant);
      setAssets(data || []);
    } catch (err) {
      setAssets([]);
    }
  };

  React.useEffect(() => {
    loadAdminData();
  }, []);

  React.useEffect(() => {
    loadAssets();
  }, [selectedPlant]);

  React.useEffect(() => {
    if (
      !plantModalOpen &&
      !userModalOpen &&
      !activeDbTool &&
      !activeAdminPanel &&
      !plantUsersModalOpen
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (plantModalOpen) {
        setPlantModalOpen(false);
        setEditingPlantId(null);
      }
      if (userModalOpen) {
        setUserModalOpen(false);
        setEditingUserId(null);
      }
      if (plantUsersModalOpen) {
        setPlantUsersModalOpen(false);
        setPlantUsersPlant(null);
      }
      if (activeDbTool) {
        setActiveDbTool(null);
      }
      if (activeAdminPanel) {
        setActiveAdminPanel(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAdminPanel, activeDbTool, plantModalOpen, plantUsersModalOpen, userModalOpen]);

  const singlePlantLocked = plants.length > 0;

  const handleStartPlantEdit = (plant: any) => {
    setEditingPlantId(plant.id);
    setPlantForm({
      name: plant.name || '',
      code: plant.code || '',
      address: plant.address || '',
      city: plant.city || '',
      country: plant.country || '',
      is_active: plant.is_active ?? true,
    });
    setPlantModalOpen(true);
  };

  const handleOpenPlantUsers = (plant: any) => {
    const assignedIds = users
      .filter((user) => Array.isArray(user.plant_ids) && user.plant_ids.includes(plant.id))
      .map((user) => user.id);
    setPlantUsersPlant(plant);
    setPlantUsersSelection(assignedIds);
    setPlantUsersModalOpen(true);
  };

  const togglePlantUser = (userId: string) => {
    setPlantUsersSelection((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const handleSavePlantUsers = async () => {
    if (!plantUsersPlant) return;

    setPlantUsersSaving(true);
    setError(null);
    const plantId = plantUsersPlant.id;

    try {
      const updates = users
        .map((user) => {
          const currentIds = Array.isArray(user.plant_ids) ? user.plant_ids : [];
          const shouldHave = plantUsersSelection.includes(user.id);
          const hasPlant = currentIds.includes(plantId);

          if (shouldHave === hasPlant) {
            return null;
          }

          const nextIds = shouldHave
            ? [...currentIds, plantId]
            : currentIds.filter((id: string) => id !== plantId);

          return updateAdminUser(user.id, {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            role: user.role || 'tecnico',
            is_active: user.is_active ?? true,
            plant_ids: nextIds,
          });
        })
        .filter(Boolean) as Promise<any>[];

      if (updates.length > 0) {
        await Promise.all(updates);
      }
      await loadAdminData();
      setPlantUsersModalOpen(false);
      setPlantUsersPlant(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar utilizadores da planta');
    } finally {
      setPlantUsersSaving(false);
    }
  };

  const handleUpdatePlant = async () => {
    if (!editingPlantId) return;

    setSaving(true);
    setError(null);
    try {
      await updateAdminPlant(editingPlantId, plantForm);
      setEditingPlantId(null);
      await loadAdminData();
      setPlantModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar planta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivatePlant = async (plantId: string) => {
    if (!window.confirm('Desativar esta planta?')) return;

    setSaving(true);
    setError(null);
    try {
      await deactivateAdminPlant(plantId);
      await loadAdminData();
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar planta');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.first_name || !newUser.last_name) {
      setError('Preencha os campos obrigatorios do utilizador');
      return;
    }

    if (!generateUserPassword && !newUser.password) {
      setError('Defina uma password temporária ou ative a geração automática');
      return;
    }

    if (newUser.plant_ids.length === 0) {
      setError('Selecione pelo menos uma planta para o utilizador');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const createdUsername = String(newUser.username || '').trim();
      const payload: any = {
        ...newUser,
        plant_roles: buildPlantRolesPayload(newUser.plant_ids, newUser.role, newUserPlantRoles),
      };

      if (generateUserPassword) {
        payload.generatePassword = true;
        delete payload.password;
      }

      const created = await createAdminUser(payload);
      const tempPassword =
        String((created as any)?.temp_password || (created as any)?.tempPassword || '').trim();

      setNewUser({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'tecnico',
        plant_ids: [],
      });
      setNewUserPlantRoles({});
      await loadAdminData();

      if (tempPassword) {
        setOneTimePasswordUsername(createdUsername);
        setOneTimePassword(tempPassword);
      } else {
        setUserModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar utilizador');
    } finally {
      setSaving(false);
    }
  };

  const handleStartUserEdit = (user: any) => {
    setEditingUserId(user.id);
    const incoming = Array.isArray(user.plant_roles) ? user.plant_roles : [];
    const roleMap: Record<string, string> = {};
    for (const row of incoming) {
      if (row?.plant_id) roleMap[String(row.plant_id)] = String(row.role || user.role || 'tecnico');
    }
    setUserFormPlantRoles(roleMap);
    setUserForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'tecnico',
      is_active: user.is_active ?? true,
      plant_ids: user.plant_ids || [],
    });
    setUserModalMode('edit');
    setUserModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUserId) return;

    if (userForm.plant_ids.length === 0) {
      setError('Selecione pelo menos uma planta para o utilizador');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateAdminUser(editingUserId, {
        ...userForm,
        plant_roles: buildPlantRolesPayload(userForm.plant_ids, userForm.role, userFormPlantRoles),
      });
      setEditingUserId(null);
      await loadAdminData();
      setUserModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar utilizador');
    } finally {
      setSaving(false);
    }
  };

  const dbTools = [
    {
      id: 'setup' as const,
      title: 'Setup BD',
      description: 'Estado e administração da base de dados.',
      icon: Database,
    },
    {
      id: 'migrations' as const,
      title: 'Atualizar BD',
      description: 'Executar migrações e aplicar seeds.',
      icon: Wrench,
    },
    {
      id: 'bootstrap' as const,
      title: 'Setup inicial',
      description: 'Recriar a base do zero (ação destrutiva).',
      icon: Server,
    },
  ];

  const adminPanels = [
    {
      id: 'plants' as const,
      title: 'Plantas',
      description: 'Gestão completa de plantas e atribuições.',
      icon: Building2,
    },
    {
      id: 'suppliers' as const,
      title: 'Fornecedores',
      description: 'Base de parceiros e contactos de compra.',
      icon: Users,
    },
    {
      id: 'spareparts' as const,
      title: 'Registar peças',
      description: 'Adicionar novas peças ao catálogo.',
      icon: Plus,
    },
    {
      id: 'stock' as const,
      title: 'Stock de peças',
      description: 'Registar entradas e reposições de inventário.',
      icon: Boxes,
    },
  ];

  return (
    <div className="space-y-6">
      {!usersOnly ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
            Administração
          </p>
          <h2 className="mt-2 text-2xl font-semibold theme-text">Gestão administrativa</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Controle plantas, utilizadores, roles e equipamentos sem sair das configurações.
          </p>
        </div>
      ) : null}

      {error && (
        <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text shadow-sm">
          <span className="badge-danger mr-2 text-xs">Erro</span>
          {error}
        </div>
      )}

      {!usersOnly ? (
        <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold theme-text">Ferramentas da base de dados</h3>
              <p className="text-sm theme-text-muted">Menu rápido de configuração e migrações.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {dbTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveDbTool(tool.id)}
                  className="group rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 text-left shadow-sm transition hover:bg-[color:var(--dash-surface)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold theme-text">{tool.title}</p>
                      <p className="mt-1 text-xs theme-text-muted">{tool.description}</p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border theme-border bg-[color:var(--dash-surface)] text-[color:var(--dash-accent)] transition group-hover:bg-[color:var(--dash-surface-2)]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-[color:var(--dash-accent)]">Abrir</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!usersOnly ? (
        <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold theme-text">Menu administrativo</h3>
              <p className="text-sm theme-text-muted">Aceda às páginas de gestão.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {adminPanels.map((panel) => {
              const Icon = panel.icon;
              return (
                <button
                  key={panel.id}
                  onClick={() => setActiveAdminPanel(panel.id)}
                  className="group rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 text-left shadow-sm transition hover:bg-[color:var(--dash-surface)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold theme-text">{panel.title}</p>
                      <p className="mt-1 text-xs theme-text-muted">{panel.description}</p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border theme-border bg-[color:var(--dash-surface)] text-[color:var(--dash-accent)] transition group-hover:bg-[color:var(--dash-surface-2)]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-[color:var(--dash-accent)]">Abrir</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!usersOnly ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[28px] border theme-border theme-card p-5 shadow-sm space-y-6">
          <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold theme-text">Plantas & utilizadores</h3>
              <p className="text-sm theme-text-muted">Associe utilizadores a cada planta</p>
            </div>
            <Building2 className="h-5 w-5 theme-text-muted" />
          </div>
          {singlePlantLocked && (
            <p className="text-xs theme-text-muted">
              Modo de fábrica única ativo. A criação de novas plantas está bloqueada.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {loading && <p className="text-sm theme-text-muted">Carregando plantas...</p>}
            {!loading && plants.length === 0 && (
              <p className="text-sm theme-text-muted">Nenhuma planta cadastrada.</p>
            )}
            {plants.map((plant) => {
              const assignedUsers = users.filter(
                (user) => Array.isArray(user.plant_ids) && user.plant_ids.includes(plant.id),
              );
              const visibleUsers = assignedUsers.slice(0, 4);
              const remainingUsers = assignedUsers.length - visibleUsers.length;

              return (
                <div
                  key={plant.id}
                  className="rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 shadow-sm transition hover:bg-[color:var(--dash-surface)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold theme-text">
                        {plant.code} - {plant.name}
                      </p>
                      <p className="text-xs theme-text-muted">
                        {plant.city || 'Cidade'} · {plant.country || 'País'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          plant.is_active
                            ? 'bg-[color:var(--dash-surface)] text-[color:var(--dash-accent)]'
                            : 'bg-[color:var(--dash-surface)] theme-text-muted'
                        }`}
                      >
                        {plant.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                      <button
                        className="text-xs theme-text-muted hover:text-[color:var(--dash-text)]"
                        onClick={() => handleStartPlantEdit(plant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="text-xs theme-text-muted hover:text-[color:var(--dash-text)]"
                        onClick={() => handleDeactivatePlant(plant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {visibleUsers.length === 0 && (
                      <span className="text-xs theme-text-muted">
                        Sem utilizadores atribuídos.
                      </span>
                    )}
                    {visibleUsers.map((user) => (
                      <span
                        key={user.id}
                        className="rounded-full bg-[color:var(--dash-surface)] px-3 py-1 text-xs font-semibold theme-text-muted"
                      >
                        {user.first_name} {user.last_name}
                      </span>
                    ))}
                    {remainingUsers > 0 && (
                      <span className="rounded-full bg-[color:var(--dash-surface)] px-3 py-1 text-xs theme-text-muted">
                        +{remainingUsers}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => handleOpenPlantUsers(plant)}
                    >
                      Atribuir utilizadores
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border theme-border theme-card p-5 shadow-sm space-y-5">
          <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold theme-text">Equipamentos</h3>
              <p className="text-sm theme-text-muted">Resumo por planta selecionada</p>
            </div>
            <a className="text-sm text-[color:var(--settings-accent)]" href="/assets">
              Ver lista
            </a>
          </div>

          {!selectedPlant && (
            <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text">
              <span className="badge-warning mr-2 text-xs">Atenção</span>
              Selecione uma planta no topo para visualizar equipamentos.
            </div>
          )}

          {selectedPlant && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-4">
                <p className="text-xs theme-text-muted">Total</p>
                <p className="text-2xl font-semibold theme-text">{assets.length}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {assets.slice(0, 5).map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-[20px] border theme-border bg-[color:var(--dash-panel)] p-3 shadow-sm transition hover:bg-[color:var(--dash-surface)]"
                  >
                    <div>
                      <p className="text-sm font-medium theme-text">{asset.name}</p>
                      <p className="text-xs theme-text-muted">{asset.code}</p>
                    </div>
                    <span className="mt-2 inline-flex items-center rounded-full bg-[color:var(--dash-surface)] px-2 py-1 text-xs theme-text-muted">
                      {asset.status || 'ativo'}
                    </span>
                  </div>
                ))}
                {assets.length === 0 && (
                  <p className="text-sm theme-text-muted">Sem equipamentos cadastrados.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[28px] border theme-border theme-card p-5 shadow-sm space-y-6">
        <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold theme-text">Utilizadores e roles</h3>
            <p className="text-sm theme-text-muted">Crie contas e distribua acessos</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => {
                setUserModalMode('create');
                setNewUser({
                  username: '',
                  email: '',
                  password: '',
                  first_name: '',
                  last_name: '',
                  role: 'tecnico',
                  plant_ids: [],
                });
                setUserModalOpen(true);
                setGenerateUserPassword(false);
                setOneTimePassword('');
                setOneTimePasswordUsername('');
              }}
              disabled={saving}
            >
              <Plus className="h-4 w-4" />
              Novo utilizador
            </button>
            <Users className="h-5 w-5 theme-text-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading && <p className="text-sm theme-text-muted">Carregando utilizadores...</p>}
          {!loading && users.length === 0 && (
            <p className="text-sm theme-text-muted">Nenhum utilizador encontrado.</p>
          )}
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 shadow-sm transition hover:bg-[color:var(--dash-surface)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold theme-text">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs theme-text-muted">{user.username}</p>
                  <p className="text-xs theme-text-muted">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[color:var(--dash-surface)] px-3 py-1 text-xs theme-text-muted">
                    {user.role}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.is_active
                        ? 'bg-[color:var(--dash-surface)] text-[color:var(--dash-accent)]'
                        : 'bg-[color:var(--dash-surface)] theme-text-muted'
                    }`}
                  >
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    className="text-xs theme-text-muted hover:text-[color:var(--dash-text)]"
                    onClick={() => handleStartUserEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!usersOnly && plantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setPlantModalOpen(false);
              setEditingPlantId(null);
            }}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => {
                setPlantModalOpen(false);
                setEditingPlantId(null);
              }}
              className="absolute right-4 top-4 rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-1 text-xs font-semibold theme-text transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--dash-accent)]">
              Editar planta
            </p>
            <h3 className="mt-2 text-lg font-semibold theme-text">
              Atualizar dados
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold theme-text-muted uppercase tracking-wide">
                  Nome da planta
                </label>
                <input
                  className="input"
                  value={plantForm.name}
                  onChange={(event) => setPlantForm({ ...plantForm, name: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-muted uppercase tracking-wide">
                  Código
                </label>
                <input
                  className="input"
                  value={plantForm.code}
                  onChange={(event) => setPlantForm({ ...plantForm, code: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-muted uppercase tracking-wide">
                  Cidade
                </label>
                <input
                  className="input"
                  value={plantForm.city}
                  onChange={(event) => setPlantForm({ ...plantForm, city: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-muted uppercase tracking-wide">
                  País
                </label>
                <input
                  className="input"
                  value={plantForm.country}
                  onChange={(event) => setPlantForm({ ...plantForm, country: event.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-xs theme-text-muted">
                <input
                  type="checkbox"
                  checked={plantForm.is_active}
                  onChange={(event) =>
                    setPlantForm({ ...plantForm, is_active: event.target.checked })
                  }
                  className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                />
                Planta ativa
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={handleUpdatePlant} disabled={saving}>
                Guardar alterações
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setPlantModalOpen(false);
                  setEditingPlantId(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setUserModalOpen(false);
              setEditingUserId(null);
              setOneTimePassword('');
              setOneTimePasswordUsername('');
            }}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => {
                setUserModalOpen(false);
                setEditingUserId(null);
                setOneTimePassword('');
                setOneTimePasswordUsername('');
              }}
              className="absolute right-4 top-4 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--dash-accent)]">
              {userModalMode === 'create' ? 'Novo utilizador' : 'Editar utilizador'}
            </p>
            <h3 className="mt-2 text-lg font-semibold theme-text">
              {userModalMode === 'create' ? 'Criar conta' : 'Atualizar conta'}
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="input"
                placeholder="Nome"
                value={userModalMode === 'create' ? newUser.first_name : userForm.first_name}
                onChange={(event) =>
                  userModalMode === 'create'
                    ? setNewUser({ ...newUser, first_name: event.target.value })
                    : setUserForm({ ...userForm, first_name: event.target.value })
                }
              />
              <input
                className="input"
                placeholder="Apelido"
                value={userModalMode === 'create' ? newUser.last_name : userForm.last_name}
                onChange={(event) =>
                  userModalMode === 'create'
                    ? setNewUser({ ...newUser, last_name: event.target.value })
                    : setUserForm({ ...userForm, last_name: event.target.value })
                }
              />
              {userModalMode === 'create' && (
                <>
                  <input
                    className="input"
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(event) => setNewUser({ ...newUser, username: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                  />
                  <div className="md:col-span-2 rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3">
                    <label className="flex items-center gap-2 text-xs theme-text-muted">
                      <input
                        type="checkbox"
                        checked={generateUserPassword}
                        onChange={(event) => {
                          setGenerateUserPassword(event.target.checked);
                          setOneTimePassword('');
                          setOneTimePasswordUsername('');
                          if (event.target.checked) {
                            setNewUser({ ...newUser, password: '' });
                          }
                        }}
                        className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                      />
                      Gerar password temporária automaticamente (mostrar 1 vez)
                    </label>
                    {!generateUserPassword && (
                      <input
                        className="input mt-3"
                        placeholder="Password temporária"
                        value={newUser.password}
                        onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                      />
                    )}
                  </div>
                </>
              )}

              {userModalMode === 'create' && oneTimePassword ? (
                <div className="md:col-span-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-800">
                    Password gerada (mostrar 1 vez)
                  </p>
                  <p className="mt-2 text-sm theme-text">
                    Utilizador: <span className="font-semibold">{oneTimePasswordUsername || '(novo)'}</span>
                  </p>
                  <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="rounded-xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2 font-mono text-sm theme-text">
                      {oneTimePassword}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3"
                      onClick={() => {
                        void navigator.clipboard?.writeText(oneTimePassword);
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="mt-2 text-xs theme-text-muted">
                    Guarde esta password agora — não será possível voltar a ver.
                  </p>
                </div>
              ) : null}
              <select
                className="input"
                value={userModalMode === 'create' ? newUser.role : userForm.role}
                onChange={(event) =>
                  userModalMode === 'create'
                    ? setNewUser({ ...newUser, role: event.target.value })
                    : setUserForm({ ...userForm, role: event.target.value })
                }
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 md:col-span-2">
                <p className="text-xs font-semibold theme-text-muted">Plantas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plants.map((plant) => {
                    const selectedIds =
                      userModalMode === 'create' ? newUser.plant_ids : userForm.plant_ids;
                    return (
                      <button
                        key={plant.id}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          selectedIds.includes(plant.id)
                            ? 'border-[color:var(--dash-border)] bg-[color:var(--dash-surface-2)] theme-text'
                            : 'border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] theme-text-muted'
                        }`}
                        onClick={() =>
                          (() => {
                            const nextIds = togglePlantSelection(selectedIds, plant.id);
                            if (userModalMode === 'create') {
                              setNewUser({ ...newUser, plant_ids: nextIds });
                              setNewUserPlantRoles((current) => {
                                const next = { ...current };
                                if (nextIds.includes(plant.id)) {
                                  next[plant.id] = next[plant.id] || newUser.role;
                                } else {
                                  delete next[plant.id];
                                }
                                return next;
                              });
                            } else {
                              setUserForm({ ...userForm, plant_ids: nextIds });
                              setUserFormPlantRoles((current) => {
                                const next = { ...current };
                                if (nextIds.includes(plant.id)) {
                                  next[plant.id] = next[plant.id] || userForm.role;
                                } else {
                                  delete next[plant.id];
                                }
                                return next;
                              });
                            }
                          })()
                        }
                      >
                        {plant.code}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(userModalMode === 'create' ? newUser.plant_ids : userForm.plant_ids).map((plantId) => {
                    const plant = plants.find((p) => p.id === plantId);
                    const roleMap = userModalMode === 'create' ? newUserPlantRoles : userFormPlantRoles;
                    const defaultRole = userModalMode === 'create' ? newUser.role : userForm.role;
                    return (
                      <div
                        key={plantId}
                        className="flex items-center justify-between gap-3 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold theme-text truncate">
                            {plant?.code || plantId}
                          </div>
                          <div className="text-[11px] theme-text-muted truncate">
                            Role nesta planta
                          </div>
                        </div>
                        <select
                          className="input h-9"
                          value={roleMap[plantId] || defaultRole}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (userModalMode === 'create') {
                              setNewUserPlantRoles((current) => ({ ...current, [plantId]: value }));
                            } else {
                              setUserFormPlantRoles((current) => ({ ...current, [plantId]: value }));
                            }
                          }}
                        >
                          {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
              {userModalMode === 'edit' && (
                <label className="flex items-center gap-2 text-xs theme-text-muted">
                  <input
                    type="checkbox"
                    checked={userForm.is_active}
                    onChange={(event) =>
                      setUserForm({ ...userForm, is_active: event.target.checked })
                    }
                    className="rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                  />
                  Utilizador ativo
                </label>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {userModalMode === 'create' ? (
                <button className="btn-primary" onClick={handleCreateUser} disabled={saving}>
                  Criar utilizador
                </button>
              ) : (
                <button className="btn-primary" onClick={handleUpdateUser} disabled={saving}>
                  Guardar alterações
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={() => {
                  setUserModalOpen(false);
                  setEditingUserId(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {!usersOnly && plantUsersModalOpen && plantUsersPlant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setPlantUsersModalOpen(false);
              setPlantUsersPlant(null);
            }}
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => {
                setPlantUsersModalOpen(false);
                setPlantUsersPlant(null);
              }}
              className="absolute right-4 top-4 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--dash-accent)]">
              Atribuir utilizadores
            </p>
            <h3 className="mt-2 text-lg font-semibold theme-text">
              {plantUsersPlant.code} - {plantUsersPlant.name}
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center justify-between rounded-2xl border theme-border bg-[color:var(--dash-surface)] px-4 py-3 text-sm shadow-sm"
                >
                  <div>
                    <p className="font-medium theme-text">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs theme-text-muted">{user.email}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={plantUsersSelection.includes(user.id)}
                    onChange={() => togglePlantUser(user.id)}
                    className="h-4 w-4 rounded border theme-border bg-[color:var(--dash-panel)] accent-[color:var(--dash-accent)]"
                  />
                </label>
              ))}
              {users.length === 0 && (
                <p className="text-sm theme-text-muted">Nenhum utilizador encontrado.</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="btn-primary"
                onClick={handleSavePlantUsers}
                disabled={plantUsersSaving}
              >
                Guardar atribuições
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setPlantUsersModalOpen(false);
                  setPlantUsersPlant(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {!usersOnly && activeDbTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveDbTool(null)}
          />
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => setActiveDbTool(null)}
              className="absolute right-4 top-4 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              {activeDbTool === 'setup' && <AdminSetupPage embedded />}
              {activeDbTool === 'migrations' && <DatabaseUpdatePage embedded />}
              {activeDbTool === 'bootstrap' && <SetupInitPage embedded />}
            </div>
          </div>
        </div>
      )}

      {!usersOnly && activeAdminPanel === 'plants' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => setActiveAdminPanel(null)}
              className="absolute right-6 top-6 z-10 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              <PlantsPage embedded />
            </div>
          </div>
        </div>
      )}

      {!usersOnly && activeAdminPanel === 'suppliers' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => setActiveAdminPanel(null)}
              className="absolute right-6 top-6 z-10 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              <SuppliersPage embedded />
            </div>
          </div>
        </div>
      )}

      {!usersOnly && activeAdminPanel === 'spareparts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => setActiveAdminPanel(null)}
              className="absolute right-6 top-6 z-10 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              <SparePartRegisterPage embedded />
            </div>
          </div>
        </div>
      )}

      {!usersOnly && activeAdminPanel === 'stock' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-lg">
            <button
              onClick={() => setActiveAdminPanel(null)}
              className="absolute right-6 top-6 z-10 rounded-full border theme-border theme-card px-3 py-1 text-xs font-semibold theme-text-muted transition hover:bg-[color:var(--dash-surface)]"
            >
              Fechar
            </button>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              <StockEntryPage embedded />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
