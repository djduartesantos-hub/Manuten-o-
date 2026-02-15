import { z } from 'zod';

const uuidField = (label: string) => z.string().uuid(`${label} deve ser UUID`);
const moneyField = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato decimal invalido');

export const purchaseRequestItemSchema = z.object({
  spare_part_id: uuidField('Spare Part ID'),
  supplier_id: uuidField('Supplier ID').optional(),
  quantity: z.number().int().min(1, 'Quantidade deve ser positiva'),
  unit_cost: moneyField.optional(),
  notes: z.string().max(1000).optional(),
});

export const createPurchaseRequestSchema = z.object({
  title: z.string().min(3, 'Titulo minimo 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
  needed_by: z.string().optional(),
  items: z.array(purchaseRequestItemSchema).min(1, 'Adicione pelo menos uma linha'),
});

export const updatePurchaseRequestSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
  needed_by: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'ordered', 'received', 'cancelled']).optional(),
  rejection_reason: z.string().max(2000).optional(),
});

export const purchaseOrderItemSchema = z.object({
  spare_part_id: uuidField('Spare Part ID'),
  quantity: z.number().int().min(1, 'Quantidade deve ser positiva'),
  unit_cost: moneyField.optional(),
  notes: z.string().max(1000).optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplier_id: uuidField('Supplier ID'),
  request_id: uuidField('Request ID').optional(),
  expected_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
});

export const updatePurchaseOrderSchema = z.object({
  status: z.enum(['draft', 'sent', 'partially_received', 'received', 'cancelled']).optional(),
  expected_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const receivePurchaseOrderSchema = z.object({
  received_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        purchase_order_item_id: uuidField('Item ID'),
        quantity: z.number().int().min(1, 'Quantidade deve ser positiva'),
        unit_cost: moneyField.optional(),
      }),
    )
    .min(1, 'Adicione pelo menos um item recebido'),
});

export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type UpdatePurchaseRequestInput = z.infer<typeof updatePurchaseRequestSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
