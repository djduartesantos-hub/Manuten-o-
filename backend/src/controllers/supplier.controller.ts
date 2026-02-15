import { Response } from 'express';
import { SupplierService } from '../services/supplier.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import {
  CreateSupplierInput,
  CreateSupplierSchema,
  UpdateSupplierSchema,
} from '../schemas/validation.js';
import { AuditService } from '../services/audit.service.js';
import { buildAuditDiffFromPatch, getClientIp } from '../utils/audit.js';

const supplierService = new SupplierService();

export async function getSuppliers(req: AuthenticatedRequest, res: Response) {
  try {
    const { search } = req.query;

    const suppliers = await supplierService.getSuppliers(req.tenantId!, {
      search: search as string,
    });

    res.json({
      success: true,
      data: suppliers,
      total: suppliers.length,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch suppliers',
    });
  }
}

export async function getSupplier(req: AuthenticatedRequest, res: Response) {
  try {
    const { supplier_id } = req.params;

    if (!supplier_id) {
      res.status(400).json({
        success: false,
        error: 'Supplier ID is required',
      });
      return;
    }

    const supplier = await supplierService.getSupplierById(req.tenantId!, supplier_id);

    res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch supplier',
    });
  }
}

export async function createSupplier(req: AuthenticatedRequest, res: Response) {
  try {
    const data = CreateSupplierSchema.parse(req.body) as CreateSupplierInput;

    const supplier = await supplierService.createSupplier(req.tenantId!, data);

    if (req.user?.userId) {
      try {
        await AuditService.createLog({
          tenant_id: String(req.tenantId),
          user_id: String(req.user.userId),
          action: 'create',
          entity_type: 'supplier',
          entity_id: String(supplier.id),
          old_values: null,
          new_values: {
            id: supplier.id,
            name: supplier.name,
            email: supplier.email,
            phone: supplier.phone,
          },
          ip_address: getClientIp(req),
        });
      } catch {
        // ignore
      }
    }

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    const isValidationError = error && typeof error === 'object' && 'errors' in error;
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create supplier',
      details: isValidationError ? (error as any).errors : undefined,
    });
  }
}

export async function updateSupplier(req: AuthenticatedRequest, res: Response) {
  try {
    const { supplier_id } = req.params;

    if (!supplier_id) {
      res.status(400).json({
        success: false,
        error: 'Supplier ID is required',
      });
      return;
    }

    const validation = UpdateSupplierSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    const before = await supplierService.getSupplierById(req.tenantId!, supplier_id);
    const supplier = await supplierService.updateSupplier(
      req.tenantId!,
      supplier_id,
      validation.data,
    );

    if (req.user?.userId && before) {
      const diff = buildAuditDiffFromPatch({
        before: before as any,
        after: supplier as any,
        patch: validation.data as any,
      });

      if (Object.keys(diff.oldValues).length > 0) {
        try {
          await AuditService.createLog({
            tenant_id: String(req.tenantId),
            user_id: String(req.user.userId),
            action: 'update',
            entity_type: 'supplier',
            entity_id: String(supplier.id),
            old_values: diff.oldValues,
            new_values: diff.newValues,
            ip_address: getClientIp(req),
          });
        } catch {
          // ignore
        }
      }
    }

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully',
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update supplier',
    });
  }
}

export async function deleteSupplier(req: AuthenticatedRequest, res: Response) {
  try {
    const { supplier_id } = req.params;

    if (!supplier_id) {
      res.status(400).json({
        success: false,
        error: 'Supplier ID is required',
      });
      return;
    }

    const before = await supplierService.getSupplierById(req.tenantId!, supplier_id);
    await supplierService.deleteSupplier(req.tenantId!, supplier_id);

    if (req.user?.userId && before) {
      try {
        await AuditService.createLog({
          tenant_id: String(req.tenantId),
          user_id: String(req.user.userId),
          action: 'delete',
          entity_type: 'supplier',
          entity_id: String(supplier_id),
          old_values: {
            id: (before as any).id,
            name: (before as any).name,
            email: (before as any).email,
            phone: (before as any).phone,
          },
          new_values: null,
          ip_address: getClientIp(req),
        });
      } catch {
        // ignore
      }
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete supplier',
    });
  }
}
