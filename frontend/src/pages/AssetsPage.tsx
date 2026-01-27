import { MainLayout } from '../layouts/MainLayout';
import { AlertCircle } from 'lucide-react';

export function AssetsPage() {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Equipamentos</h1>
        <p className="text-gray-600 mt-2">Gerencie seus ativos e equipamentos</p>
      </div>

      <div className="card p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Em Desenvolvimento</h2>
        <p className="text-gray-600">Esta página está sendo desenvolvida</p>
      </div>
    </MainLayout>
  );
}
