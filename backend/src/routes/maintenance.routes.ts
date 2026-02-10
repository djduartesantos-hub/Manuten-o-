import { Router } from 'express';
import * as MaintenanceController from '../controllers/maintenance.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

// Apply middlewares
// Note: tenantMiddleware NOT used here because route uses :plantId not :tenantId
router.use(authMiddleware);
router.use(plantMiddleware);

// Maintenance Plans
// GET /api/tenants/:plantId/plans - listar planos
router.get('/:plantId/plans', requirePermission('plans:read'), MaintenanceController.getMaintenancePlans);

// Preventive Maintenance Schedules
// GET /api/tenants/:plantId/preventive-schedules/upcoming - próximos agendamentos (dashboard)
router.get(
  '/:plantId/preventive-schedules/upcoming',
  requirePermission('schedules:read'),
  MaintenanceController.getUpcomingPreventiveSchedules,
);

// GET /api/tenants/:plantId/preventive-schedules - listar agendamentos
router.get(
  '/:plantId/preventive-schedules',
  requirePermission('schedules:read'),
  MaintenanceController.getPreventiveSchedules,
);

// POST /api/tenants/:plantId/preventive-schedules - criar agendamento
router.post(
  '/:plantId/preventive-schedules',
  requirePermission('schedules:write'),
  MaintenanceController.createPreventiveSchedule,
);

// PATCH /api/tenants/:plantId/preventive-schedules/:schedule_id - atualizar agendamento
router.patch(
  '/:plantId/preventive-schedules/:schedule_id',
  requirePermission('schedules:write'),
  MaintenanceController.updatePreventiveSchedule,
);

// POST /api/tenants/:plantId/preventive-schedules/:schedule_id/skip - skipar ciclo (com motivo)
router.post(
  '/:plantId/preventive-schedules/:schedule_id/skip',
  requirePermission('schedules:write'),
  MaintenanceController.skipPreventiveSchedule,
);

// POST /api/tenants/:plantId/plans - criar plano
router.post(
  '/:plantId/plans',
  requirePermission('plans:write'),
  MaintenanceController.createMaintenancePlan
);

// GET /api/tenants/:plantId/plans/:plan_id - detalhe do plano
router.get(
  '/:plantId/plans/:plan_id',
  requirePermission('plans:read'),
  MaintenanceController.getMaintenancePlan,
);

// PATCH /api/tenants/:plantId/plans/:plan_id - atualizar plano
router.patch(
  '/:plantId/plans/:plan_id',
  requirePermission('plans:write'),
  MaintenanceController.updateMaintenancePlan
);

// DELETE /api/tenants/:plantId/plans/:plan_id - eliminar plano
router.delete(
  '/:plantId/plans/:plan_id',
  requirePermission('plans:write'),
  MaintenanceController.deleteMaintenancePlan
);

// GET /api/tenants/:plantId/plans/asset/:asset_id/due - planos vencidos
router.get(
  '/:plantId/plans/asset/:asset_id/due',
  requirePermission('plans:read'),
  MaintenanceController.getMaintenancePlansDue,
);

// Maintenance Tasks
// GET /api/tenants/:plantId/plans/:plan_id/tasks - listar tarefas do plano
router.get(
  '/:plantId/plans/:plan_id/tasks',
  requirePermission('plans:read'),
  MaintenanceController.getMaintenanceTasks,
);

// POST /api/tenants/:plantId/plans/:plan_id/tasks - criar tarefa
router.post(
  '/:plantId/plans/:plan_id/tasks',
  requirePermission('plans:write'),
  MaintenanceController.createMaintenanceTask
);

// DELETE /api/tenants/:plantId/tasks/:task_id - eliminar tarefa
router.delete(
  '/:plantId/tasks/:task_id',
  requirePermission('plans:write'),
  MaintenanceController.deleteMaintenanceTask
);

export default router;
