import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import {
  createApiKey,
  createWebhook,
  deleteApiKey,
  deleteWebhook,
  listApiKeys,
  listWebhookDeliveries,
  listWebhookEvents,
  listWebhooks,
  updateApiKey,
  updateWebhook,
} from '../controllers/integrations.controller.js';

const router = Router();

router.use(authMiddleware);

// Webhooks
router.get('/webhooks', requirePermission('integrations:read', 'tenant'), listWebhooks);
router.post('/webhooks', requirePermission('integrations:write', 'tenant'), createWebhook);
router.patch('/webhooks/:webhookId', requirePermission('integrations:write', 'tenant'), updateWebhook);
router.delete('/webhooks/:webhookId', requirePermission('integrations:write', 'tenant'), deleteWebhook);
router.get('/webhooks/events', requirePermission('integrations:read', 'tenant'), listWebhookEvents);
router.get('/webhooks/deliveries', requirePermission('integrations:read', 'tenant'), listWebhookDeliveries);

// API Keys
router.get('/api-keys', requirePermission('integrations:read', 'tenant'), listApiKeys);
router.post('/api-keys', requirePermission('integrations:write', 'tenant'), createApiKey);
router.patch('/api-keys/:apiKeyId', requirePermission('integrations:write', 'tenant'), updateApiKey);
router.delete('/api-keys/:apiKeyId', requirePermission('integrations:write', 'tenant'), deleteApiKey);

export default router;
