import Queue from 'bull';
import { logger } from '../config/logger.js';

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class JobQueueService {
  private static queues: Map<string, Queue.Queue> = new Map();
  private static redisAvailable = true;

  // Initialize queue
  static getQueue(queueName: string): Queue.Queue {
    if (!this.queues.has(queueName)) {
      try {
        const queue = new Queue(queueName, {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
          },
        });

        // Global error handler - suppress connection errors
        queue.on('error', (error: any) => {
          if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
            this.redisAvailable = false;
            logger.debug(`Queue ${queueName} Redis unavailable - job processing disabled`);
          } else {
            logger.error(`Queue ${queueName} error:`, error);
          }
        });

        // Failed job handler
        queue.on('failed', (job, error) => {
          logger.debug(`Job ${job.id} failed in ${queueName}:`, { error: error?.message });
        });

        this.queues.set(queueName, queue);
      } catch (error: any) {
        if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
          this.redisAvailable = false;
          logger.debug(`Cannot create queue ${queueName} - Redis unavailable`);
        } else {
          logger.error(`Failed to create queue ${queueName}:`, error);
          throw error;
        }
      }
    }

    return this.queues.get(queueName)!;
  }

  // Add job - silently skip if Redis unavailable
  static async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: any,
  ): Promise<Queue.Job<T> | null> {
    if (!this.redisAvailable) {
      return null;
    }

    try {
      const queue = this.getQueue(queueName);
      if (!queue) return null;

      const job = await queue.add(jobName, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        ...options,
      });

      logger.debug(`Job ${job.id} added to ${queueName}`);
      return job;
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
        this.redisAvailable = false;
      } else {
        logger.debug(`Failed to add job to ${queueName}`);
      }
      return null;
    }
  }

  // Schedule job (delayed)
  static async scheduleJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    delayMs: number,
  ): Promise<Queue.Job<T> | null> {
    return this.addJob(queueName, jobName, data, {
      delay: delayMs,
    });
  }

  // Process job - silently skip if Redis unavailable
  static async processJob<T, R>(
    queueName: string,
    jobName: string | undefined,
    processor: (job: Queue.Job<T>) => Promise<R>,
  ): Promise<void> {
    if (!this.redisAvailable) {
      return;
    }

    try {
      const queue = this.getQueue(queueName);
      if (!queue) return;

      const concurrency = parseInt(process.env.JOB_CONCURRENCY || '5');

      if (jobName) {
        queue.process(jobName, concurrency, processor);
      } else {
        queue.process(concurrency, processor);
      }

      logger.debug(`Processing started for ${queueName}${jobName ? `:${jobName}` : ''}`);
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
        this.redisAvailable = false;
      } else {
        logger.debug(`Job processing setup for ${queueName} skipped`);
      }
    }
  }

  // Get job
  static async getJob(queueName: string, jobId: string | number): Promise<Queue.Job | null | undefined> {
    if (!this.redisAvailable) return null;

    try {
      const queue = this.getQueue(queueName);
      if (!queue) return null;
      return await queue.getJob(jobId);
    } catch (error) {
      return null;
    }
  }

  // Get queue stats
  static async getStats(queueName: string): Promise<any> {
    if (!this.redisAvailable) return null;

    try {
      const queue = this.getQueue(queueName);
      if (!queue) return null;
      const counts = await queue.getJobCounts();
      return {
        queue: queueName,
        ...counts,
      };
    } catch (error) {
      return null;
    }
  }

  // Clear queue
  static async clearQueue(queueName: string): Promise<void> {
    if (!this.redisAvailable) return;

    try {
      const queue = this.getQueue(queueName);
      if (queue) {
        await queue.clean(0);
      }
    } catch (error) {
      // Silent fail
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
