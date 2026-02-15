import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { ComplianceService } from '../services/compliance.service.js';

function requireTenantAndAsset(req: AuthenticatedRequest, res: Response) {
  const tenantId = String(req.tenantId || '').trim();
  const assetId = String(req.params?.assetId || '').trim();
  if (!tenantId || !assetId) {
    res.status(400).json({ success: false, error: 'Tenant ID e asset ID obrigatorios' });
    return null;
  }
  return { tenantId, assetId };
}

async function ensureAsset(tenantId: string, assetId: string, res: Response) {
  const asset = await ComplianceService.getAsset(tenantId, assetId);
  if (!asset) {
    res.status(404).json({ success: false, error: 'Asset not found' });
    return null;
  }
  return asset;
}

export class ComplianceController {
  static async getLifecycle(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ComplianceService.getAsset(ids.tenantId, ids.assetId);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Asset not found' });
      return;
    }

    const lifecycle = await ComplianceService.getLifecycle(ids.tenantId, ids.assetId);
    res.json({ success: true, data: lifecycle || null });
  }

  static async upsertLifecycle(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ComplianceService.getAsset(ids.tenantId, ids.assetId);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Asset not found' });
      return;
    }

    const lifecycle = await ComplianceService.upsertLifecycle(ids.tenantId, ids.assetId, req.body || {});
    res.json({ success: true, data: lifecycle || null });
  }

  static async listCertifications(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const data = await ComplianceService.listCertifications(ids.tenantId, ids.assetId);
    res.json({ success: true, data });
  }

  static async createCertification(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const row = await ComplianceService.createCertification(ids.tenantId, ids.assetId, req.body || {});
    res.status(201).json({ success: true, data: row });
  }

  static async updateCertification(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    const row = await ComplianceService.updateCertification(tenantId, id, req.body || {});
    if (!row) {
      res.status(404).json({ success: false, error: 'Certification not found' });
      return;
    }

    res.json({ success: true, data: row });
  }

  static async deleteCertification(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    await ComplianceService.deleteCertification(tenantId, id);
    res.json({ success: true });
  }

  static async listInspections(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const data = await ComplianceService.listInspections(ids.tenantId, ids.assetId);
    res.json({ success: true, data });
  }

  static async createInspection(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const row = await ComplianceService.createInspection(ids.tenantId, ids.assetId, req.body || {});
    res.status(201).json({ success: true, data: row });
  }

  static async updateInspection(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    const row = await ComplianceService.updateInspection(tenantId, id, req.body || {});
    if (!row) {
      res.status(404).json({ success: false, error: 'Inspection not found' });
      return;
    }

    res.json({ success: true, data: row });
  }

  static async deleteInspection(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    await ComplianceService.deleteInspection(tenantId, id);
    res.json({ success: true });
  }

  static async listCalibrations(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const data = await ComplianceService.listCalibrations(ids.tenantId, ids.assetId);
    res.json({ success: true, data });
  }

  static async createCalibration(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const row = await ComplianceService.createCalibration(ids.tenantId, ids.assetId, req.body || {});
    res.status(201).json({ success: true, data: row });
  }

  static async updateCalibration(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    const row = await ComplianceService.updateCalibration(tenantId, id, req.body || {});
    if (!row) {
      res.status(404).json({ success: false, error: 'Calibration not found' });
      return;
    }

    res.json({ success: true, data: row });
  }

  static async deleteCalibration(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    await ComplianceService.deleteCalibration(tenantId, id);
    res.json({ success: true });
  }

  static async listTags(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const data = await ComplianceService.listTags(ids.tenantId, ids.assetId);
    res.json({ success: true, data });
  }

  static async lookupTag(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const code = String(req.query?.code || '').trim();
    if (!tenantId || !code) {
      res.status(400).json({ success: false, error: 'Tenant ID e code obrigatorios' });
      return;
    }

    const tag = await ComplianceService.lookupTag(tenantId, code);
    res.json({ success: true, data: tag || null });
  }

  static async createTag(req: AuthenticatedRequest, res: Response) {
    const ids = requireTenantAndAsset(req, res);
    if (!ids) return;

    const asset = await ensureAsset(ids.tenantId, ids.assetId, res);
    if (!asset) return;

    const tagCode = String(req.body?.tag_code || '').trim();
    if (tagCode) {
      const existing = await ComplianceService.lookupTag(ids.tenantId, tagCode);
      if (existing) {
        res.status(409).json({ success: false, error: 'Tag code ja existe' });
        return;
      }
    }

    const row = await ComplianceService.createTag(ids.tenantId, ids.assetId, req.body || {});
    res.status(201).json({ success: true, data: row });
  }

  static async updateTag(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    const row = await ComplianceService.updateTag(tenantId, id, req.body || {});
    if (!row) {
      res.status(404).json({ success: false, error: 'Tag not found' });
      return;
    }

    res.json({ success: true, data: row });
  }

  static async deleteTag(req: AuthenticatedRequest, res: Response) {
    const tenantId = String(req.tenantId || '').trim();
    const id = String(req.params?.id || '').trim();
    if (!tenantId || !id) {
      res.status(400).json({ success: false, error: 'Tenant ID e id obrigatorios' });
      return;
    }

    await ComplianceService.deleteTag(tenantId, id);
    res.json({ success: true });
  }
}
