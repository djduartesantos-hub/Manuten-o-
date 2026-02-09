import { z } from 'zod';

export const createMaintenanceKitSchema = z
  .object({
    name: z.string().min(2).max(120),
    notes: z.string().max(1000).optional(),
    plan_id: z.string().uuid().optional(),
    category_id: z.string().uuid().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((val) => !(val.plan_id && val.category_id), {
    message: 'Indique plan_id ou category_id (não ambos)',
    path: ['plan_id'],
  });

export const updateMaintenanceKitSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    notes: z.string().max(1000).optional(),
    plan_id: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((val) => !(val.plan_id && val.category_id), {
    message: 'Indique plan_id ou category_id (não ambos)',
    path: ['plan_id'],
  });

export const upsertMaintenanceKitItemsSchema = z.object({
  items: z
    .array(
      z.object({
        spare_part_id: z.string().uuid('Spare Part ID deve ser UUID'),
        quantity: z.number().int().positive('Quantidade deve ser positiva'),
      }),
    )
    .min(1, 'Indique pelo menos 1 item')
    .refine(
      (items) => {
        const ids = items.map((i) => i.spare_part_id);
        return new Set(ids).size === ids.length;
      },
      {
        message: 'Não repita a mesma peça no kit',
        path: ['items'],
      },
    ),
});

export type CreateMaintenanceKitInput = z.infer<typeof createMaintenanceKitSchema>;
export type UpdateMaintenanceKitInput = z.infer<typeof updateMaintenanceKitSchema>;
export type UpsertMaintenanceKitItemsInput = z.infer<typeof upsertMaintenanceKitItemsSchema>;
