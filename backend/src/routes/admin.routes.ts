import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { validateRequest } from '../middlewares/validation.js';
import * as AdminController from '../controllers/admin.controller.js';
import * as SecurityController from '../controllers/security.controller.js';
import * as SlaController from '../controllers/sla.controller.js';
import { CreateSLARuleSchema, UpdateTenantSecurityPolicySchema } from '../schemas/validation.js';

const router = Router();

const adminWriteLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 60,
	standardHeaders: true,
	legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: true,
	legacyHeaders: false,
});

const rbacWriteLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 80,
	standardHeaders: true,
	legacyHeaders: false,
});

router.use(authMiddleware);

// Plants
router.get('/plants', requirePermission('admin:plants', 'tenant'), AdminController.listPlants);
router.post('/plants', requirePermission('admin:plants', 'tenant'), AdminController.createPlant);
router.patch('/plants/:plantId', requirePermission('admin:plants', 'tenant'), AdminController.updatePlant);
router.delete('/plants/:plantId', requirePermission('admin:plants', 'tenant'), AdminController.deactivatePlant);

// Tenant Security Policy (password policy + login lockout)
router.get('/security-policy', requirePermission('admin:users', 'tenant'), SecurityController.getTenantSecurityPolicy);
router.patch(
	'/security-policy',
	requirePermission('admin:users', 'tenant'),
	adminWriteLimiter,
	validateRequest(UpdateTenantSecurityPolicySchema),
	SecurityController.updateTenantSecurityPolicy,
);

// Users
router.get('/users', requirePermission('admin:users', 'tenant'), AdminController.listUsers);
router.post('/users', requirePermission('admin:users', 'tenant'), AdminController.createUser);
router.patch('/users/:userId', requirePermission('admin:users', 'tenant'), AdminController.updateUser);
router.post(
	'/users/:userId/reset-password',
	requirePermission('admin:users', 'tenant'),
	passwordResetLimiter,
	AdminController.resetUserPassword,
);

// Roles
router.get('/roles', requirePermission('admin:users', 'tenant'), AdminController.listRoles);
router.post('/roles', requirePermission('admin:rbac', 'tenant'), rbacWriteLimiter, AdminController.createRole);
router.patch('/roles/:roleKey', requirePermission('admin:rbac', 'tenant'), rbacWriteLimiter, AdminController.updateRole);
router.get('/permissions', requirePermission('admin:rbac', 'tenant'), AdminController.listPermissions);
router.get('/roles/export.csv', requirePermission('admin:rbac', 'tenant'), AdminController.exportRbacMatrix);
router.get(
	'/roles/:roleKey/permissions',
	requirePermission('admin:rbac', 'tenant'),
	AdminController.getRolePermissions,
);
router.put(
	'/roles/:roleKey/permissions',
	requirePermission('admin:rbac', 'tenant'),
	rbacWriteLimiter,
	AdminController.setRolePermissions,
);

// Role Home Pages (global + per-plant)
router.get('/role-homes', requirePermission('admin:rbac', 'tenant'), AdminController.listRoleHomePages);
router.put('/role-homes', requirePermission('admin:rbac', 'tenant'), rbacWriteLimiter, AdminController.setRoleHomePages);

// SLA Rules (work_order + ticket)
router.get('/sla-rules', requirePermission('admin:rbac', 'tenant'), SlaController.listSlaRules);
router.post(
	'/sla-rules',
	requirePermission('admin:rbac', 'tenant'),
	validateRequest(CreateSLARuleSchema),
	SlaController.upsertSlaRule,
);
router.delete('/sla-rules/:ruleId', requirePermission('admin:rbac', 'tenant'), SlaController.deactivateSlaRule);

export default router;
