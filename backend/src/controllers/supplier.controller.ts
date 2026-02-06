import { Response } from 'express';
import { SupplierService } from '../services/supplier.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { CreateSupplierSchema, UpdateSupplierSchema } from '../schemas/validation.js';

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
    const validation = CreateSupplierSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    const supplier = await supplierService.createSupplier(req.tenantId!, validation.data);

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create supplier',
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

    const supplier = await supplierService.updateSupplier(
      req.tenantId!,
      supplier_id,
      validation.data,
    );

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

    await supplierService.deleteSupplier(req.tenantId!, supplier_id);

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
