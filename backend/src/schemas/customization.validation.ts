import { z } from 'zod';

// Dashboard Widget Types
export const widgetTypeSchema = z.enum([
  'kpi_metrics',
  'work_orders_chart',
  'maintenance_schedule',
  'asset_status',
  'technician_performance',
  'stock_levels',
  'overdue_maintenance',
  'completion_rate',
  'mttr_mtbf',
  'alerts',
]);

// Widget Configuration Schema
export const widgetConfigSchema = z.object({
  id: z.string().uuid(),
  type: widgetTypeSchema,
  title: z.string().min(1).max(100),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
  }),
  size: z.object({
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(8),
  }),
  settings: z.record(z.any()).optional(),
  isVisible: z.boolean().default(true),
});

// Create Dashboard Layout Schema
export const createDashboardLayoutSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  widgets: z.array(widgetConfigSchema).min(1),
  isDefault: z.boolean().default(false),
});

// Update Dashboard Layout Schema
export const updateDashboardLayoutSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  widgets: z.array(widgetConfigSchema).optional(),
  isDefault: z.boolean().optional(),
});

// Scheduled Report Schema
export const reportFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);

export const createScheduledReportSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  frequency: reportFrequencySchema,
  sendDay: z.number().int().min(1).max(28).optional(),
  sendTime: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  recipients: z.array(z.string().email()).min(1),
  reportType: z.enum(['summary', 'detailed', 'kpi', 'maintenance', 'inventory']),
  includeCharts: z.boolean().default(true),
  includeData: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updateScheduledReportSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  frequency: reportFrequencySchema.optional(),
  sendDay: z.number().int().min(1).max(28).optional(),
  sendTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  recipients: z.array(z.string().email()).optional(),
  reportType: z.enum(['summary', 'detailed', 'kpi', 'maintenance', 'inventory']).optional(),
  includeCharts: z.boolean().optional(),
  includeData: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Theme Settings Schema
export const themeSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  fontFamily: z.enum(['system', 'inter', 'roboto']).default('system'),
  fontSize: z.enum(['small', 'normal', 'large']).default('normal'),
  compactMode: z.boolean().default(false),
});

export const updateThemeSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  fontFamily: z.enum(['system', 'inter', 'roboto']).optional(),
  fontSize: z.enum(['small', 'normal', 'large']).optional(),
  compactMode: z.boolean().optional(),
});

// Predictive Analysis Schema
export const createPredictiveAnalysisSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  analysisType: z.enum(['spare_parts', 'maintenance_schedule', 'failure_prediction']),
  lookbackPeriod: z.number().int().min(7).max(365).default(90),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  targetAssets: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().default(true),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type CreateDashboardLayout = z.infer<typeof createDashboardLayoutSchema>;
export type UpdateDashboardLayout = z.infer<typeof updateDashboardLayoutSchema>;
export type ScheduledReport = z.infer<typeof createScheduledReportSchema>;
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export type CreatePredictiveAnalysis = z.infer<typeof createPredictiveAnalysisSchema>;
