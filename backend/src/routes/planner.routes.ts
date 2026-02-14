import { Router } from 'express';
import { PlannerController } from '../controllers/planner.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(plantMiddleware);

// Planner (unified calendar): preventive schedules + work orders + planned downtimes
router.get(
  '/:plantId/planner',
  requirePermission('schedules:read'),
  requirePermission('workorders:read'),
  PlannerController.listPlanner,
);

// Planned Downtimes (CRUD)
router.get(
  '/:plantId/planned-downtimes',
  requirePermission('workorders:read'),
  PlannerController.listPlannedDowntimes,
);

router.post(
  '/:plantId/planned-downtimes',
  requirePermission('workorders:write'),
  PlannerController.createPlannedDowntime,
);

router.put(
  '/:plantId/planned-downtimes/:downtimeId',
  requirePermission('workorders:write'),
  PlannerController.updatePlannedDowntime,
);

router.delete(
  '/:plantId/planned-downtimes/:downtimeId',
  requirePermission('workorders:write'),
  PlannerController.deletePlannedDowntime,
);

export default router;
