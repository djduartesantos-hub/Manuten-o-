import { Client } from '@elastic/elasticsearch';
import { logger } from '../config/logger.js';

let elasticsearchClient: Client | null = null;
let elasticsearchDisabledLogged = false;

export class ElasticsearchService {
  private static resolveNodeUrl(): string | null {
    const configured = process.env.ELASTICSEARCH_URL;
    if (configured && configured.trim().length > 0) return configured;

    // In dev/test we keep the localhost default to preserve existing workflows.
    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:9200';
    }

    return null;
  }

  static isEnabled(): boolean {
    return ElasticsearchService.resolveNodeUrl() !== null;
  }

  static getInstance(): Client {
    const nodeUrl = ElasticsearchService.resolveNodeUrl();
    if (!nodeUrl) {
      if (!elasticsearchDisabledLogged) {
        logger.info('Elasticsearch disabled (ELASTICSEARCH_URL not set)');
        elasticsearchDisabledLogged = true;
      }
      throw new Error('Elasticsearch disabled');
    }

    if (!elasticsearchClient) {
      elasticsearchClient = new Client({
        node: nodeUrl,
        auth: process.env.ELASTICSEARCH_PASSWORD
          ? {
              username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
              password: process.env.ELASTICSEARCH_PASSWORD,
            }
          : undefined,
      });

      logger.info('Elasticsearch client initialized');
    }

    return elasticsearchClient;
  }

  // Create indices
  static async initializeIndices(): Promise<void> {
    if (!ElasticsearchService.isEnabled()) {
      if (!elasticsearchDisabledLogged) {
        logger.info('Elasticsearch disabled (ELASTICSEARCH_URL not set)');
        elasticsearchDisabledLogged = true;
      }
      return;
    }

    try {
      const client = this.getInstance();

      // Orders index
      await this.createIndexIfNotExists(client, 'orders_v1', {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            tenant_id: { type: 'keyword' },
            plant_id: { type: 'keyword' },
            asset_id: { type: 'keyword' },
            title: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            status: { type: 'keyword' },
            priority: { type: 'keyword' },
            type: { type: 'keyword' },
            sla: { type: 'date' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
          },
        },
      });

      // Assets index
      await this.createIndexIfNotExists(client, 'assets_v1', {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            tenant_id: { type: 'keyword' },
            plant_id: { type: 'keyword' },
            name: { type: 'text', analyzer: 'standard' },
            code: { type: 'keyword' },
            category: { type: 'keyword' },
            created_at: { type: 'date' },
          },
        },
      });

      // Audit trail index
      await this.createIndexIfNotExists(client, 'audit_log_v1', {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            tenant_id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            entity_type: { type: 'keyword' },
            entity_id: { type: 'keyword' },
            action: { type: 'keyword' },
            changes: { type: 'object', enabled: false },
            timestamp: { type: 'date' },
          },
        },
      });

      logger.info('✅ Elasticsearch indices initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Elasticsearch indices:', error);
      throw error;
    }
  }

  private static async createIndexIfNotExists(
    client: Client,
    indexName: string,
    settings: any,
  ): Promise<void> {
    try {
      const exists = await client.indices.exists({ index: indexName });
      if (!exists) {
        await client.indices.create({
          index: indexName,
          ...settings,
        });
        logger.info(`Created index: ${indexName}`);
      }
    } catch (error: any) {
      if (error.statusCode !== 400) {
        throw error;
      }
    }
  }

  // Search
  static async search(indexName: string, query: any): Promise<any> {
    if (!ElasticsearchService.isEnabled()) {
      return {
        hits: {
          total: { value: 0, relation: 'eq' },
          hits: [],
        },
      };
    }

    try {
      const client = this.getInstance();
      const result = await client.search({
        index: indexName,
        body: query,
      });
      return result;
    } catch (error) {
      logger.error(`Elasticsearch search error in ${indexName}:`, error);
      throw error;
    }
  }

  // Index document
  static async index(indexName: string, id: string, body: any): Promise<void> {
    if (!ElasticsearchService.isEnabled()) return;

    try {
      const client = this.getInstance();
      await client.index({
        index: indexName,
        id,
        body,
      });
    } catch (error) {
      logger.error(`Elasticsearch index error in ${indexName}:`, error);
      throw error;
    }
  }

  // Bulk index
  static async bulk(operations: any[]): Promise<void> {
    if (!ElasticsearchService.isEnabled()) return;

    try {
      const client = this.getInstance();
      if (operations.length === 0) return;

      await client.bulk({
        body: operations,
      });
    } catch (error) {
      logger.error('Elasticsearch bulk error:', error);
      throw error;
    }
  }

  // Delete document
  static async delete(indexName: string, id: string): Promise<void> {
    if (!ElasticsearchService.isEnabled()) return;

    try {
      const client = this.getInstance();
      await client.delete({
        index: indexName,
        id,
      });
    } catch (error) {
      logger.error(`Elasticsearch delete error in ${indexName}:`, error);
      throw error;
    }
  }

  // Health check
  static async ping(): Promise<boolean> {
    if (!ElasticsearchService.isEnabled()) return false;

    try {
      const client = this.getInstance();
      const health = await client.cluster.health();
      return health.status !== 'red';
    } catch (error) {
      logger.error('Elasticsearch health check failed:', error);
      return false;
    }
  }

  // Close connection
  static async disconnect(): Promise<void> {
    try {
      if (elasticsearchClient) {
        await elasticsearchClient.close();
        elasticsearchClient = null;
        logger.info('Elasticsearch disconnected');
      }
    } catch (error) {
      logger.error('Elasticsearch disconnect error:', error);
    }
  }
}
