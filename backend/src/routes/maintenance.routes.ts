import { Router } from 'express';
import * as MaintenanceController from '../controllers/maintenance.controller.js';
import { authMiddleware, tenantMiddleware, plantMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(plantMiddleware);

// Maintenance Plans
// GET /api/tenants/:plantId/plans - listar planos
router.get('/:plantId/plans', MaintenanceController.getMaintenancePlans);

// POST /api/tenants/:plantId/plans - criar plano
router.post(
  '/:plantId/plans',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.createMaintenancePlan
);

// GET /api/tenants/:plantId/plans/:plan_id - detalhe do plano
router.get('/:plantId/plans/:plan_id', MaintenanceController.getMaintenancePlan);

// PATCH /api/tenants/:plantId/plans/:plan_id - atualizar plano
router.patch(
  '/:plantId/plans/:plan_id',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.updateMaintenancePlan
);

// DELETE /api/tenants/:plantId/plans/:plan_id - eliminar plano
router.delete(
  '/:plantId/plans/:plan_id',
  requireRole('supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.deleteMaintenancePlan
);

// GET /api/tenants/:plantId/plans/asset/:asset_id/due - planos vencidos
router.get('/:plantId/plans/asset/:asset_id/due', MaintenanceController.getMaintenancePlansDue);

// Maintenance Tasks
// GET /api/tenants/:plantId/plans/:plan_id/tasks - listar tarefas do plano
router.get('/:plantId/plans/:plan_id/tasks', MaintenanceController.getMaintenanceTasks);

// POST /api/tenants/:plantId/plans/:plan_id/tasks - criar tarefa
router.post(
  '/:plantId/plans/:plan_id/tasks',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.createMaintenanceTask
);

// DELETE /api/tenants/:plantId/tasks/:task_id - eliminar tarefa
router.delete(
  '/:plantId/tasks/:task_id',
  requireRole('supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.deleteMaintenanceTask
);

export default router;
