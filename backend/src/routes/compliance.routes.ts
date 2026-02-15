import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { validateRequest } from '../middlewares/validation.js';
import {
  CreateAssetCalibrationSchema,
  CreateAssetCertificationSchema,
  CreateAssetInspectionSchema,
  CreateAssetTagSchema,
  UpdateAssetCalibrationSchema,
  UpdateAssetCertificationSchema,
  UpdateAssetInspectionSchema,
  UpdateAssetTagSchema,
  UpsertAssetLifecycleSchema,
} from '../schemas/validation.js';
import { ComplianceController } from '../controllers/compliance.controller.js';

const router = Router();

router.use(authMiddleware);

// Asset lifecycle
router.get(
  '/assets/:assetId/lifecycle',
  requirePermission('assets:read'),
  ComplianceController.getLifecycle,
);
router.put(
  '/assets/:assetId/lifecycle',
  requirePermission('assets:write'),
  validateRequest(UpsertAssetLifecycleSchema),
  ComplianceController.upsertLifecycle,
);

// Certifications
router.get(
  '/assets/:assetId/certifications',
  requirePermission('assets:read'),
  ComplianceController.listCertifications,
);
router.post(
  '/assets/:assetId/certifications',
  requirePermission('assets:write'),
  validateRequest(CreateAssetCertificationSchema),
  ComplianceController.createCertification,
);
router.patch(
  '/certifications/:id',
  requirePermission('assets:write'),
  validateRequest(UpdateAssetCertificationSchema),
  ComplianceController.updateCertification,
);
router.delete(
  '/certifications/:id',
  requirePermission('assets:write'),
  ComplianceController.deleteCertification,
);

// Inspections
router.get(
  '/assets/:assetId/inspections',
  requirePermission('assets:read'),
  ComplianceController.listInspections,
);
router.post(
  '/assets/:assetId/inspections',
  requirePermission('assets:write'),
  validateRequest(CreateAssetInspectionSchema),
  ComplianceController.createInspection,
);
router.patch(
  '/inspections/:id',
  requirePermission('assets:write'),
  validateRequest(UpdateAssetInspectionSchema),
  ComplianceController.updateInspection,
);
router.delete(
  '/inspections/:id',
  requirePermission('assets:write'),
  ComplianceController.deleteInspection,
);

// Calibrations
router.get(
  '/assets/:assetId/calibrations',
  requirePermission('assets:read'),
  ComplianceController.listCalibrations,
);
router.post(
  '/assets/:assetId/calibrations',
  requirePermission('assets:write'),
  validateRequest(CreateAssetCalibrationSchema),
  ComplianceController.createCalibration,
);
router.patch(
  '/calibrations/:id',
  requirePermission('assets:write'),
  validateRequest(UpdateAssetCalibrationSchema),
  ComplianceController.updateCalibration,
);
router.delete(
  '/calibrations/:id',
  requirePermission('assets:write'),
  ComplianceController.deleteCalibration,
);

// Tags (QR/NFC)
router.get(
  '/assets/:assetId/tags',
  requirePermission('assets:read'),
  ComplianceController.listTags,
);
router.get(
  '/tags/lookup',
  requirePermission('assets:read'),
  ComplianceController.lookupTag,
);
router.post(
  '/assets/:assetId/tags',
  requirePermission('assets:write'),
  validateRequest(CreateAssetTagSchema),
  ComplianceController.createTag,
);
router.patch(
  '/tags/:id',
  requirePermission('assets:write'),
  validateRequest(UpdateAssetTagSchema),
  ComplianceController.updateTag,
);
router.delete(
  '/tags/:id',
  requirePermission('assets:write'),
  ComplianceController.deleteTag,
);

export default router;
