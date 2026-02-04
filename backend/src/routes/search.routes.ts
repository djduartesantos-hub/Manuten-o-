import { Router, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { AuthenticatedRequest } from '../types';
import { ElasticsearchService } from '../services/elasticsearch.service';

const router = Router();

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { q, type, plant_id, status, priority, category, page, limit, sort } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query is required (min 2 chars)' });
    }

    const selectedType = (type as string | undefined)?.toLowerCase();
    const includeOrders = !selectedType || selectedType === 'orders';
    const includeAssets = !selectedType || selectedType === 'assets';

    const plantId = typeof plant_id === 'string' ? plant_id : undefined;

    const pageNumber = page ? Math.max(1, Number(page)) : 1;
    const pageSize = limit ? Math.min(50, Math.max(1, Number(limit))) : 20;
    const from = (pageNumber - 1) * pageSize;

    const buildQuery = (
      fields: string[],
      filters: Record<string, string | undefined>,
      sortField?: string,
    ) => ({
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: q,
                fields,
              },
            },
            { term: { tenant_id: tenantId } },
            ...(plantId ? [{ term: { plant_id: plantId } }] : []),
          ],
          filter: Object.entries(filters)
            .filter(([, value]) => !!value)
            .map(([key, value]) => ({ term: { [key]: value } })),
        },
      },
      ...(sortField && sort === 'date_desc'
        ? { sort: [{ [sortField]: 'desc' }] }
        : sortField && sort === 'date_asc'
          ? { sort: [{ [sortField]: 'asc' }] }
          : {}),
      from,
      size: pageSize,
    });

    const [ordersResult, assetsResult] = await Promise.all([
      includeOrders
        ? ElasticsearchService.search(
            'orders_v1',
            buildQuery(
              ['title^2', 'description', 'status', 'priority'],
              {
                status: typeof status === 'string' ? status : undefined,
                priority: typeof priority === 'string' ? priority : undefined,
              },
              'created_at',
            ),
          )
        : Promise.resolve(null),
      includeAssets
        ? ElasticsearchService.search(
            'assets_v1',
            buildQuery(
              ['name^2', 'code', 'category'],
              {
                category: typeof category === 'string' ? category : undefined,
              },
              'created_at',
            ),
          )
        : Promise.resolve(null),
    ]);

    const mapHits = (result: any) =>
      result?.hits?.hits?.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
      })) || [];

    const getTotal = (result: any) =>
      typeof result?.hits?.total?.value === 'number' ? result.hits.total.value : 0;

    return res.json({
      success: true,
      data: {
        orders: includeOrders
          ? { items: mapHits(ordersResult), total: getTotal(ordersResult) }
          : { items: [], total: 0 },
        assets: includeAssets
          ? { items: mapHits(assetsResult), total: getTotal(assetsResult) }
          : { items: [], total: 0 },
        page: pageNumber,
        limit: pageSize,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;