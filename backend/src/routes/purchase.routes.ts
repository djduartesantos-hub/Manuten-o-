import { Router } from 'express';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { PurchaseController } from '../controllers/purchase.controller.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(plantMiddleware);

router.get('/:plantId/purchase-requests', requirePermission('purchases:read'), PurchaseController.listRequests);
router.post('/:plantId/purchase-requests', requirePermission('purchases:write'), PurchaseController.createRequest);
router.get(
  '/:plantId/purchase-requests/:requestId',
  requirePermission('purchases:read'),
  PurchaseController.getRequest,
);
router.patch(
  '/:plantId/purchase-requests/:requestId',
  requirePermission('purchases:write'),
  PurchaseController.updateRequest,
);

router.get('/:plantId/purchase-orders', requirePermission('purchases:read'), PurchaseController.listOrders);
router.post('/:plantId/purchase-orders', requirePermission('purchases:write'), PurchaseController.createOrder);
router.get(
  '/:plantId/purchase-orders/:orderId',
  requirePermission('purchases:read'),
  PurchaseController.getOrder,
);
router.patch(
  '/:plantId/purchase-orders/:orderId',
  requirePermission('purchases:write'),
  PurchaseController.updateOrder,
);
router.post(
  '/:plantId/purchase-orders/:orderId/receive',
  requirePermission('purchases:write'),
  PurchaseController.receiveOrder,
);

export default router;
