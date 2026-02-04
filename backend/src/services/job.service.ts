import Queue from 'bull';
import { logger } from '../config/logger';

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class JobQueueService {
  private static queues: Map<string, Queue.Queue> = new Map();

  // Initialize queue
  static getQueue(queueName: string): Queue.Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
      });

      // Global error handler
      queue.on('error', (error) => {
        logger.error(`Queue ${queueName} error:`, error);
      });

      // Failed job handler
      queue.on('failed', (job, error) => {
        logger.error(`Job ${job.id} failed in ${queueName}:`, error);
      });

      // Stalled job handler
      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled in ${queueName}`);
      });

      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName)!;
  }

  // Add job
  static async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: any,
  ): Promise<Queue.Job<T>> {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.add(jobName, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        ...options,
      });

      logger.info(`Job ${job.id} added to ${queueName}`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job to ${queueName}:`, error);
      throw error;
    }
  }

  // Schedule job (delayed)
  static async scheduleJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    delayMs: number,
  ): Promise<Queue.Job<T>> {
    return this.addJob(queueName, jobName, data, {
      delay: delayMs,
    });
  }

  // Process job
  static async processJob<T, R>(
    queueName: string,
    jobName: string | undefined,
    processor: (job: Queue.Job<T>) => Promise<R>,
  ): Promise<void> {
    try {
      const queue = this.getQueue(queueName);
      const concurrency = parseInt(process.env.JOB_CONCURRENCY || '5');

      if (jobName) {
        queue.process(jobName, concurrency, processor);
      } else {
        queue.process(concurrency, processor);
      }

      logger.info(`Processing started for ${queueName}${jobName ? `:${jobName}` : ''}`);
    } catch (error) {
      logger.error(`Failed to process job in ${queueName}:`, error);
      throw error;
    }
  }

  // Get job
  static async getJob(queueName: string, jobId: string | number): Promise<Queue.Job | null | undefined> {
    try {
      const queue = this.getQueue(queueName);
      return await queue.getJob(jobId);
    } catch (error) {
      logger.error(`Failed to get job ${jobId} from ${queueName}:`, error);
      return undefined;
    }
  }

  // Get queue stats
  static async getStats(queueName: string): Promise<any> {
    try {
      const queue = this.getQueue(queueName);
      const counts = await queue.getJobCounts();
      return {
        queue: queueName,
        ...counts,
      };
    } catch (error) {
      logger.error(`Failed to get stats for ${queueName}:`, error);
      return null;
    }
  }

  // Clear queue
  static async clearQueue(queueName: string): Promise<void> {
    try {
      const queue = this.getQueue(queueName);
      await queue.clean(0);
      logger.info(`Queue ${queueName} cleared`);
    } catch (error) {
      logger.error(`Failed to clear queue ${queueName}:`, error);
    }
  }

  // Close all queues
  static async closeAllQueues(): Promise<void> {
    try {
      for (const queue of this.queues.values()) {
        await queue.close();
      }
      this.queues.clear();
      logger.info('All queues closed');
    } catch (error) {
      logger.error('Error closing queues:', error);
    }
  }
}

// Pre-defined queue names
export const QUEUES = {
  EMAIL: 'email',
  REPORTS: 'reports',
  EXPORTS: 'exports',
  MAINTENANCE: 'maintenance',
  CACHE: 'cache',
  ELASTICSEARCH: 'elasticsearch',
  BACKUP: 'backup',
  CLEANUP: 'cleanup',
};
