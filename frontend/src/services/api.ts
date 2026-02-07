// API Configuration
// Use relative path for API calls - always works whether in dev or production
// This ensures frontend requests go to the same origin
const API_BASE_URL = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutMs = 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo limite da requisicao. Verifique a ligacao e tente novamente.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  const result: ApiResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }

  return result.data as T;
}

async function publicApiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: options.signal ?? controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo limite da requisicao. Verifique a ligacao e tente novamente.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  const result: ApiResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }

  return result.data as T;
}

export async function getApiHealth(): Promise<{
  ok: boolean;
  status: number;
  message: string;
}> {
  const controller = new AbortController();
  const timeoutMs = 8000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch('/health', {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return { ok: false, status: 0, message: 'Timeout' };
    }
    return { ok: false, status: 0, message: error?.message || 'Falha' };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: `HTTP ${response.status}` };
  }

  try {
    const data = await response.json();
    return { ok: true, status: response.status, message: data?.message || 'OK' };
  } catch {
    return { ok: true, status: response.status, message: 'OK' };
  }
}

export async function login(
  username: string,
  password: string,
): Promise<{
  token: string;
  refreshToken: string;
  user: any;
}> {
  return apiCall(
    '/auth/login',
    {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    },
  );
}

export async function getWorkOrders(plantId: string, status?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  return apiCall(`/${plantId}/work-orders?${params.toString()}`);
}

export async function getWorkOrder(plantId: string, workOrderId: string) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}`);
}

export async function createWorkOrder(plantId: string, data: any) {
  return apiCall(`/${plantId}/work-orders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWorkOrder(plantId: string, workOrderId: string, data: any) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getDashboardMetrics(plantId: string) {
  return apiCall(`/dashboard/${plantId}/metrics`);
}

export async function getDashboardKPIs(plantId: string) {
  return apiCall(`/dashboard/${plantId}/kpis`);
}

export async function getUserPlants() {
  try {
    const data = await apiCall('/plants');
    console.log('API getUserPlants response:', data);
    
    // Handle both array and object responses
    const plants = Array.isArray(data) ? data : (data?.data || []);
    
    if (!plants || plants.length === 0) {
      console.warn('No plants returned from API');
      return [];
    }
    
    return plants;
  } catch (error) {
    console.error('Error fetching user plants:', error);
    throw error;
  }
}

export async function getAssets(plantId: string, search?: string) {
  if (!plantId || plantId === 'null' || plantId === 'undefined' || plantId.trim() === '') {
    throw new Error('Selecione uma planta valida');
  }

  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const query = params.toString();
  const data = await apiCall(`/${plantId}/assets${query ? `?${query}` : ''}`);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray((data as any).data)) {
    return (data as any).data;
  }

  if (data && Array.isArray((data as any).assets)) {
    return (data as any).assets;
  }

  return [];
}

export async function createAsset(plantId: string, data: any) {
  return apiCall(`/${plantId}/assets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAsset(plantId: string, assetId: string, data: any) {
  return apiCall(`/${plantId}/assets/${assetId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAsset(plantId: string, assetId: string) {
  return apiCall(`/${plantId}/assets/${assetId}`, {
    method: 'DELETE',
  });
}

export async function getAssetCategories() {
  return apiCall('/asset-categories');
}

export async function createAssetCategory(data: any) {
  return apiCall('/asset-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAssetCategory(categoryId: string, data: any) {
  return apiCall(`/asset-categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getMaintenancePlans(plantId: string) {
  return apiCall(`/${plantId}/plans`);
}

export async function createMaintenancePlan(plantId: string, data: any) {
  return apiCall(`/${plantId}/plans`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMaintenancePlan(
  plantId: string,
  planId: string,
  data: any,
) {
  return apiCall(`/${plantId}/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMaintenancePlan(plantId: string, planId: string) {
  return apiCall(`/${plantId}/plans/${planId}`, {
    method: 'DELETE',
  });
}

export async function getSpareParts(plantId: string) {
  return apiCall(`/${plantId}/spareparts`);
}

export async function getSuppliers(plantId: string, search?: string) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const query = params.toString();
  return apiCall(`/${plantId}/suppliers${query ? `?${query}` : ''}`);
}

export async function createSupplier(plantId: string, data: any) {
  return apiCall(`/${plantId}/suppliers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSupplier(plantId: string, supplierId: string, data: any) {
  return apiCall(`/${plantId}/suppliers/${supplierId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(plantId: string, supplierId: string) {
  return apiCall(`/${plantId}/suppliers/${supplierId}`, {
    method: 'DELETE',
  });
}

export async function createSparePart(plantId: string, data: any) {
  return apiCall(`/${plantId}/spareparts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getStockMovementsByPlant(plantId: string) {
  return apiCall(`/${plantId}/stock-movements/plant/${plantId}`);
}

export async function createStockMovement(plantId: string, data: any) {
  return apiCall(`/${plantId}/stock-movements`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getJobQueueStats() {
  return apiCall('/jobs/stats');
}

// ============================================================================
// ADMIN MANAGEMENT (plants, users, roles)
// ============================================================================

export async function getAdminPlants() {
  return apiCall('/admin/plants');
}

export async function createAdminPlant(data: any) {
  return apiCall('/admin/plants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminPlant(plantId: string, data: any) {
  return apiCall(`/admin/plants/${plantId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deactivateAdminPlant(plantId: string) {
  return apiCall(`/admin/plants/${plantId}`, {
    method: 'DELETE',
  });
}

export async function getAdminUsers() {
  return apiCall('/admin/users');
}

export async function createAdminUser(data: any) {
  return apiCall('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminUser(userId: string, data: any) {
  return apiCall(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getAdminRoles() {
  return apiCall('/admin/roles');
}

export async function enqueueJob(data: {
  queue: string;
  jobName: string;
  payload?: any;
  delayMs?: number;
}) {
  return apiCall('/jobs/enqueue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getJobDetails(queue: string, jobId: string) {
  return apiCall(`/jobs/${queue}/${jobId}`);
}

export async function getRecentJobs(queue: string, limit: number = 20) {
  return apiCall(`/jobs/${queue}/recent?limit=${limit}`);
}

export async function searchAll(
  query: string,
  options?: {
    type?: 'orders' | 'assets';
    plantId?: string;
    status?: string;
    priority?: string;
    category?: string;
    page?: number;
    limit?: number;
    sort?: 'score' | 'date_desc' | 'date_asc';
  },
) {
  const params = new URLSearchParams();
  params.append('q', query);
  if (options?.type) params.append('type', options.type);
  if (options?.plantId) params.append('plant_id', options.plantId);
  if (options?.status) params.append('status', options.status);
  if (options?.priority) params.append('priority', options.priority);
  if (options?.category) params.append('category', options.category);
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.sort && options.sort !== 'score') params.append('sort', options.sort);

  return apiCall(`/search?${params.toString()}`);
}

// ============================================================================
// SETUP ENDPOINTS (for database initialization)
// ============================================================================

export async function getSetupStatus() {
  return apiCall('/setup/status');
}

export async function initializeDatabase() {
  return apiCall('/setup/initialize', {
    method: 'POST',
  });
}

export async function seedDemoData() {
  return apiCall('/setup/seed', {
    method: 'POST',
  });
}

export async function runMigrations() {
  return apiCall('/setup/migrate', {
    method: 'POST',
  });
}

export async function clearAllData() {
  return apiCall('/setup/clear', {
    method: 'POST',
  });
}

export async function bootstrapDatabase() {
  return publicApiCall('/api/setup/bootstrap', {
    method: 'POST',
  });
}
