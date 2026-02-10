import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { LoginSchema, RefreshTokenSchema } from '../schemas/validation.js';
import { validateRequest } from '../middlewares/validation.js';

const router = Router();

router.get('/status', AuthController.status);
router.post('/login', validateRequest(LoginSchema), AuthController.login);
router.post('/refresh', validateRequest(RefreshTokenSchema), AuthController.refresh);

export default router;
