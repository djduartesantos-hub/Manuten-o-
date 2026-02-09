import { Router } from 'express';
import { WorkOrderController } from '../controllers/workorder.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
router.use(authMiddleware);
router.use(plantMiddleware);

// Routes
router.get('/:plantId/work-orders', WorkOrderController.list);
router.post('/:plantId/work-orders', WorkOrderController.create);
router.get('/:plantId/work-orders/:workOrderId', WorkOrderController.get);
router.put('/:plantId/work-orders/:workOrderId', WorkOrderController.update);
router.delete('/:plantId/work-orders/:workOrderId', WorkOrderController.remove);
router.get('/:plantId/work-orders/:workOrderId/tasks', WorkOrderController.listTasks);
router.post('/:plantId/work-orders/:workOrderId/tasks', WorkOrderController.addTask);
router.patch('/:plantId/work-orders/:workOrderId/tasks/:taskId', WorkOrderController.updateTask);
router.get('/:plantId/work-orders/:workOrderId/audit', WorkOrderController.listAuditLogs);

// Stock Reservations (Phase 3)
router.get(
	'/:plantId/work-orders/:workOrderId/reservations',
	WorkOrderController.listStockReservations,
);
router.post(
	'/:plantId/work-orders/:workOrderId/reservations',
	WorkOrderController.createStockReservation,
);
router.post(
	'/:plantId/work-orders/:workOrderId/reservations/:reservationId/release',
	WorkOrderController.releaseStockReservation,
);

export default router;
