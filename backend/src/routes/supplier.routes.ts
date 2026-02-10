import { Router } from 'express';
import * as SupplierController from '../controllers/supplier.controller.js';
import { authMiddleware, plantMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(plantMiddleware);

// Suppliers
// GET /api/tenants/:plantId/suppliers - listar fornecedores
router.get('/:plantId/suppliers', requirePermission('suppliers:read'), SupplierController.getSuppliers);

// POST /api/tenants/:plantId/suppliers - criar fornecedor
router.post(
  '/:plantId/suppliers',
  requirePermission('suppliers:write'),
  SupplierController.createSupplier,
);

// GET /api/tenants/:plantId/suppliers/:supplier_id - detalhe do fornecedor
router.get(
  '/:plantId/suppliers/:supplier_id',
  requirePermission('suppliers:read'),
  SupplierController.getSupplier,
);

// PATCH /api/tenants/:plantId/suppliers/:supplier_id - atualizar fornecedor
router.patch(
  '/:plantId/suppliers/:supplier_id',
  requirePermission('suppliers:write'),
  SupplierController.updateSupplier,
);

// DELETE /api/tenants/:plantId/suppliers/:supplier_id - eliminar fornecedor
router.delete(
  '/:plantId/suppliers/:supplier_id',
  requirePermission('suppliers:write'),
  SupplierController.deleteSupplier,
);

export default router;
