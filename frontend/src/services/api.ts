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

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
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

    const payload = parseJwtPayload(token);
    const role = String(payload?.role || '').trim().toLowerCase();
    if (role === 'superadmin') {
      // SuperAdmin default scope is GLOBAL.
      // Only send tenant override headers for endpoints that are explicitly tenant-scoped.
      const tenantScopedSuperadmin =
        endpoint === '/superadmin/db/status' ||
        endpoint.startsWith('/superadmin/db/status?') ||
        endpoint === '/superadmin/db/runs/export' ||
        endpoint.startsWith('/superadmin/db/runs/export?') ||
        endpoint === '/superadmin/metrics/plants' ||
        endpoint.startsWith('/superadmin/metrics/plants?') ||
        endpoint === '/superadmin/metrics/plants/export' ||
        endpoint.startsWith('/superadmin/metrics/plants/export?') ||
        endpoint === '/superadmin/metrics/users/anomalies' ||
        endpoint.startsWith('/superadmin/metrics/users/anomalies?') ||
        endpoint === '/superadmin/metrics/users/security' ||
        endpoint.startsWith('/superadmin/metrics/users/security?') ||
        endpoint === '/superadmin/metrics/users/security/export' ||
        endpoint.startsWith('/superadmin/metrics/users/security/export?') ||
        endpoint === '/superadmin/metrics/rbac/drift' ||
        endpoint.startsWith('/superadmin/metrics/rbac/drift?') ||
        endpoint === '/superadmin/metrics/rbac/drift/export' ||
        endpoint.startsWith('/superadmin/metrics/rbac/drift/export?') ||
        endpoint === '/superadmin/diagnostics/bundle/export' ||
        endpoint.startsWith('/superadmin/diagnostics/bundle/export?') ||
        endpoint === '/superadmin/diagnostics/integrity' ||
        endpoint.startsWith('/superadmin/diagnostics/integrity?') ||
        endpoint === '/superadmin/diagnostics/integrity/export' ||
        endpoint.startsWith('/superadmin/diagnostics/integrity/export?');

      if (tenantScopedSuperadmin) {
        const selectedTenantId = localStorage.getItem('superadminTenantId');
        if (selectedTenantId && selectedTenantId.trim().length > 0) {
          headers['x-tenant-id'] = selectedTenantId.trim();
        }
      }
    }
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

