import { z } from 'zod';

export const createStockReservationSchema = z.object({
  spare_part_id: z.string().uuid('Spare Part ID deve ser UUID'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  notes: z.string().max(1000).optional(),
});

export const releaseStockReservationSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const consumeStockReservationSchema = z.object({
  quantity: z.number().int().positive('Quantidade deve ser positiva').optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateStockReservationInput = z.infer<typeof createStockReservationSchema>;
export type ReleaseStockReservationInput = z.infer<typeof releaseStockReservationSchema>;
export type ConsumeStockReservationInput = z.infer<typeof consumeStockReservationSchema>;
