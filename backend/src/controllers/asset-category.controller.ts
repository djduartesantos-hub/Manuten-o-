import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import {
  CreateAssetCategorySchema,
  UpdateAssetCategorySchema,
} from '../schemas/validation.js';
import { AssetCategoryService } from '../services/asset-category.service.js';

const categoryService = new AssetCategoryService();

export async function listAssetCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const categories = await categoryService.getCategories(req.tenantId!);
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error listing asset categories:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories',
    });
  }
}

export async function createAssetCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const data = CreateAssetCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(req.tenantId!, data);
    res.status(201).json({
      success: true,
      data: category,
      message: 'Categoria criada com sucesso',
    });
  } catch (error) {
    console.error('Error creating asset category:', error);
    const isValidationError = error && typeof error === 'object' && 'errors' in error;
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create category',
      details: isValidationError ? (error as any).errors : undefined,
    });
  }
}

export async function updateAssetCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      res.status(400).json({
        success: false,
        error: 'Category ID is required',
      });
      return;
    }

    const validation = UpdateAssetCategorySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    const category = await categoryService.updateCategory(
      req.tenantId!,
      categoryId,
      validation.data,
    );

    res.json({
      success: true,
      data: category,
      message: 'Categoria atualizada com sucesso',
    });
  } catch (error) {
    console.error('Error updating asset category:', error);
    res.status(error instanceof Error && error.message.includes('nao encontrada') ? 404 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update category',
    });
  }
}
