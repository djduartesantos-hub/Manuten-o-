import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, Download, Filter, Loader2, TrendingUp } from 'lucide-react';
import { useAppStore } from '../context/store';
import { getWorkOrders } from '../services/api';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement);

interface WorkOrder {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  sla_deadline?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  asset?: {
    code: string;
    name: string;
  } | null;
  assigned_to_id?: string | null;
}

export function ReportsPage() {
  const { selectedPlant } = useAppStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'general' | 'asset' | 'technician' | 'temporal'>('general');

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!selectedPlant) return;
      setLoading(true);
      setError(null);
      try {
        const orders = await getWorkOrders(selectedPlant);
        setWorkOrders(orders || []);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedPlant]);

  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (priorityFilter && order.priority !== priorityFilter) return false;
      if (assetFilter && order.asset?.code !== assetFilter) return false;

      if (searchTerm) {
        const haystack = `${order.title} ${order.description || ''} ${order.asset?.code || ''} ${
          order.asset?.name || ''
        }`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) return false;
      }

      if (dateFrom) {
        const created = order.created_at ? new Date(order.created_at).getTime() : 0;
        if (created < new Date(dateFrom).getTime()) return false;
      }

      if (dateTo) {
        const created = order.created_at ? new Date(order.created_at).getTime() : 0;
        if (created > new Date(dateTo).getTime() + 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [workOrders, statusFilter, priorityFilter, dateFrom, dateTo, searchTerm, assetFilter]);

  // Calculate MTTR (Mean Time To Repair) and MTBF (Mean Time Between Failures)
  const calculateMetrics = useMemo(() => {
    const completed = filteredOrders.filter((o) => o.status === 'concluida');
    
    let totalRepairTime = 0;
    let repairCount = 0;

    completed.forEach((order) => {
      if (order.actual_hours) {
        totalRepairTime += order.actual_hours;
        repairCount += 1;
      }
    });

    const mttr = repairCount > 0 ? (totalRepairTime / repairCount).toFixed(2) : '0';
    
    // MTBF: Average time between failures (days between completed orders)
    let mtbf = 0;
    if (completed.length > 1) {
      const sortedByDate = [...completed].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      let totalDaysBetween = 0;
      for (let i = 1; i < sortedByDate.length; i++) {
        const prev = new Date(sortedByDate[i - 1].created_at || 0).getTime();
        const curr = new Date(sortedByDate[i].created_at || 0).getTime();
        totalDaysBetween += (curr - prev) / (1000 * 60 * 60 * 24);
      }
      mtbf = (totalDaysBetween / (sortedByDate.length - 1)).toFixed(2);
    }

    const completionRate =
      workOrders.length > 0 ? ((completed.length / workOrders.length) * 100).toFixed(1) : '0';
    const slaCompliance =
      completed.length > 0
        ? (
            ((completed.filter((o) => {
              if (!o.sla_deadline) return true;
              return new Date(o.completed_at || 0).getTime() <= new Date(o.sla_deadline).getTime();
            }).length /
              completed.length) *
              100).toFixed(1)
          )
        : '0';

    return { mttr, mtbf, completionRate, slaCompliance };
  }, [filteredOrders, workOrders]);

  const summary = useMemo(() => {
    const total = filteredOrders.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byAsset: Record<string, number> = {};
    const byTechnician: Record<string, number> = {};
    let overdue = 0;

    filteredOrders.forEach((order) => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      const priority = order.priority || 'n/a';
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      if (order.asset?.code) {
        byAsset[order.asset.code] = (byAsset[order.asset.code] || 0) + 1;
      }

      const tech = order.assigned_to_id || 'Sem atribuição';
      byTechnician[tech] = (byTechnician[tech] || 0) + 1;

      if (order.sla_deadline) {
        const sla = new Date(order.sla_deadline).getTime();
        if (sla < Date.now() && order.status !== 'concluida') overdue += 1;
      }
    });

    return { total, byStatus, byPriority, byAsset, byTechnician, overdue };
  }, [filteredOrders]);

  const uniqueAssets = useMemo(() => {
    const assets = new Set<string>();
    workOrders.forEach((order) => {
      if (order.asset?.code) assets.add(order.asset.code);
    });
    return Array.from(assets);
  }, [workOrders]);

  const statusChartData = useMemo(() => {
    const labels = Object.keys(summary.byStatus);
    return {
      labels,
      datasets: [
        {
          label: 'Ordens por status',
          data: labels.map((label) => summary.byStatus[label]),
          backgroundColor: ['#0ea5e9', '#6366f1', '#f59e0b', '#22c55e', '#ef4444'],
        },
      ],
    };
  }, [summary]);

  const priorityChartData = useMemo(() => {
    const labels = Object.keys(summary.byPriority);
    return {
      labels,
      datasets: [
        {
          label: 'Ordens por prioridade',
          data: labels.map((label) => summary.byPriority[label]),
          backgroundColor: ['#22c55e', '#0ea5e9', '#f59e0b', '#ef4444'],
        },
      ],
    };
  }, [summary]);

  const assetChartData = useMemo(() => {
    const labels = Object.keys(summary.byAsset).slice(0, 10);
    return {
      labels,
      datasets: [
        {
          label: 'Ordens por ativo',
          data: labels.map((label) => summary.byAsset[label]),
          backgroundColor: '#0ea5e9',
          borderColor: '#0284c7',
          borderWidth: 1,
        },
      ],
    };
  }, [summary]);

  const technicianChartData = useMemo(() => {
    const labels = Object.keys(summary.byTechnician);
    return {
      labels,
      datasets: [
        {
          label: 'Ordens por técnico',
          data: labels.map((label) => summary.byTechnician[label]),
          backgroundColor: '#6366f1',
          borderColor: '#4f46e5',
          borderWidth: 1,
        },
      ],
    };
  }, [summary]);

  // Temporal analysis: orders over time (by week)
  const temporalChartData = useMemo(() => {
    const ordersByWeek: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      if (order.created_at) {
        const date = new Date(order.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        ordersByWeek[weekKey] = (ordersByWeek[weekKey] || 0) + 1;
      }
    });

    const sortedWeeks = Object.keys(ordersByWeek).sort();
    return {
      labels: sortedWeeks.map((w) => new Date(w).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Ordens por semana',
          data: sortedWeeks.map((w) => ordersByWeek[w]),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [filteredOrders]);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Ordens de Serviço', 14, 20);

    doc.setFontSize(10);
    doc.text(`Tipo: ${reportType} | Total: ${summary.total} | Em atraso: ${summary.overdue}`, 14, 28);
    doc.text(`MTTR: ${calculateMetrics.mttr}h | MTBF: ${calculateMetrics.mtbf}d | Conformidade SLA: ${calculateMetrics.slaCompliance}%`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [['Ordem', 'Status', 'Prioridade', 'Ativo', 'Horas', 'Criada em']],
      body: filteredOrders.slice(0, 50).map((order) => [
        order.title.substring(0, 20),
        order.status,
        order.priority || '',
        order.asset ? order.asset.code : '-',
        order.actual_hours || order.estimated_hours || '-',
        order.created_at ? new Date(order.created_at).toLocaleDateString() : '-',
      ]),
    });

    doc.save('relatorio-ordens.pdf');
  };

  const exportCsv = () => {
    const headers = ['ID', 'Título', 'Status', 'Prioridade', 'Ativo', 'Horas Estimadas', 'Horas Reais', 'Criada em', 'Atualizada em'];
    const rows = filteredOrders.map((order) => [
      order.id,
      order.title,
      order.status,
      order.priority || '',
      order.asset ? `${order.asset.code} - ${order.asset.name}` : '',
      order.estimated_hours || '',
      order.actual_hours || '',
      order.created_at ? new Date(order.created_at).toLocaleString() : '',
      order.updated_at ? new Date(order.updated_at).toLocaleString() : '',
    ]);

    const csvContent = [headers, ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-ordens-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios Avançados</h1>
          <p className="text-gray-600 mt-2">Análises, métricas e exportações de ordens</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary inline-flex items-center gap-2"
            onClick={exportCsv}
            disabled={loading}
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            className="btn-primary inline-flex items-center gap-2"
            onClick={exportPdf}
            disabled={loading}
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && (
        <div className="card p-12 text-center">
          <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Report Type Selector */}
          <div className="card mb-6 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Tipo de Relatório</h2>
            <div className="flex flex-wrap gap-2">
              {['general', 'asset', 'technician', 'temporal'].map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type as any)}
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    reportType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'general' && 'Geral'}
                  {type === 'asset' && 'Por Ativo'}
                  {type === 'technician' && 'Por Técnico'}
                  {type === 'temporal' && 'Temporal'}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-6 p-4">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-gray-700">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                className="input"
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                className="input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Status (todos)</option>
                <option value="aberta">Aberta</option>
                <option value="atribuida">Atribuída</option>
                <option value="em_curso">Em curso</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
              <select
                className="input"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="">Prioridade (todas)</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
              <select
                className="input"
                value={assetFilter}
                onChange={(event) => setAssetFilter(event.target.value)}
              >
                <option value="">Ativo (todos)</option>
                {uniqueAssets.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div className="mt-3">
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="card-gradient p-5">
              <p className="text-xs text-gray-600 uppercase">Total Filtrado</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{summary.total}</p>
            </div>
            <div className="card-gradient p-5">
              <p className="text-xs text-gray-600 uppercase">Em Atraso (SLA)</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{summary.overdue}</p>
            </div>
            <div className="card-gradient p-5">
              <p className="text-xs text-gray-600 uppercase">MTTR (horas)</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{calculateMetrics.mttr}</p>
            </div>
            <div className="card-gradient p-5">
              <p className="text-xs text-gray-600 uppercase">Conformidade SLA</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{calculateMetrics.slaCompliance}%</p>
            </div>
            <div className="card-gradient p-5">
              <p className="text-xs text-gray-600 uppercase">Taxa Conclusão</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{calculateMetrics.completionRate}%</p>
            </div>
          </div>

          {/* Charts based on report type */}
          {reportType === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
                <Doughnut data={statusChartData} />
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prioridades</h3>
                <Bar data={priorityChartData} />
              </div>
            </div>
          )}

          {reportType === 'asset' && (
            <div className="card mb-6 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ordens por Ativo
              </h3>
              <Bar data={assetChartData} />
            </div>
          )}

          {reportType === 'technician' && (
            <div className="card mb-6 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ordens por Técnico
              </h3>
              <Bar data={technicianChartData} />
            </div>
          )}

          {reportType === 'temporal' && (
            <div className="card mb-6 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tendência Temporal (Semanal)
              </h3>
              <Line data={temporalChartData} />
            </div>
          )}

          {/* Data Table */}
          <div className="card">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Ordens Filtradas</h2>
              <p className="text-sm text-gray-500">{filteredOrders.length} registros</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ativo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criada em</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                        Nenhuma ordem encontrada
                      </td>
                    </tr>
                  )}
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.title}</div>
                        <div className="text-xs text-gray-500">{order.description || 'Sem descrição'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.asset ? `${order.asset.code}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`chip text-xs font-medium px-2 py-1 rounded-full ${
                            order.status === 'concluida'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'cancelada'
                              ? 'bg-red-100 text-red-700'
                              : order.status === 'em_curso'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`chip text-xs font-medium px-2 py-1 rounded-full ${
                            order.priority === 'critica'
                              ? 'bg-red-100 text-red-700'
                              : order.priority === 'alta'
                              ? 'bg-orange-100 text-orange-700'
                              : order.priority === 'media'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {order.priority || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.actual_hours ? `${order.actual_hours}h` : order.estimated_hours ? `${order.estimated_hours}h (est.)` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-PT') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
