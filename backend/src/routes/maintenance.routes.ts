import { Router } from 'express';
import * as MaintenanceController from '../controllers/maintenance.controller.js';
import { authMiddleware, tenantMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

// Apply middlewares
router.use(authMiddleware);
router.use(tenantMiddleware);

// Maintenance Plans
// GET /api/maintenance/plans - listar planos
router.get('/plans', MaintenanceController.getMaintenancePlans);

// POST /api/maintenance/plans - criar plano
router.post(
  '/plans',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.createMaintenancePlan
);

// GET /api/maintenance/plans/:plan_id - detalhe do plano
router.get('/plans/:plan_id', MaintenanceController.getMaintenancePlan);

// PATCH /api/maintenance/plans/:plan_id - atualizar plano
router.patch(
  '/plans/:plan_id',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.updateMaintenancePlan
);

// DELETE /api/maintenance/plans/:plan_id - eliminar plano
router.delete(
  '/plans/:plan_id',
  requireRole('supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.deleteMaintenancePlan
);

// GET /api/maintenance/plans/asset/:asset_id/due - planos vencidos
router.get('/plans/asset/:asset_id/due', MaintenanceController.getMaintenancePlansDue);

// Maintenance Tasks
// GET /api/maintenance/plans/:plan_id/tasks - listar tarefas do plano
router.get('/plans/:plan_id/tasks', MaintenanceController.getMaintenanceTasks);

// POST /api/maintenance/plans/:plan_id/tasks - criar tarefa
router.post(
  '/plans/:plan_id/tasks',
  requireRole('planner', 'supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.createMaintenanceTask
);

// DELETE /api/maintenance/tasks/:task_id - eliminar tarefa
router.delete(
  '/tasks/:task_id',
  requireRole('supervisor', 'maintenance_manager', 'admin'),
  MaintenanceController.deleteMaintenanceTask
);

export default router;
