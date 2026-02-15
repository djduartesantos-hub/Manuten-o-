import { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import { useProfileAccess } from '../hooks/useProfileAccess';
import { createWorkOrderWorkflow, getWorkOrderWorkflow, updateWorkOrderWorkflow } from '../services/api';
import { RefreshCcw, Save } from 'lucide-react';

export function WorkOrderWorkflowPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { selectedPlant } = useAppStore();
  const access = useProfileAccess();
  const canRead = access.isSuperAdmin || access.permissions.has('workflows:read');
  const canWrite = access.isSuperAdmin || access.permissions.has('workflows:write');

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState('Workflow OT');
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadWorkflow = async () => {
    if (!selectedPlant || !canRead) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await getWorkOrderWorkflow(selectedPlant);
      const workflow = (data as any)?.workflow || null;
      const config = (data as any)?.config || null;
      setWorkflowId(workflow?.id || null);
      setName(workflow?.name || 'Workflow OT');
      setConfigText(JSON.stringify(config || {}, null, 2));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar workflow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflow();
  }, [selectedPlant, canRead]);

  const handleSave = async () => {
    if (!selectedPlant || !canWrite) return;
    setError(null);
    setSuccess(null);

    let parsed: any = null;
    try {
      parsed = JSON.parse(configText || '{}');
    } catch {
      setError('JSON invalido');
      return;
    }

    setLoading(true);
    try {
      if (workflowId) {
        await updateWorkOrderWorkflow(selectedPlant, workflowId, {
          name,
          is_default: true,
          config: parsed,
        });
      } else {
        const created = await createWorkOrderWorkflow(selectedPlant, {
          name,
          is_default: true,
          config: parsed,
        });
        setWorkflowId((created as any)?.id || null);
      }
      setSuccess('Workflow atualizado com sucesso');
      await loadWorkflow();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar workflow');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="space-y-6 font-display">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">Ordens</p>
        <h2 className="mt-2 text-2xl font-semibold theme-text">Workflow de ordens</h2>
        <p className="mt-1 text-sm theme-text-muted">
          Configure transicoes e aprovacoes por role no formato JSON.
        </p>
      </div>

      {(error || success) && (
        <div
          className={`rounded-2xl border p-4 text-sm shadow-sm ${
            error
              ? 'border-rose-500/20 bg-rose-500/10 text-rose-700'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="rounded-[24px] border theme-border theme-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold theme-text">Workflow ativo</p>
            <p className="text-xs theme-text-muted">Configuracao por planta</p>
          </div>
          <button className="btn-secondary" onClick={loadWorkflow} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
          <input
            className="input"
            placeholder="Nome do workflow"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canWrite || loading}
          />
          <textarea
            className="input min-h-[260px] font-mono text-xs"
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            disabled={!canWrite || loading}
          />
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={!canWrite || loading}>
          <Save className="h-4 w-4" />
          Guardar workflow
        </button>
      </div>
    </div>
  );

  if (embedded) return content;

  return <MainLayout>{content}</MainLayout>;
}
