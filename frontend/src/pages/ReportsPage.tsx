import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle, Download, Filter, Loader2 } from 'lucide-react';
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
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface WorkOrder {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  created_at?: string;
  sla_deadline?: string | null;
  asset?: {
    code: string;
    name: string;
  } | null;
}

export function ReportsPage() {
  const { selectedPlant } = useAppStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
  }, [workOrders, statusFilter, priorityFilter, dateFrom, dateTo, searchTerm]);

  const summary = useMemo(() => {
    const total = filteredOrders.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let overdue = 0;

    filteredOrders.forEach((order) => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      const priority = order.priority || 'n/a';
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      if (order.sla_deadline) {
        const sla = new Date(order.sla_deadline).getTime();
        if (sla < Date.now()) overdue += 1;
      }
    });

    return { total, byStatus, byPriority, overdue };
  }, [filteredOrders]);

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

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Ordens de Serviço', 14, 20);

    doc.setFontSize(11);
    doc.text(`Total: ${summary.total} | Em atraso: ${summary.overdue}`, 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [['Título', 'Status', 'Prioridade', 'Ativo', 'Criada em']],
      body: filteredOrders.slice(0, 50).map((order) => [
        order.title,
        order.status,
        order.priority || '',
        order.asset ? `${order.asset.code} - ${order.asset.name}` : '-',
        order.created_at ? new Date(order.created_at).toLocaleString() : '-',
      ]),
    });

    doc.save('relatorio-ordens.pdf');
  };

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-2">Filtros avançados e gráficos de ordens</p>
        </div>
        <button
          className="btn-primary inline-flex items-center gap-2"
          onClick={exportPdf}
          disabled={loading}
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
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
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card-gradient p-5">
              <p className="text-sm text-gray-600">Total filtrado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
            </div>
            <div className="card-gradient p-5">
              <p className="text-sm text-gray-600">Em atraso (SLA)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{summary.overdue}</p>
            </div>
            <div className="card-gradient p-5">
              <p className="text-sm text-gray-600">Status distintos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Object.keys(summary.byStatus).length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              <Doughnut data={statusChartData} />
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Prioridades</h3>
              <Bar data={priorityChartData} />
            </div>
          </div>

          <div className="card mt-6">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Ordens filtradas</h2>
              <p className="text-sm text-gray-500">{filteredOrders.length} registros</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ordem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ativo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Prioridade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Criada em
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                        Nenhuma ordem encontrada
                      </td>
                    </tr>
                  )}
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.title}</div>
                        <div className="text-xs text-gray-500">
                          {order.description || 'Sem descrição'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.asset ? `${order.asset.code} - ${order.asset.name}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                        {order.status}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                        {order.priority || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
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
