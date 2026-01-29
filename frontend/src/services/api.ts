// API Configuration
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

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
  tenant: string,
): Promise<{
  token: string;
  refreshToken: string;
  user: any;
}> {
  // Sends tenant as tenant_slug for convenience (backend also accepts tenant_id)
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, tenant_slug: tenant }),
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
