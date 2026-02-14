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
      // In SuperAdmin mode, a selected tenant (Empresa) drives the tenant context.
      // We send the tenant override header for tenant-scoped endpoints.
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
        endpoint.startsWith('/superadmin/diagnostics/integrity/export?') ||
        endpoint === '/superadmin/tickets/suggestions' ||
        endpoint.startsWith('/superadmin/tickets/suggestions?') ||
        endpoint.startsWith('/superadmin/tickets/suggestions/') ||
        endpoint.startsWith('/admin/') ||
        endpoint.startsWith('/setup/') ||
        endpoint === '/plants' ||
        endpoint.startsWith('/plants/');

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
        endpoint.startsWith('/superadmin/metrics/rbac/drift/export?') ||
        endpoint === '/superadmin/tickets/suggestions' ||
        endpoint.startsWith('/superadmin/tickets/suggestions?') ||
        endpoint.startsWith('/superadmin/tickets/suggestions/') ||
        endpoint.startsWith('/admin/') ||
        endpoint.startsWith('/setup/');

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

function toPlainValue(value: any): any {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) return value.toISOString();

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeRows(data: any): Array<Record<string, any>> {
  const raw =
    Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : Array.isArray(data?.data) ? data.data : null;

  const rows = raw ?? (data && typeof data === 'object' ? [data] : [data]);
  return rows.map((row: any) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) out[k] = toPlainValue(v);
      return out;
    }
    return { value: toPlainValue(row) };
  });
}

function getColumns(rows: Array<Record<string, any>>): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r || {})) set.add(k);
  }
  return Array.from(set);
}

async function triggerDownloadXlsx(data: any, filename: string, sheetName = 'Export') {
  const rows = normalizeRows(data);
  const columns = getColumns(rows);

  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}

async function triggerDownloadPdf(data: any, filename: string, title = 'Export') {
  const rows = normalizeRows(data);
  const columns = getColumns(rows);

  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableMod as any).default || (autoTableMod as any);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(String(title || 'Export'), 40, 40);

  const body = rows.map((r) => columns.map((c) => String(r?.[c] ?? '')));

  autoTable(doc, {
    head: [columns],
    body,
    startY: 60,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fontStyle: 'bold' },
  });

  const blob = doc.output('blob');
  triggerDownload(blob, filename);
}

// ============================================================================
// SUPERADMIN (global)
// ============================================================================

export async function getSuperadminTenants(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    is_read_only?: boolean;
    read_only_reason?: string | null;
    read_only_at?: any;
    read_only_by?: string | null;
    created_at?: any;
    updated_at?: any;
  }>
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
  is_read_only?: boolean;
  read_only_reason?: string | null;
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

export async function downloadSuperadminTenantsActivity(format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'csv', days = 30, limit = 200) {
  const qs = new URLSearchParams({
    format: format === 'xlsx' || format === 'pdf' ? 'json' : format,
    days: String(days),
    limit: String(limit),
  });
  const res = await apiCallRaw(`/superadmin/metrics/activity/tenants/export?${qs.toString()}`);

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'superadmin_tenants_activity.xlsx', 'TenantsActivity');
    } else {
      await triggerDownloadPdf(data, 'superadmin_tenants_activity.pdf', 'Top empresas por atividade (30d)');
    }
    return;
  }

  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_tenants_activity.json' : 'superadmin_tenants_activity.csv');
}

export async function getSuperadminTenantsMetrics(): Promise<any[]> {
  return apiCall('/superadmin/metrics/tenants');
}

export async function downloadSuperadminTenantsMetrics(format: 'csv' | 'json' | 'xlsx' | 'pdf') {
  const rawFormat = format === 'xlsx' || format === 'pdf' ? 'json' : format;
  const res = await apiCallRaw(`/superadmin/metrics/tenants/export?format=${encodeURIComponent(rawFormat)}`);

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'superadmin_tenants_metrics.xlsx', 'Tenants');
    } else {
      await triggerDownloadPdf(data, 'superadmin_tenants_metrics.pdf', 'Métricas de empresas');
    }
    return;
  }

  const blob = await res.blob();
  const ext = format === 'json' ? 'json' : 'csv';
  triggerDownload(blob, `superadmin_tenants_metrics.${ext}`);
}

export async function getSuperadminPlantsMetrics(): Promise<any[]> {
  return apiCall('/superadmin/metrics/plants');
}

