import React, { useState } from 'react';
import {
  Bell,
  Cog,
  FileText,
  AlertTriangle,
  Shield,
  ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react';

type SettingTab =
  | 'general'
  | 'alerts'
  | 'preventive'
  | 'warnings'
  | 'documents'
  | 'permissions';

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
    ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
              <p className="text-slate-600 mt-1">Gerencie alertas, manutenção e documentação</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2 bg-white rounded-lg shadow-sm p-4 sticky top-20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{tab.label}</div>
                  </div>
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Alerts & Notifications */}
              {activeTab === 'alerts' && (
                <AlertsSettings />
              )}

              {/* Preventive Maintenance */}
              {activeTab === 'preventive' && (
                <PreventiveMaintenanceSettings />
              )}

              {/* Predictive Warnings */}
              {activeTab === 'warnings' && (
                <PredictiveWarningsSettings />
              )}

              {/* Documents Library */}
              {activeTab === 'documents' && (
                <DocumentsLibrarySettings />
              )}

              {/* Permissions */}
              {activeTab === 'permissions' && (
                <PermissionsSettings />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== COMPONENT STUBS =====================

function AlertsSettings() {
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
      const response = await fetch('/api/alerts/configurations', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
      }
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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
      }
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!window.confirm('Eliminar este alerta?')) return;
    try {
      const response = await fetch(`/api/alerts/configurations/${alertId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAlerts();
      }
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

  const roles = ['admin', 'manager', 'technician', 'viewer'];

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
      const response = await fetch('/api/maintenance-plans', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingPlan ? 'PUT' : 'POST';
      const url = editingPlan
        ? `/api/maintenance-plans/${editingPlan.id}`
        : '/api/maintenance-plans';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
      }
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Eliminar este plano?')) return;
    try {
      const response = await fetch(`/api/maintenance-plans/${planId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchPlans();
      }
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
      const response = await fetch('/api/assets', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedAsset(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchWarnings = async (assetId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/alerts/warnings/${assetId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setWarnings(data);
      }
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
      const response = await fetch('/api/assets', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchDocuments = async (assetId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/alerts/documents?asset_id=${assetId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
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

      const response = await fetch('/api/alerts/documents', {
        method: 'POST',
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
      const response = await fetch(`/api/alerts/documents/${docId}`, {
        method: 'DELETE',
      });
      if (response.ok && selectedAsset) {
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

export default SettingsPage;
