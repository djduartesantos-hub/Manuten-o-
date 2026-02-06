import { Router, Response } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import { JobQueueService, QUEUES } from '../services/job.service.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('admin_empresa', 'supervisor', 'gestor_manutencao', 'superadmin'));

// GET /api/jobs/stats
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const queueNames = Object.values(QUEUES);
    const stats = await Promise.all(
      queueNames.map((queueName) => JobQueueService.getStats(queueName)),
    );

    return res.json({
      success: true,
      data: stats.filter(Boolean),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

// GET /api/jobs/:queue/recent
router.get('/:queue/recent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queue } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const jobQueue = JobQueueService.getQueue(queue);

    const jobs = await jobQueue.getJobs(
      ['completed', 'failed', 'waiting', 'active', 'delayed'],
      0,
      Math.max(0, limit - 1),
    );

    const data = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        state: await job.getState(),
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
      })),
    );

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch recent jobs' });
  }
});

// GET /api/jobs/:queue/:id
router.get('/:queue/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queue, id } = req.params;
    const job = await JobQueueService.getJob(queue, id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();

    return res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        data: job.data,
        state,
        progress,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs/enqueue
router.post('/enqueue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queue, jobName, payload, delayMs } = req.body || {};

    if (!queue || !jobName) {
      return res.status(400).json({ error: 'queue and jobName are required' });
    }

    const job = delayMs
      ? await JobQueueService.scheduleJob(queue, jobName, payload || {}, delayMs)
      : await JobQueueService.addJob(queue, jobName, payload || {});

    return res.status(201).json({
      success: true,
      data: { id: job.id, queue: job.queue.name, name: job.name },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

export default router;