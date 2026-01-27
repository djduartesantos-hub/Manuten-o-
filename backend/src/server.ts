import 'dotenv/config';
import { createApp } from './app';
import { initDatabase } from './config/database';
import { logger } from './config/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database
    await initDatabase();

    // Create Express app
    const app = createApp();

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
