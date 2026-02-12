import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import {
	clearNotificationsInbox,
	deleteNotificationInboxItem,
	getNotificationsInbox,
	getNotificationRules,
	markNotificationsReadAll,
	updateNotificationRules,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/rules', requirePermission('notifications:read', 'tenant'), getNotificationRules);
router.put('/rules', requirePermission('notifications:write', 'tenant'), updateNotificationRules);

router.get('/inbox', requirePermission('notifications:read', 'tenant'), getNotificationsInbox);
router.patch('/inbox/read-all', requirePermission('notifications:read', 'tenant'), markNotificationsReadAll);
router.delete('/inbox', requirePermission('notifications:read', 'tenant'), clearNotificationsInbox);
router.delete('/inbox/:notificationId', requirePermission('notifications:read', 'tenant'), deleteNotificationInboxItem);

export default router;
