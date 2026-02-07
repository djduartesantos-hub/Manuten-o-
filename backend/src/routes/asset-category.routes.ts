import { Router } from 'express';
import {
  createAssetCategory,
  listAssetCategories,
  updateAssetCategory,
} from '../controllers/asset-category.controller.js';
import { authMiddleware, requireRole, tenantMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/asset-categories', listAssetCategories);

router.post(
  '/asset-categories',
  requireRole('tecnico', 'supervisor', 'gestor_manutencao', 'admin_empresa', 'superadmin'),
  createAssetCategory,
);

router.patch(
  '/asset-categories/:categoryId',
  requireRole('supervisor', 'gestor_manutencao', 'admin_empresa', 'superadmin'),
  updateAssetCategory,
);

export default router;
