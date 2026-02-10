import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import * as AdminController from '../controllers/admin.controller.js';

const router = Router();

router.use(authMiddleware);

// Plants
router.get('/plants', requirePermission('admin:plants', 'tenant'), AdminController.listPlants);
router.post('/plants', requirePermission('admin:plants', 'tenant'), AdminController.createPlant);
router.patch('/plants/:plantId', requirePermission('admin:plants', 'tenant'), AdminController.updatePlant);
router.delete('/plants/:plantId', requirePermission('admin:plants', 'tenant'), AdminController.deactivatePlant);

// Users
router.get('/users', requirePermission('admin:users', 'tenant'), AdminController.listUsers);
router.post('/users', requirePermission('admin:users', 'tenant'), AdminController.createUser);
router.patch('/users/:userId', requirePermission('admin:users', 'tenant'), AdminController.updateUser);
router.post(
	'/users/:userId/reset-password',
	requirePermission('admin:users', 'tenant'),
	AdminController.resetUserPassword,
);

// Roles
router.get('/roles', requirePermission('admin:users', 'tenant'), AdminController.listRoles);
router.get('/permissions', requirePermission('admin:rbac', 'tenant'), AdminController.listPermissions);
router.get(
	'/roles/:roleKey/permissions',
	requirePermission('admin:rbac', 'tenant'),
	AdminController.getRolePermissions,
);
router.put(
	'/roles/:roleKey/permissions',
	requirePermission('admin:rbac', 'tenant'),
	AdminController.setRolePermissions,
);

export default router;
