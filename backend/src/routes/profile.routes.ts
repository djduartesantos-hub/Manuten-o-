import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validation.js';
import { ChangePasswordSchema, UpdateProfileSchema } from '../schemas/validation.js';
import { ProfileController } from '../controllers/profile.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', ProfileController.getProfile);
router.get('/home-route', ProfileController.getHomeRoute);
router.get('/permissions', ProfileController.getPermissions);
router.patch('/', validateRequest(UpdateProfileSchema), ProfileController.updateProfile);
router.patch(
  '/password',
  validateRequest(ChangePasswordSchema),
  ProfileController.changePassword,
);

export default router;
