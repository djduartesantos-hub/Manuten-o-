import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectedUsers: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const newSocket = io(process.env.VITE_API_URL || 'http://localhost:3001', {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Socket disconnected');
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to server:', data);
      setConnectedUsers(1); // Placeholder
    });

    // Order events
    newSocket.on('order:created', (data) => {
      toast.success(data.message, {
        duration: 4000,
        icon: '📋',
      });
      window.dispatchEvent(new CustomEvent('realtime:work-orders'));
    });

    newSocket.on('order:updated', (data) => {
      toast.success(data.message, {
        duration: 3000,
        icon: '✏️',
      });
      window.dispatchEvent(new CustomEvent('realtime:work-orders'));
    });

    newSocket.on('order:status-changed', (data) => {
      toast.success(data.message, {
        duration: 4000,
        icon: '✅',
      });
      window.dispatchEvent(new CustomEvent('realtime:work-orders'));
    });

    // Asset events
    newSocket.on('asset:created', (data) => {
      toast.success(data.message || 'Novo equipamento criado', {
        duration: 3000,
        icon: '🧰',
      });
      window.dispatchEvent(new CustomEvent('realtime:assets'));
    });

    newSocket.on('asset:updated', (data) => {
      toast.success(data.message || 'Equipamento atualizado', {
        duration: 3000,
        icon: '🧰',
      });
      window.dispatchEvent(new CustomEvent('realtime:assets'));
    });

    // Alert events
    newSocket.on('alert:triggered', (data) => {
      const icons: { [key: string]: string } = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };
      toast.error(data.message, {
        duration: 5000,
        icon: icons[data.severity] || '⚠️',
      });
    });

    // Document events
    newSocket.on('document:uploaded', (data) => {
      toast.success(data.message, {
        duration: 3000,
        icon: '📄',
      });
    });

    // Generic notifications
    newSocket.on('notification', (data) => {
      const toastType = data.type === 'error' ? toast.error : data.type === 'success' ? toast.success : toast;
      toastType(data.message, {
        duration: 3000,
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
      toast.error('Erro na conexão', {
        duration: 3000,
        icon: '❌',
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
  if (context === undefined) {
    throw new Error('useSocket must be used within SocketProvider');
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
