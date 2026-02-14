import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useSocket } from '../context/SocketContext';
import { Bell, Check, Mail, Trash2 } from 'lucide-react';

function formatWhen(iso: string) {
  try {
    const date = new Date(iso);
    return date.toLocaleString();
  } catch {
    return iso;
  }
}

export function NotificationsPage() {
  const {
  notifications,
  unreadCount,
  markAllRead,
  clearNotifications,
  deleteNotification,
  markNotificationRead,
	markNotificationUnread,
  } = useSocket();

  return (
    <MainLayout>
      <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-[32px] border theme-border glass-panel p-8 shadow-sm">
          <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
                Notificacoes
              </p>
              <h1 className="mt-2 text-3xl font-semibold theme-text">Caixa de entrada</h1>
              <p className="mt-1 text-sm theme-text-muted">
                Alertas e eventos recebidos em tempo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={markAllRead}
                disabled={notifications.length === 0 || unreadCount === 0}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Marcar como lidas
              </button>
              <button
                type="button"
                onClick={clearNotifications}
                disabled={notifications.length === 0}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar
              </button>
            </div>
          </div>
        </section>

        {notifications.length === 0 ? (
          <div className="rounded-2xl border theme-border glass-panel p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl theme-surface">
              <Bell className="h-6 w-6 theme-text-muted" />
            </div>
            <p className="mt-4 text-sm theme-text-muted">Sem notificacoes por agora.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={
                  'rounded-2xl border theme-border glass-panel p-4 shadow-sm ' +
                  (n.read ? 'opacity-90' : '')
                }
              >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read ? <span className="badge-danger text-xs">Novo</span> : null}
                    <p className="text-sm font-semibold theme-text">{n.title}</p>
                  </div>
                  <p className="mt-1 text-sm theme-text-muted">{n.message}</p>
                  {n.meta ? <p className="mt-1 text-xs theme-text-muted">{n.meta}</p> : null}
                </div>


                <div className="flex w-full items-center gap-4 sm:w-auto sm:justify-end">
                  <p className="text-xs theme-text-muted whitespace-nowrap">
                    {formatWhen(n.createdAt)}
                  </p>

                  <div className="ml-auto flex items-center gap-3">
                    {!n.read ? (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border theme-border theme-card theme-text-muted transition hover:bg-[color:var(--dash-surface)] hover:theme-text"
                        aria-label="Marcar como lida"
                        title="Marcar como lida"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markNotificationUnread(n.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border theme-border theme-card theme-text-muted transition hover:bg-[color:var(--dash-surface)] hover:theme-text"
                        aria-label="Marcar como não lida"
                        title="Marcar como não lida"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border theme-border theme-card theme-text-muted transition hover:bg-[color:var(--dash-surface)] hover:text-rose-600"
                      aria-label="Apagar notificação"
                      title="Apagar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