export async function downloadSuperadminPlantsMetrics(format: 'csv' | 'json' | 'xlsx' | 'pdf') {
  const rawFormat = format === 'xlsx' || format === 'pdf' ? 'json' : format;
  const res = await apiCallRaw(`/superadmin/metrics/plants/export?format=${encodeURIComponent(rawFormat)}`);

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'superadmin_plants_metrics.xlsx', 'Plants');
    } else {
      await triggerDownloadPdf(data, 'superadmin_plants_metrics.pdf', 'Saúde por fábrica');
    }
    return;
  }

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

export async function downloadSuperadminUserSecurity(format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'csv', days = 30, limit = 200) {
  const qs = new URLSearchParams({
    format: format === 'xlsx' || format === 'pdf' ? 'json' : format,
    days: String(days),
    limit: String(limit),
  });
  const res = await apiCallRaw(`/superadmin/metrics/users/security/export?${qs.toString()}`);

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'superadmin_user_security.xlsx', 'UserSecurity');
    } else {
      await triggerDownloadPdf(data, 'superadmin_user_security.pdf', 'Segurança (30d)');
    }
    return;
  }

  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_user_security.json' : 'superadmin_user_security.csv');
}

export async function getSuperadminRbacDrift(): Promise<any> {
  return apiCall('/superadmin/metrics/rbac/drift');
}

export async function downloadSuperadminRbacDrift(format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'csv') {
  const qs = new URLSearchParams({ format });
  const rawFormat = format === 'xlsx' || format === 'pdf' ? 'json' : format;
  qs.set('format', rawFormat);
  const res = await apiCallRaw(`/superadmin/metrics/rbac/drift/export?${qs.toString()}`);

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'superadmin_rbac_drift.xlsx', 'RBACDrift');
    } else {
      await triggerDownloadPdf(data, 'superadmin_rbac_drift.pdf', 'RBAC Drift');
    }
    return;
  }

  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_rbac_drift.json' : 'superadmin_rbac_drift.csv');
}

export async function getSuperadminIntegrityChecks(): Promise<any> {
  return apiCall('/superadmin/diagnostics/integrity');
}

export async function downloadSuperadminIntegrityChecks(format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'csv') {
  const rawFormat = format === 'xlsx' || format === 'pdf' ? 'json' : format;
  const qs = new URLSearchParams({ format: rawFormat });
  const res = await apiCallRaw(`/superadmin/diagnostics/integrity/export?${qs.toString()}`);

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'superadmin_integrity_checks.xlsx', 'Integrity');
    } else {
      await triggerDownloadPdf(data, 'superadmin_integrity_checks.pdf', 'Integridade');
    }
    return;
  }

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

export async function getSuperadminTenantsHealthScore(limit?: number): Promise<{
  generatedAt: string;
  items: Array<{
    tenant: { id: string; name: string; slug: string; is_active: boolean };
    counts: { users: number; activeUsers: number; plants: number };
    lastLogin: string | null;
    score: number;
    status: 'ok' | 'warning' | 'critical';
    alerts: Array<{ type: string; severity: 'info' | 'warning' | 'critical'; message: string }>;
  }>;
}> {
  const safeLimit =
    limit !== undefined && Number.isFinite(Number(limit)) ? Math.max(1, Math.min(200, Math.trunc(Number(limit)))) : null;
  const qs = safeLimit ? `?limit=${encodeURIComponent(String(safeLimit))}` : '';
  return apiCall(`/superadmin/diagnostics/tenants/healthscore${qs}`);
}

export async function downloadSuperadminTenantsHealthScore(
  format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'csv',
  limit = 200,
) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(500, Math.trunc(Number(limit)))) : 200;
  const rawFormat = format === 'xlsx' || format === 'pdf' ? 'json' : format;
  const qs = new URLSearchParams({ format: rawFormat, limit: String(safeLimit) });
  const res = await apiCallRaw(`/superadmin/diagnostics/tenants/healthscore/export?${qs.toString()}`, { method: 'GET' });

  if (format === 'xlsx' || format === 'pdf') {
    const payload = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(payload, 'superadmin_tenants_healthscore.xlsx', 'HealthScore');
    } else {
      await triggerDownloadPdf(payload, 'superadmin_tenants_healthscore.pdf', 'Health score (Tenants)');
    }
    return;
  }

  const blob = await res.blob();
  triggerDownload(blob, format === 'json' ? 'superadmin_tenants_healthscore.json' : 'superadmin_tenants_healthscore.csv');
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

export async function downloadSuperadminAudit(format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'csv', limit = 200) {
  const rawFormat = format === 'xlsx' || format === 'pdf' ? 'json' : format;
  const qs = new URLSearchParams({ format: rawFormat, limit: String(limit) });
  const res = await apiCallRaw(`/superadmin/audit/export?${qs.toString()}`, { method: 'GET' });

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'superadmin_audit_logs.xlsx', 'Audit');
    } else {
      await triggerDownloadPdf(data, 'superadmin_audit_logs.pdf', 'Auditoria (SuperAdmin)');
    }
    return;
  }

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

