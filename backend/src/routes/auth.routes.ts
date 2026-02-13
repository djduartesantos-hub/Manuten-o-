import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { LoginSchema, RefreshTokenSchema } from '../schemas/validation.js';
import { validateRequest } from '../middlewares/validation.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.get('/status', AuthController.status);
router.post('/login', validateRequest(LoginSchema), AuthController.login);
router.post('/refresh', validateRequest(RefreshTokenSchema), AuthController.refresh);
router.post('/logout', authMiddleware, AuthController.logout);
router.post('/logout-all', authMiddleware, AuthController.logoutAll);

export default router;
