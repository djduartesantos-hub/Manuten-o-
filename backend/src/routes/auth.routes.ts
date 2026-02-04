import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { LoginSchema, RefreshTokenSchema } from '../schemas/validation';
import { validateRequest } from '../middlewares/validation';

const router = Router();

router.post('/login', validateRequest(LoginSchema), AuthController.login);
router.post('/refresh', validateRequest(RefreshTokenSchema), AuthController.refresh);

export default router;
