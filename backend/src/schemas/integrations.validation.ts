import { z } from 'zod';

export const notificationChannelSchema = z.enum(['email', 'in_app', 'socket']);

export const createNotificationTemplateSchema = z.object({
  eventType: z.string().min(1).max(100),
  channel: notificationChannelSchema,
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const updateNotificationTemplateSchema = z.object({
  eventType: z.string().min(1).max(100).optional(),
  channel: notificationChannelSchema.optional(),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const createWebhookSchema = z.object({
  name: z.string().min(2).max(100),
  url: z.string().url(),
  eventTypes: z.array(z.string().min(1).max(100)).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
  secret: z.string().min(8).max(200).optional(),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  url: z.string().url().optional(),
  eventTypes: z.array(z.string().min(1).max(100)).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
  secret: z.string().min(8).max(200).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(2).max(100),
  scopes: z.array(z.string().min(1).max(100)).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  scopes: z.array(z.string().min(1).max(100)).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});
