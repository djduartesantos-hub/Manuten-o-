import { z } from 'zod';

const preventiveScheduleStatusSchema = z.enum([
  'planeada',
  'agendada',
  'confirmada',
  'em_execucao',
  'concluida',
  'fechada',
  'reagendada',
]);

// Maintenance Plan Schemas
export const createMaintenancePlanSchema = z.object({
  asset_id: z.string().uuid('Asset ID deve ser UUID'),
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['preventiva', 'corretiva']).default('preventiva'),
  frequency_type: z
    .enum(['days', 'months', 'meter'])
    .describe('Tipo de frequência: dias, meses ou leitura de contador'),
  frequency_value: z.number().int().positive('Valor deve ser positivo'),
  meter_threshold: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato decimal inválido').optional(),
  is_active: z.boolean().default(true),
});

export const updateMaintenancePlanSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['preventiva', 'corretiva']).optional(),
  frequency_type: z.enum(['days', 'months', 'meter']).optional(),
  frequency_value: z.number().int().positive().optional(),
  meter_threshold: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  is_active: z.boolean().optional(),
});

// Maintenance Task Schemas
export const createMaintenanceTaskSchema = z.object({
  plan_id: z.string().uuid('Plan ID deve ser UUID'),
  description: z.string().min(3, 'Descrição mínimo 3 caracteres').max(500),
  sequence: z.number().int().nonnegative().optional(),
});

// Preventive Maintenance Scheduling Schemas
export const createPreventiveScheduleSchema = z.object({
  plan_id: z.string().uuid('Plan ID deve ser UUID'),
  scheduled_for: z.string().datetime('scheduled_for deve ser uma data ISO válida'),
  status: preventiveScheduleStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePreventiveScheduleSchema = z.object({
  scheduled_for: z.string().datetime('scheduled_for deve ser uma data ISO válida').optional(),
  status: preventiveScheduleStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateMaintenancePlanInput = z.infer<typeof createMaintenancePlanSchema>;
export type UpdateMaintenancePlanInput = z.infer<typeof updateMaintenancePlanSchema>;
export type CreateMaintenanceTaskInput = z.infer<typeof createMaintenanceTaskSchema>;

export type CreatePreventiveScheduleInput = z.infer<typeof createPreventiveScheduleSchema>;
export type UpdatePreventiveScheduleInput = z.infer<typeof updatePreventiveScheduleSchema>;
