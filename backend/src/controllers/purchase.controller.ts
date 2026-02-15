import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { PurchaseService } from '../services/purchase.service.js';
import {
  createPurchaseOrderSchema,
  createPurchaseRequestSchema,
  CreatePurchaseOrderInput,
  CreatePurchaseRequestInput,
  ReceivePurchaseOrderInput,
  receivePurchaseOrderSchema,
  updatePurchaseOrderSchema,
  updatePurchaseRequestSchema,
} from '../schemas/purchase.validation.js';

const purchaseService = new PurchaseService();

export class PurchaseController {
  static async listRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const status = req.query?.status as string | undefined;
      if (!req.tenantId || !plantId) {
        res.status(400).json({ success: false, error: 'Plant ID is required' });
        return;
      }

      const rows = await purchaseService.listPurchaseRequests(req.tenantId, plantId, status);
      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list purchase requests',
      });
    }
  }

  static async getRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId, requestId } = req.params;
      if (!req.tenantId || !plantId || !requestId) {
        res.status(400).json({ success: false, error: 'Request ID is required' });
        return;
      }

      const request = await purchaseService.getPurchaseRequest(req.tenantId, plantId, requestId);
      if (!request) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }

      res.json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch purchase request',
      });
    }
  }

  static async createRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      if (!req.tenantId || !plantId || !req.user?.userId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const validation = createPurchaseRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const payload = validation.data as CreatePurchaseRequestInput;

      const request = await purchaseService.createPurchaseRequest(
        req.tenantId,
        plantId,
        String(req.user.userId),
        payload,
      );

      res.status(201).json({ success: true, data: request });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create purchase request',
      });
    }
  }

  static async updateRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId, requestId } = req.params;
      if (!req.tenantId || !plantId || !requestId) {
        res.status(400).json({ success: false, error: 'Request ID is required' });
        return;
      }

      const validation = updatePurchaseRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const updates: any = { ...validation.data };
      const status = updates.status as string | undefined;

      if (status === 'submitted') {
        updates.updated_at = new Date();
      }

      if (status === 'approved') {
        updates.approved_by = req.user?.userId ?? null;
        updates.approved_at = new Date();
      }

      if (status === 'rejected') {
        updates.rejected_by = req.user?.userId ?? null;
        updates.rejected_at = new Date();
      }

      if (status === 'ordered') {
        updates.ordered_at = new Date();
      }

      if (status === 'received') {
        updates.received_at = new Date();
      }

      const request = await purchaseService.updatePurchaseRequest(req.tenantId, plantId, requestId, updates);
      if (!request) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }

      res.json({ success: true, data: request });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update purchase request',
      });
    }
  }

  static async listOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const status = req.query?.status as string | undefined;
      if (!req.tenantId || !plantId) {
        res.status(400).json({ success: false, error: 'Plant ID is required' });
        return;
      }

      const rows = await purchaseService.listPurchaseOrders(req.tenantId, plantId, status);
      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list purchase orders',
      });
    }
  }

  static async getOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId, orderId } = req.params;
      if (!req.tenantId || !plantId || !orderId) {
        res.status(400).json({ success: false, error: 'Order ID is required' });
        return;
      }

      const order = await purchaseService.getPurchaseOrder(req.tenantId, plantId, orderId);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch purchase order',
      });
    }
  }

  static async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      if (!req.tenantId || !plantId || !req.user?.userId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const validation = createPurchaseOrderSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const payload = validation.data as CreatePurchaseOrderInput;

      const order = await purchaseService.createPurchaseOrder(
        req.tenantId,
        plantId,
        String(req.user.userId),
        payload,
      );

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create purchase order',
      });
    }
  }

  static async updateOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId, orderId } = req.params;
      if (!req.tenantId || !plantId || !orderId) {
        res.status(400).json({ success: false, error: 'Order ID is required' });
        return;
      }

      const validation = updatePurchaseOrderSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const updates: any = { ...validation.data };
      if (updates.status === 'sent' && !updates.ordered_at) {
        updates.ordered_at = new Date();
      }

      const order = await purchaseService.updatePurchaseOrder(req.tenantId, plantId, orderId, updates);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      res.json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update purchase order',
      });
    }
  }

  static async receiveOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId, orderId } = req.params;
      if (!req.tenantId || !plantId || !orderId || !req.user?.userId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const validation = receivePurchaseOrderSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
        return;
      }

      const payload = validation.data as ReceivePurchaseOrderInput;

      const result = await purchaseService.receivePurchaseOrder(
        req.tenantId,
        plantId,
        orderId,
        String(req.user.userId),
        payload,
      );

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to receive purchase order',
      });
    }
  }
}
