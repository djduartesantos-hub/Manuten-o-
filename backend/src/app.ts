import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import workOrderRoutes from './routes/workorder.routes.js';
import assetRoutes from './routes/asset.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import sparePartRoutes from './routes/sparepart.routes.js';
import alertRoutes from './routes/alert.routes.js';
import searchRoutes from './routes/search.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import setupRoutes from './routes/setup.routes.js';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares/error.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(requestLogger());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/tenants', workOrderRoutes);
  app.use('/api/tenants', assetRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/spareparts', sparePartRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/setup', setupRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'CMMS Backend is running',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
      },
    });
  });

  // Socket.io health check
  app.get('/health/socket', (_req, res) => {
    res.json({
      success: true,
      message: 'Socket.io is available',
      timestamp: new Date().toISOString(),
      endpoint: 'ws://localhost:' + (process.env.PORT || 3000),
    });
  });

  // Serve static frontend files in production
  if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../../frontend');
    app.use(express.static(frontendPath));
    
    // Serve index.html for all non-API routes (SPA fallback)
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
      }
    });
  }

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
