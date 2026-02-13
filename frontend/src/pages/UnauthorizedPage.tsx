import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { getHomeRouteForRole } from '../utils/homeRoute';

export function UnauthorizedPage() {
  const { user } = useAuth();
  const location = useLocation();

  const fallback = getHomeRouteForRole(user?.role);
  const fromPath = String((location.state as any)?.from?.pathname || '').trim();

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border theme-border theme-card p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">Acesso</div>
          <h1 className="mt-2 text-2xl font-bold theme-text">Sem permissões para abrir esta página</h1>
          <p className="mt-2 text-sm theme-text-muted">
            O seu utilizador não tem acesso a este conteúdo.
            {fromPath ? ` (Tentou abrir: ${fromPath})` : ''}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={fallback} className="btn-primary h-9 px-4 inline-flex items-center">
              Ir para a página inicial
            </Link>
            <Link to="/profile" className="btn-secondary h-9 px-4 inline-flex items-center">
              Ver perfil
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