async function apiCallRaw(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutMs = 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: any = {
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;

    const payload = parseJwtPayload(token);
    const role = String(payload?.role || '').trim().toLowerCase();
    if (role === 'superadmin') {
      const tenantScopedSuperadmin =
        endpoint === '/superadmin/db/status' ||
        endpoint.startsWith('/superadmin/db/status?') ||
        endpoint === '/superadmin/db/runs/export' ||
        endpoint.startsWith('/superadmin/db/runs/export?') ||
        endpoint === '/superadmin/metrics/plants' ||
        endpoint.startsWith('/superadmin/metrics/plants?') ||
        endpoint === '/superadmin/metrics/plants/export' ||
        endpoint.startsWith('/superadmin/metrics/plants/export?') ||
        endpoint === '/superadmin/metrics/users/anomalies' ||
        endpoint.startsWith('/superadmin/metrics/users/anomalies?') ||
        endpoint === '/superadmin/metrics/users/security' ||
        endpoint.startsWith('/superadmin/metrics/users/security?') ||
        endpoint === '/superadmin/metrics/users/security/export' ||
        endpoint.startsWith('/superadmin/metrics/users/security/export?') ||
        endpoint === '/superadmin/metrics/rbac/drift' ||
        endpoint.startsWith('/superadmin/metrics/rbac/drift?') ||
        endpoint === '/superadmin/diagnostics/bundle/export' ||
        endpoint.startsWith('/superadmin/diagnostics/bundle/export?') ||
        endpoint === '/superadmin/diagnostics/integrity' ||
        endpoint.startsWith('/superadmin/diagnostics/integrity?') ||
        endpoint === '/superadmin/diagnostics/integrity/export' ||
        endpoint.startsWith('/superadmin/diagnostics/integrity/export?') ||
        endpoint === '/superadmin/metrics/rbac/drift/export' ||
        endpoint.startsWith('/superadmin/metrics/rbac/drift/export?');

      if (tenantScopedSuperadmin) {
        const selectedTenantId = localStorage.getItem('superadminTenantId');
        if (selectedTenantId && selectedTenantId.trim().length > 0) {
          headers['x-tenant-id'] = selectedTenantId.trim();
        }
      }
    }
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
    try {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    } catch {
      throw new Error('API request failed');
    }
  }

  return response;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================================
// SUPERADMIN (global)
// ============================================================================

export async function getSuperadminTenants(): Promise<
  Array<{ id: string; name: string; slug: string; is_active: boolean; created_at?: any; updated_at?: any }>
> {
  return apiCall('/superadmin/tenants');
}

export async function createSuperadminTenant(data: {
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
}) {
  return apiCall('/superadmin/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSuperadminTenant(tenantId: string, data: {
  name?: string;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
}) {
  return apiCall(`/superadmin/tenants/${tenantId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getSuperadminDbStatus(limit?: number): Promise<{
  scope?: 'global' | 'tenant';
  tenantId: string;
  tenantSlug: string;
  serverTime: string;
  dbOk: boolean;
  dbTime?: string;
  counts?: { users?: number | null; plants?: number | null };
  drizzleMigrations?: { table?: string | null; latest?: any | null };
  lastSetupRun?: {
    id?: string;
    tenant_id?: string;
    run_type?: string;
    user_id?: string | null;
    migrations?: any;
    patches?: any;
    created_at?: any;
  } | null;
  setupRuns?: Array<{
    id?: string;
    tenant_id?: string;
    run_type?: string;
    user_id?: string | null;
    migrations?: any;
    patches?: any;
    created_at?: any;
  }>;
}> {
  const safeLimit =
    limit !== undefined && Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Math.trunc(Number(limit)))) : null;
  const qs = safeLimit ? `?limit=${encodeURIComponent(String(safeLimit))}` : '';
  return apiCall(`/superadmin/db/status${qs}`);
}

export async function getSuperadminHealth(): Promise<{
  apiOk: boolean;
  serverTime: string;
  uptimeSeconds: number;
  version?: string | null;
  dbOk: boolean;
  dbTime?: string | null;
}> {
  return apiCall('/superadmin/health');
}

export async function getSuperadminDashboardMetrics(): Promise<any> {
  return apiCall('/superadmin/metrics/dashboard');
}

export async function getSuperadminTenantsActivity(days?: number, limit?: number): Promise<any[]> {
  const params = new URLSearchParams();
  if (days && Number.isFinite(days)) params.set('days', String(days));
  if (limit && Number.isFinite(limit)) params.set('limit', String(limit));
  const qs = params.toString();
  return apiCall(`/superadmin/metrics/activity/tenants${qs ? `?${qs}` : ''}`);
}

export async function downloadSuperadminTenantsActivity(format: 'csv' | 'json' = 'csv', days = 30, limit = 200) {
  const qs = new URLSearchParams({
    format,
    days: String(days),
    limit: String(limit),
  });
  const res = await apiCallRaw(`/superadmin/metrics/activity/tenants/export?${qs.toString()}`);
  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_tenants_activity.json' : 'superadmin_tenants_activity.csv');
}

export async function getSuperadminTenantsMetrics(): Promise<any[]> {
  return apiCall('/superadmin/metrics/tenants');
}

export async function downloadSuperadminTenantsMetrics(format: 'csv' | 'json') {
  const res = await apiCallRaw(`/superadmin/metrics/tenants/export?format=${encodeURIComponent(format)}`);
  const blob = await res.blob();
  const ext = format === 'json' ? 'json' : 'csv';
  triggerDownload(blob, `superadmin_tenants_metrics.${ext}`);
}

export async function getSuperadminPlantsMetrics(): Promise<any[]> {
  return apiCall('/superadmin/metrics/plants');
}

export async function downloadSuperadminPlantsMetrics(format: 'csv' | 'json') {
  const res = await apiCallRaw(`/superadmin/metrics/plants/export?format=${encodeURIComponent(format)}`);
  const blob = await res.blob();
  const ext = format === 'json' ? 'json' : 'csv';
  triggerDownload(blob, `superadmin_plants_metrics.${ext}`);
}

export async function getSuperadminUserAnomalies(): Promise<any> {
  return apiCall('/superadmin/metrics/users/anomalies');
}

export async function getSuperadminUserSecurityInsights(days?: number, limit?: number): Promise<any> {
  const params = new URLSearchParams();
  if (days && Number.isFinite(days)) params.set('days', String(days));
  if (limit && Number.isFinite(limit)) params.set('limit', String(limit));
  const qs = params.toString();
  return apiCall(`/superadmin/metrics/users/security${qs ? `?${qs}` : ''}`);
}

export async function downloadSuperadminUserSecurity(format: 'csv' | 'json' = 'csv', days = 30, limit = 200) {
  const qs = new URLSearchParams({
    format,
    days: String(days),
    limit: String(limit),
  });
  const res = await apiCallRaw(`/superadmin/metrics/users/security/export?${qs.toString()}`);
  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_user_security.json' : 'superadmin_user_security.csv');
}

export async function getSuperadminRbacDrift(): Promise<any> {
  return apiCall('/superadmin/metrics/rbac/drift');
}

export async function downloadSuperadminRbacDrift(format: 'csv' | 'json' = 'csv') {
  const qs = new URLSearchParams({ format });
  const res = await apiCallRaw(`/superadmin/metrics/rbac/drift/export?${qs.toString()}`);
  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_rbac_drift.json' : 'superadmin_rbac_drift.csv');
}

export async function getSuperadminIntegrityChecks(): Promise<any> {
  return apiCall('/superadmin/diagnostics/integrity');
}

export async function downloadSuperadminIntegrityChecks(format: 'csv' | 'json' = 'csv') {
  const qs = new URLSearchParams({ format });
  const res = await apiCallRaw(`/superadmin/diagnostics/integrity/export?${qs.toString()}`);
  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_integrity_checks.json' : 'superadmin_integrity_checks.csv');
}

export async function downloadSuperadminDiagnosticsBundle(options?: {
  format?: 'json' | 'zip';
  auditLimit?: number;
  diagnosticsLimit?: number;
  dbRunsLimit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.format) params.set('format', options.format);
  if (options?.auditLimit && Number.isFinite(options.auditLimit)) params.set('auditLimit', String(options.auditLimit));
  if (options?.diagnosticsLimit && Number.isFinite(options.diagnosticsLimit)) params.set('diagnosticsLimit', String(options.diagnosticsLimit));
  if (options?.dbRunsLimit && Number.isFinite(options.dbRunsLimit)) params.set('dbRunsLimit', String(options.dbRunsLimit));
  const qs = params.toString();
  const res = await apiCallRaw(`/superadmin/diagnostics/bundle/export${qs ? `?${qs}` : ''}`);
  const blob = await res.blob();
  const filename = options?.format === 'zip' ? 'superadmin_diagnostics_bundle.zip' : 'superadmin_diagnostics_bundle.json';
  triggerDownload(blob, filename);
}

export async function downloadSuperadminDbStatusJson(limit?: number) {
  const params = new URLSearchParams();
  if (limit && Number.isFinite(limit)) params.set('limit', String(limit));
  const qs = params.toString();
  const res = await apiCallRaw(`/superadmin/db/status${qs ? `?${qs}` : ''}`);
  const blob = await res.blob();
  triggerDownload(blob, 'superadmin_db_status.json');
}

export async function getSuperadminTenantDiagnostics(limit?: number): Promise<{
  topTenants: Array<{ id: string; name: string; slug: string; is_active: boolean; users: number; plants: number }>;
  warnings: Array<{
    type: string;
    tenant: { id: string; name: string; slug: string; is_active: boolean };
    users: number;
    plants: number;
  }>;
}> {
  const safeLimit =
    limit !== undefined && Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Math.trunc(Number(limit)))) : null;
  const qs = safeLimit ? `?limit=${encodeURIComponent(String(safeLimit))}` : '';
  return apiCall(`/superadmin/diagnostics/tenants${qs}`);
}

export async function getSuperadminAudit(params?: {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}): Promise<
  Array<{
    id: string;
    actor_user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    affected_tenant_id: string | null;
    metadata: any;
    ip_address: string | null;
    user_agent: string | null;
    created_at: any;
  }>
> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);

  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiCall(`/superadmin/audit${suffix}`);
}

export async function purgeSuperadminAudit(): Promise<{ deleted: number; disabled?: boolean }> {
  return apiCall('/superadmin/audit/purge', { method: 'POST' });
}

export async function downloadSuperadminAudit(format: 'csv' | 'json' = 'csv', limit = 200) {
  const qs = new URLSearchParams({ format, limit: String(limit) });
  const res = await apiCallRaw(`/superadmin/audit/export?${qs.toString()}`, {
    method: 'GET',
  });
  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_audit_logs.json' : 'superadmin_audit_logs.csv');
}

export async function searchSuperadminUsers(q: string): Promise<
  Array<{
    id: string;
    tenant_id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  }>
> {
  const safe = String(q || '').trim();
  if (!safe) return [];
  return apiCall(`/superadmin/users/search?q=${encodeURIComponent(safe)}`);
}

export async function resetSuperadminUserPassword(userId: string): Promise<{
  userId: string;
  tenantId: string;
  username: string;
  oneTimePassword: string;
}> {
  return apiCall(`/superadmin/users/${encodeURIComponent(String(userId))}/reset-password`, {
    method: 'POST',
  });
}

export async function downloadSetupRunsExport(format: 'csv' | 'json' = 'csv', limit = 200) {
  const qs = new URLSearchParams({ format, limit: String(limit) });
  const res = await apiCallRaw(`/superadmin/db/runs/export?${qs.toString()}`, {
    method: 'GET',
  });
  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'setup_db_runs.json' : 'setup_db_runs.csv');
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

export type UserProfile = {
  id: string;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  roleLabel?: string | null;
  tenantId: string;
};

export type AdminRoleOption = {
  value: string;
  label: string;
  description?: string | null;
  is_system?: boolean;
};

export async function getProfile(): Promise<UserProfile> {
  return apiCall('/profile');
}

export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}): Promise<UserProfile> {
  return apiCall('/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message?: string } | void> {
  return apiCall('/profile/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
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

export async function getWorkOrderAuditLogs(plantId: string, workOrderId: string) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}/audit`);
}

export async function getWorkOrderReservations(plantId: string, workOrderId: string) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}/reservations`);
}

export async function createWorkOrderReservation(
  plantId: string,
  workOrderId: string,
  data: { spare_part_id: string; quantity: number; notes?: string },
) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}/reservations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function releaseWorkOrderReservation(
  plantId: string,
  workOrderId: string,
  reservationId: string,
  reason?: string,
) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}/reservations/${reservationId}/release`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getWorkOrderTasks(plantId: string, workOrderId: string) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}/tasks`);
}

export async function addWorkOrderTask(plantId: string, workOrderId: string, description: string) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}

export async function updateWorkOrderTask(
  plantId: string,
  workOrderId: string,
  taskId: string,
  is_completed: boolean,
){
  return apiCall(`/${plantId}/work-orders/${workOrderId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_completed }),
  });
}

