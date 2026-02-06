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

  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

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

export async function login(
  email: string,
  password: string,
): Promise<{
  token: string;
  refreshToken: string;
  user: any;
}> {
  // Backend uses default tenant for single-tenant mode
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getWorkOrders(plantId: string, status?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  return apiCall(`/tenants/${plantId}/work-orders?${params.toString()}`);
}

export async function getWorkOrder(plantId: string, workOrderId: string) {
  return apiCall(`/tenants/${plantId}/work-orders/${workOrderId}`);
}

export async function createWorkOrder(plantId: string, data: any) {
  return apiCall(`/tenants/${plantId}/work-orders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWorkOrder(plantId: string, workOrderId: string, data: any) {
  return apiCall(`/tenants/${plantId}/work-orders/${workOrderId}`, {
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
    const data = await apiCall('/tenants/plants');
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
  return apiCall(`/tenants/${plantId}/assets${query ? `?${query}` : ''}`);
}

export async function getMaintenancePlans(plantId: string) {
  return apiCall(`/tenants/${plantId}/plans`);
}

export async function createMaintenancePlan(plantId: string, data: any) {
  return apiCall(`/tenants/${plantId}/plans`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSpareParts(plantId: string) {
  return apiCall(`/tenants/${plantId}/spareparts`);
}

export async function getSuppliers(plantId: string, search?: string) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const query = params.toString();
  return apiCall(`/tenants/${plantId}/suppliers${query ? `?${query}` : ''}`);
}

export async function createSupplier(plantId: string, data: any) {
  return apiCall(`/tenants/${plantId}/suppliers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSupplier(plantId: string, supplierId: string, data: any) {
  return apiCall(`/tenants/${plantId}/suppliers/${supplierId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(plantId: string, supplierId: string) {
  return apiCall(`/tenants/${plantId}/suppliers/${supplierId}`, {
    method: 'DELETE',
  });
}

export async function createSparePart(plantId: string, data: any) {
  return apiCall(`/tenants/${plantId}/spareparts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getStockMovementsByPlant(plantId: string) {
  return apiCall(`/tenants/${plantId}/stock-movements/plant/${plantId}`);
}

export async function createStockMovement(plantId: string, data: any) {
  return apiCall(`/tenants/${plantId}/stock-movements`, {
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

export async function seedDemoData() {
  return apiCall('/setup/seed', {
    method: 'POST',
  });
}

export async function clearAllData() {
  return apiCall('/setup/clear', {
    method: 'POST',
  });
}
