import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { getNotificationRules, updateNotificationRules } from '../controllers/notification.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/rules', requirePermission('notifications:read', 'tenant'), getNotificationRules);
router.put('/rules', requirePermission('notifications:write', 'tenant'), updateNotificationRules);

export default router;