export async function deleteWorkOrderTask(plantId: string, workOrderId: string, taskId: string) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function deleteWorkOrder(plantId: string, workOrderId: string) {
  return apiCall(`/${plantId}/work-orders/${workOrderId}`, {
    method: 'DELETE',
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

export async function getPreventiveSchedules(
  plantId: string,
  filters?: { asset_id?: string; plan_id?: string; status?: string },
) {
  const params = new URLSearchParams();
  if (filters?.asset_id) params.append('asset_id', filters.asset_id);
  if (filters?.plan_id) params.append('plan_id', filters.plan_id);
  if (filters?.status) params.append('status', filters.status);
  const query = params.toString();
  return apiCall(`/${plantId}/preventive-schedules${query ? `?${query}` : ''}`);
}

export async function getUpcomingPreventiveSchedules(plantId: string, limit = 5) {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  return apiCall(`/${plantId}/preventive-schedules/upcoming?${params.toString()}`);
}

export async function createPreventiveSchedule(plantId: string, data: any) {
  return apiCall(`/${plantId}/preventive-schedules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePreventiveSchedule(
  plantId: string,
  scheduleId: string,
  data: any,
) {
  return apiCall(`/${plantId}/preventive-schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function skipPreventiveSchedule(
  plantId: string,
  scheduleId: string,
  reason: string,
) {
  return apiCall(`/${plantId}/preventive-schedules/${scheduleId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
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

export async function getSparePartsForecast(plantId: string, days: number = 30) {
  const params = new URLSearchParams();
  params.append('days', String(days));
  return apiCall(`/${plantId}/spareparts/forecast?${params.toString()}`);
}

export async function getSuppliers(plantId: string, search?: string) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const query = params.toString();
  return apiCall(`/${plantId}/suppliers${query ? `?${query}` : ''}`);
}

// ============================================================================
// MAINTENANCE KITS
// ============================================================================

export async function getMaintenanceKits(filters?: {
  plan_id?: string;
  category_id?: string;
  is_active?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.plan_id) params.append('plan_id', filters.plan_id);
  if (filters?.category_id) params.append('category_id', filters.category_id);
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
  const query = params.toString();
  return apiCall(`/maintenance-kits${query ? `?${query}` : ''}`);
}

export async function getMaintenanceKit(kitId: string) {
  return apiCall(`/maintenance-kits/${kitId}`);
}

export async function createMaintenanceKit(data: {
  name: string;
  notes?: string;
  plan_id?: string;
  category_id?: string;
  is_active?: boolean;
}) {
  return apiCall('/maintenance-kits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMaintenanceKit(
  kitId: string,
  data: {
    name?: string;
    notes?: string;
    plan_id?: string | null;
    category_id?: string | null;
    is_active?: boolean;
  },
) {
  return apiCall(`/maintenance-kits/${kitId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getMaintenanceKitItems(kitId: string) {
  return apiCall(`/maintenance-kits/${kitId}/items`);
}

export async function upsertMaintenanceKitItems(
  kitId: string,
  data: { items: Array<{ spare_part_id: string; quantity: number }> },
) {
  return apiCall(`/maintenance-kits/${kitId}/items`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
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
    body: JSON.stringify({
      ...data,
      plant_id: plantId,
    }),
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

export async function createAdminRole(data: {
  key: string;
  name: string;
  description?: string | null;
}): Promise<AdminRoleOption> {
  return apiCall('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminRole(
  roleKey: string,
  data: { name?: string; description?: string | null },
): Promise<AdminRoleOption> {
  return apiCall(`/admin/roles/${roleKey}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getAdminPermissions() {
  return apiCall('/admin/permissions');
}

export type AdminRoleHomeEntry = {
  role_key: string;
  plant_id: string | null;
  home_path: string;
  plant_override: string | null;
  global_base: string | null;
  suggested_home: string;
};

export async function getAdminRoleHomes(plantId?: string | null): Promise<AdminRoleHomeEntry[]> {
  const params = new URLSearchParams();
  if (plantId) params.append('plant_id', plantId);
  const qs = params.toString();
  return apiCall(`/admin/role-homes${qs ? `?${qs}` : ''}`);
}

export async function setAdminRoleHomes(
  plantId: string | null,
  entries: Array<{ role_key: string; home_path: string }>,
): Promise<{ message?: string } | void> {
  return apiCall('/admin/role-homes', {
    method: 'PUT',
    body: JSON.stringify({ plant_id: plantId, entries }),
  });
}

export async function getProfileHomeRoute(
  plantId: string,
): Promise<{ plantId: string; roleKey: string; roleLabel: string | null; homePath: string }> {
  const params = new URLSearchParams();
  params.append('plantId', plantId);
  return apiCall(`/profile/home-route?${params.toString()}`);
}

export async function getAdminRolePermissions(roleKey: string) {
  return apiCall(`/admin/roles/${roleKey}/permissions`);
}

export async function setAdminRolePermissions(roleKey: string, permissions: string[]) {
  return apiCall(`/admin/roles/${roleKey}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

export async function resetAdminUserPassword(userId: string, password: string) {
  return apiCall(`/admin/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
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

export async function patchWorkOrders() {
  return apiCall('/setup/patch/work-orders', {
    method: 'POST',
  });
}

export async function patchWorkOrdersDowntimeRca() {
  return apiCall('/setup/patch/work-orders-downtime-rca', {
    method: 'POST',
  });
}

export async function patchWorkOrdersSlaPause() {
  return apiCall('/setup/patch/work-orders-sla-pause', {
    method: 'POST',
  });
}

export async function patchMaintenancePlansToleranceMode() {
  return apiCall('/setup/patch/maintenance-plans-tolerance-mode', {
    method: 'POST',
  });
}

export async function patchMaintenancePlansScheduleAnchorMode() {
  return apiCall('/setup/patch/maintenance-plans-schedule-anchor-mode', {
    method: 'POST',
  });
}

export async function patchStockReservations() {
  return apiCall('/setup/patch/stock-reservations', {
    method: 'POST',
  });
}

export async function patchMaintenanceKits() {
  return apiCall('/setup/patch/maintenance-kits', {
    method: 'POST',
  });
}

export async function applyDbCorrections() {
  return apiCall('/setup/patch/all', {
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

export async function getNotificationRules() {
  return apiCall('/notifications/rules');
}

export async function updateNotificationRules(rules: any[]) {
  return apiCall('/notifications/rules', {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
}

export type InboxNotification = {
  id: string;
  eventType: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error' | string;
  entity?: string | null;
  entityId?: string | null;
  meta?: any;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
};

export async function getNotificationsInbox(params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<{ items: InboxNotification[]; unreadCount: number }> {
  const qs = new URLSearchParams();
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));
  if (typeof params?.unreadOnly === 'boolean') qs.set('unreadOnly', String(params.unreadOnly));

  const suffix = qs.toString();
  return apiCall(`/notifications/inbox${suffix ? `?${suffix}` : ''}`);
}

export async function markNotificationsReadAll(): Promise<{ updated: number }> {
  return apiCall('/notifications/inbox/read-all', {
    method: 'PATCH',
  });
}

export async function clearNotificationsInbox(): Promise<{ deleted: number }> {
  return apiCall('/notifications/inbox', {
    method: 'DELETE',
  });
}

export async function deleteInboxNotification(notificationId: string): Promise<{ deleted: number }> {
  return apiCall(`/notifications/inbox/${encodeURIComponent(notificationId)}`, {
    method: 'DELETE',
  });
}

export async function markInboxNotificationRead(notificationId: string): Promise<{ updated: number }> {
  return apiCall(`/notifications/inbox/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
  });
}

export async function markInboxNotificationUnread(notificationId: string): Promise<{ updated: number }> {
  return apiCall(`/notifications/inbox/${encodeURIComponent(notificationId)}/unread`, {
    method: 'PATCH',
  });
}
