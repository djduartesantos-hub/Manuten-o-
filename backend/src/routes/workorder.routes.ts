import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { WorkOrderController } from '../controllers/workorder.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadBaseDir = path.join(__dirname, '../../uploads');
const workOrderUpload = multer({
	storage: multer.diskStorage({
		destination: (req, _file, cb) => {
			const tenantId = (req as any).tenantId || (req as any).user?.tenantId || 'unknown-tenant';
			const workOrderId = String((req as any).params?.workOrderId || 'unknown-order');
			const dest = path.join(uploadBaseDir, tenantId, 'work-orders', workOrderId);
			try {
				fs.mkdirSync(dest, { recursive: true });
			} catch {
				// ignore
			}
			cb(null, dest);
		},
		filename: (_req, file, cb) => {
			const original = file.originalname || 'file';
			const ext = path.extname(original).slice(0, 12);
			const safeBase = path
				.basename(original, path.extname(original))
				.replace(/[^a-zA-Z0-9_.-]/g, '_')
				.slice(0, 60);
			cb(null, `${Date.now()}-${safeBase}${ext}`);
		},
	}),
	limits: { fileSize: 10 * 1024 * 1024 },
});

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

// Timeline/Events
router.get(
	'/:plantId/work-orders/:workOrderId/events',
	requirePermission('workorders:read'),
	WorkOrderController.listEvents,
);
router.post(
	'/:plantId/work-orders/:workOrderId/events/note',
	requirePermission('workorders:write'),
	WorkOrderController.addNoteEvent,
);

// Attachments (evidências)
router.get(
	'/:plantId/work-orders/:workOrderId/attachments',
	requirePermission('workorders:read'),
	WorkOrderController.listAttachments,
);
router.post(
	'/:plantId/work-orders/:workOrderId/attachments',
	requirePermission('workorders:write'),
	workOrderUpload.single('file'),
	WorkOrderController.uploadAttachment,
);

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

router.post(
	'/:plantId/work-orders/:workOrderId/reservations/:reservationId/consume',
	requirePermission('workorders:write'),
	WorkOrderController.consumeStockReservation,
);

export default router;
