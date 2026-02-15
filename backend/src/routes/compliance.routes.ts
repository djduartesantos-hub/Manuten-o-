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
  requirePermission('assets:read', 'tenant'),
  ComplianceController.getLifecycle,
);
router.put(
  '/assets/:assetId/lifecycle',
  requirePermission('assets:write', 'tenant'),
  validateRequest(UpsertAssetLifecycleSchema),
  ComplianceController.upsertLifecycle,
);

// Certifications
router.get(
  '/assets/:assetId/certifications',
  requirePermission('assets:read', 'tenant'),
  ComplianceController.listCertifications,
);
router.post(
  '/assets/:assetId/certifications',
  requirePermission('assets:write', 'tenant'),
  validateRequest(CreateAssetCertificationSchema),
  ComplianceController.createCertification,
);
router.patch(
  '/certifications/:id',
  requirePermission('assets:write', 'tenant'),
  validateRequest(UpdateAssetCertificationSchema),
  ComplianceController.updateCertification,
);
router.delete(
  '/certifications/:id',
  requirePermission('assets:write', 'tenant'),
  ComplianceController.deleteCertification,
);

// Inspections
router.get(
  '/assets/:assetId/inspections',
  requirePermission('assets:read', 'tenant'),
  ComplianceController.listInspections,
);
router.post(
  '/assets/:assetId/inspections',
  requirePermission('assets:write', 'tenant'),
  validateRequest(CreateAssetInspectionSchema),
  ComplianceController.createInspection,
);
router.patch(
  '/inspections/:id',
  requirePermission('assets:write', 'tenant'),
  validateRequest(UpdateAssetInspectionSchema),
  ComplianceController.updateInspection,
);
router.delete(
  '/inspections/:id',
  requirePermission('assets:write', 'tenant'),
  ComplianceController.deleteInspection,
);

// Calibrations
router.get(
  '/assets/:assetId/calibrations',
  requirePermission('assets:read', 'tenant'),
  ComplianceController.listCalibrations,
);
router.post(
  '/assets/:assetId/calibrations',
  requirePermission('assets:write', 'tenant'),
  validateRequest(CreateAssetCalibrationSchema),
  ComplianceController.createCalibration,
);
router.patch(
  '/calibrations/:id',
  requirePermission('assets:write', 'tenant'),
  validateRequest(UpdateAssetCalibrationSchema),
  ComplianceController.updateCalibration,
);
router.delete(
  '/calibrations/:id',
  requirePermission('assets:write', 'tenant'),
  ComplianceController.deleteCalibration,
);

// Tags (QR/NFC)
router.get(
  '/assets/:assetId/tags',
  requirePermission('assets:read', 'tenant'),
  ComplianceController.listTags,
);
router.get(
  '/tags/lookup',
  requirePermission('assets:read', 'tenant'),
  ComplianceController.lookupTag,
);
router.post(
  '/assets/:assetId/tags',
  requirePermission('assets:write', 'tenant'),
  validateRequest(CreateAssetTagSchema),
  ComplianceController.createTag,
);
router.patch(
  '/tags/:id',
  requirePermission('assets:write', 'tenant'),
  validateRequest(UpdateAssetTagSchema),
  ComplianceController.updateTag,
);
router.delete(
  '/tags/:id',
  requirePermission('assets:write', 'tenant'),
  ComplianceController.deleteTag,
);

export default router;
