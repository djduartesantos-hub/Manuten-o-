import { z } from 'zod';

// Spare Part Schemas
export const createSparePartSchema = z.object({
  code: z.string().min(1, 'Código obrigatório').max(50),
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  unit_cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato decimal inválido').optional(),
  supplier_id: z.string().uuid('Supplier ID deve ser UUID').optional(),
});

export const updateSparePartSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  unit_cost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  supplier_id: z.string().uuid().optional(),
});

// Stock Movement Schemas
export const createStockMovementSchema = z.object({
  spare_part_id: z.string().uuid('Spare Part ID deve ser UUID'),
  plant_id: z.string().uuid('Plant ID deve ser UUID'),
  work_order_id: z.string().uuid('Work Order ID deve ser UUID').optional(),
  type: z.enum(['entrada', 'saida', 'ajuste']),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  unit_cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato decimal inválido').optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateSparePartInput = z.infer<typeof createSparePartSchema>;
export type UpdateSparePartInput = z.infer<typeof updateSparePartSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
