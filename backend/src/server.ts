import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { initDatabase } from './config/database';
import { logger } from './config/logger';
import { SocketManager } from './services/socket.manager';
import { setSocketManager } from './utils/socket-instance';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database
    await initDatabase();

    // Create Express app
    const app = createApp();

    // Create HTTP server for Socket.io
    const server = http.createServer(app);

    // Initialize Socket.io
    const socketManager = new SocketManager(server);
    setSocketManager(socketManager); // Make available globally
    logger.info('✅ Socket.io initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      socketManager.shutdown();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
