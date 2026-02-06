import { z } from 'zod';

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password mínimo 6 caracteres'),
  // tenant_id and tenant_slug are not required in single-tenant mode
  tenant_id: z.string().optional(),
  tenant_slug: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obrigatório'),
});

// Work Order Schemas
export const CreateWorkOrderSchema = z.object({
  asset_id: z.string().uuid('Asset ID deve ser UUID'),
  title: z.string().min(3, 'Título mínimo 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(1).max(4, 'Prioridade 1-4'),
  maintenance_type: z.enum(['preventiva', 'corretiva']),
  planned_hours: z.number().positive('Horas deve ser positivo').optional(),
  planned_date: z.string().datetime().optional(),
});

export const UpdateWorkOrderSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(1).max(4).optional(),
  status: z.enum(['aberta', 'atribuida', 'em_curso', 'concluida', 'cancelada']).optional(),
  assigned_user_id: z.string().uuid().optional(),
  actual_hours: z.number().positive().optional(),
  planned_date: z.string().datetime().optional(),
});

export const AddTaskSchema = z.object({
  description: z.string().min(3, 'Descrição mínimo 3 caracteres').max(500),
  task_number: z.number().int().positive().optional(),
  estimated_hours: z.number().positive().optional(),
});

// Asset Schemas
export const CreateAssetSchema = z.object({
  code: z.string().min(1, 'Código obrigatório').max(50),
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid('Category ID deve ser UUID'),
  location: z.string().max(200).optional(),
  serial_number: z.string().max(100).optional(),
  qr_code: z.string().max(500).optional(),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  meter_type: z.enum(['horas', 'km', 'ciclos', 'outro']).optional(),
  current_meter_value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  acquisition_date: z.string().datetime().optional(),
  acquisition_cost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  is_critical: z.boolean().optional(),
  status: z.enum(['operacional', 'parado', 'manutencao']).optional(),
});

export const UpdateAssetSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  location: z.string().max(200).optional(),
  serial_number: z.string().max(100).optional(),
  qr_code: z.string().max(500).optional(),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  meter_type: z.enum(['horas', 'km', 'ciclos', 'outro']).optional(),
  current_meter_value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  acquisition_date: z.string().datetime().optional(),
  acquisition_cost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  is_critical: z.boolean().optional(),
  status: z.enum(['operacional', 'parado', 'manutencao']).optional(),
});

// Asset Category Schemas
export const CreateAssetCategorySchema = z.object({
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(100),
  description: z.string().max(500).optional(),
});

export const UpdateAssetCategorySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
});

// Maintenance Plan Schemas
export const CreateMaintenancePlanSchema = z.object({
  asset_id: z.string().uuid('Asset ID deve ser UUID'),
  frequency_type: z.enum(['horas', 'dias', 'km', 'ciclos']),
  frequency_value: z.number().positive('Frequência deve ser positiva'),
  description: z.string().max(2000).optional(),
  estimated_hours: z.number().positive().optional(),
  next_maintenance_date: z.string().datetime().optional(),
});

export const UpdateMaintenancePlanSchema = z.object({
  frequency_type: z.enum(['horas', 'dias', 'km', 'ciclos']).optional(),
  frequency_value: z.number().positive().optional(),
  description: z.string().max(2000).optional(),
  estimated_hours: z.number().positive().optional(),
  next_maintenance_date: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

// Spare Part Schemas
export const CreateSparePartSchema = z.object({
  code: z.string().min(1, 'Código obrigatório').max(50),
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  unit_cost: z.number().positive('Custo deve ser positivo'),
  supplier_id: z.string().uuid().optional(),
  current_stock: z.number().nonnegative().optional(),
  reorder_level: z.number().nonnegative().optional(),
  reorder_quantity: z.number().positive().optional(),
});

export const UpdateSparePartSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  unit_cost: z.number().positive().optional(),
  supplier_id: z.string().uuid().optional(),
  current_stock: z.number().nonnegative().optional(),
  reorder_level: z.number().nonnegative().optional(),
  reorder_quantity: z.number().positive().optional(),
});

// Supplier Schemas
export const CreateSupplierSchema = z.object({
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(200),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  country: z.string().max(200).optional(),
});

export const UpdateSupplierSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  country: z.string().max(200).optional(),
});

// Meter Reading Schemas
export const CreateMeterReadingSchema = z.object({
  asset_id: z.string().uuid('Asset ID deve ser UUID'),
  reading_value: z.number().nonnegative('Leitura deve ser não-negativa'),
  reading_date: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

// Stock Movement Schemas
export const CreateStockMovementSchema = z.object({
  spare_part_id: z.string().uuid('Spare Part ID deve ser UUID'),
  movement_type: z.enum(['entrada', 'saida', 'ajuste']),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  reason: z.string().max(500),
  reference_id: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// SLA Rule Schemas
export const CreateSLARuleSchema = z.object({
  priority: z.number().int().min(1).max(4),
  response_time_hours: z.number().positive('Tempo deve ser positivo'),
  resolution_time_hours: z.number().positive('Tempo deve ser positivo'),
  description: z.string().max(500).optional(),
});

export const UpdateSLARuleSchema = z.object({
  priority: z.number().int().min(1).max(4).optional(),
  response_time_hours: z.number().positive().optional(),
  resolution_time_hours: z.number().positive().optional(),
  description: z.string().max(500).optional(),
});

// Type exports
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof UpdateWorkOrderSchema>;
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
export type CreateAssetCategoryInput = z.infer<typeof CreateAssetCategorySchema>;
export type CreateMaintenancePlanInput = z.infer<typeof CreateMaintenancePlanSchema>;
export type CreateSparePartInput = z.infer<typeof CreateSparePartSchema>;
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
export type CreateMeterReadingInput = z.infer<typeof CreateMeterReadingSchema>;
export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;
