import { Router } from 'express';
import { WorkOrderController } from '../controllers/workorder.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
router.use(authMiddleware);
router.use(plantMiddleware);

// Routes
router.get('/:plantId/work-orders', requirePermission('workorders:read'), WorkOrderController.list);
router.post('/:plantId/work-orders', requirePermission('workorders:write'), WorkOrderController.create);
router.get('/:plantId/work-orders/:workOrderId', requirePermission('workorders:read'), WorkOrderController.get);
router.put('/:plantId/work-orders/:workOrderId', requirePermission('workorders:write'), WorkOrderController.update);
router.delete('/:plantId/work-orders/:workOrderId', requirePermission('workorders:write'), WorkOrderController.remove);
router.get('/:plantId/work-orders/:workOrderId/tasks', requirePermission('workorders:read'), WorkOrderController.listTasks);
router.post('/:plantId/work-orders/:workOrderId/tasks', requirePermission('workorders:write'), WorkOrderController.addTask);
router.patch('/:plantId/work-orders/:workOrderId/tasks/:taskId', requirePermission('workorders:write'), WorkOrderController.updateTask);
router.delete('/:plantId/work-orders/:workOrderId/tasks/:taskId', requirePermission('workorders:write'), WorkOrderController.removeTask);
router.get('/:plantId/work-orders/:workOrderId/audit', requirePermission('workorders:read'), WorkOrderController.listAuditLogs);

// Stock Reservations (Phase 3)
router.get(
	'/:plantId/work-orders/:workOrderId/reservations',
	requirePermission('workorders:read'),
	WorkOrderController.listStockReservations,
);
router.post(
	'/:plantId/work-orders/:workOrderId/reservations',
	requirePermission('workorders:write'),
	WorkOrderController.createStockReservation,
);
router.post(
	'/:plantId/work-orders/:workOrderId/reservations/:reservationId/release',
	requirePermission('workorders:write'),
	WorkOrderController.releaseStockReservation,
);

export default router;
