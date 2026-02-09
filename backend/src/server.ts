import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { initDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import { SocketManager } from './services/socket.manager.js';
import { setSocketManager } from './utils/socket-instance.js';
import { initJobProcessors } from './jobs/processors.js';
import { ElasticsearchService } from './services/elasticsearch.service.js';
import { NotificationService } from './services/notification.service.js';
import { AlertService } from './services/alert.service.js';

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

    // Initialize Elasticsearch indices (best-effort)
    try {
      await ElasticsearchService.initializeIndices();
    } catch (error) {
      logger.warn('Elasticsearch initialization failed:', error);
    }

    // Initialize job processors (best-effort, Redis may not be available on Windows)
    try {
      initJobProcessors();
      logger.info('✅ Job processors initialized');
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Redis') || error.message.includes('ECONNREFUSED'))) {
        logger.warn('⚠️  Redis not available - job processing will be limited. Make sure Redis is running for production.');
      } else {
        logger.error('Job processors initialization failed:', error);
      }
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
    });

    // SLA overdue notifications (best-effort)
    setInterval(() => {
      NotificationService.checkSlaOverdue().catch((error) => {
        logger.warn('SLA check failed:', error instanceof Error ? error.message : error);
      });
    }, 5 * 60 * 1000);

    setInterval(() => {
      NotificationService.checkLowStockAll().catch((error) => {
        logger.warn('Low stock check failed:', error instanceof Error ? error.message : error);
      });
    }, 10 * 60 * 1000);

    // SLA-critical alerts (history + dashboard card) based on configured alert rules
    setInterval(() => {
      AlertService.checkSlaCriticalAll().catch((error) => {
        logger.warn('SLA-critical alert generation failed:', error instanceof Error ? error.message : error);
      });
    }, 10 * 60 * 1000);

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
