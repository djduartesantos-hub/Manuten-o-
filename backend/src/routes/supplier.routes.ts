import { Router } from 'express';
import * as SupplierController from '../controllers/supplier.controller.js';
import { authMiddleware, plantMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(plantMiddleware);

// Suppliers
// GET /api/tenants/:plantId/suppliers - listar fornecedores
router.get('/:plantId/suppliers', SupplierController.getSuppliers);

// POST /api/tenants/:plantId/suppliers - criar fornecedor
router.post(
  '/:plantId/suppliers',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  SupplierController.createSupplier,
);

// GET /api/tenants/:plantId/suppliers/:supplier_id - detalhe do fornecedor
router.get('/:plantId/suppliers/:supplier_id', SupplierController.getSupplier);

// PATCH /api/tenants/:plantId/suppliers/:supplier_id - atualizar fornecedor
router.patch(
  '/:plantId/suppliers/:supplier_id',
  requireRole('gestor_manutencao', 'supervisor', 'admin_empresa', 'superadmin'),
  SupplierController.updateSupplier,
);

// DELETE /api/tenants/:plantId/suppliers/:supplier_id - eliminar fornecedor
router.delete(
  '/:plantId/suppliers/:supplier_id',
  requireRole('supervisor', 'gestor_manutencao', 'admin_empresa', 'superadmin'),
  SupplierController.deleteSupplier,
);

export default router;