export async function downloadSetupRunsExport(format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'csv', limit = 200) {
  const rawFormat = format === 'xlsx' || format === 'pdf' ? 'json' : format;
  const qs = new URLSearchParams({ format: rawFormat, limit: String(limit) });
  const res = await apiCallRaw(`/superadmin/db/runs/export?${qs.toString()}`, { method: 'GET' });

  if (format === 'xlsx' || format === 'pdf') {
    const data = await res.json();
    if (format === 'xlsx') {
      await triggerDownloadXlsx(data, 'setup_db_runs.xlsx', 'SetupRuns');
    } else {
      await triggerDownloadPdf(data, 'setup_db_runs.pdf', 'Setup DB Runs');
    }
    return;
  }

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

export async function logout(): Promise<{ message?: string } | void> {
  return apiCall('/auth/logout', {
    method: 'POST',
  });
}

export async function logoutAll(): Promise<{ revoked?: number } | void> {
  return apiCall('/auth/logout-all', {
    method: 'POST',
  });
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

export type AuthSession = {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
  revokedBy?: string | null;
  isCurrent?: boolean;
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

export async function listMySessions(): Promise<AuthSession[]> {
  return apiCall('/profile/sessions');
}

export async function revokeMySession(sessionId: string): Promise<{ revoked: boolean } | void> {
  return apiCall(`/profile/sessions/${encodeURIComponent(String(sessionId))}/revoke`, {
    method: 'POST',
  });
}

export async function revokeOtherSessions(): Promise<{ revoked: number } | void> {
  return apiCall('/profile/sessions/revoke-others', {
    method: 'POST',
  });
}

export type WorkOrderAttachment = {
  id: string;
  work_order_id: string;
  file_url: string;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  uploaded_by?: string | null;
  created_at?: string;
  uploader?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export type WorkOrderEvent = {
  id: string;
  event_type: string;
  message?: string | null;
  meta?: any;
  actor_user_id?: string | null;
  created_at?: string;
  actor?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

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

export async function listWorkOrderEvents(plantId: string, workOrderId: string): Promise<WorkOrderEvent[]> {
  return apiCall(`/${encodeURIComponent(String(plantId))}/work-orders/${encodeURIComponent(String(workOrderId))}/events`);
}

export async function addWorkOrderNote(plantId: string, workOrderId: string, message: string): Promise<{ ok: boolean } | void> {
  return apiCall(
    `/${encodeURIComponent(String(plantId))}/work-orders/${encodeURIComponent(String(workOrderId))}/events/note`,
    {
      method: 'POST',
      body: JSON.stringify({ message }),
    },
  );
}

export async function listWorkOrderAttachments(plantId: string, workOrderId: string): Promise<WorkOrderAttachment[]> {
  return apiCall(`/${encodeURIComponent(String(plantId))}/work-orders/${encodeURIComponent(String(workOrderId))}/attachments`);
}

export async function uploadWorkOrderAttachment(
  plantId: string,
  workOrderId: string,
  file: File,
): Promise<WorkOrderAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiCallRaw(
    `/${encodeURIComponent(String(plantId))}/work-orders/${encodeURIComponent(String(workOrderId))}/attachments`,
    { method: 'POST', body: form },
  );
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || 'Upload failed');
  return json.data as WorkOrderAttachment;
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

export type TenantSecurityPolicy = {
  passwordMinLength: number;
  passwordRequireLower: boolean;
  passwordRequireUpper: boolean;
  passwordRequireDigit: boolean;
  passwordRequireSpecial: boolean;
  maxFailedLogins: number;
  failedLoginWindowMinutes: number;
  lockoutMinutes: number;
};

export async function getAdminSecurityPolicy(): Promise<TenantSecurityPolicy> {
  return apiCall('/admin/security-policy');
}

export async function updateAdminSecurityPolicy(patch: {
  password_min_length?: number;
  password_require_lower?: boolean;
  password_require_upper?: boolean;
  password_require_digit?: boolean;
  password_require_special?: boolean;
  max_failed_logins?: number;
  failed_login_window_minutes?: number;
  lockout_minutes?: number;
}): Promise<TenantSecurityPolicy> {
  return apiCall('/admin/security-policy', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

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

export async function getProfilePermissions(
  plantId: string,
): Promise<{ plantId: string; roleKey: string; permissions: string[] }> {
  const params = new URLSearchParams();
  params.append('plantId', plantId);
  return apiCall(`/profile/permissions?${params.toString()}`);
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

export async function getSqlMigrationsStatus() {
  return apiCall('/setup/migrations/status');
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

export async function applyRbacPatch() {
  return apiCall('/setup/patch/rbac', {
    method: 'POST',
  });
}

export async function clearAllData() {
  return apiCall('/setup/clear', {
    method: 'POST',
  });
}

export async function bootstrapDatabase(options?: {
  resetMode?: 'schema' | 'truncate';
  runSqlMigrations?: boolean;
  seedDemo?: boolean;
}) {
  return publicApiCall('/api/setup/bootstrap', {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
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

// -------------------- Tickets (tenant + SuperAdmin) --------------------

export type TicketStatus = 'aberto' | 'em_progresso' | 'resolvido' | 'fechado';

export type TicketLevel = 'fabrica' | 'empresa' | 'superadmin';

export type TicketPriority = 'baixa' | 'media' | 'alta' | 'critica';

export type Ticket = {
  id: string;
  tenant_id: string;
  plant_id?: string | null;
  created_by_user_id?: string | null;
  assigned_to_user_id?: string | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority?: TicketPriority;
  tags?: string[];
  source_type?: string | null;
  source_key?: string | null;
  source_meta?: any;
  sla_response_deadline?: string | null;
  sla_resolution_deadline?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  level?: TicketLevel;
  is_general?: boolean;
  is_internal?: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  closed_at?: string | null;
  forwarded_at?: string | null;
  forward_note?: string | null;
};

export type TicketAttachment = {
  id: string;
  ticket_id: string;
  tenant_id: string;
  file_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  file_url: string;
  uploaded_by_user_id?: string | null;
  created_at: string;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  tenant_id: string;
  body: string;
  is_internal?: boolean;
  created_at: string;
  author?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export type TicketEvent = {
  id: string;
  ticket_id: string;
  tenant_id: string;
  plant_id?: string | null;
  level?: TicketLevel;
  event_type: string;
  message?: string | null;
  meta?: any;
  created_at: string;
  actor?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export type TicketDetail = {
  ticket: Ticket;
  comments: TicketComment[];
  events?: TicketEvent[];
};

// Fábrica (plant-scoped)
export async function listPlantTickets(
  plantId: string,
  params?: { status?: TicketStatus; q?: string; limit?: number; offset?: number },
): Promise<Ticket[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', String(params.status));
  if (params?.q) qs.set('q', String(params.q));
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  return apiCall(`/plants/${encodeURIComponent(plantId)}/tickets${suffix ? `?${suffix}` : ''}`);
}

export async function createPlantTicket(
  plantId: string,
  input: {
    title: string;
    description: string;
    is_general?: boolean;
    priority?: TicketPriority;
    tags?: string[];
    source_type?: string;
    source_key?: string;
    source_meta?: any;
  },
): Promise<Ticket> {
  return apiCall(`/plants/${encodeURIComponent(plantId)}/tickets`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getPlantTicket(plantId: string, ticketId: string): Promise<TicketDetail> {
  return apiCall(`/plants/${encodeURIComponent(plantId)}/tickets/${encodeURIComponent(ticketId)}`);
}

export async function addPlantTicketComment(
  plantId: string,
  ticketId: string,
  input: { body: string },
): Promise<TicketComment> {
  return apiCall(`/plants/${encodeURIComponent(plantId)}/tickets/${encodeURIComponent(ticketId)}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updatePlantTicketStatus(
  plantId: string,
  ticketId: string,
  status: TicketStatus,
): Promise<Ticket> {
  return apiCall(`/plants/${encodeURIComponent(plantId)}/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function forwardPlantTicketToCompany(
  plantId: string,
  ticketId: string,
  input?: { note?: string },
): Promise<Ticket> {
  return apiCall(`/plants/${encodeURIComponent(plantId)}/tickets/${encodeURIComponent(ticketId)}/forward`, {
    method: 'PATCH',
    body: JSON.stringify(input || {}),
  });
}

export async function listPlantTicketAttachments(plantId: string, ticketId: string): Promise<TicketAttachment[]> {
  return apiCall(
    `/plants/${encodeURIComponent(plantId)}/tickets/${encodeURIComponent(ticketId)}/attachments`,
  );
}

export async function uploadPlantTicketAttachment(
  plantId: string,
  ticketId: string,
  file: File,
): Promise<TicketAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiCallRaw(
    `/plants/${encodeURIComponent(plantId)}/tickets/${encodeURIComponent(ticketId)}/attachments`,
    { method: 'POST', body: form },
  );
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || 'Upload failed');
  return json.data as TicketAttachment;
}

// Empresa (tenant-scoped)
export async function listCompanyTickets(params?: {
  status?: TicketStatus;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<Ticket[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', String(params.status));
  if (params?.q) qs.set('q', String(params.q));
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  return apiCall(`/tickets/company${suffix ? `?${suffix}` : ''}`);
}

export async function getCompanyTicket(ticketId: string): Promise<TicketDetail> {
  return apiCall(`/tickets/company/${encodeURIComponent(ticketId)}`);
}

export async function addCompanyTicketComment(ticketId: string, input: { body: string }): Promise<TicketComment> {
  return apiCall(`/tickets/company/${encodeURIComponent(ticketId)}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCompanyTicketStatus(ticketId: string, status: TicketStatus): Promise<Ticket> {
  return apiCall(`/tickets/company/${encodeURIComponent(ticketId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function updateCompanyTicket(
  ticketId: string,
  patch: { assigned_to_user_id?: string | null; priority?: TicketPriority; tags?: string[] },
): Promise<Ticket> {
  return apiCall(`/tickets/company/${encodeURIComponent(ticketId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function forwardCompanyTicketToSuperadmin(ticketId: string, input?: { note?: string }): Promise<Ticket> {
  return apiCall(`/tickets/company/${encodeURIComponent(ticketId)}/forward`, {
    method: 'PATCH',
    body: JSON.stringify(input || {}),
  });
}

export async function listCompanyTicketAttachments(ticketId: string): Promise<TicketAttachment[]> {
  return apiCall(`/tickets/company/${encodeURIComponent(ticketId)}/attachments`);
}

export async function uploadCompanyTicketAttachment(ticketId: string, file: File): Promise<TicketAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiCallRaw(`/tickets/company/${encodeURIComponent(ticketId)}/attachments`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || 'Upload failed');
  return json.data as TicketAttachment;
}

export type SuperadminTicketListItem = {
  id: string;
  tenant_id: string;
  tenant_name?: string | null;
  plant_id?: string | null;
  title: string;
  status: TicketStatus;
  level?: TicketLevel;
  is_general?: boolean;
  is_internal?: boolean;
  created_at: string;
  last_activity_at: string;
  closed_at?: string | null;
  forwarded_at?: string | null;
};

export async function superadminListTickets(params?: {
  tenantId?: string;
  status?: TicketStatus;
  level?: TicketLevel;
  q?: string;
  limit?: number;
}): Promise<SuperadminTicketListItem[]> {
  const qs = new URLSearchParams();
  if (params?.tenantId) qs.set('tenantId', String(params.tenantId));
  if (params?.status) qs.set('status', String(params.status));
  if (params?.level) qs.set('level', String(params.level));
  if (params?.q) qs.set('q', String(params.q));
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  const suffix = qs.toString();
  return apiCall(`/superadmin/tickets${suffix ? `?${suffix}` : ''}`);
}

export async function superadminGetTicket(ticketId: string): Promise<TicketDetail> {
  return apiCall(`/superadmin/tickets/${encodeURIComponent(ticketId)}`);
}

export async function superadminUpdateTicket(
  ticketId: string,
  patch: { status?: TicketStatus; assigned_to_user_id?: string | null; is_internal?: boolean },
): Promise<Ticket> {
  return apiCall(`/superadmin/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function superadminAddTicketComment(
  ticketId: string,
  input: { body: string; is_internal?: boolean },
): Promise<TicketComment> {
  return apiCall(`/superadmin/tickets/${encodeURIComponent(ticketId)}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function superadminListTicketAttachments(ticketId: string): Promise<TicketAttachment[]> {
  return apiCall(`/superadmin/tickets/${encodeURIComponent(ticketId)}/attachments`);
}

export async function superadminUploadTicketAttachment(ticketId: string, file: File): Promise<TicketAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiCallRaw(`/superadmin/tickets/${encodeURIComponent(ticketId)}/attachments`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || 'Upload failed');
  return json.data as TicketAttachment;
}

export type TicketSuggestion = {
  key: string;
  title: string;
  description: string;
  priority: TicketPriority;
  source_type: string;
  source_key: string;
  source_meta?: any;
  alreadyOpen?: boolean;
};

export async function superadminListTicketSuggestions(): Promise<{ tenantId: string; suggestions: TicketSuggestion[] }> {
  return apiCall('/superadmin/tickets/suggestions');
}

export async function superadminCreateTicketFromSuggestion(key: string): Promise<Ticket> {
  return apiCall(`/superadmin/tickets/suggestions/${encodeURIComponent(key)}/create`, {
    method: 'POST',
  });
}
