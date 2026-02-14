import React from 'react';
import toast from 'react-hot-toast';
import { MainLayout } from '../layouts/MainLayout';
import {
  addCompanyTicketComment,
  addPlantTicketComment,
  createPlantTicket,
  forwardCompanyTicketToSuperadmin,
  forwardPlantTicketToCompany,
  getCompanyTicket,
  getPlantTicket,
  listCompanyTicketAttachments,
  listCompanyTickets,
  listPlantTicketAttachments,
  listPlantTickets,
  updateCompanyTicket,
  updateCompanyTicketStatus,
  updatePlantTicketStatus,
  uploadCompanyTicketAttachment,
  uploadPlantTicketAttachment,
  type Ticket,
  type TicketAttachment,
  type TicketDetail,
  type TicketEvent,
  type TicketLevel,
  type TicketPriority,
  type TicketStatus,
} from '../services/api';
import { LifeBuoy, Plus, RefreshCw } from 'lucide-react';
import { useAppStore } from '../context/store';
import { useProfileAccess } from '../hooks/useProfileAccess';

const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: 'Aberto',
  em_progresso: 'Em progresso',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const LEVEL_LABEL: Record<TicketLevel, string> = {
  fabrica: 'Fábrica',
  empresa: 'Empresa',
  superadmin: 'SuperAdmin',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

const EVENT_LABEL: Record<string, string> = {
  ticket_created: 'Ticket criado',
  ticket_commented: 'Comentário',
  ticket_status_changed: 'Estado alterado',
  ticket_forwarded_to_company: 'Reencaminhado para Empresa',
  ticket_forwarded_to_superadmin: 'Reencaminhado para SuperAdmin',
  ticket_updated: 'Atualizado',
};

function formatWhen(value: any): string {
  try {
    const date = value instanceof Date ? value : new Date(String(value));
    return date.toLocaleString();
  } catch {
    return String(value || '');
  }
}

export function TicketsPage() {
  const { selectedPlant } = useAppStore();
  const { roleKey } = useProfileAccess();

  const [loading, setLoading] = React.useState(false);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TicketStatus | ''>('');

  const pageLimit = 30;

  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDescription, setNewDescription] = React.useState('');
  const [newIsGeneral, setNewIsGeneral] = React.useState(false);
  const [newPriority, setNewPriority] = React.useState<TicketPriority>('media');
  const [newTagsText, setNewTagsText] = React.useState('');

  const [selectedId, setSelectedId] = React.useState<string>('');
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<TicketDetail | null>(null);

  const [attachmentsLoading, setAttachmentsLoading] = React.useState(false);
  const [attachments, setAttachments] = React.useState<TicketAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = React.useState(false);
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);

  const [companyPriority, setCompanyPriority] = React.useState<TicketPriority>('media');
  const [companyTagsText, setCompanyTagsText] = React.useState('');
  const [savingCompanyPatch, setSavingCompanyPatch] = React.useState(false);

  const [commentBody, setCommentBody] = React.useState('');
  const [commenting, setCommenting] = React.useState(false);

  const [viewMode, setViewMode] = React.useState<'fabrica' | 'empresa'>(() =>
    String(roleKey || '') === 'admin_empresa' ? 'empresa' : 'fabrica',
  );

  React.useEffect(() => {
    if (String(roleKey || '') === 'admin_empresa') return;
    setViewMode('fabrica');
  }, [roleKey]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows =
        viewMode === 'empresa'
          ? await listCompanyTickets({
              limit: pageLimit,
              offset: 0,
              q: q.trim() || undefined,
              status: statusFilter || undefined,
            })
          : selectedPlant
            ? await listPlantTickets(selectedPlant, {
                limit: pageLimit,
                offset: 0,
                q: q.trim() || undefined,
                status: statusFilter || undefined,
              })
            : [];

      const normalized = Array.isArray(rows) ? rows : [];
      setTickets(normalized);
      setHasMore(normalized.length === pageLimit);
      if (selectedId) {
        const stillExists = (rows || []).some((t) => String(t.id) === String(selectedId));
        if (!stillExists) {
          setSelectedId('');
          setDetail(null);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar tickets');
      setTickets([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [pageLimit, q, selectedId, selectedPlant, statusFilter, viewMode]);

  const loadMore = React.useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = tickets.length;
      const rows =
        viewMode === 'empresa'
          ? await listCompanyTickets({
              limit: pageLimit,
              offset,
              q: q.trim() || undefined,
              status: statusFilter || undefined,
            })
          : selectedPlant
            ? await listPlantTickets(selectedPlant, {
                limit: pageLimit,
                offset,
                q: q.trim() || undefined,
                status: statusFilter || undefined,
              })
            : [];

      const normalized = Array.isArray(rows) ? rows : [];
      setTickets((prev) => prev.concat(normalized));
      setHasMore(normalized.length === pageLimit);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar mais tickets');
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, pageLimit, q, selectedPlant, statusFilter, tickets.length, viewMode]);

  const loadDetail = React.useCallback(async (ticketId: string) => {
    setDetailLoading(true);
    try {
      const data =
        viewMode === 'empresa'
          ? await getCompanyTicket(ticketId)
          : selectedPlant
            ? await getPlantTicket(selectedPlant, ticketId)
            : null;
      setDetail(data || null);

      const t = (data as any)?.ticket as Ticket | undefined;
      const p = String((t as any)?.priority || '').trim() as TicketPriority;
      if (viewMode === 'empresa') {
        setCompanyPriority((['baixa', 'media', 'alta', 'critica'] as string[]).includes(p) ? (p as TicketPriority) : 'media');
        setCompanyTagsText(Array.isArray((t as any)?.tags) ? (t as any).tags.join(', ') : '');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar ticket');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedPlant, viewMode]);

  const loadAttachments = React.useCallback(async () => {
    if (!selectedId) return;
    if (viewMode !== 'empresa' && !selectedPlant) return;

    setAttachmentsLoading(true);
    try {
      const rows =
        viewMode === 'empresa'
          ? await listCompanyTicketAttachments(selectedId)
          : await listPlantTicketAttachments(String(selectedPlant), selectedId);
      setAttachments(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar anexos');
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [selectedId, selectedPlant, viewMode]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
    void loadAttachments();
  }, [loadAttachments, loadDetail, selectedId]);

  React.useEffect(() => {
    if (!selectedId) return;
    void loadAttachments();
  }, [loadAttachments, selectedId, viewMode]);

  const parseTags = (text: string): string[] => {
    return String(text || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlant) {
      toast.error('Selecione uma fábrica primeiro');
      return;
    }

    const title = newTitle.trim();
    const description = newDescription.trim();

    if (!title || title.length < 3) {
      toast.error('Título mínimo 3 caracteres');
      return;
    }
    if (!description) {
      toast.error('Descrição obrigatória');
      return;
    }

    setCreating(true);
    try {
      const created = await createPlantTicket(selectedPlant, {
        title,
        description,
        is_general: newIsGeneral,
        priority: newPriority,
        tags: parseTags(newTagsText),
      });
      toast.success('Ticket criado');
      setNewTitle('');
      setNewDescription('');
      setNewIsGeneral(false);
      setNewPriority('media');
      setNewTagsText('');
      setCreateFormOpen(false);
      await load();
      if (created?.id) setSelectedId(String(created.id));
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao criar ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleUploadAttachment = async () => {
    if (!selectedId) return;
    if (!attachmentFile) {
      toast.error('Selecione um ficheiro');
      return;
    }
    if (viewMode !== 'empresa' && !selectedPlant) {
      toast.error('Selecione uma fábrica primeiro');
      return;
    }

    setUploadingAttachment(true);
    try {
      if (viewMode === 'empresa') {
        await uploadCompanyTicketAttachment(selectedId, attachmentFile);
      } else {
        await uploadPlantTicketAttachment(String(selectedPlant), selectedId, attachmentFile);
      }
      setAttachmentFile(null);
      toast.success('Anexo enviado');
      await loadAttachments();
      await loadDetail(selectedId);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao enviar anexo');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSaveCompanyPatch = async () => {
    if (!selectedId) return;
    setSavingCompanyPatch(true);
    try {
      await updateCompanyTicket(selectedId, {
        priority: companyPriority,
        tags: parseTags(companyTagsText),
      });
      toast.success('Ticket atualizado');
      await load();
      await loadDetail(selectedId);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao atualizar ticket');
    } finally {
      setSavingCompanyPatch(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    if (viewMode !== 'empresa' && !selectedPlant) {
      toast.error('Selecione uma fábrica primeiro');
      return;
    }

    const body = commentBody.trim();
    if (!body) {
      toast.error('Mensagem obrigatória');
      return;
    }

    setCommenting(true);
    try {
      if (viewMode === 'empresa') {
        await addCompanyTicketComment(selectedId, { body });
      } else {
        await addPlantTicketComment(String(selectedPlant), selectedId, { body });
      }
      setCommentBody('');
      await load();
      await loadDetail(selectedId);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao enviar comentário');
    } finally {
      setCommenting(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedId) return;

    if (viewMode !== 'empresa' && !selectedPlant) {
      toast.error('Selecione uma fábrica primeiro');
      return;
    }

    try {
      if (viewMode === 'empresa') {
        await updateCompanyTicketStatus(selectedId, status);
      } else {
        await updatePlantTicketStatus(String(selectedPlant), selectedId, status);
      }
      await load();
      await loadDetail(selectedId);
      toast.success('Estado atualizado');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao atualizar estado');
    }
  };

  const canForwardFromPlant = String(roleKey || '') === 'gestor_manutencao';
  const canForwardFromCompany = String(roleKey || '') === 'admin_empresa';

  const handleForward = async () => {
    if (!selectedId) return;

    try {
      if (viewMode === 'empresa') {
        await forwardCompanyTicketToSuperadmin(selectedId);
        toast.success('Reencaminhado para SuperAdmin');
      } else {
        if (!selectedPlant) {
          toast.error('Selecione uma fábrica primeiro');
          return;
        }
        await forwardPlantTicketToCompany(selectedPlant, selectedId);
        toast.success('Reencaminhado para Empresa');
      }

      await load();
      await loadDetail(selectedId);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao reencaminhar');
    }
  };

  const selectedTicket = detail?.ticket || null;
  const selectedLevel = String((selectedTicket as any)?.level || '') as TicketLevel;
  const isGeneral = Boolean((selectedTicket as any)?.is_general);

  const timelineItems = React.useMemo(() => {
    const events = ((detail as any)?.events || []) as TicketEvent[];
    return (events || [])
      .slice()
      .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime());
  }, [detail]);

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border glass-panel p-6 shadow-sm">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">Suporte</p>
              <h1 className="mt-2 text-3xl font-semibold theme-text">Tickets</h1>
              <p className="mt-1 text-sm theme-text-muted">Abra e acompanhe pedidos de suporte.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {String(roleKey || '') === 'admin_empresa' ? (
                <select
                  className="h-9 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                  value={viewMode}
                  onChange={(e) => {
                    setSelectedId('');
                    setDetail(null);
                    setViewMode(e.target.value as any);
                  }}
                  disabled={loading}
                  title="Caixa"
                >
                  <option value="empresa">Caixa: Empresa</option>
                  <option value="fabrica">Caixa: Fábrica</option>
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                className="btn-secondary h-9 px-3 inline-flex items-center"
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border theme-border glass-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 theme-text-muted" />
                <p className="text-sm font-semibold theme-text">Lista</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateFormOpen((v) => !v)}
                className="btn-secondary h-9 px-3 inline-flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="h-9 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void load();
                }}
                placeholder="Pesquisar…"
                disabled={loading}
              />
              <select
                className="h-9 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  void load();
                }}
                disabled={loading}
                title="Estado"
              >
                <option value="">Todos os estados</option>
                <option value="aberto">Aberto</option>
                <option value="em_progresso">Em progresso</option>
                <option value="resolvido">Resolvido</option>
                <option value="fechado">Fechado</option>
              </select>
            </div>

            {tickets.length === 0 ? (
              <div className="mt-4 text-sm theme-text-muted">
                {loading ? 'A carregar…' : 'Sem tickets.'}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {tickets.map((t) => {
                  const active = String(selectedId) === String(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(String(t.id))}
                      className={
                        'w-full text-left rounded-2xl border theme-border theme-card p-3 transition ' +
                        (active ? 'ring-2 ring-[color:var(--dash-accent)]' : 'hover:bg-[color:var(--dash-surface)]')
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold theme-text truncate">{t.title}</p>
                        <span className="text-xs theme-text-muted whitespace-nowrap">{STATUS_LABEL[t.status]}</span>
                      </div>
                      <p className="mt-1 text-xs theme-text-muted">Última atividade: {formatWhen(t.last_activity_at)}</p>
                    </button>
                  );
                })}

                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    className="btn-secondary h-9 px-3 w-full"
                    disabled={loadingMore || loading}
                  >
                    {loadingMore ? 'A carregar…' : 'Carregar mais'}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {createFormOpen ? (
            <form onSubmit={handleCreate} className="rounded-2xl border theme-border glass-panel p-4">
              <p className="text-sm font-semibold theme-text">Criar ticket</p>
              <div className="mt-3 grid gap-3">
                <div>
                  <label className="text-xs font-semibold theme-text-muted">Título</label>
                  <input
                    className="mt-1 w-full h-10 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Erro ao abrir ordem"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold theme-text-muted">Descrição</label>
                  <textarea
                    className="mt-1 w-full min-h-[120px] rounded-xl border theme-border theme-card px-3 py-2 text-sm theme-text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Descreva o problema com detalhe…"
                    disabled={creating}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="ticketGeneral"
                    type="checkbox"
                    checked={newIsGeneral}
                    onChange={(e) => setNewIsGeneral(Boolean(e.target.checked))}
                    disabled={creating}
                  />
                  <label htmlFor="ticketGeneral" className="text-sm theme-text-muted">
                    Problema geral (envia direto ao SuperAdmin)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold theme-text-muted">Prioridade</label>
                    <select
                      className="mt-1 w-full h-10 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                      disabled={creating}
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold theme-text-muted">Tags (separadas por vírgula)</label>
                    <input
                      className="mt-1 w-full h-10 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                      value={newTagsText}
                      onChange={(e) => setNewTagsText(e.target.value)}
                      placeholder="ex: login, app, urgente"
                      disabled={creating}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary h-10" disabled={creating}>
                  {creating ? 'A criar…' : 'Criar'}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border theme-border glass-panel p-5">
            {!selectedId ? (
              <div className="text-sm theme-text-muted">Selecione um ticket para ver detalhe.</div>
            ) : detailLoading ? (
              <div className="text-sm theme-text-muted">A carregar…</div>
            ) : !selectedTicket ? (
              <div className="text-sm theme-text-muted">Ticket não encontrado.</div>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">Ticket</p>
                    <h2 className="mt-2 text-lg font-semibold theme-text truncate">{selectedTicket.title}</h2>
                    <p className="mt-1 text-sm theme-text-muted">Criado em {formatWhen(selectedTicket.created_at)}</p>
                    <p className="mt-1 text-xs theme-text-muted">
                      Nível: {selectedLevel && (LEVEL_LABEL as any)[selectedLevel] ? (LEVEL_LABEL as any)[selectedLevel] : String(selectedLevel || '—')}
                      {isGeneral ? ' • Geral' : ''}
                    </p>
                    <p className="mt-1 text-xs theme-text-muted">
                      Prioridade: {String((selectedTicket as any)?.priority || '').trim() && (PRIORITY_LABEL as any)[String((selectedTicket as any)?.priority)]
                        ? (PRIORITY_LABEL as any)[String((selectedTicket as any)?.priority)]
                        : String((selectedTicket as any)?.priority || '—')}
                      {Array.isArray((selectedTicket as any)?.tags) && (selectedTicket as any).tags.length > 0
                        ? ` • Tags: ${(selectedTicket as any).tags.join(', ')}`
                        : ''}
                    </p>
                    {(selectedTicket as any)?.sla_response_deadline || (selectedTicket as any)?.sla_resolution_deadline ? (
                      <p className="mt-1 text-xs theme-text-muted">
                        SLA resposta: {(selectedTicket as any)?.sla_response_deadline ? formatWhen((selectedTicket as any).sla_response_deadline) : '—'}
                        {' • '}
                        SLA resolução: {(selectedTicket as any)?.sla_resolution_deadline ? formatWhen((selectedTicket as any).sla_resolution_deadline) : '—'}
                      </p>
                    ) : null}
                    {(selectedTicket as any)?.first_response_at || (selectedTicket as any)?.resolved_at || (selectedTicket as any)?.closed_at ? (
                      <p className="mt-1 text-xs theme-text-muted">
                        1ª resposta: {(selectedTicket as any)?.first_response_at ? formatWhen((selectedTicket as any).first_response_at) : '—'}
                        {' • '}
                        Resolvido: {(selectedTicket as any)?.resolved_at ? formatWhen((selectedTicket as any).resolved_at) : '—'}
                        {' • '}
                        Fechado: {(selectedTicket as any)?.closed_at ? formatWhen((selectedTicket as any).closed_at) : '—'}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                    >
                      <option value="aberto">Aberto</option>
                      <option value="em_progresso">Em progresso</option>
                      <option value="resolvido">Resolvido</option>
                      <option value="fechado">Fechado</option>
                    </select>

                    {viewMode === 'fabrica' && canForwardFromPlant && selectedLevel === 'fabrica' && !isGeneral ? (
                      <button type="button" className="btn-secondary h-9 px-3" onClick={() => void handleForward()}>
                        Reencaminhar → Empresa
                      </button>
                    ) : null}

                    {viewMode === 'empresa' && canForwardFromCompany && selectedLevel === 'empresa' && !isGeneral ? (
                      <button type="button" className="btn-secondary h-9 px-3" onClick={() => void handleForward()}>
                        Reencaminhar → SuperAdmin
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border theme-border theme-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">Descrição</p>
                  <p className="mt-2 text-sm theme-text whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {viewMode === 'empresa' ? (
                  <div className="mt-4 rounded-2xl border theme-border theme-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">Gestão (Empresa)</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold theme-text-muted">Prioridade</label>
                        <select
                          className="mt-1 w-full h-10 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                          value={companyPriority}
                          onChange={(e) => setCompanyPriority(e.target.value as TicketPriority)}
                          disabled={savingCompanyPatch}
                        >
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                          <option value="critica">Crítica</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold theme-text-muted">Tags</label>
                        <input
                          className="mt-1 w-full h-10 rounded-xl border theme-border theme-card px-3 text-sm theme-text"
                          value={companyTagsText}
                          onChange={(e) => setCompanyTagsText(e.target.value)}
                          placeholder="ex: cliente, backend"
                          disabled={savingCompanyPatch}
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button type="button" className="btn-primary h-10 px-4" onClick={() => void handleSaveCompanyPatch()} disabled={savingCompanyPatch}>
                        {savingCompanyPatch ? 'A guardar…' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border theme-border theme-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">Anexos</p>

                  <div className="mt-3">
                    {attachmentsLoading ? (
                      <div className="text-sm theme-text-muted">A carregar anexos…</div>
                    ) : attachments.length === 0 ? (
                      <div className="text-sm theme-text-muted">Sem anexos.</div>
                    ) : (
                      <div className="space-y-2">
                        {attachments
                          .slice()
                          .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
                          .map((a) => (
                            <div key={a.id} className="rounded-2xl border theme-border theme-card p-3">
                              <div className="flex items-start justify-between gap-2">
                                <a
                                  className="text-sm font-semibold theme-text underline truncate"
                                  href={String(a.file_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={a.file_name}
                                >
                                  {a.file_name}
                                </a>
                                <span className="text-xs theme-text-muted whitespace-nowrap">{formatWhen(a.created_at)}</span>
                              </div>
                              {typeof a.size_bytes === 'number' ? (
                                <p className="mt-1 text-xs theme-text-muted">{Math.round(a.size_bytes / 1024)} KB</p>
                              ) : null}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setAttachmentFile(f || null);
                      }}
                      disabled={uploadingAttachment}
                      className="text-sm theme-text"
                    />
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3"
                      disabled={uploadingAttachment || !attachmentFile}
                      onClick={() => void handleUploadAttachment()}
                    >
                      {uploadingAttachment ? 'A enviar…' : 'Enviar anexo'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border theme-border theme-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">Timeline</p>

                  <div className="mt-3 space-y-2">
                    {timelineItems.length === 0 ? (
                      <div className="text-sm theme-text-muted">Sem eventos.</div>
                    ) : (
                      timelineItems.map((ev) => {
                        const actorName = ev.actor
                          ? `${String(ev.actor.first_name || '').trim()} ${String(ev.actor.last_name || '').trim()}`.trim()
                          : '';
                        const label = EVENT_LABEL[String(ev.event_type)] || String(ev.event_type || 'Evento');

                        return (
                          <div key={ev.id} className="rounded-2xl border theme-border theme-card p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold theme-text-muted">
                                {label}
                                {actorName ? ` • ${actorName}` : ''}
                              </p>
                              <p className="text-xs theme-text-muted whitespace-nowrap">{formatWhen(ev.created_at)}</p>
                            </div>
                            {ev.message ? <p className="mt-2 text-sm theme-text whitespace-pre-wrap">{ev.message}</p> : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold theme-text">Comentários</p>

                  <div className="mt-3 space-y-2">
                    {(detail?.comments || []).length === 0 ? (
                      <div className="text-sm theme-text-muted">Sem comentários.</div>
                    ) : (
                      (detail?.comments || [])
                        .slice()
                        .reverse()
                        .map((c) => {
                          const authorName = c.author
                            ? `${String(c.author.first_name || '').trim()} ${String(c.author.last_name || '').trim()}`.trim()
                            : '—';
                          return (
                            <div key={c.id} className="rounded-2xl border theme-border theme-card p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold theme-text-muted">{authorName || 'Utilizador'}</p>
                                <p className="text-xs theme-text-muted whitespace-nowrap">{formatWhen(c.created_at)}</p>
                              </div>
                              <p className="mt-2 text-sm theme-text whitespace-pre-wrap">{c.body}</p>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="mt-4 grid gap-3">
                    <textarea
                      className="w-full min-h-[90px] rounded-2xl border theme-border theme-card px-3 py-2 text-sm theme-text"
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Escreva uma resposta…"
                      disabled={commenting}
                    />
                    <button type="submit" className="btn-primary h-10" disabled={commenting}>
                      {commenting ? 'A enviar…' : 'Enviar'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
