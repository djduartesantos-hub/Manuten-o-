import { Router } from 'express';
import {
  createAssetCategory,
  listAssetCategories,
  updateAssetCategory,
} from '../controllers/asset-category.controller.js';
import { authMiddleware, tenantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/asset-categories', requirePermission('categories:read', 'tenant'), listAssetCategories);

router.post(
  '/asset-categories',
  requirePermission('categories:write', 'tenant'),
  createAssetCategory,
);

router.patch(
  '/asset-categories/:categoryId',
  requirePermission('categories:write', 'tenant'),
  updateAssetCategory,
);

export default router;
