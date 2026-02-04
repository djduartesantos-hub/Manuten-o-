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
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Alertas & Notificações</h2>
        <p className="text-slate-600">Configure limites de alertas e opções de notificação</p>
      </div>
      <div className="text-slate-500 py-12 text-center">
        AlertsSettings component - Em desenvolvimento
      </div>
    </div>
  );
}

function PreventiveMaintenanceSettings() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Planos de Manutenção Preventiva</h2>
        <p className="text-slate-600">Crie e gerencie planos de manutenção por equipamento</p>
      </div>
      <div className="text-slate-500 py-12 text-center">
        PreventiveMaintenanceSettings component - Em desenvolvimento
      </div>
    </div>
  );
}

function PredictiveWarningsSettings() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Alertas Preditivos</h2>
        <p className="text-slate-600">Análise automática de histórico para avisos de risco</p>
      </div>
      <div className="text-slate-500 py-12 text-center">
        PredictiveWarningsSettings component - Em desenvolvimento
      </div>
    </div>
  );
}

function DocumentsLibrarySettings() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Biblioteca de Documentos</h2>
        <p className="text-slate-600">Gerencie manuais, esquemas e certificados</p>
      </div>
      <div className="text-slate-500 py-12 text-center">
        DocumentsLibrarySettings component - Em desenvolvimento
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
