import { z } from 'zod';

const preventiveScheduleStatusSchema = z.enum([
  'agendada',
  'em_execucao',
  'concluida',
  'fechada',
  'reagendada',
]);

const scheduleBasisSchema = z.enum(['completion', 'scheduled']);
const toleranceUnitSchema = z.enum(['hours', 'days']);

// Maintenance Plan Schemas
export const createMaintenancePlanSchema = z.object({
  asset_id: z.string().uuid('Asset ID deve ser UUID'),
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['preventiva', 'corretiva']).default('preventiva'),
  frequency_type: z
    .enum(['days', 'months', 'hours', 'meter'])
    .describe('Tipo de frequência: dias, meses ou leitura de contador'),
  frequency_value: z.number().int().positive('Valor deve ser positivo'),
  meter_threshold: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato decimal inválido').optional(),
  auto_schedule: z.boolean().optional(),
  schedule_basis: scheduleBasisSchema.optional(),
  tolerance_unit: toleranceUnitSchema.optional(),
  tolerance_before_value: z.number().int().nonnegative().optional(),
  tolerance_after_value: z.number().int().nonnegative().optional(),
  tasks: z.array(z.string().min(3).max(500)).optional(),
  is_active: z.boolean().default(true),
});

export const updateMaintenancePlanSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['preventiva', 'corretiva']).optional(),
  frequency_type: z.enum(['days', 'months', 'hours', 'meter']).optional(),
  frequency_value: z.number().int().positive().optional(),
  meter_threshold: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  auto_schedule: z.boolean().optional(),
  schedule_basis: scheduleBasisSchema.optional(),
  tolerance_unit: toleranceUnitSchema.optional(),
  tolerance_before_value: z.number().int().nonnegative().optional(),
  tolerance_after_value: z.number().int().nonnegative().optional(),
  tasks: z.array(z.string().min(3).max(500)).optional(),
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
  next_interval_value: z.number().int().positive().optional(),
  next_interval_unit: z.enum(['hours', 'days', 'months']).optional(),
  reschedule_reason: z.string().min(3).max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'reagendada') {
    if (!data.scheduled_for) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduled_for'],
        message: 'Para reagendar, envie scheduled_for',
      });
    }
    if (!data.reschedule_reason || data.reschedule_reason.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reschedule_reason'],
        message: 'Motivo é obrigatório ao reagendar',
      });
    }
  }
});

export type CreateMaintenancePlanInput = z.infer<typeof createMaintenancePlanSchema>;
export type UpdateMaintenancePlanInput = z.infer<typeof updateMaintenancePlanSchema>;
export type CreateMaintenanceTaskInput = z.infer<typeof createMaintenanceTaskSchema>;

export type CreatePreventiveScheduleInput = z.infer<typeof createPreventiveScheduleSchema>;
export type UpdatePreventiveScheduleInput = z.infer<typeof updatePreventiveScheduleSchema>;
