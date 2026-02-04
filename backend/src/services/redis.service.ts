import Redis from 'ioredis';
import { logger } from '../config/logger';

// Redis singleton
let redisClient: Redis | null = null;

export class RedisService {
  static getInstance(): Redis {
    if (!redisClient) {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryStrategy: (times) => Math.min(times * 50, 2000),
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      redisClient.on('connect', () => {
        logger.info('✅ Redis connected');
      });

      redisClient.on('error', (err) => {
        logger.error('❌ Redis error:', err);
      });
    }

    return redisClient;
  }

  // Get value
  static async get(key: string): Promise<string | null> {
    try {
      const client = this.getInstance();
      return await client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  // Get JSON
  static async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis getJSON error for key ${key}:`, error);
      return null;
    }
  }

  // Set value
  static async set(key: string, value: string, expiresIn?: number): Promise<boolean> {
    try {
      const client = this.getInstance();
      if (expiresIn) {
        await client.setex(key, expiresIn, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  // Set JSON
  static async setJSON<T>(key: string, value: T, expiresIn?: number): Promise<boolean> {
    return this.set(key, JSON.stringify(value), expiresIn);
  }

  // Delete
  static async del(key: string): Promise<boolean> {
    try {
      const client = this.getInstance();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  // Delete multiple
  static async delMultiple(keys: string[]): Promise<boolean> {
    try {
      const client = this.getInstance();
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error(`Redis delMultiple error:`, error);
      return false;
    }
  }

  // Increment counter
  static async incr(key: string): Promise<number> {
    try {
      const client = this.getInstance();
      return await client.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  // Exists
  static async exists(key: string): Promise<boolean> {
    try {
      const client = this.getInstance();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // TTL
  static async ttl(key: string): Promise<number> {
    try {
      const client = this.getInstance();
      return await client.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Expire
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const client = this.getInstance();
      const result = await client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  // Clear all (use with caution!)
  static async flushDb(): Promise<boolean> {
    try {
      const client = this.getInstance();
      await client.flushdb();
      logger.info('Redis DB flushed');
      return true;
    } catch (error) {
      logger.error('Redis FLUSHDB error:', error);
      return false;
    }
  }

  // Health check
  static async ping(): Promise<boolean> {
    try {
      const client = this.getInstance();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis PING error:', error);
      return false;
    }
  }

  // Close connection
  static async disconnect(): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.disconnect();
        redisClient = null;
        logger.info('Redis disconnected');
      }
    } catch (error) {
      logger.error('Redis disconnect error:', error);
    }
  }
}

// Cache key builders
export const CacheKeys = {
  // Assets
  asset: (tenantId: string, assetId: string) => `asset:${tenantId}:${assetId}`,
  assetsList: (tenantId: string) => `assets:${tenantId}`,
  
  // Alerts
  alertConfig: (tenantId: string, alertId: string) => `alert:${tenantId}:${alertId}`,
  alertConfigs: (tenantId: string) => `alerts:${tenantId}`,
  alertsHistory: (tenantId: string) => `alerts-history:${tenantId}`,
  
  // Maintenance Plans
  maintenancePlan: (tenantId: string, planId: string) => `plan:${tenantId}:${planId}`,
  maintenancePlans: (tenantId: string) => `plans:${tenantId}`,
  
  // Documents
  document: (tenantId: string, docId: string) => `doc:${tenantId}:${docId}`,
  documents: (tenantId: string) => `docs:${tenantId}`,
  
  // Auth
  userSession: (userId: string) => `session:${userId}`,
  userRole: (userId: string) => `role:${userId}`,
  tenant: (tenantId: string) => `tenant:${tenantId}`,
};

// TTL values (in seconds)
export const CacheTTL = {
  ASSETS: 5 * 60, // 5 minutes
  ALERTS: 2 * 60, // 2 minutes
  PLANS: 10 * 60, // 10 minutes
  DOCUMENTS: 5 * 60, // 5 minutes
  SESSION: 24 * 60 * 60, // 24 hours
  AUTH: 30 * 60, // 30 minutes
  TENANT: 1 * 60 * 60, // 1 hour
};
