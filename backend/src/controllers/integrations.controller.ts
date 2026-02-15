import { Response } from 'express';
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  apiKeys,
  notificationTemplates,
  webhookDeliveries,
  webhookEndpoints,
  webhookEvents,
} from '../db/schema.js';
import { AuthenticatedRequest } from '../types/index.js';
import {
  createApiKeySchema,
  createNotificationTemplateSchema,
  createWebhookSchema,
  updateApiKeySchema,
  updateNotificationTemplateSchema,
  updateWebhookSchema,
} from '../schemas/integrations.validation.js';

function resolveTenantId(req: AuthenticatedRequest): string | null {
  return req.tenantId || req.user?.tenantId || null;
}

function parseExpiresAt(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildApiKey(): { key: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const key = `mk_${raw}`;
  const prefix = key.slice(0, 10);
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

// ========== Notification Templates ==========

export async function listNotificationTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const rows = await db.query.notificationTemplates.findMany({
      where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
      orderBy: (fields: any, { asc }: any) => [asc(fields.event_type), asc(fields.channel)],
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list templates' });
  }
}

export async function createNotificationTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const validation = createNotificationTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
      return;
    }

    const now = new Date();
    const [row] = await db
      .insert(notificationTemplates)
      .values({
        tenant_id: tenantId,
        event_type: validation.data.eventType,
        channel: validation.data.channel,
        subject: validation.data.subject ?? null,
        body: validation.data.body,
        is_active: validation.data.isActive !== false,
        created_at: now,
        updated_at: now,
      })
      .returning();

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
}

