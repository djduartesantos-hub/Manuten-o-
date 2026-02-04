import express, { Express } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import workOrderRoutes from './routes/workorder.routes';
import assetRoutes from './routes/asset.routes';
import dashboardRoutes from './routes/dashboard.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import sparePartRoutes from './routes/sparepart.routes';
import alertRoutes from './routes/alert.routes';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares/error';

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

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'CMMS Backend is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
