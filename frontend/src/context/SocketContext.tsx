import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  clearNotificationsInbox,
	deleteInboxNotification,
  getNotificationsInbox,
	markInboxNotificationRead,
  markNotificationsReadAll,
} from '../services/api';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectedUsers: number;
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
	deleteNotification: (notificationId: string) => Promise<void>;
	markNotificationRead: (notificationId: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export type AppNotification = {
  id: string;
  createdAt: string;
  eventType?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  meta?: string;
  entity?: string;
  entityId?: string;
  read: boolean;
};

type ToastKind = 'success' | 'error' | 'warning' | 'info';

function showPrettyToast(
  kind: ToastKind,
  message: string,
  opts?: {
    title?: string;
    meta?: string;
    duration?: number;
  },
) {
  const duration =
    opts?.duration ??
    (kind === 'error' ? 16000 : kind === 'warning' ? 14000 : 11000);

  const config =
    kind === 'success'
      ? {
          title: opts?.title ?? 'Sucesso',
          Icon: CheckCircle2,
          iconWrap: 'bg-emerald-500/10 text-emerald-700',
          iconClass: 'text-emerald-600',
          accent: 'bg-emerald-500',
        }
      : kind === 'error'
        ? {
            title: opts?.title ?? 'Erro',
            Icon: XCircle,
            iconWrap: 'bg-rose-500/10 text-rose-700',
            iconClass: 'text-rose-600',
            accent: 'bg-rose-500',
          }
        : kind === 'warning'
          ? {
              title: opts?.title ?? 'Aviso',
              Icon: AlertTriangle,
              iconWrap: 'bg-amber-500/10 text-amber-700',
              iconClass: 'text-amber-600',
              accent: 'bg-amber-500',
            }
          : {
              title: opts?.title ?? 'Informação',
              Icon: Info,
              iconWrap: 'bg-sky-500/10 text-sky-700',
              iconClass: 'text-sky-600',
              accent: 'bg-sky-500',
            };

  const Icon = config.Icon;

  toast.custom(
    (t) => (
      <div
        className={
          'pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border theme-border theme-card shadow-sm transition-all duration-300 ' +
          (t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
        }
        role="status"
        aria-live="polite"
      >
        <div className="flex">
          <div className={'w-1.5 ' + config.accent} />
          <div className="flex flex-1 gap-3 p-4">
            <div
              className={
                'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ' +
                config.iconWrap
              }
            >
              <Icon className={'h-5 w-5 ' + config.iconClass} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold theme-text">{config.title}</p>
                  <p className="mt-0.5 break-words text-sm theme-text-muted">{message}</p>
                  {opts?.meta ? (
                    <p className="mt-1 text-xs theme-text-muted">{opts.meta}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-xl border theme-border bg-[color:var(--dash-panel-2)] theme-text-muted transition hover:bg-[color:var(--dash-panel)] hover:theme-text focus:outline-none"
                  aria-label="Fechar alerta"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { duration },
  );
}

function labelPreventiveStatus(status?: string | null) {
  const value = status || '';
  if (value === 'em_execucao') return 'Em Execução';
  if (value === 'concluida') return 'Concluída';
  if (value === 'reagendada') return 'Reagendada';
  if (value === 'agendada') return 'Agendada';
  if (value === 'fechada') return 'Fechada';
  return value || '—';
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const { token, user } = useAuthStore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const hydrateInbox = React.useCallback(async () => {
    try {
      const inbox = await getNotificationsInbox({ limit: 200, offset: 0 });
      setNotifications(
        (inbox.items || []).map((row) => ({
          id: row.id,
          createdAt: row.createdAt,
          eventType: row.eventType,
          title: row.title,
          message: row.message,
          type:
            row.level === 'success'
              ? 'success'
              : row.level === 'warning'
                ? 'warning'
                : row.level === 'error'
                  ? 'error'
                  : 'info',
          entity: row.entity ?? undefined,
          entityId: row.entityId ?? undefined,
          read: Boolean(row.read),
        })),
      );
      setUnreadCount(Number(inbox.unreadCount ?? 0));
    } catch {
      // best-effort: inbox is optional
    }
  }, []);

  const markAllRead = React.useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markNotificationsReadAll();
    } catch {
      // best-effort
    }
  }, []);

  const clearNotifications = React.useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearNotificationsInbox();
    } catch {
      // best-effort
    }
  }, []);

  const deleteNotification = React.useCallback(async (notificationId: string) => {
    const id = String(notificationId || '').trim();
    if (!id) return;

    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((u) => Math.max(0, u - 1));
      }
      return prev.filter((n) => n.id !== id);
    });

    try {
      await deleteInboxNotification(id);
    } catch {
      // best-effort
    }
  }, []);

  const markNotificationRead = React.useCallback(async (notificationId: string) => {
    const id = String(notificationId || '').trim();
    if (!id) return;

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        if (!n.read) setUnreadCount((u) => Math.max(0, u - 1));
        return { ...n, read: true };
      }),
    );

    try {
      await markInboxNotificationRead(id);
    } catch {
      // best-effort
    }
  }, []);

  const pushNotification = React.useCallback(
    (
      n: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
        notificationId?: string;
        id?: string;
        createdAt?: string;
        read?: boolean;
      },
    ) => {
      const id =
        n.notificationId ||
        n.id ||
        (typeof crypto !== 'undefined' && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

      const createdAt = n.createdAt || new Date().toISOString();
      const read = Boolean(n.read);

      setNotifications((prev) => {
        if (prev.some((row) => row.id === id)) return prev;
        return [
          {
            id,
            createdAt,
            read,
            eventType: n.eventType,
            title: n.title,
            message: n.message,
            type: n.type,
            meta: n.meta,
            entity: n.entity,
            entityId: n.entityId,
          },
          ...prev,
        ].slice(0, 200);
      });

      if (!read) {
        setUnreadCount((prev) => prev + 1);
      }
    },
    [],
  );

  useEffect(() => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void hydrateInbox();
  }, [token, user, hydrateInbox]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    // Use same origin for socket connection (works in dev and production)
    const socketUrl = window.location.origin;
    
    console.log('Initializing Socket.IO connection to:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['polling', 'websocket'], // Try polling first (more reliable)
      // Add timeout to prevent hanging connections
      timeout: 20000,
      // Allow multiple connections
      multiplex: true,
      forceNew: false,
      // Upgrade after establishing connection
      upgrade: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      setRetryCount(0);
      console.log('✅ Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('⚠️  Socket disconnected. Reason:', reason);
      // Socket will auto-reconnect if reason is not 'io client namespace disconnect'
    });

    newSocket.on('reconnect', () => {
      console.log('🔄 Socket reconnected after disconnect');
      setIsConnected(true);
      setRetryCount(0);
    });

    newSocket.on('reconnect_attempt', () => {
      setRetryCount(prev => prev + 1);
      console.log('🔄 Attempting to reconnect... (attempt ' + (retryCount + 1) + ')');
    });

    // Connection error - this is non-critical
    newSocket.on('connect_error', (error) => {
      console.warn('Socket connection error (non-critical, will retry):', error.message);
      // Socket is optional feature - app works without it
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.warn('Socket error (non-critical):', error);
      // Don't block app if socket has issues
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to server:', data);
      setConnectedUsers(1); // Placeholder
    });

    // Order events
    newSocket.on('order:created', (data) => {
      showPrettyToast('success', data.message, {
        title: 'Ordem criada',
        meta: 'ordem de trabalho • criada',
        duration: 8000,
      });
      window.dispatchEvent(new CustomEvent('realtime:work-orders'));
    });

    newSocket.on('order:updated', (data) => {
      showPrettyToast('success', data.message, {
        title: 'Ordem atualizada',
        meta: 'ordem de trabalho • atualizada',
        duration: 8000,
      });
      window.dispatchEvent(new CustomEvent('realtime:work-orders'));
    });

    newSocket.on('order:status-changed', (data) => {
      showPrettyToast('success', data.message, {
        title: 'Estado alterado',
        meta: 'ordem de trabalho • estado',
        duration: 9000,
      });
      window.dispatchEvent(new CustomEvent('realtime:work-orders'));
    });

    // Asset events
    newSocket.on('asset:created', (data) => {
      showPrettyToast('success', data.message || 'Novo equipamento criado', {
        title: 'Equipamento criado',
        meta: 'equipamento • criado',
        duration: 8000,
      });
      window.dispatchEvent(new CustomEvent('realtime:assets'));
    });

    newSocket.on('asset:updated', (data) => {
      showPrettyToast('success', data.message || 'Equipamento atualizado', {
        title: 'Equipamento atualizado',
        meta: 'equipamento • atualizado',
        duration: 8000,
      });
      window.dispatchEvent(new CustomEvent('realtime:assets'));
    });

    // Alert events
    newSocket.on('alert:triggered', (data) => {
      const metaParts: string[] = [];
      if (data?.entity) metaParts.push(String(data.entity));
      if (data?.action) metaParts.push(String(data.action));
      if (data?.severity) metaParts.push(`severidade: ${String(data.severity)}`);

      showPrettyToast('warning', data.message, {
        title: 'Alerta',
        meta: metaParts.length ? metaParts.join(' • ') : undefined,
        duration: data?.severity === 'critical' ? 14000 : 11000,
      });

      pushNotification({
        title: 'Alerta',
        message: String(data?.message || 'Alerta recebido'),
        type: data?.severity === 'critical' ? 'error' : 'warning',
        meta: metaParts.length ? metaParts.join(' • ') : undefined,
        entity: data?.entity,
        entityId: data?.entityId,
      });
    });

    // Document events
    newSocket.on('document:uploaded', (data) => {
      showPrettyToast('success', data.message, {
        title: 'Documento carregado',
        meta: 'documento • upload',
        duration: 8000,
      });
    });

    // Generic notifications
    newSocket.on('notification', (data) => {
      const kind: ToastKind =
        data?.type === 'error'
          ? 'error'
          : data?.type === 'success'
            ? 'success'
            : data?.type === 'warning'
              ? 'warning'
              : 'info';

      const actorName = data?.actor?.username ? String(data.actor.username) : '';

      if (data?.entity === 'preventive-schedule' && data?.action === 'updated') {
        const previousLabel = labelPreventiveStatus(data?.previousStatus);
        const newLabel = labelPreventiveStatus(data?.newStatus);
        const message =
          data?.previousStatus && data?.newStatus
            ? `Estado: ${previousLabel} → ${newLabel}`
            : data?.newStatus
              ? `Estado: ${newLabel}`
              : 'Agendamento preventivo atualizado';

        showPrettyToast('info', message, {
          title: 'Agendamento preventivo atualizado',
          meta: actorName ? `Atualizado por ${actorName}` : undefined,
          duration: 14000,
        });

        pushNotification({
          notificationId: data?.notificationId,
          createdAt: data?.createdAt,
          eventType: data?.eventType,
          title: 'Agendamento preventivo atualizado',
          message,
          type: 'info',
          meta: actorName ? `Atualizado por ${actorName}` : undefined,
          entity: data?.entity,
          entityId: data?.entityId,
        });
      } else {
        const metaParts: string[] = [];
        if (data?.entity) metaParts.push(String(data.entity));
        if (data?.action) metaParts.push(String(data.action));

        showPrettyToast(kind, data.message, {
          title: kind === 'success' ? 'Notificação' : kind === 'error' ? 'Erro' : 'Informação',
          meta: actorName ? `Por ${actorName}` : metaParts.length ? metaParts.join(' • ') : undefined,
          duration: kind === 'error' ? 18000 : 13000,
        });

        pushNotification({
          notificationId: data?.notificationId,
          createdAt: data?.createdAt,
          eventType: data?.eventType,
          title: String(
            data?.title ||
              (kind === 'success'
                ? 'Notificação'
                : kind === 'error'
                  ? 'Erro'
                  : 'Informação'),
          ),
          message: String(data?.message || ''),
          type:
            kind === 'success'
              ? 'success'
              : kind === 'error'
                ? 'error'
                : kind === 'warning'
                  ? 'warning'
                  : 'info',
          meta:
            actorName ? `Por ${actorName}` : metaParts.length ? metaParts.join(' • ') : undefined,
          entity: data?.entity,
          entityId: data?.entityId,
        });
      }

      if (data.entity === 'asset') {
        window.dispatchEvent(new CustomEvent('realtime:assets'));
      }

      if (data.entity === 'maintenance-plan') {
        window.dispatchEvent(new CustomEvent('realtime:maintenance-plans'));
      }
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      showPrettyToast('error', 'Erro na conexão', {
        title: 'Conexão',
        meta: 'tempo real • socket',
        duration: 14000,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectedUsers,
        notifications,
        unreadCount,
        markAllRead,
        clearNotifications,
			deleteNotification,
			markNotificationRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  // Socket is optional - return a safe default if not available
  if (context === undefined) {
    console.warn('SocketContext not available - using fallback');
    return {
      socket: null,
      isConnected: false,
      connectedUsers: 0,
      notifications: [],
      unreadCount: 0,
      markAllRead: async () => {},
      clearNotifications: async () => {},
		deleteNotification: async () => {},
		markNotificationRead: async () => {},
    };
  }
  return context;
}

// Hook para emitir eventos
export function useSocketEmit() {
  const { socket } = useSocket();

  return {
    emitTyping: (entityType: string, entityId: string) => {
      socket?.emit('typing', { entityType, entityId });
    },
    emitStopTyping: (entityType: string, entityId: string) => {
      socket?.emit('stop-typing', { entityType, entityId });
    },
  };
}

// Hook para escutar eventos específicos
export function useSocketListener<T>(eventName: string, handler: (data: T) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, handler]);
}
