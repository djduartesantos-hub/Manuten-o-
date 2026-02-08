import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectedUsers: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

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
    (kind === 'error' ? 10000 : kind === 'warning' ? 9000 : 7000);

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

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const { token, user } = useAuthStore();

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
        data?.type === 'error' ? 'error' : data?.type === 'success' ? 'success' : 'info';

      const metaParts: string[] = [];
      if (data?.entity) metaParts.push(String(data.entity));
      if (data?.action) metaParts.push(String(data.action));

      showPrettyToast(kind, data.message, {
        title: kind === 'success' ? 'Notificação' : kind === 'error' ? 'Erro' : 'Informação',
        meta: metaParts.length ? metaParts.join(' • ') : undefined,
        duration: kind === 'error' ? 11000 : 8000,
      });

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
        duration: 11000,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectedUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  // Socket is optional - return a safe default if not available
  if (context === undefined) {
    console.warn('SocketContext not available - using fallback');
    return { socket: null, isConnected: false, connectedUsers: 0 };
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
