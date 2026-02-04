# Phase 3B Integration Checklist

## ✅ Completed (Committed in 9cbc574)
- [x] Dependencies installed (160 packages)
- [x] Redis service created (22 methods, cache keys, TTL constants)
- [x] Elasticsearch service created (search, indexing, bulk operations)
- [x] Bull job queue service created (8 queue types, scheduling, processors)
- [x] Socket.io manager created (JWT auth, tenant rooms, event emitters)
- [x] Frontend SocketContext created (3 hooks, 6 event listeners)
- [x] React Query client configured (5min stale, 10min cache)
- [x] App.tsx updated (QueryClientProvider, SocketProvider, Toaster)
- [x] Header updated with socket status indicator
- [x] Server.ts updated (HTTP server, Socket.io initialization)
- [x] All TypeScript errors fixed, both builds pass (0 errors)

## 🔄 In Progress - Next Steps

### 1. Add Socket.io Emit Calls to Routes (2-3 hours)
**Purpose:** Real-time notifications when data changes
**Files to modify:**
- `/backend/src/routes/workorder.routes.ts` - emit order:created, order:updated, order:status-changed
- `/backend/src/routes/asset.routes.ts` - emit asset:created, asset:updated
- `/backend/src/routes/alert.routes.ts` - emit alert:triggered
- `/backend/src/routes/maintenance.routes.ts` - emit plan:created, plan:updated

**Example pattern:**
```typescript
// At top of route file
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance';

// In create endpoint
if (isSocketManagerReady()) {
  const socket = getSocketManager();
  socket.emitOrderCreated(tenantId, newOrder);
}
```

### 2. Add Redis Caching to Queries (2-3 hours)
**Purpose:** Speed up repeated queries by caching
**Files to modify:**
- `/backend/src/services/asset.service.ts` - Cache getAssets, getAssetById
- `/backend/src/services/alert.service.ts` - Cache getAlertConfigurations
- `/backend/src/services/maintenance.service.ts` - Cache getMaintenancePlans
- `/backend/src/services/document.service.ts` - Cache getDocuments

**Example pattern:**
```typescript
static async getAssets(tenantId: string): Promise<Asset[]> {
  // Try cache first
  const cached = await RedisService.getJSON<Asset[]>(CacheKeys.assetsList(tenantId));
  if (cached) return cached;
  
  // Query database
  const assets = await db.select().from(assetsTable).where(eq(assetsTable.tenantId, tenantId));
  
  // Cache result
  await RedisService.setJSON(CacheKeys.assetsList(tenantId), assets, CacheTTL.ASSETS);
  return assets;
}
```

### 3. Add Cache Invalidation on Mutations (1-2 hours)
**Purpose:** Keep cache fresh when data changes
**Pattern:**
```typescript
// After update/delete, clear cache
await RedisService.del(CacheKeys.assetsList(tenantId));
await RedisService.del(CacheKeys.asset(tenantId, assetId));
```

### 4. Add Elasticsearch Indexing (2-3 hours)
**Purpose:** Enable full-text search and analytics
**Files to modify:**
- `/backend/src/controllers/workorder.controller.ts` - Index on create/update
- `/backend/src/controllers/asset.controller.ts` - Index on create/update
- `/backend/src/controllers/maintenance.controller.ts` - Index plans on create/update

**Example pattern:**
```typescript
// After creating order
await ElasticsearchService.index('orders_v1', order.id, {
  tenant_id: order.tenantId,
  asset_id: order.assetId,
  title: order.title,
  description: order.description,
  status: order.status,
  priority: order.priority,
  type: order.type,
  sla: order.sla,
  created_at: order.createdAt,
  updated_at: order.updatedAt,
});
```

### 5. Implement Bull Job Processors (2-3 hours)
**Purpose:** Process long-running tasks asynchronously
**Queues to implement:**
- EMAIL: Send alert/maintenance emails
- REPORTS: Generate PDF reports
- EXPORTS: Export data to CSV/Excel
- MAINTENANCE: Recalculate maintenance schedules

**Example pattern:**
```typescript
JobQueueService.processJob(QUEUES.EMAIL, async (job) => {
  const { alertId, userId } = job.data;
  // Send email
  await sendAlertEmail(userId, alertId);
  return { success: true };
});
```

### 6. Add Frontend Real-time Updates (2-3 hours)
**Purpose:** Auto-update UI when data changes in real-time
**Components to update:**
- `/frontend/src/pages/WorkOrdersPage.tsx` - Listen to order events
- `/frontend/src/pages/AssetsPage.tsx` - Listen to asset events
- `/frontend/src/pages/AlertsPage.tsx` - Listen to alert events
- `/frontend/src/pages/MaintenancePlansPage.tsx` - Listen to plan events

**Example pattern:**
```typescript
// Use the socket hook
const { socket } = useSocket();
const queryClient = useQueryClient();

useEffect(() => {
  if (!socket) return;
  
  const handleOrderCreated = (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
  };
  
  socket.on('order:created', handleOrderCreated);
  return () => socket.off('order:created', handleOrderCreated);
}, [socket, queryClient]);
```

## 📊 Impact Metrics
- **Latency:** Expected ↓50-70% (caching + optimization)
- **Real-time:** <100ms message delivery (WebSocket)
- **Scalability:** Supports 100k+ records with Elasticsearch
- **Reliability:** Auto-retry on failures (Redis, Bull, Socket.io)

## 🔗 Service Dependencies
```
Routes/Controllers
    ↓
Socket.io (emit events)
Redis (cache queries)
Elasticsearch (full-text search)
Bull (background jobs)
```

## 🚀 Starting the Development Server
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Redis (if not running via Docker)
redis-server

# Terminal 4: Elasticsearch (if not running via Docker)
# Already running in Docker or start manually
```

## 📝 Testing Checklist
- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] Socket.io connects when app loads
- [ ] Socket status indicator shows "Conectado"
- [ ] Create new work order → see real-time toast notification
- [ ] Test cache hits (queries should be instant)
- [ ] Test Elasticsearch search
- [ ] Test Bull job queue

---
**Next immediate action:** Add socket.emit() calls to route files (workorder.routes.ts, asset.routes.ts, etc.)
