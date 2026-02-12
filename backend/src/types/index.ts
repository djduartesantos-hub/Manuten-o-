export enum UserRole {
  SuperAdmin = 'superadmin',
  AdminEmpresa = 'admin_empresa',
  GestorManutencao = 'gestor_manutencao',
  Supervisor = 'supervisor',
  Tecnico = 'tecnico',
  Operador = 'operador',
}

export enum OrderStatus {
  Open = 'aberta',
  InAnalysis = 'em_analise',
  InExecution = 'em_execucao',
  Paused = 'em_pausa',
  Completed = 'concluida',
  Closed = 'fechada',
  Cancelled = 'cancelada',
}

export enum MaintenanceType {
  Preventive = 'preventiva',
  Corrective = 'corretiva',
}

export interface JWTPayload {
  userId: string;
  tenantId: string;
  username: string;
  email?: string;
  role: UserRole;
  plantIds?: string[];
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JWTPayload;
  tenantId?: string;
  tenantSlug?: string;
  tenantIsReadOnly?: boolean;
  requestId?: string;
  plantId?: string;
  ip?: string;
  path?: string;
  body?: any;
  params?: any;
  query?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
