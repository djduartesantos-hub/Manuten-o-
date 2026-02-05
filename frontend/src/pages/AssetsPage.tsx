import { MainLayout } from '../layouts/MainLayout';
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../context/store';
import { getAssets } from '../services/api';

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  location?: string | null;
  category?: {
    name: string;
  } | null;
}

export function AssetsPage() {
  const { selectedPlant } = useAppStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      if (!selectedPlant || !selectedPlant.trim()) {
        setAssets([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getAssets(selectedPlant);
        setAssets(data || []);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar equipamentos');
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [selectedPlant]);

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      if (!selectedPlant) return;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await getAssets(selectedPlant);
          setAssets(data || []);
        } catch (err: any) {
          setError(err.message || 'Erro ao carregar equipamentos');
        } finally {
          setLoading(false);
        }
      })();
    };

    window.addEventListener('realtime:assets', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('realtime:assets', handleRealtimeUpdate);
    };
  }, [selectedPlant]);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Equipamentos</h1>
        <p className="text-gray-600 mt-2">Gerencie seus ativos e equipamentos</p>
      </div>

      {!selectedPlant && (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Selecione uma fábrica</h2>
          <p className="text-gray-600">Escolha uma fábrica no topo para ver os ativos</p>
        </div>
      )}

      {selectedPlant && loading && (
        <div className="card p-12 text-center">
          <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Carregando equipamentos...</p>
        </div>
      )}

      {selectedPlant && !loading && error && (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      )}

      {selectedPlant && !loading && !error && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Localização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      Nenhum equipamento encontrado
                    </td>
                  </tr>
                )}
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {asset.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {asset.status || 'n/a'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
