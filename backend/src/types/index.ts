export enum UserRole {
  SuperAdmin = 'superadmin',
  AdminEmpresa = 'admin_empresa',
  GestorManutencao = 'gestor_manutencao',
  Supervisor = 'supervisor',
  Tecnico = 'tecnico',
  Leitor = 'leitor',
}

export enum OrderStatus {
  Open = 'aberta',
  Assigned = 'atribuida',
  InProgress = 'em_curso',
  Completed = 'concluida',
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
