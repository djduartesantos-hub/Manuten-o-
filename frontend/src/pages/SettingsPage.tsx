import React, { useState, type CSSProperties } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import {
  apiCall,
  createAdminPlant,
  createAdminUser,
  deactivateAdminPlant,
  getAdminPlants,
  getAdminRoles,
  getAdminUsers,
  getAssets,
  updateAdminPlant,
  updateAdminUser,
} from '../services/api';
import {
  Bell,
  Cog,
  FileText,
  AlertTriangle,
  Shield,
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react';

type SettingTab =
  | 'general'
  | 'alerts'
  | 'preventive'
  | 'warnings'
  | 'documents'
  | 'permissions'
  | 'management';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>('alerts');

  const tabs: { id: SettingTab; label: string; icon: React.ReactNode; description: string }[] =
    [
      {
        id: 'alerts',
        label: 'Alertas & Notificações',
        icon: <Bell className="w-5 h-5" />,
        description: 'Configure thresholds e notificações de alertas',
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

  return (
    <MainLayout>
      <div
        className="relative space-y-10 font-display text-[color:var(--settings-ink)]"
        style={
          {
            '--settings-accent': '#0f766e',
            '--settings-accent-2': '#2563eb',
            '--settings-ink': '#0f172a',
            '--settings-surface': '#f8fafc',
          } as CSSProperties
        }
      >
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,_#ecfeff,_#ffffff_55%)] p-8 shadow-[0_28px_80px_-60px_rgba(15,118,110,0.5)]">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-emerald-200/60 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-blue-200/50 blur-3xl" />
          <div className="absolute right-12 top-10 h-2 w-20 rounded-full bg-[color:var(--settings-accent)] opacity-40" />
          <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center">
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm">
              <SettingsIcon className="h-6 w-6 text-[color:var(--settings-accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Centro de controle
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
                Configuracoes
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Gerencie alertas, manutencao preventiva e documentos em um unico lugar.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <nav className="space-y-2 rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    activeTab === tab.id
                      ? 'border-emerald-200 bg-[color:var(--settings-surface)] text-[color:var(--settings-accent)] shadow-sm'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-[color:var(--settings-surface)]'
                  }`}
                >
                  {activeTab === tab.id && (
                    <span className="absolute left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[color:var(--settings-accent)]" />
                  )}
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/70 p-2 text-[color:var(--settings-accent)] shadow-sm">
                      {tab.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{tab.label}</div>
                      <p className="text-xs text-slate-400 truncate">{tab.description}</p>
                    </div>
                    {activeTab === tab.id && (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_-45px_rgba(15,118,110,0.4)]">
              {activeTab === 'alerts' && <AlertsSettings />}
              {activeTab === 'preventive' && <PreventiveMaintenanceSettings />}
              {activeTab === 'warnings' && <PredictiveWarningsSettings />}
              {activeTab === 'documents' && <DocumentsLibrarySettings />}
              {activeTab === 'permissions' && <PermissionsSettings />}
              {activeTab === 'management' && <ManagementSettings />}
            </div>
          </div>
        </div>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Alertas & Notificações</h2>
          <p className="text-slate-600 mt-1">Configure limites e canais de notificação</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingAlert(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Alerta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Equipamento
                </label>
                <select
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Alerta
                </label>
                <select
                  value={formData.alert_type}
                  onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Limite
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, threshold: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Time Unit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unidade
                </label>
                <select
                  value={formData.time_unit}
                  onChange={(e) => setFormData({ ...formData, time_unit: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                  <option value="cycles">Ciclos</option>
                </select>
              </div>

              {/* Escalate After Hours */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Escalar após (horas)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.escalate_after_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, escalate_after_hours: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notify Roles */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notificar Roles
              </label>
              <div className="flex gap-4">
                {roles.map((role) => (
                  <label key={role} className="flex items-center gap-2">
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
                      className="rounded"
                    />
                    <span className="capitalize text-sm text-slate-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notification Options */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.notify_email}
                  onChange={(e) => setFormData({ ...formData, notify_email: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Email</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.notify_push}
                  onChange={(e) => setFormData({ ...formData, notify_push: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Push</span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingAlert ? 'Atualizar' : 'Criar'} Alerta
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAlert(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
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
          <div className="text-center py-8 text-slate-500">Carregando...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nenhum alerta configurado ainda
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {alertTypes.find((t) => t.value === alert.alert_type)?.label}
                    </span>
                    <span className="text-sm text-slate-600">
                      {alert.asset?.name} ({alert.asset?.code})
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Limite:</span> {alert.threshold} {alert.time_unit}
                    </div>
                    <div>
                      <span className="font-medium">Escalar após:</span>{' '}
                      {alert.escalate_after_hours}h
                    </div>
                    <div>
                      <span className="font-medium">Notificações:</span>{' '}
                      {[alert.notify_email && 'Email', alert.notify_push && 'Push']
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    <div>
                      <span className="font-medium">Roles:</span> {alert.notify_roles?.join(', ')}
                    </div>
                  </div>
                  {alert.description && (
                    <p className="mt-2 text-sm text-slate-600 italic">"{alert.description}"</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(alert)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Planos de Manutenção Preventiva</h2>
          <p className="text-slate-600 mt-1">Crie e gerencie planos de manutenção por equipamento</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingPlan(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Plano
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Equipamento
                </label>
                <select
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="ex: Manutenção Mensal"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Frequency Value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Frequência
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.frequency_value}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency_value: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Frequency Unit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unidade
                </label>
                <select
                  value={formData.frequency_unit}
                  onChange={(e) => setFormData({ ...formData, frequency_unit: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tasks */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Tarefas</label>
                <button
                  type="button"
                  onClick={addTask}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Adicionar Tarefa
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
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeTask(idx)}
                      className="px-3 py-2 text-red-600 hover:text-red-700 font-medium"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingPlan ? 'Atualizar' : 'Criar'} Plano
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPlan(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
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
          <div className="text-center py-8 text-slate-500">Carregando...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nenhum plano de manutenção ainda
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{plan.name}</span>
                    <span className="text-sm text-slate-600">
                      {plan.asset?.name} ({plan.asset?.code})
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Frequência:</span> A cada{' '}
                      {plan.frequency_value} {plan.frequency_unit}
                    </div>
                    <div>
                      <span className="font-medium">Tarefas:</span> {plan.tasks?.length || 0}
                    </div>
                  </div>
                  {plan.description && (
                    <p className="mt-2 text-sm text-slate-600 italic">"{plan.description}"</p>
                  )}
                  {plan.tasks && plan.tasks.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {plan.tasks.map((task: string, idx: number) => (
                        <div key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Alertas Preditivos</h2>
        <p className="text-slate-600 mt-1">Análise automática de histórico para avisos de risco</p>
      </div>

      {/* Asset Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Selecionar Equipamento
        </label>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="text-center py-8 text-slate-500">Analisando histórico...</div>
      ) : warnings.length === 0 ? (
        <div className="text-center py-12 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-green-800 font-medium">Nenhum risco detectado</p>
          <p className="text-green-700 text-sm mt-1">Este equipamento está funcionando normalmente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {warnings.map((warning, idx) => (
            <div
              key={idx}
              className={`border-2 rounded-lg p-4 ${getSeverityColor(warning.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getSeverityIcon(warning.severity)}</div>
                <div className="flex-1">
                  <div className="font-bold">{warning.message}</div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    {warning.pattern && (
                      <div>
                        <span className="font-medium">Padrão Detectado:</span> {warning.pattern}
                      </div>
                    )}
                    {warning.mtbf && (
                      <div>
                        <span className="font-medium">MTBF:</span> {warning.mtbf} horas
                      </div>
                    )}
                    {warning.failure_rate && (
                      <div>
                        <span className="font-medium">Taxa Falha:</span> {warning.failure_rate}%
                      </div>
                    )}
                    {warning.confidence && (
                      <div>
                        <span className="font-medium">Confiança:</span> {warning.confidence}%
                      </div>
                    )}
                  </div>
                  {warning.recommendation && (
                    <div className="mt-3 p-2 bg-white bg-opacity-50 rounded">
                      <span className="font-medium">Recomendação:</span> {warning.recommendation}
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
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {warnings.filter((w) => w.severity === 'critical').length}
            </div>
            <div className="text-sm text-red-700">Críticos</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">
              {warnings.filter((w) => w.severity === 'high').length}
            </div>
            <div className="text-sm text-orange-700">Altos</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {warnings.filter((w) => w.severity === 'medium').length}
            </div>
            <div className="text-sm text-yellow-700">Médios</div>
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
        <h2 className="text-2xl font-bold text-slate-900">Biblioteca de Documentos</h2>
        <p className="text-slate-600 mt-1">Manuais, esquemas, certificados e garantias</p>
      </div>

      {/* Asset Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Selecionar Equipamento
        </label>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="mb-6 p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Tipo de Documento
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
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
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700"
                />
              </div>
              {uploading && <p className="text-sm text-blue-600 mt-2">Enviando...</p>}
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Carregando...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {selectedAsset ? 'Nenhum documento para este equipamento' : 'Selecione um equipamento'}
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{getDocumentIcon(doc.document_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{doc.title}</div>
                    <div className="text-xs text-slate-600">
                      v{doc.version_number} •{' '}
                      {new Date(doc.created_at).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                  {isExpired(doc.expires_at) && (
                    <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                      Expirado
                    </span>
                  )}
                  {isExpiring(doc.expires_at) && (
                    <span className="ml-2 px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded">
                      Expira em breve
                    </span>
                  )}
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedDoc === doc.id ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Expanded Details */}
              {expandedDoc === doc.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">Tamanho:</span>
                      <p className="text-slate-600">{(doc.file_size_mb || 0).toFixed(2)} MB</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Formato:</span>
                      <p className="text-slate-600">{doc.file_extension?.toUpperCase()}</p>
                    </div>
                    {doc.expires_at && (
                      <div>
                        <span className="font-medium text-slate-700">Expira em:</span>
                        <p className="text-slate-600">
                          {new Date(doc.expires_at).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    )}
                    {doc.tags && doc.tags.length > 0 && (
                      <div>
                        <span className="font-medium text-slate-700">Tags:</span>
                        <p className="text-slate-600">{doc.tags.join(', ')}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={doc.file_url}
                      download
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Permissões & Roles</h2>
        <p className="text-slate-600">Gerencie o acesso por função de utilizador</p>
      </div>

      {/* Permissions Matrix */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Funcionalidade
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                Manager
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                Técnico
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                Visualizador
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {[
              { feature: 'Criar Equipamentos', permissions: [true, true, false, false] },
              { feature: 'Editar Configurações', permissions: [true, true, false, false] },
              { feature: 'Ver Relatórios', permissions: [true, true, true, true] },
              { feature: 'Executar Ordens', permissions: [true, true, true, false] },
              { feature: 'Deletar Dados', permissions: [true, false, false, false] },
              { feature: 'Exportar Dados', permissions: [true, true, false, false] },
              { feature: 'Gerir Utilizadores', permissions: [true, false, false, false] },
            ].map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {row.feature}
                </td>
                {row.permissions.map((perm, i) => (
                  <td key={i} className="px-6 py-4 text-center">
                    {perm ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                        <span className="text-green-700 font-bold">✓</span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> As permissões são pré-configuradas por role. Customização de roles será
          disponibilizada em futuras versões.
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

  const [newPlant, setNewPlant] = React.useState({
    name: '',
    code: '',
    city: '',
    country: '',
  });
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

  const handleCreatePlant = async () => {
    if (!newPlant.name || !newPlant.code) {
      setError('Nome e codigo da planta sao obrigatorios');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createAdminPlant(newPlant);
      setNewPlant({ name: '', code: '', city: '', country: '' });
      await loadAdminData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar planta');
    } finally {
      setSaving(false);
    }
  };

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
  };

  const handleUpdatePlant = async () => {
    if (!editingPlantId) return;

    setSaving(true);
    setError(null);
    try {
      await updateAdminPlant(editingPlantId, plantForm);
      setEditingPlantId(null);
      await loadAdminData();
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
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar utilizador');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Gestao administrativa</h2>
        <p className="text-slate-600 mt-1">
          Controle plantas, utilizadores, roles e equipamentos sem sair das configuracoes.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Plantas</h3>
              <p className="text-sm text-slate-500">Cadastre e organize instalacoes</p>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Nome da planta
              </label>
              <input
                className="input"
                value={newPlant.name}
                onChange={(event) => setNewPlant({ ...newPlant, name: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Codigo
              </label>
              <input
                className="input"
                value={newPlant.code}
                onChange={(event) => setNewPlant({ ...newPlant, code: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Cidade
              </label>
              <input
                className="input"
                value={newPlant.city}
                onChange={(event) => setNewPlant({ ...newPlant, city: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Pais
              </label>
              <input
                className="input"
                value={newPlant.country}
                onChange={(event) => setNewPlant({ ...newPlant, country: event.target.value })}
              />
            </div>
          </div>

          <button
            className="btn-primary inline-flex items-center gap-2"
            onClick={handleCreatePlant}
            disabled={saving || singlePlantLocked}
          >
            <Plus className="h-4 w-4" />
            Criar planta
          </button>
          {singlePlantLocked && (
            <p className="text-xs text-slate-500">
              Modo de fabrica unica ativo. A criacao de novas plantas esta bloqueada.
            </p>
          )}

          <div className="space-y-3">
            {loading && <p className="text-sm text-slate-500">Carregando plantas...</p>}
            {!loading && plants.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma planta cadastrada.</p>
            )}
            {plants.map((plant) => (
              <div
                key={plant.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {plant.code} - {plant.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {plant.city || 'Cidade'} · {plant.country || 'Pais'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plant.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {plant.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                    <button
                      className="text-xs text-slate-500 hover:text-slate-700"
                      onClick={() => handleStartPlantEdit(plant)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="text-xs text-rose-500 hover:text-rose-600"
                      onClick={() => handleDeactivatePlant(plant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingPlantId === plant.id && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      className="input"
                      value={plantForm.name}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, name: event.target.value })
                      }
                      placeholder="Nome"
                    />
                    <input
                      className="input"
                      value={plantForm.code}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, code: event.target.value })
                      }
                      placeholder="Codigo"
                    />
                    <input
                      className="input"
                      value={plantForm.city}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, city: event.target.value })
                      }
                      placeholder="Cidade"
                    />
                    <input
                      className="input"
                      value={plantForm.country}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, country: event.target.value })
                      }
                      placeholder="Pais"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={plantForm.is_active}
                        onChange={(event) =>
                          setPlantForm({ ...plantForm, is_active: event.target.checked })
                        }
                      />
                      Planta ativa
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-primary"
                        onClick={handleUpdatePlant}
                        disabled={saving}
                      >
                        Guardar
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setEditingPlantId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Equipamentos</h3>
              <p className="text-sm text-slate-500">Resumo por planta selecionada</p>
            </div>
            <a className="text-sm text-primary-600" href="/assets">
              Ver lista
            </a>
          </div>

          {!selectedPlant && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Selecione uma planta no topo para visualizar equipamentos.
            </div>
          )}

          {selectedPlant && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-semibold text-slate-900">{assets.length}</p>
              </div>
              <div className="space-y-2">
                {assets.slice(0, 5).map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{asset.name}</p>
                      <p className="text-xs text-slate-500">{asset.code}</p>
                    </div>
                    <span className="text-xs text-slate-500">{asset.status || 'ativo'}</span>
                  </div>
                ))}
                {assets.length === 0 && (
                  <p className="text-sm text-slate-500">Sem equipamentos cadastrados.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Utilizadores e roles</h3>
            <p className="text-sm text-slate-500">Crie contas e distribua acessos</p>
          </div>
          <Users className="h-5 w-5 text-slate-400" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="input"
            placeholder="Nome"
            value={newUser.first_name}
            onChange={(event) => setNewUser({ ...newUser, first_name: event.target.value })}
          />
          <input
            className="input"
            placeholder="Apelido"
            value={newUser.last_name}
            onChange={(event) => setNewUser({ ...newUser, last_name: event.target.value })}
          />
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
          <select
            className="input"
            value={newUser.role}
            onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Plantas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {plants.map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    newUser.plant_ids.includes(plant.id)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-slate-600'
                  }`}
                  onClick={() =>
                    setNewUser({
                      ...newUser,
                      plant_ids: togglePlantSelection(newUser.plant_ids, plant.id),
                    })
                  }
                >
                  {plant.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="btn-primary inline-flex items-center gap-2"
          onClick={handleCreateUser}
          disabled={saving}
        >
          <Plus className="h-4 w-4" />
          Criar utilizador
        </button>

        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-500">Carregando utilizadores...</p>}
          {!loading && users.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum utilizador encontrado.</p>
          )}
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{user.username}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {user.role}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    className="text-xs text-slate-500 hover:text-slate-700"
                    onClick={() => handleStartUserEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {editingUserId === user.id && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    className="input"
                    value={userForm.first_name}
                    onChange={(event) =>
                      setUserForm({ ...userForm, first_name: event.target.value })
                    }
                    placeholder="Nome"
                  />
                  <input
                    className="input"
                    value={userForm.last_name}
                    onChange={(event) =>
                      setUserForm({ ...userForm, last_name: event.target.value })
                    }
                    placeholder="Apelido"
                  />
                  <select
                    className="input"
                    value={userForm.role}
                    onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={userForm.is_active}
                      onChange={(event) =>
                        setUserForm({ ...userForm, is_active: event.target.checked })
                      }
                    />
                    Utilizador ativo
                  </label>
                  <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Plantas</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {plants.map((plant) => (
                        <button
                          key={plant.id}
                          type="button"
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            userForm.plant_ids.includes(plant.id)
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-white text-slate-600'
                          }`}
                          onClick={() =>
                            setUserForm({
                              ...userForm,
                              plant_ids: togglePlantSelection(userForm.plant_ids, plant.id),
                            })
                          }
                        >
                          {plant.code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <button className="btn-primary" onClick={handleUpdateUser} disabled={saving}>
                      Guardar
                    </button>
                    <button className="btn-secondary" onClick={() => setEditingUserId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
