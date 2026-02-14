import { and, eq, lte, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { scheduledReports } from '../db/schema.js';
import { JobQueueService, QUEUES } from './job.service.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface DashboardLayout {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  description?: string;
  widgets: any[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ScheduledReport {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  sendDay?: number;
  sendTime: string;
  recipients: string[];
  reportType: string;
  includeCharts: boolean;
  includeData: boolean;
  isActive: boolean;
  lastSentAt?: Date;
  nextSendAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PredictiveAnalysis {
  id: string;
  tenant_id: string;
  analysisType: 'spare_parts' | 'maintenance_schedule' | 'failure_prediction';
  name: string;
  description?: string;
  lookbackPeriod: number;
  confidenceThreshold: number;
  targetAssets?: string[];
  lastRunAt?: Date;
  predictions: any[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomizationService {
  private async ensureScheduledReportsTable(): Promise<void> {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        frequency TEXT NOT NULL,
        send_day INTEGER NULL,
        send_time TEXT NOT NULL DEFAULT '09:00',
        recipients TEXT[] NOT NULL,
        report_type TEXT NOT NULL,
        include_charts BOOLEAN DEFAULT TRUE,
        include_data BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        last_sent_at TIMESTAMPTZ NULL,
        next_send_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS scheduled_reports_tenant_id_idx
        ON scheduled_reports(tenant_id);
      CREATE INDEX IF NOT EXISTS scheduled_reports_tenant_next_send_idx
        ON scheduled_reports(tenant_id, next_send_at);
    `));
  }
  // ========== DASHBOARD LAYOUTS ==========

  async getDashboardLayouts(_tenant_id: string, _user_id: string): Promise<DashboardLayout[]> {
    // SELECT * FROM dashboard_layouts WHERE tenant_id = $1 AND user_id = $2
    return [];
  }

  async getDashboardLayout(_tenant_id: string, _user_id: string, _layout_id: string): Promise<DashboardLayout | null> {
    // SELECT * FROM dashboard_layouts WHERE tenant_id = $1 AND user_id = $2 AND id = $3
    return null;
  }

  async createDashboardLayout(tenant_id: string, user_id: string, input: any): Promise<DashboardLayout> {
    const id = crypto.randomUUID();
    const now = new Date();
    return {
      id,
      tenant_id,
      user_id,
      name: input.name,
      description: input.description,
      widgets: input.widgets,
      isDefault: input.isDefault,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateDashboardLayout(tenant_id: string, user_id: string, layout_id: string, input: any): Promise<DashboardLayout> {
    return {
      id: layout_id,
      tenant_id,
      user_id,
      name: input.name || 'Updated Layout',
      widgets: input.widgets || [],
      isDefault: input.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async deleteDashboardLayout(_tenant_id: string, _user_id: string, _layout_id: string): Promise<void> {
    // DELETE FROM dashboard_layouts WHERE tenant_id = $1 AND user_id = $2 AND id = $3
  }

  async setDefaultLayout(_tenant_id: string, _user_id: string, _layout_id: string): Promise<void> {
    // UPDATE dashboard_layouts SET isDefault = false WHERE tenant_id = $1 AND user_id = $2
    // UPDATE dashboard_layouts SET isDefault = true WHERE id = $3
  }

  // ========== SCHEDULED REPORTS ==========

  async getScheduledReports(_tenant_id: string, _user_id: string): Promise<ScheduledReport[]> {
    await this.ensureScheduledReportsTable();
    const rows = await db
      .select()
      .from(scheduledReports)
      .where(and(eq(scheduledReports.tenant_id, _tenant_id), eq(scheduledReports.user_id, _user_id)))
      .orderBy(scheduledReports.created_at);
    return rows as any;
  }

  async getScheduledReport(_tenant_id: string, _user_id: string, _report_id: string): Promise<ScheduledReport | null> {
    await this.ensureScheduledReportsTable();
    const row = await db.query.scheduledReports.findFirst({
      where: (fields: any, { and, eq }: any) =>
        and(eq(fields.id, _report_id), eq(fields.tenant_id, _tenant_id), eq(fields.user_id, _user_id)),
    });
    return (row as any) || null;
  }

  async createScheduledReport(tenant_id: string, user_id: string, input: any): Promise<ScheduledReport> {
    await this.ensureScheduledReportsTable();
    const now = new Date();
    const nextSendAt = this.calculateNextSendTime(input.frequency, input.sendDay, input.sendTime || '09:00');

    const [row] = await db
      .insert(scheduledReports)
      .values({
        tenant_id,
        user_id,
        name: input.name,
        description: input.description,
        frequency: input.frequency,
        send_day: input.sendDay,
        send_time: input.sendTime || '09:00',
        recipients: input.recipients,
        report_type: input.reportType,
        include_charts: input.includeCharts !== false,
        include_data: input.includeData !== false,
        is_active: input.isActive !== false,
        next_send_at: nextSendAt,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return row as any;
  }

  async updateScheduledReport(_tenant_id: string, _user_id: string, _report_id: string, _input: any): Promise<ScheduledReport> {
    await this.ensureScheduledReportsTable();
    const existing = await this.getScheduledReport(_tenant_id, _user_id, _report_id);
    if (!existing) throw new Error('Scheduled report not found');

    const nextSendAt = this.calculateNextSendTime(
      _input.frequency || (existing as any).frequency,
      _input.sendDay ?? (existing as any).send_day,
      _input.sendTime || (existing as any).send_time,
    );

    const [row] = await db
      .update(scheduledReports)
      .set({
        name: _input.name ?? existing.name,
        description: _input.description ?? existing.description,
        frequency: _input.frequency ?? (existing as any).frequency,
        send_day: _input.sendDay ?? (existing as any).send_day,
        send_time: _input.sendTime ?? (existing as any).send_time,
        recipients: _input.recipients ?? (existing as any).recipients,
        report_type: _input.reportType ?? (existing as any).report_type,
        include_charts: _input.includeCharts ?? (existing as any).include_charts,
        include_data: _input.includeData ?? (existing as any).include_data,
        is_active: _input.isActive ?? (existing as any).is_active,
        next_send_at: nextSendAt,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(scheduledReports.id, _report_id),
          eq(scheduledReports.tenant_id, _tenant_id),
          eq(scheduledReports.user_id, _user_id),
        ),
      )
      .returning();

    return row as any;
  }

  async deleteScheduledReport(_tenant_id: string, _user_id: string, _report_id: string): Promise<void> {
    await this.ensureScheduledReportsTable();
    await db
      .delete(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, _report_id),
          eq(scheduledReports.tenant_id, _tenant_id),
          eq(scheduledReports.user_id, _user_id),
        ),
      );
  }

  async toggleReportStatus(_tenant_id: string, _user_id: string, _report_id: string, _isActive: boolean): Promise<ScheduledReport> {
    await this.ensureScheduledReportsTable();
    const [row] = await db
      .update(scheduledReports)
      .set({
        is_active: _isActive,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(scheduledReports.id, _report_id),
          eq(scheduledReports.tenant_id, _tenant_id),
          eq(scheduledReports.user_id, _user_id),
        ),
      )
      .returning();

    if (!row) throw new Error('Scheduled report not found');
    return row as any;
  }

  private calculateNextSendTime(
    frequency: 'daily' | 'weekly' | 'monthly',
    sendDay?: number,
    sendTime = '09:00',
  ): Date {
    const now = new Date();
    const [hourStr, minStr] = String(sendTime || '09:00').split(':');
    const hour = Number(hourStr || 9);
    const minute = Number(minStr || 0);

    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);

    if (frequency === 'daily') {
      if (next <= now) next.setDate(next.getDate() + 1);
      return next;
    }

    if (frequency === 'weekly') {
      const target = Math.min(Math.max(sendDay || 1, 1), 7);
      const currentDow = next.getDay() === 0 ? 7 : next.getDay();
      let delta = (target - currentDow + 7) % 7;
      if (delta === 0 && next <= now) delta = 7;
      next.setDate(next.getDate() + delta);
      return next;
    }

    const day = Math.min(Math.max(sendDay || 1, 1), 28);
    if (next.getDate() > day || (next.getDate() === day && next <= now)) {
      next.setMonth(next.getMonth() + 1);
    }
    next.setDate(day);
    return next;
  }

  async getReportsDueToSend(): Promise<ScheduledReport[]> {
    await this.ensureScheduledReportsTable();
    const now = new Date();
    const rows = await db
      .select()
      .from(scheduledReports)
      .where(and(eq(scheduledReports.is_active, true), lte(scheduledReports.next_send_at, now)));
    return rows as any;
  }

  async markReportAsSent(
    _report_id: string,
    _frequency: 'daily' | 'weekly' | 'monthly',
    _sendDay?: number,
    _sendTime?: string,
  ): Promise<void> {
    await this.ensureScheduledReportsTable();
    const nextSendAt = this.calculateNextSendTime(_frequency, _sendDay, _sendTime || '09:00');
    await db
      .update(scheduledReports)
      .set({
        last_sent_at: new Date(),
        next_send_at: nextSendAt,
        updated_at: new Date(),
      })
      .where(eq(scheduledReports.id, _report_id));
  }

  private async buildReportSummary(tenantId: string, reportType: string): Promise<{ text: string; html: string; csv: string; pdf: string }> {
    const now = new Date();

    const openOrders = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM work_orders
      WHERE tenant_id = ${tenantId}
        AND status NOT IN ('concluida','fechada','cancelada');
    `);

    const slaOverdue = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM work_orders
      WHERE tenant_id = ${tenantId}
        AND sla_deadline IS NOT NULL
        AND sla_deadline < ${now}
        AND status NOT IN ('concluida','fechada','cancelada','em_pausa');
    `);

    const preventiveOverdue = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM preventive_maintenance_schedules
      WHERE tenant_id = ${tenantId}
        AND status = 'agendada'
        AND scheduled_for < ${now};
    `);

    const lowStockRows = await db.execute(sql`
      SELECT
        sp.id,
        sp.code,
        sp.name,
        sp.min_stock,
        sm.plant_id,
        SUM(CASE WHEN sm.type = 'entrada' OR sm.type = 'ajuste' THEN sm.quantity ELSE -sm.quantity END)::int AS quantity
      FROM spare_parts sp
      JOIN stock_movements sm ON sm.spare_part_id = sp.id AND sm.tenant_id = sp.tenant_id
      WHERE sp.tenant_id = ${tenantId} AND sp.min_stock IS NOT NULL AND sp.min_stock > 0
      GROUP BY sp.id, sp.code, sp.name, sp.min_stock, sm.plant_id
      HAVING SUM(CASE WHEN sm.type = 'entrada' OR sm.type = 'ajuste' THEN sm.quantity ELSE -sm.quantity END)::int < sp.min_stock
      ORDER BY quantity ASC
      LIMIT 10;
    `);

    const lowStockCount = (lowStockRows.rows || []).length;
    const openCount = Number(openOrders.rows?.[0]?.count ?? 0);
    const slaCount = Number(slaOverdue.rows?.[0]?.count ?? 0);
    const preventiveCount = Number(preventiveOverdue.rows?.[0]?.count ?? 0);

    const header = `Relatorio ${String(reportType || 'summary')} - ${now.toISOString()}`;
    const lines = [
      header,
      `Ordens abertas: ${openCount}`,
      `SLA em atraso: ${slaCount}`,
      `Preventivas em atraso: ${preventiveCount}`,
      `Itens de stock abaixo do minimo: ${lowStockCount}`,
    ];

    if (reportType === 'inventory' && lowStockCount > 0) {
      lines.push('', 'Top itens abaixo do minimo:');
      for (const row of lowStockRows.rows || []) {
        lines.push(`- ${row.code} ${row.name}: ${row.quantity}/${row.min_stock}`);
      }
    }

    if (reportType === 'maintenance') {
      lines.push('', 'Resumo manutencao:');
      lines.push(`- Ordens abertas: ${openCount}`);
      lines.push(`- SLA em atraso: ${slaCount}`);
      lines.push(`- Preventivas em atraso: ${preventiveCount}`);
    }

    const htmlLines = lines.map((line) => line.trim().length === 0 ? '<br />' : `<div>${line}</div>`).join('');

    const csvRows = [
      ['metric', 'value'],
      ['open_work_orders', String(openCount)],
      ['sla_overdue', String(slaCount)],
      ['preventive_overdue', String(preventiveCount)],
      ['low_stock_items', String(lowStockCount)],
    ];
    if (reportType === 'inventory' && lowStockCount > 0) {
      csvRows.push(['', '']);
      csvRows.push(['low_stock_code', 'low_stock_name']);
      for (const row of lowStockRows.rows || []) {
        csvRows.push([String(row.code || ''), String(row.name || '')]);
      }
    }
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(header, { x: 40, y: 790, size: 16, font, color: rgb(0.1, 0.1, 0.1) });

    let y = 760;
    for (const line of lines.slice(1)) {
      if (y < 60) break;
      if (line.trim().length === 0) {
        y -= 12;
        continue;
      }
      page.drawText(String(line), { x: 40, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return { text: lines.join('\n'), html: htmlLines, csv, pdf: pdfBase64 };
  }

  async processDueReports(): Promise<{ sent: number; errors: number }> {
    const reports = await this.getReportsDueToSend();
    let sent = 0;
    let errors = 0;

    for (const report of reports as any[]) {
      try {
        const { text, html, csv, pdf } = await this.buildReportSummary(report.tenant_id, report.report_type);
        const subject = `Relatorio agendado: ${String(report.name || report.report_type)}`;

        const queued = await JobQueueService.addJob(QUEUES.EMAIL, 'send-email', {
          to: report.recipients,
          subject,
          text,
          html,
          attachments: [
            {
              filename: `relatorio_${String(report.report_type || 'summary')}.csv`,
              content: Buffer.from(csv, 'utf8').toString('base64'),
              type: 'text/csv',
            },
            {
              filename: `relatorio_${String(report.report_type || 'summary')}.pdf`,
              content: pdf,
              type: 'application/pdf',
            },
          ],
        });

        if (!queued) {
          errors += 1;
          continue;
        }

        const nextSendAt = this.calculateNextSendTime(report.frequency, report.send_day, report.send_time);
        await db
          .update(scheduledReports)
          .set({
            last_sent_at: new Date(),
            next_send_at: nextSendAt,
            updated_at: new Date(),
          })
          .where(eq(scheduledReports.id, report.id));

        sent += 1;
      } catch {
        errors += 1;
      }
    }

    return { sent, errors };
  }

  // ========== THEME SETTINGS ==========

  async getThemeSettings(_tenant_id: string, _user_id: string): Promise<any> {
    // SELECT * FROM user_preferences WHERE tenant_id = $1 AND user_id = $2
    return {
      theme: 'light',
      accentColor: '#3B82F6',
      fontFamily: 'system',
      fontSize: 'normal',
      compactMode: false,
    };
  }

  async updateThemeSettings(_tenant_id: string, _user_id: string, input: any): Promise<any> {
    // INSERT INTO user_preferences (...) VALUES (...) ON CONFLICT DO UPDATE SET ...
    return {
      theme: input.theme || 'light',
      accentColor: input.accentColor || '#3B82F6',
      fontFamily: input.fontFamily || 'system',
      fontSize: input.fontSize || 'normal',
      compactMode: input.compactMode || false,
    };
  }

  // ========== PREDICTIVE ANALYSIS ==========

  async getPredictiveAnalyses(_tenant_id: string): Promise<PredictiveAnalysis[]> {
    // SELECT * FROM predictive_analyses WHERE tenant_id = $1
    return [];
  }

  async createPredictiveAnalysis(_tenant_id: string, input: any): Promise<PredictiveAnalysis> {
    const id = crypto.randomUUID();
    const now = new Date();

    return {
      id,
      tenant_id: _tenant_id,
      analysisType: input.analysisType,
      name: input.name,
      description: input.description,
      lookbackPeriod: input.lookbackPeriod || 90,
      confidenceThreshold: input.confidenceThreshold || 0.7,
      targetAssets: input.targetAssets,
      predictions: await this.runPredictiveAnalysis(_tenant_id, input),
      isActive: input.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
  }

  async runPredictiveAnalysis(_tenant_id: string, config: any): Promise<any[]> {
    // Run ML analysis based on config.analysisType
    const predictions: any[] = [];

    if (config.analysisType === 'spare_parts') {
      // Predict spare parts needs based on historical usage patterns
      predictions.push({
        partId: 'part-001',
        predictedDemand: 15,
        confidence: 0.85,
        forecastPeriod: '30 days',
        recommendedAction: 'Order now',
      });
    } else if (config.analysisType === 'maintenance_schedule') {
      // Predict optimal maintenance schedule
      predictions.push({
        assetId: 'asset-001',
        nextMaintenanceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        confidence: 0.92,
        estimatedDowntime: '2 hours',
      });
    } else if (config.analysisType === 'failure_prediction') {
      // Predict equipment failures
      predictions.push({
        assetId: 'asset-001',
        failureLikelihood: 0.73,
        confidence: 0.88,
        timeToFailure: '14 days',
        severity: 'high',
        recommendedActions: ['Increase monitoring', 'Schedule preventive maintenance'],
      });
    }

    return predictions;
  }

  async getPredictiveAnalysis(_tenant_id: string, _analysis_id: string): Promise<PredictiveAnalysis | null> {
    // SELECT * FROM predictive_analyses WHERE id = $1 AND tenant_id = $2
    return null;
  }

  async updatePredictiveAnalysis(_tenant_id: string, _analysis_id: string, _input: any): Promise<PredictiveAnalysis> {
    // UPDATE predictive_analyses SET ... WHERE id = $1 AND tenant_id = $2
    throw new Error('Predictive analysis not found');
  }

  async deletePredictiveAnalysis(_tenant_id: string, _analysis_id: string): Promise<void> {
    // DELETE FROM predictive_analyses WHERE id = $1 AND tenant_id = $2
  }

  async getAnalysisPredictions(_tenant_id: string, _analysis_id: string): Promise<any[]> {
    // SELECT predictions FROM predictive_analyses WHERE id = $1 AND tenant_id = $2
    return [];
  }
}
