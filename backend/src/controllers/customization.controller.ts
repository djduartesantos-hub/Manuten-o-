import { Request, Response } from 'express';
import { CustomizationService } from '../services/customization.service.js';
import { createDashboardLayoutSchema, updateDashboardLayoutSchema, createScheduledReportSchema, updateScheduledReportSchema, themeSettingsSchema, createPredictiveAnalysisSchema } from '../schemas/customization.validation.js';

const customizationService = new CustomizationService();

interface AuthenticatedRequest extends Request {
  user?: { userId: string; tenantId: string; role: string };
}

// ========== DASHBOARD CONTROLLERS ==========

export async function getDashboardLayouts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    if (!tenantId || !userId) {
      res.status(400).json({ error: 'Missing authentication' });
      return;
    }

    const layouts = await customizationService.getDashboardLayouts(tenantId, userId);
    res.json({ success: true, data: layouts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard layouts' });
  }
}

export async function getDashboardLayout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const { layoutId } = req.params;

    if (!tenantId || !userId || !layoutId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const layout = await customizationService.getDashboardLayout(tenantId, userId, layoutId);
    if (!layout) {
      res.status(404).json({ success: false, error: 'Dashboard layout not found' });
      return;
    }

    res.json({ success: true, data: layout });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard layout' });
  }
}

export async function createDashboardLayout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const validation = createDashboardLayoutSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input', details: validation.error.errors });
      return;
    }

    const layout = await customizationService.createDashboardLayout(tenantId!, userId!, validation.data);
    res.status(201).json({ success: true, data: layout });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create dashboard layout' });
  }
}

export async function updateDashboardLayout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const { layoutId } = req.params;
    const validation = updateDashboardLayoutSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }

    const layout = await customizationService.updateDashboardLayout(tenantId!, userId!, layoutId, validation.data);
    res.json({ success: true, data: layout });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update dashboard layout' });
  }
}

export async function deleteDashboardLayout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const { layoutId } = req.params;

    if (!tenantId || !userId || !layoutId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    await customizationService.deleteDashboardLayout(tenantId, userId, layoutId);
    res.json({ success: true, message: 'Dashboard layout deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete dashboard layout' });
  }
}

// ========== SCHEDULED REPORTS CONTROLLERS ==========

export async function getScheduledReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const reports = await customizationService.getScheduledReports(tenantId!, userId!);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch scheduled reports' });
  }
}

export async function createScheduledReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const validation = createScheduledReportSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }

    const report = await customizationService.createScheduledReport(tenantId!, userId!, validation.data);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create scheduled report' });
  }
}

export async function updateScheduledReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const { reportId } = req.params;
    const validation = updateScheduledReportSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }

    const report = await customizationService.updateScheduledReport(tenantId!, userId!, reportId, validation.data);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update scheduled report' });
  }
}

export async function deleteScheduledReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const { reportId } = req.params;

    await customizationService.deleteScheduledReport(tenantId!, userId!, reportId);
    res.json({ success: true, message: 'Scheduled report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete scheduled report' });
  }
}

// ========== THEME CONTROLLERS ==========

export async function getThemeSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const settings = await customizationService.getThemeSettings(tenantId!, userId!);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch theme settings' });
  }
}

export async function updateThemeSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user || {};
    const validation = themeSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }

    const settings = await customizationService.updateThemeSettings(tenantId!, userId!, validation.data);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update theme settings' });
  }
}

// ========== PREDICTIVE ANALYSIS CONTROLLERS ==========

export async function getPredictiveAnalyses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user || {};
    const analyses = await customizationService.getPredictiveAnalyses(tenantId!);
    res.json({ success: true, data: analyses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch predictive analyses' });
  }
}

export async function createPredictiveAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user || {};
    const validation = createPredictiveAnalysisSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }

    const analysis = await customizationService.createPredictiveAnalysis(tenantId!, validation.data);
    res.status(201).json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create predictive analysis' });
  }
}

export async function getPredictiveAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user || {};
    const { analysisId } = req.params;

    const analysis = await customizationService.getPredictiveAnalysis(tenantId!, analysisId);
    if (!analysis) {
      res.status(404).json({ success: false, error: 'Predictive analysis not found' });
      return;
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch predictive analysis' });
  }
}

export async function getAnalysisPredictions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user || {};
    const { analysisId } = req.params;

    const predictions = await customizationService.getAnalysisPredictions(tenantId!, analysisId);
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch predictions' });
  }
}
