import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
}

export class SocketManager {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    // Configure CORS origin - in production, accept same origin
    const corsOrigin = process.env.NODE_ENV === 'production' 
      ? true  // Accept same origin in production (Render)
      : (process.env.FRONTEND_URL || 'http://localhost:5173');

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
        allowEIO3: true,
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    // Middleware
    this.setupMiddleware();
    // Connection handler
    this.setupConnectionHandler();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          logger.warn('Socket connection rejected: no token provided');
          // Allow connection but mark as unauthenticated
          // This lets the socket emit an error event instead of hard-failing
          return next();
        }

        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          const userId = decoded?.userId ?? decoded?.id;
          const tenantId = decoded?.tenantId ?? decoded?.tenant_id;
          socket.user = {
            id: userId,
            tenantId,
            role: decoded.role,
          };

          logger.info(`Socket authenticated: ${socket.id} | User: ${userId}`);
          next();
        } catch (jwtError) {
          logger.warn('JWT verification failed:', jwtError instanceof Error ? jwtError.message : jwtError);
          // Allow connection to proceed, will be handled in connection handler
          next();
        }
      } catch (error) {
        logger.warn('Socket auth middleware error:', error instanceof Error ? error.message : error);
        // Allow connection to proceed gracefully
        next();
      }
    });
  }

  private setupConnectionHandler(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.user) {
        logger.warn(`Socket not authenticated: ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      const { id, tenantId, role } = socket.user;
      const roomId = `tenant:${tenantId}`;

      logger.info(`✅ Socket connected: ${socket.id} | User: ${id} | Tenant: ${tenantId}`);

      // Join tenant room
      socket.join(roomId);

      // Join role room (for role-specific broadcasts)
      socket.join(`tenant:${tenantId}:role:${role}`);

      // Join user room (for user-specific broadcasts)
      socket.join(`tenant:${tenantId}:user:${id}`);

      // Emit connection success
      socket.emit('connected', {
        socketId: socket.id,
        userId: id,
        tenantId,
        role,
        timestamp: new Date(),
      });

      // Handle events
      this.setupEventHandlers(socket);

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.warn(`Socket error: ${socket.id} | Error: ${error}`);
      });
    });
  }

  private setupEventHandlers(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    const { tenantId } = socket.user;

    // Typing indicator
    socket.on('typing', (data: { entityType: string; entityId: string }) => {
      this.io
        .to(`tenant:${tenantId}`)
        .emit('user:typing', { user: socket.user!.id, ...data });
    });

    // Stop typing
    socket.on('stop-typing', (data: { entityType: string; entityId: string }) => {
      this.io
        .to(`tenant:${tenantId}`)
        .emit('user:stop-typing', { user: socket.user!.id, ...data });
    });
  }

  // Broadcast events
  broadcastToTenant(tenantId: string, eventName: string, data: any): void {
    this.io.to(`tenant:${tenantId}`).emit(eventName, {
      ...data,
      timestamp: new Date(),
    });
  }

  broadcastToRole(tenantId: string, role: string, eventName: string, data: any): void {
    this.io.to(`tenant:${tenantId}:role:${role}`).emit(eventName, {
      ...data,
      timestamp: new Date(),
    });
  }

  broadcastToUser(tenantId: string, userId: string, eventName: string, data: any): void {
    this.io.to(`tenant:${tenantId}:user:${userId}`).emit(eventName, {
      ...data,
      timestamp: new Date(),
    });
  }

  // Event emitters
  emitOrderCreated(tenantId: string, order: any): void {
    this.broadcastToTenant(tenantId, 'order:created', {
      order,
      message: `Nova ordem criada: ${order.title}`,
    });
  }

  emitOrderUpdated(tenantId: string, order: any): void {
    this.broadcastToTenant(tenantId, 'order:updated', {
      order,
      message: `Ordem atualizada: ${order.title}`,
    });
  }

  emitOrderStatusChanged(tenantId: string, order: any, previousStatus: string): void {
    this.broadcastToTenant(tenantId, 'order:status-changed', {
      order,
      previousStatus,
      message: `Ordem ${order.title} passou para ${order.status}`,
    });
  }

  emitAlertTriggered(tenantId: string, alert: any): void {
    ['admin_empresa', 'superadmin'].forEach((role) => {
      this.broadcastToRole(tenantId, role, 'alert:triggered', {
        alert,
        severity: alert.severity,
        message: alert.message,
      });
    });
  }

  emitDocumentUploaded(tenantId: string, document: any): void {
    this.broadcastToTenant(tenantId, 'document:uploaded', {
      document,
      message: `Documento adicionado: ${document.title}`,
    });
  }

  emitNotification(tenantId: string, notification: any): void {
    this.broadcastToTenant(tenantId, 'notification', {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
    });
  }

  // Get connected users count
  getConnectedUsers(tenantId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`tenant:${tenantId}`);
    return room?.size || 0;
  }

  // Get IO instance (for advanced usage)
  getIO(): SocketIOServer {
    return this.io;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        logger.info('Socket.io server closed');
        resolve();
      });
    });
  }
}
