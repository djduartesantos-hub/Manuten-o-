import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { LoginSchema, RefreshTokenSchema } from '../schemas/validation.js';
import { validateRequest } from '../middlewares/validation.js';
import { tenantSlugMiddleware } from '../middlewares/tenant.js';

const router = Router({ mergeParams: true });

router.post('/login', tenantSlugMiddleware, validateRequest(LoginSchema), AuthController.login);
router.post('/refresh', validateRequest(RefreshTokenSchema), AuthController.refresh);

export default router;