export async function updateNotificationTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const templateId = String(req.params?.templateId || '').trim();

    if (!tenantId || !templateId) {
      res.status(400).json({ success: false, error: 'Tenant ID and template ID are required' });
      return;
    }

    const validation = updateNotificationTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
      return;
    }

    const existing = await db.query.notificationTemplates.findFirst({
      where: (fields: any, { and, eq }: any) =>
        and(eq(fields.id, templateId), eq(fields.tenant_id, tenantId)),
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    const [row] = await db
      .update(notificationTemplates)
      .set({
        event_type: validation.data.eventType ?? existing.event_type,
        channel: validation.data.channel ?? existing.channel,
        subject: validation.data.subject === undefined ? existing.subject : validation.data.subject,
        body: validation.data.body ?? existing.body,
        is_active: validation.data.isActive ?? existing.is_active,
        updated_at: new Date(),
      })
      .where(and(eq(notificationTemplates.id, templateId), eq(notificationTemplates.tenant_id, tenantId)))
      .returning();

    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
}

export async function deleteNotificationTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const templateId = String(req.params?.templateId || '').trim();

    if (!tenantId || !templateId) {
      res.status(400).json({ success: false, error: 'Tenant ID and template ID are required' });
      return;
    }

    const result = await db
      .delete(notificationTemplates)
      .where(and(eq(notificationTemplates.id, templateId), eq(notificationTemplates.tenant_id, tenantId)));

    res.json({ success: true, data: { deleted: result.rowCount ?? 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
}

// ========== Webhooks ==========

export async function listWebhooks(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const rows = await db.query.webhookEndpoints.findMany({
      where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
      orderBy: (fields: any, { asc }: any) => [asc(fields.name)],
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list webhooks' });
  }
}

export async function createWebhook(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const userId = req.user?.userId;

    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const validation = createWebhookSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
      return;
    }

    const secret = validation.data.secret || crypto.randomBytes(24).toString('hex');
    const now = new Date();

    const [row] = await db
      .insert(webhookEndpoints)
      .values({
        tenant_id: tenantId,
        name: validation.data.name,
        url: validation.data.url,
        secret,
        event_types: validation.data.eventTypes || [],
        headers: validation.data.headers || null,
        is_active: validation.data.isActive !== false,
        created_by: userId || null,
        created_at: now,
        updated_at: now,
      })
      .returning();

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create webhook' });
  }
}

export async function updateWebhook(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const webhookId = String(req.params?.webhookId || '').trim();

    if (!tenantId || !webhookId) {
      res.status(400).json({ success: false, error: 'Tenant ID and webhook ID are required' });
      return;
    }

    const validation = updateWebhookSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
      return;
    }

    const existing = await db.query.webhookEndpoints.findFirst({
      where: (fields: any, { and, eq }: any) => and(eq(fields.id, webhookId), eq(fields.tenant_id, tenantId)),
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    const [row] = await db
      .update(webhookEndpoints)
      .set({
        name: validation.data.name ?? existing.name,
        url: validation.data.url ?? existing.url,
        secret: validation.data.secret ?? existing.secret,
        event_types: validation.data.eventTypes ?? existing.event_types,
        headers: validation.data.headers ?? existing.headers,
        is_active: validation.data.isActive ?? existing.is_active,
        updated_at: new Date(),
      })
      .where(and(eq(webhookEndpoints.id, webhookId), eq(webhookEndpoints.tenant_id, tenantId)))
      .returning();

    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update webhook' });
  }
}

export async function deleteWebhook(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const webhookId = String(req.params?.webhookId || '').trim();

    if (!tenantId || !webhookId) {
      res.status(400).json({ success: false, error: 'Tenant ID and webhook ID are required' });
      return;
    }

    const result = await db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, webhookId), eq(webhookEndpoints.tenant_id, tenantId)));

    res.json({ success: true, data: { deleted: result.rowCount ?? 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete webhook' });
  }
}

// ========== API Keys ==========

export async function listApiKeys(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const rows = await db.query.apiKeys.findMany({
      columns: {
        id: true,
        tenant_id: true,
        name: true,
        key_prefix: true,
        scopes: true,
        last_used_at: true,
        expires_at: true,
        is_active: true,
        created_by: true,
        created_at: true,
        updated_at: true,
      },
      where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
      orderBy: (fields: any, { desc }: any) => [desc(fields.created_at)],
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list API keys' });
  }
}

export async function createApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const userId = req.user?.userId;

    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const validation = createApiKeySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
      return;
    }

    const { key, prefix, hash } = buildApiKey();
    const now = new Date();
    const expiresAt = parseExpiresAt(validation.data.expiresAt);

    const [row] = await db
      .insert(apiKeys)
      .values({
        tenant_id: tenantId,
        name: validation.data.name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: validation.data.scopes || [],
        expires_at: expiresAt,
        is_active: validation.data.isActive !== false,
        created_by: userId || null,
        created_at: now,
        updated_at: now,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        apiKey: key,
        record: row,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create API key' });
  }
}

export async function updateApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const apiKeyId = String(req.params?.apiKeyId || '').trim();

    if (!tenantId || !apiKeyId) {
      res.status(400).json({ success: false, error: 'Tenant ID and API key ID are required' });
      return;
    }

    const validation = updateApiKeySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
      return;
    }

    const existing = await db.query.apiKeys.findFirst({
      where: (fields: any, { and, eq }: any) => and(eq(fields.id, apiKeyId), eq(fields.tenant_id, tenantId)),
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'API key not found' });
      return;
    }

    const expiresAt = validation.data.expiresAt === undefined
      ? existing.expires_at
      : parseExpiresAt(validation.data.expiresAt);

    const [row] = await db
      .update(apiKeys)
      .set({
        name: validation.data.name ?? existing.name,
        scopes: validation.data.scopes ?? existing.scopes,
        expires_at: expiresAt,
        is_active: validation.data.isActive ?? existing.is_active,
        updated_at: new Date(),
      })
      .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.tenant_id, tenantId)))
      .returning();

    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update API key' });
  }
}

export async function deleteApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    const apiKeyId = String(req.params?.apiKeyId || '').trim();

    if (!tenantId || !apiKeyId) {
      res.status(400).json({ success: false, error: 'Tenant ID and API key ID are required' });
      return;
    }

    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.tenant_id, tenantId)));

    res.json({ success: true, data: { deleted: result.rowCount ?? 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete API key' });
  }
}

// ========== Webhook Events/Deliveries (read-only) ==========

export async function listWebhookEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const limitRaw = Number(req.query?.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

    const rows = await db.query.webhookEvents.findMany({
      where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
      orderBy: (fields: any, { desc }: any) => [desc(fields.created_at)],
      limit,
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list webhook events' });
  }
}

export async function listWebhookDeliveries(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID is required' });
      return;
    }

    const webhookId = String(req.query?.webhookId || '').trim();
    const limitRaw = Number(req.query?.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

    const rows = await db.query.webhookDeliveries.findMany({
      where: (fields: any, { and, eq }: any) =>
        webhookId ? and(eq(fields.tenant_id, tenantId), eq(fields.webhook_id, webhookId)) : eq(fields.tenant_id, tenantId),
      orderBy: (fields: any, { desc }: any) => [desc(fields.created_at)],
      limit,
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list webhook deliveries' });
  }
}
