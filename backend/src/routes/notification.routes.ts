import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import {
	clearNotificationsInbox,
	deleteNotificationInboxItem,
	getNotificationsInbox,
	getNotificationRules,
	markNotificationRead,
	markNotificationUnread,
	markNotificationsReadAll,
	updateNotificationRules,
} from '../controllers/notification.controller.js';
import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  listNotificationTemplates,
  updateNotificationTemplate,
} from '../controllers/integrations.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/rules', requirePermission('notifications:read', 'tenant'), getNotificationRules);
router.put('/rules', requirePermission('notifications:write', 'tenant'), updateNotificationRules);

router.get('/templates', requirePermission('notifications:read', 'tenant'), listNotificationTemplates);
router.post('/templates', requirePermission('notifications:write', 'tenant'), createNotificationTemplate);
router.patch('/templates/:templateId', requirePermission('notifications:write', 'tenant'), updateNotificationTemplate);
router.delete('/templates/:templateId', requirePermission('notifications:write', 'tenant'), deleteNotificationTemplate);

router.get('/inbox', requirePermission('notifications:read', 'tenant'), getNotificationsInbox);
router.patch('/inbox/read-all', requirePermission('notifications:read', 'tenant'), markNotificationsReadAll);
router.patch('/inbox/:notificationId/read', requirePermission('notifications:read', 'tenant'), markNotificationRead);
router.patch('/inbox/:notificationId/unread', requirePermission('notifications:read', 'tenant'), markNotificationUnread);
router.delete('/inbox', requirePermission('notifications:read', 'tenant'), clearNotificationsInbox);
router.delete('/inbox/:notificationId', requirePermission('notifications:read', 'tenant'), deleteNotificationInboxItem);

export default router;
