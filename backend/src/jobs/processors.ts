import { JobQueueService, QUEUES } from '../services/job.service';
import { logger } from '../config/logger';
import { db } from '../config/database';
import { assets, workOrders } from '../db/schema';
import { ElasticsearchService } from '../services/elasticsearch.service';
import sgMail from '@sendgrid/mail';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export function initJobProcessors(): void {
  // Email jobs
  JobQueueService.processJob(QUEUES.EMAIL, 'send-email', async (job) => {
    job.progress(10);
    const { to, subject, text, html, from } = job.data || {};

    if (!process.env.SENDGRID_API_KEY) {
      logger.warn('SendGrid not configured. Skipping email send.', {
        id: job.id,
      });
      job.progress(100);
      return { success: true, data: { skipped: true } };
    }

    if (!to || !subject || (!text && !html)) {
      throw new Error('Invalid email payload');
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to,
      from: from || process.env.SENDGRID_FROM || 'noreply@cmms.local',
      subject,
      text,
      html,
    });

    job.progress(100);
    return { success: true };
  });

  // Report generation jobs
  JobQueueService.processJob(QUEUES.REPORTS, 'generate-report', async (job) => {
    job.progress(10);
    const title = job.data?.title || 'Relatório CMMS';

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(title, {
      x: 50,
      y: 780,
      size: 20,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Gerado em: ${new Date().toISOString()}`, {
      x: 50,
      y: 750,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdfDoc.save();
    job.progress(100);
    return { success: true, data: { size: pdfBytes.length } };
  });

  // Export jobs
  JobQueueService.processJob(QUEUES.EXPORTS, 'export-csv', async (job) => {
    job.progress(10);
    const rows: Array<Record<string, any>> = job.data?.rows || [];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((key) => JSON.stringify(row[key] ?? '')).join(','),
      ),
    ].join('\n');

    job.progress(100);
    return { success: true, data: { size: csv.length } };
  });

  // Maintenance recalculation jobs
  JobQueueService.processJob(QUEUES.MAINTENANCE, 'recalculate-plans', async (job) => {
    job.progress(10);
    logger.info('Processing maintenance job', { id: job.id, data: job.data });
    job.progress(100);
    return { success: true };
  });

  // Elasticsearch reindex job
  JobQueueService.processJob(QUEUES.ELASTICSEARCH, 'reindex', async (job) => {
    job.progress(5);

    const [assetsData, workOrdersData] = await Promise.all([
      db.select().from(assets),
      db.select().from(workOrders),
    ]);

    const operations: any[] = [];

    assetsData.forEach((asset) => {
      operations.push({ index: { _index: 'assets_v1', _id: asset.id } });
      operations.push({
        id: asset.id,
        tenant_id: asset.tenant_id,
        plant_id: asset.plant_id,
        name: asset.name,
        code: asset.code,
        category: asset.category_id,
        created_at: asset.created_at,
      });
    });

    workOrdersData.forEach((order) => {
      operations.push({ index: { _index: 'orders_v1', _id: order.id } });
      operations.push({
        id: order.id,
        tenant_id: order.tenant_id,
        plant_id: order.plant_id,
        asset_id: order.asset_id,
        title: order.title,
        description: order.description,
        status: order.status,
        priority: order.priority,
        sla: order.sla_deadline,
        created_at: order.created_at,
        updated_at: order.updated_at,
      });
    });

    job.progress(70);
    await ElasticsearchService.bulk(operations);
    job.progress(100);
    return {
      success: true,
      data: {
        assets: assetsData.length,
        orders: workOrdersData.length,
      },
    };
  });
}