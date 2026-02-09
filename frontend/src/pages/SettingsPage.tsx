import React, { useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import {
  apiCall,
  createAdminUser,
  deactivateAdminPlant,
  getAdminPlants,
  getAdminRoles,
  getAdminUsers,
  getAssets,
  getNotificationRules,
  updateAdminPlant,
  updateAdminUser,
  updateNotificationRules,
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
} from 'lucide-react';
import { AdminSetupPage } from './AdminSetupPage';
import { DatabaseUpdatePage } from './DatabaseUpdatePage';
import { SetupInitPage } from './SetupInitPage';
import { PlantsPage } from './PlantsPage';
import { SuppliersPage } from './SuppliersPage';
import { StockEntryPage } from './StockEntryPage';
import { SparePartRegisterPage } from './SparePartRegisterPage';

type SettingTab =
  | 'general'
  | 'alerts'
  | 'notifications'
  | 'preventive'
  | 'warnings'
  | 'documents'
  | 'permissions'
  | 'management';

export function SettingsPage() {
  const [activePanel, setActivePanel] = useState<SettingTab | null>(null);

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
        description: 'Crie planos de manutenção preventiva',
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
      {
        id: 'permissions',
        label: 'Permissões & Roles',
        icon: <Shield className="w-5 h-5" />,
        description: 'Gerencie acesso por role',
      },
      {
        id: 'management',
        label: 'Gestao administrativa',
        icon: <Users className="w-5 h-5" />,
        description: 'Plantas, utilizadores, roles e equipamentos',
      },
    ];

  const activeMeta = tabs.find((tab) => tab.id === activePanel) || null;

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
                onClick={() => setActivePanel(tab.id)}
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

        {activePanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setActivePanel(null)}
              aria-hidden="true"
            />
            <div className="relative w-[1100px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] shadow-[0_30px_80px_-55px_rgba(15,23,42,0.65)]">
              <div className="flex items-start justify-between gap-4 border-b border-[color:var(--dash-border)] bg-[color:var(--dash-surface)] p-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--dash-muted)]">
                    Configuracoes
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
                  onClick={() => setActivePanel(null)}
                >
                  Fechar
                </button>
              </div>

              <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-6">
                {activePanel === 'alerts' && <AlertsSettings />}
                {activePanel === 'notifications' && <NotificationSettings />}
                {activePanel === 'preventive' && <PreventiveMaintenanceSettings />}
                {activePanel === 'warnings' && <PredictiveWarningsSettings />}
                {activePanel === 'documents' && <DocumentsLibrarySettings />}
                {activePanel === 'permissions' && <PermissionsSettings />}
                {activePanel === 'management' && <ManagementSettings />}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ===================== COMPONENT STUBS =====================

function AlertsSettings() {
  const { selectedPlant } = useAppStore();
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
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
    'leitor',
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

function PreventiveMaintenanceSettings() {
  const { selectedPlant } = useAppStore();
  const [plans, setPlans] = React.useState<any[]>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({
    asset_id: '',
    name: '',
    frequency_value: 1,
    frequency_unit: 'days',
    description: '',
    tasks: [] as string[],
  });

  React.useEffect(() => {
    fetchPlans();
    fetchAssets();
  }, []);

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
        tasks: [],
      });
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
      frequency_unit: plan.frequency_unit,
      description: plan.description || '',
      tasks: plan.tasks || [],
    });
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

  return (
    <div>
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
                  <option value="cycles">Ciclos</option>
                  <option value="months">Meses</option>
                </select>
              </div>
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
                      {plan.frequency_value} {plan.frequency_unit}
                    </div>
                    <div>
                      <span className="font-medium">Tarefas:</span> {plan.tasks?.length || 0}
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
  }, []);

  React.useEffect(() => {
    if (selectedAsset) {
      fetchWarnings(selectedAsset);
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
      if (data && data.length > 0) {
        setSelectedAsset(data[0].id);
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
      <div className="mb-6 rounded-[24px] border theme-border theme-card p-4 shadow-sm">
        <label className="block text-sm font-medium theme-text mb-2">
          Selecionar equipamento
        </label>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="input"
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
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

  React.useEffect(() => {
    fetchAssets();
  }, []);

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

      if (response.ok) {
        fetchDocuments(selectedAsset);
        e.target.value = '';
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
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
      <div className="mb-6 rounded-[24px] border theme-border theme-card p-4 shadow-sm">
        <label className="block text-sm font-medium theme-text mb-2">
          Selecionar equipamento
        </label>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="input"
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
          <div className="rounded-2xl border border-dashed theme-border bg-[color:var(--dash-surface)] p-10 text-center text-sm theme-text-muted">
            {selectedAsset ? 'Nenhum documento para este equipamento' : 'Selecione um equipamento'}
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="overflow-hidden rounded-2xl border theme-border theme-card shadow-sm"
            >
              <button
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
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
                      className="rounded-full border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/10"
                    >
                      Eliminar
                    </button>
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
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
          Controlo de acesso
        </p>
        <h2 className="mt-2 text-2xl font-semibold theme-text">Permissoes & roles</h2>
        <p className="mt-1 text-sm theme-text-muted">
          Gerencie o acesso por funcao de utilizador.
        </p>
      </div>

      {/* Permissions Matrix */}
      <div className="relative overflow-x-auto rounded-[24px] border theme-border theme-card shadow-sm">
        <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--settings-accent),var(--settings-accent-2))]" />
        <table className="min-w-full divide-y divide-[color:var(--dash-border)]">
          <thead className="bg-[color:var(--dash-surface)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Funcionalidade
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Admin
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Manager
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Tecnico
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Visualizador
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--dash-border)] bg-[color:var(--dash-panel)]">
            {[
              { feature: 'Criar Equipamentos', permissions: [true, true, false, false] },
              { feature: 'Editar Configuracoes', permissions: [true, true, false, false] },
              { feature: 'Ver Relatorios', permissions: [true, true, true, true] },
              { feature: 'Executar Ordens', permissions: [true, true, true, false] },
              { feature: 'Deletar Dados', permissions: [true, false, false, false] },
              { feature: 'Exportar Dados', permissions: [true, true, false, false] },
              { feature: 'Gerir Utilizadores', permissions: [true, false, false, false] },
            ].map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium theme-text">
                  {row.feature}
                </td>
                {row.permissions.map((perm, i) => (
                  <td key={i} className="px-6 py-4 text-center">
                    {perm ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border theme-border bg-[color:var(--dash-panel)]">
                        <span className="text-[color:var(--dash-accent)] font-bold">✓</span>
                      </span>
                    ) : (
                      <span className="theme-text-muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-[20px] border theme-border theme-card p-4 shadow-sm">
        <p className="text-sm theme-text">
          <span className="badge-success mr-2 text-xs">Nota</span>
          As permissoes sao pre-configuradas por role. Customizacao de roles sera disponibilizada
          em futuras versoes.
        </p>
      </div>
    </div>
  );
}

function ManagementSettings() {
  const { selectedPlant } = useAppStore();
  const [plants, setPlants] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [roles, setRoles] = React.useState<Array<{ value: string; label: string }>>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [activeDbTool, setActiveDbTool] = React.useState<
    'setup' | 'migrations' | 'bootstrap' | null
  >(null);
  const [activeAdminPanel, setActiveAdminPanel] = React.useState<
    'plants' | 'suppliers' | 'spareparts' | 'stock' | null
  >(null);
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
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [userForm, setUserForm] = React.useState({
    first_name: '',
    last_name: '',
    role: 'tecnico',
    is_active: true,
    plant_ids: [] as string[],
  });

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
      setError(err.message || 'Falha ao carregar dados de gestao');
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
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
      setError('Preencha os campos obrigatorios do utilizador');
      return;
    }

    if (newUser.plant_ids.length === 0) {
      setError('Selecione pelo menos uma planta para o utilizador');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createAdminUser(newUser);
      setNewUser({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'tecnico',
        plant_ids: [],
      });
      await loadAdminData();
      setUserModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar utilizador');
    } finally {
      setSaving(false);
    }
  };

  const handleStartUserEdit = (user: any) => {
    setEditingUserId(user.id);
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
      await updateAdminUser(editingUserId, userForm);
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
      description: 'Estado e administracao da base de dados.',
      icon: Database,
    },
    {
      id: 'migrations' as const,
      title: 'Atualizar BD',
      description: 'Executar migracoes e aplicar seeds.',
      icon: Wrench,
    },
    {
      id: 'bootstrap' as const,
      title: 'Setup inicial',
      description: 'Recriar a base do zero (acao destrutiva).',
      icon: Server,
    },
  ];

  const adminPanels = [
    {
      id: 'plants' as const,
      title: 'Plantas',
      description: 'Gestao completa de plantas e atribuicoes.',
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
      description: 'Registar entradas e reposicoes de inventario.',
      icon: Boxes,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
          Administracao
        </p>
        <h2 className="mt-2 text-2xl font-semibold theme-text">Gestao administrativa</h2>
        <p className="mt-1 text-sm theme-text-muted">
          Controle plantas, utilizadores, roles e equipamentos sem sair das configuracoes.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4 text-sm theme-text shadow-sm">
          <span className="badge-danger mr-2 text-xs">Erro</span>
          {error}
        </div>
      )}

      <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold theme-text">Ferramentas da base de dados</h3>
            <p className="text-sm theme-text-muted">Menu rapido de configuracao e migracoes.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {dbTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveDbTool(tool.id)}
                className="group rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 text-left shadow-[0_12px_24px_-20px_rgba(15,23,42,0.4)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
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

      <div className="rounded-[28px] border theme-border theme-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold theme-text">Menu administrativo</h3>
            <p className="text-sm theme-text-muted">Aceda as paginas de gestao.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {adminPanels.map((panel) => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.id}
                onClick={() => setActiveAdminPanel(panel.id)}
                className="group rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 text-left shadow-[0_12px_24px_-20px_rgba(15,23,42,0.4)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
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
              Modo de fabrica unica ativo. A criacao de novas plantas esta bloqueada.
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
                  className="rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold theme-text">
                        {plant.code} - {plant.name}
                      </p>
                      <p className="text-xs theme-text-muted">
                        {plant.city || 'Cidade'} · {plant.country || 'Pais'}
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
              <span className="badge-warning mr-2 text-xs">Atencao</span>
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
                    className="rounded-[20px] border theme-border bg-[color:var(--dash-panel)] p-3 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.3)] transition hover:-translate-y-1 hover:shadow-[0_16px_32px_-22px_rgba(15,23,42,0.4)]"
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
              className="rounded-[22px] border theme-border bg-[color:var(--dash-panel)] p-4 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
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

      {plantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setPlantModalOpen(false);
              setEditingPlantId(null);
            }}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
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
                  Codigo
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
                  Pais
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
                Guardar alteracoes
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
            }}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
            <button
              onClick={() => {
                setUserModalOpen(false);
                setEditingUserId(null);
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
                  <input
                    className="input"
                    placeholder="Password temporaria"
                    value={newUser.password}
                    onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                  />
                </>
              )}
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
                          userModalMode === 'create'
                            ? setNewUser({
                                ...newUser,
                                plant_ids: togglePlantSelection(newUser.plant_ids, plant.id),
                              })
                            : setUserForm({
                                ...userForm,
                                plant_ids: togglePlantSelection(userForm.plant_ids, plant.id),
                              })
                        }
                      >
                        {plant.code}
                      </button>
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
                  Guardar alteracoes
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

      {plantUsersModalOpen && plantUsersPlant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setPlantUsersModalOpen(false);
              setPlantUsersPlant(null);
            }}
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
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
                Guardar atribuicoes
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

      {activeDbTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveDbTool(null)}
          />
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
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

      {activeAdminPanel === 'plants' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
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

      {activeAdminPanel === 'suppliers' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
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

      {activeAdminPanel === 'spareparts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
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

      {activeAdminPanel === 'stock' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveAdminPanel(null)}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border theme-border theme-card p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
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
