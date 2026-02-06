import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import * as AdminController from '../controllers/admin.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('admin_empresa', 'superadmin'));

// Plants
router.get('/plants', AdminController.listPlants);
router.post('/plants', AdminController.createPlant);
router.patch('/plants/:plantId', AdminController.updatePlant);
router.delete('/plants/:plantId', AdminController.deactivatePlant);

// Users
router.get('/users', AdminController.listUsers);
router.post('/users', AdminController.createUser);
router.patch('/users/:userId', AdminController.updateUser);

// Roles
router.get('/roles', AdminController.listRoles);

export default router;
