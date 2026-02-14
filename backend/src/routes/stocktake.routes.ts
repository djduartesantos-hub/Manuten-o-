import { Router } from 'express';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { StocktakeController } from '../controllers/stocktake.controller.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(plantMiddleware);

router.get('/:plantId/stocktakes', requirePermission('stock:read'), StocktakeController.list);
router.post('/:plantId/stocktakes', requirePermission('stock:write'), StocktakeController.create);
router.get('/:plantId/stocktakes/:stocktakeId', requirePermission('stock:read'), StocktakeController.get);
router.patch(
  '/:plantId/stocktakes/:stocktakeId/items/:itemId',
  requirePermission('stock:write'),
  StocktakeController.updateItem,
);
router.post(
  '/:plantId/stocktakes/:stocktakeId/close',
  requirePermission('stock:write'),
  StocktakeController.close,
);
router.get(
  '/:plantId/stocktakes/:stocktakeId/export.csv',
  requirePermission('stock:read'),
  StocktakeController.exportCsv,
);

export default router;
