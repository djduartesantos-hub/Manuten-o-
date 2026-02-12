import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import * as AdminController from '../controllers/admin.controller.js';

const router = Router();

function jsonRateLimit(options: { windowMs: number; limit: number; error: string }) {
	return rateLimit({
		windowMs: options.windowMs,
		limit: options.limit,
		standardHeaders: true,
		legacyHeaders: false,
		handler: (_req: Request, res: Response) => {
			return res.status(429).json({ success: false, error: options.error });
		},
	});
}

const adminExportLimiter = jsonRateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 60,
	error: 'Too many export requests. Please try again later.',
});

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

router.post(
	'/users/:userId/revoke-sessions',
	requirePermission('admin:users', 'tenant'),
	AdminController.revokeUserSessions,
);

// Roles
router.get('/roles', requirePermission('admin:users', 'tenant'), AdminController.listRoles);
router.post('/roles', requirePermission('admin:rbac', 'tenant'), AdminController.createRole);
router.patch('/roles/:roleKey', requirePermission('admin:rbac', 'tenant'), AdminController.updateRole);
router.get('/permissions', requirePermission('admin:rbac', 'tenant'), AdminController.listPermissions);
router.get('/rbac/matrix', requirePermission('admin:rbac', 'tenant'), AdminController.getRbacMatrix);
router.get(
	'/rbac/matrix/export',
	adminExportLimiter,
	requirePermission('admin:rbac', 'tenant'),
	AdminController.exportRbacMatrix,
);
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

// Role Home Pages (global + per-plant)
router.get('/role-homes', requirePermission('admin:rbac', 'tenant'), AdminController.listRoleHomePages);
router.put('/role-homes', requirePermission('admin:rbac', 'tenant'), AdminController.setRoleHomePages);

export default router;
