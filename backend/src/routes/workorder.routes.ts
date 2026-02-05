import { Router } from 'express';
import { WorkOrderController } from '../controllers/workorder.controller.js';
import { authMiddleware, tenantMiddleware, plantMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(plantMiddleware);

// Routes
router.get('/:plantId/work-orders', WorkOrderController.list);
router.post('/:plantId/work-orders', WorkOrderController.create);
router.get('/:plantId/work-orders/:workOrderId', WorkOrderController.get);
router.put('/:plantId/work-orders/:workOrderId', WorkOrderController.update);

export default router;
