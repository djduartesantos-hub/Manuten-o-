import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validation.js';
import {
  ChangePasswordSchema,
  DisableTotpSchema,
  UpdateProfileSchema,
  VerifyTotpSchema,
} from '../schemas/validation.js';
import { ProfileController } from '../controllers/profile.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', ProfileController.getProfile);
router.get('/home-route', ProfileController.getHomeRoute);
router.get('/permissions', ProfileController.getPermissions);
router.get('/sessions', ProfileController.listSessions);
router.post('/sessions/revoke-others', ProfileController.revokeOtherSessions);
router.post('/sessions/:sessionId/revoke', ProfileController.revokeSession);
router.patch('/', validateRequest(UpdateProfileSchema), ProfileController.updateProfile);
router.patch(
  '/password',
  validateRequest(ChangePasswordSchema),
  ProfileController.changePassword,
);
router.get('/mfa/totp', ProfileController.getTotpStatus);
router.post('/mfa/totp/setup', ProfileController.setupTotp);
router.post('/mfa/totp/verify', validateRequest(VerifyTotpSchema), ProfileController.verifyTotp);
router.delete('/mfa/totp', validateRequest(DisableTotpSchema), ProfileController.disableTotp);

export default router;
