import { Router, Response } from 'express';
import { validateRequest } from '../middlewares/validation.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AlertService } from '../services/alert.service.js';
import { DocumentService } from '../services/document.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { z } from 'zod';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';

const router = Router();

// ========== ALERT CONFIGURATION ROUTES ==========

// GET /api/alerts/configurations
router.get('/configurations', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { asset_id } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const configs = await AlertService.getAlertConfigurations(
      tenantId,
      asset_id as string | undefined,
    );

    return res.json(configs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch alert configurations' });
  }
});

// POST /api/alerts/configurations
const createAlertSchema = z.object({
  asset_id: z.string().uuid(),
  alert_type: z.string(),
  threshold: z.number().int().positive(),
  time_unit: z.string(),
  notify_roles: z.array(z.string()).optional(),
  notify_email: z.boolean().optional(),
  notify_push: z.boolean().optional(),
  escalate_after_hours: z.number().int().optional(),
  description: z.string().optional(),
});

router.post(
  '/configurations',
  authMiddleware,
  validateRequest(createAlertSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const config = await AlertService.createAlertConfiguration({
        tenant_id: tenantId,
        ...req.body,
      });

      return res.status(201).json(config);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create alert configuration' });
    }
  },
);

// PUT /api/alerts/configurations/:id
router.put(
  '/configurations/:id',
  authMiddleware,
  validateRequest(createAlertSchema.partial()),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updated = await AlertService.updateAlertConfiguration(
        id,
        tenantId,
        req.body,
      );

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update alert configuration' });
    }
  },
);

// DELETE /api/alerts/configurations/:id
router.delete('/configurations/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await AlertService.deleteAlertConfiguration(id, tenantId);

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete alert configuration' });
  }
});

// ========== ALERTS HISTORY ROUTES ==========

// GET /api/alerts/history
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { asset_id, severity, is_resolved, limit, offset } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const alerts = await AlertService.getAlerts(tenantId, {
      asset_id: asset_id as string | undefined,
      severity: severity as string | undefined,
      is_resolved: is_resolved === 'true' ? true : is_resolved === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    return res.json(alerts);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/alerts/history/:id/resolve
const resolveAlertSchema = z.object({
  resolution_notes: z.string().optional(),
});

router.post(
  '/history/:id/resolve',
  authMiddleware,
  validateRequest(resolveAlertSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const alert = await AlertService.resolveAlert(id, tenantId, {
        resolved_by: userId,
        resolution_notes: req.body.resolution_notes,
      });

      return res.json(alert);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to resolve alert' });
    }
  },
);

// GET /api/alerts/stats
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await AlertService.getAlertStats(tenantId);

    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
});

// GET /api/alerts/warnings/:assetId
router.get('/warnings/:assetId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { assetId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const warning = await AlertService.generateMaintenanceWarnings(
      tenantId,
      assetId,
    );

    return res.json(warning || {});
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate warnings' });
  }
});

// ========== DOCUMENT ROUTES ==========

// GET /api/alerts/documents
router.get('/documents', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { asset_id, document_type, limit, offset } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documents = await DocumentService.getDocuments(
      tenantId,
      asset_id as string | undefined,
      {
        document_type: document_type as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      },
    );

    return res.json(documents);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/alerts/documents
const uploadDocSchema = z.object({
  asset_id: z.string().uuid(),
  document_type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  file_url: z.string().url(),
  file_size_mb: z.number().optional(),
  file_extension: z.string().optional(),
  tags: z.array(z.string()).optional(),
  expires_at: z.string().datetime().optional(),
});

router.post(
  '/documents',
  authMiddleware,
  validateRequest(uploadDocSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;

      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const document = await DocumentService.uploadDocument({
        tenant_id: tenantId,
        uploaded_by: userId,
        ...req.body,
        expires_at: req.body.expires_at ? new Date(req.body.expires_at) : undefined,
      });

      if (isSocketManagerReady()) {
        const socketManager = getSocketManager();
        socketManager.emitDocumentUploaded(tenantId, {
          id: document.id,
          title: document.title,
          asset_id: document.asset_id,
          document_type: document.document_type,
        });
      }

      return res.status(201).json(document);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to upload document' });
    }
  },
);

// GET /api/alerts/documents/:id/versions
router.get('/documents/:id/versions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const versions = await DocumentService.getDocumentVersions(tenantId, id);

    return res.json(versions);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch document versions' });
  }
});

// PUT /api/alerts/documents/:id
router.put(
  '/documents/:id',
  authMiddleware,
  validateRequest(
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      expires_at: z.string().datetime().optional(),
    }),
  ),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updated = await DocumentService.updateDocument(id, tenantId, {
        ...req.body,
        expires_at: req.body.expires_at ? new Date(req.body.expires_at) : undefined,
      });

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update document' });
    }
  },
);

// DELETE /api/alerts/documents/:id
router.delete('/documents/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await DocumentService.deleteDocument(id, tenantId);

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /api/alerts/documents/expiring
router.get('/documents/expiring', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { days = '30' } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documents = await DocumentService.getExpiringDocuments(
      tenantId,
      parseInt(days as string),
    );

    return res.json(documents);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch expiring documents' });
  }
});

export default router;
