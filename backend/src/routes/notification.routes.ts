import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { getNotificationRules, updateNotificationRules } from '../controllers/notification.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/rules', requireRole('admin_empresa', 'superadmin', 'gestor_manutencao'), getNotificationRules);
router.put('/rules', requireRole('admin_empresa', 'superadmin', 'gestor_manutencao'), updateNotificationRules);

export default router;
