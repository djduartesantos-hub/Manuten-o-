import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import {
	clearNotificationsInbox,
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
router.patch('/inbox/read-all', requirePermission('notifications:write', 'tenant'), markNotificationsReadAll);
router.delete('/inbox', requirePermission('notifications:write', 'tenant'), clearNotificationsInbox);

export default router;
