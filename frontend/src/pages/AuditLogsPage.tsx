import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useProfileAccess } from '../hooks/useProfileAccess';
import { getAdminAuditLogs } from '../services/api';
import { RefreshCcw, Search } from 'lucide-react';

type AuditUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
} | null;

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  created_at?: string | null;
  user?: AuditUser;
};

const formatValue = (value: any) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.trim() || '—';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const isSameValue = (a: any, b: any) => {
  return formatValue(a) === formatValue(b);
};

const buildDiffLines = (log: AuditLog) => {
  const next = (log.new_values || {}) as Record<string, any>;
  const prev = (log.old_values || {}) as Record<string, any>;
  const lines: string[] = [];

  for (const key of Object.keys(next)) {
    if (isSameValue(next[key], prev[key])) continue;
    lines.push(`${key}: ${formatValue(prev[key])} -> ${formatValue(next[key])}`);
  }

  return lines;
};

const formatUser = (user: AuditUser) => {
  if (!user) return 'Sistema';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.id;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

export function AuditLogsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const access = useProfileAccess();
  const canRead = access.isSuperAdmin || access.permissions.has('admin:rbac');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [limit, setLimit] = useState(100);

  const loadLogs = async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAuditLogs({
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
        action: action || undefined,
        user_id: userId || undefined,
        limit,
      });
      const rows = Array.isArray(data) ? (data as AuditLog[]) : (data as any)?.data || [];
      setLogs(rows);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [canRead]);

  const emptyState = useMemo(() => !loading && logs.length === 0, [loading, logs.length]);

  const content = (
    <div className="space-y-6 font-display">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">Seguranca</p>
        <h2 className="mt-2 text-2xl font-semibold theme-text">Auditoria com diff</h2>
        <p className="mt-1 text-sm theme-text-muted">
          Historico de alteracoes com antes/depois por entidade.
        </p>
      </div>

      {!canRead && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">
          Sem permissao para ver auditoria.
        </div>
      )}

      {canRead && (
        <div className="rounded-[24px] border theme-border theme-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="input"
              placeholder="Tipo (ex: asset, work_order)"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
            <input
              className="input"
              placeholder="ID da entidade"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
            <input
              className="input"
              placeholder="Acao (ex: update)"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <input
              className="input"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <input
              className="input"
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 100)}
            />
            <button className="btn-secondary" onClick={loadLogs} disabled={loading}>
              <Search className="h-4 w-4" />
              Filtrar
            </button>
            <button className="btn-secondary" onClick={loadLogs} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {emptyState && (
            <p className="text-sm theme-text-muted">Sem registos de auditoria.</p>
          )}

          <div className="space-y-3">
            {logs.map((log) => {
              const diffLines = buildDiffLines(log);
              return (
                <div key={log.id} className="rounded-2xl border theme-border theme-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold theme-text">
                        {log.entity_type} / {log.entity_id}
                      </p>
                      <p className="text-xs theme-text-muted">
                        {log.action} - {formatUser(log.user || null)} - {formatDateTime(log.created_at)}
                      </p>
                    </div>
                    <div className="text-xs theme-text-muted">IP: {log.ip_address || '-'}</div>
                  </div>
                  {diffLines.length > 0 ? (
                    <div className="mt-3 space-y-1 text-xs theme-text-muted">
                      {diffLines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs theme-text-muted">Sem alteracoes detetadas.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return <MainLayout>{content}</MainLayout>;
}
