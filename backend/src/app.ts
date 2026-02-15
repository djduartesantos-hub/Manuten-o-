import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import authRoutes from './routes/auth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import workOrderRoutes from './routes/workorder.routes.js';
import assetRoutes from './routes/asset.routes.js';
import assetCategoryRoutes from './routes/asset-category.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import maintenanceKitRoutes from './routes/maintenancekit.routes.js';
import sparePartRoutes from './routes/sparepart.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import alertRoutes from './routes/alert.routes.js';
import searchRoutes from './routes/search.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import setupRoutes from './routes/setup.routes.js';
import setupPublicRoutes from './routes/setup.public.routes.js';
import debugRoutes from './routes/debug.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import docsRoutes from './routes/docs.routes.js';
import profileRoutes from './routes/profile.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import ticketRoutes from './routes/tickets.routes.js';
import plannerRoutes from './routes/planner.routes.js';
import stocktakeRoutes from './routes/stocktake.routes.js';
import customizationRoutes from './routes/customization.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares/error.js';
import { tenantSlugMiddleware } from './middlewares/tenant.js';
import { requestIdMiddleware } from './middlewares/requestId.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Middleware
  app.use(
    helmet({
      // Swagger UI and some embedded resources can break under strict CSP.
      contentSecurityPolicy: false,
    }),
  );

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(requestLogger());

  // Serve uploaded documents (local storage fallback)
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // API docs (no tenant required)
  app.use('/api', docsRoutes);

  // Global API rate limiting
  app.use('/api', apiLimiter);

  // Routes
  app.use('/api/setup', setupPublicRoutes);

  // Resolve tenant for all API routes, including auth.
  // Without this, /api/auth/login falls back to DEFAULT_TENANT_ID which may not
  // match the tenant id created by seeds/restores in production.
  app.use('/api/auth', tenantSlugMiddleware);
  app.use('/api/auth', authLimiter);
  app.use('/api/auth', authRoutes);

  app.use('/api', tenantSlugMiddleware);
  app.use('/api', tenantRoutes);
  app.use('/api', workOrderRoutes);
  app.use('/api', assetRoutes);
  app.use('/api', assetCategoryRoutes);
  app.use('/api', maintenanceRoutes);
  app.use('/api', maintenanceKitRoutes);
  app.use('/api', sparePartRoutes);
  app.use('/api', supplierRoutes);
  app.use('/api', stocktakeRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/setup', setupRoutes);
  app.use('/api/debug', debugRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/superadmin', superadminRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api', ticketRoutes);
  app.use('/api', plannerRoutes);
  app.use('/api/customization', customizationRoutes);
  app.use('/api', purchaseRoutes);

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
    const frontendPath = path.join(__dirname, '../public');
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
