import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  decimal,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const orderStatusEnum = pgEnum('order_status', [
  'aberta',
  'em_analise',
  'em_execucao',
  'em_pausa',
  'concluida',
  'fechada',
  'cancelada',
]);

export const maintenanceTypeEnum = pgEnum('maintenance_type', [
  'preventiva',
  'corretiva',
]);

export const preventiveScheduleStatusEnum = pgEnum('preventive_schedule_status', [
  'agendada',
  'em_execucao',
  'concluida',
  'fechada',
  'reagendada',
]);

export const priorityEnum = pgEnum('priority', ['baixa', 'media', 'alta', 'critica']);

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'entrada',
  'saida',
  'ajuste',
]);

export const stockReservationStatusEnum = pgEnum('stock_reservation_status', [
  'ativa',
  'libertada',
  'cancelada',
]);

export const ticketStatusEnum = pgEnum('ticket_status', [
  'aberto',
  'em_progresso',
  'resolvido',
  'fechado',
]);

export const ticketLevelEnum = pgEnum('ticket_level', ['fabrica', 'empresa', 'superadmin']);

// Tenants (Empresas)
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    logo_url: text('logo_url'),
    subscription_plan: text('subscription_plan').default('basic'),
    is_active: boolean('is_active').default(true),
    is_read_only: boolean('is_read_only').default(false),
    read_only_reason: text('read_only_reason'),
    read_only_at: timestamp('read_only_at', { withTimezone: true }),
    read_only_by: uuid('read_only_by'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug),
  }),
);

// Plants (Fábricas)
export const plants = pgTable(
  'plants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    address: text('address'),
    city: text('city'),
    country: text('country'),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('plants_tenant_id_idx').on(table.tenant_id),
    codeIdx: uniqueIndex('plants_tenant_code_idx').on(table.tenant_id, table.code),
  }),
);

// Users
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    password_hash: text('password_hash').notNull(),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
    phone: text('phone'),
    role: text('role').notNull().default('tecnico'),
    is_active: boolean('is_active').default(true),
    last_login: timestamp('last_login', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    usernameIdx: uniqueIndex('users_tenant_username_idx').on(table.tenant_id, table.username),
    emailIdx: uniqueIndex('users_tenant_email_idx').on(table.tenant_id, table.email),
    tenantIdIdx: index('users_tenant_id_idx').on(table.tenant_id),
  }),
);

// Auth Sessions (DB-backed) + Login Events
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refresh_token_hash: text('refresh_token_hash'),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    last_seen_at: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
    revoked_by: uuid('revoked_by'),
  },
  (table) => ({
    userIdx: index('auth_sessions_user_id_idx').on(table.user_id),
    tenantUserIdx: index('auth_sessions_tenant_user_id_idx').on(table.tenant_id, table.user_id),
    revokedIdx: index('auth_sessions_revoked_at_idx').on(table.revoked_at),
  }),
);

export const authLoginEvents = pgTable(
  'auth_login_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    username: text('username').notNull(),
    success: boolean('success').notNull().default(false),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    error: text('error'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantCreatedIdx: index('auth_login_events_tenant_created_at_idx').on(table.tenant_id, table.created_at),
    userIdx: index('auth_login_events_user_id_idx').on(table.user_id),
  }),
);

// Tenant Security Policies (password policy + login lockout)
export const tenantSecurityPolicies = pgTable(
  'tenant_security_policies',
  {
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' })
      .primaryKey(),

    password_min_length: integer('password_min_length').notNull().default(8),
    password_require_lower: boolean('password_require_lower').notNull().default(true),
    password_require_upper: boolean('password_require_upper').notNull().default(false),
    password_require_digit: boolean('password_require_digit').notNull().default(true),
    password_require_special: boolean('password_require_special').notNull().default(false),

    max_failed_logins: integer('max_failed_logins').notNull().default(8),
    failed_login_window_minutes: integer('failed_login_window_minutes').notNull().default(10),
    lockout_minutes: integer('lockout_minutes').notNull().default(15),

    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    updatedAtIdx: index('tenant_security_policies_updated_at_idx').on(table.updated_at),
  }),
);

// Support Tickets (tenant + SuperAdmin)
export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    plant_id: uuid('plant_id'),
    created_by_user_id: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    assigned_to_user_id: uuid('assigned_to_user_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    priority: priorityEnum('priority').notNull().default('media'),
    status: ticketStatusEnum('status').notNull().default('aberto'),
    level: ticketLevelEnum('level').notNull().default('fabrica'),
    is_general: boolean('is_general').default(false).notNull(),
    is_internal: boolean('is_internal').default(false),
    tags: text('tags').array(),
    source_type: text('source_type'),
    source_key: text('source_key'),
    source_meta: jsonb('source_meta'),
    sla_response_deadline: timestamp('sla_response_deadline', { withTimezone: true }),
    sla_resolution_deadline: timestamp('sla_resolution_deadline', { withTimezone: true }),
    first_response_at: timestamp('first_response_at', { withTimezone: true }),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    forwarded_by_user_id: uuid('forwarded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    forwarded_at: timestamp('forwarded_at', { withTimezone: true }),
    forward_note: text('forward_note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    last_activity_at: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
    closed_at: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('tickets_tenant_id_idx').on(table.tenant_id),
    plantIdx: index('tickets_plant_id_idx').on(table.plant_id),
    statusIdx: index('tickets_status_idx').on(table.status),
    levelIdx: index('tickets_level_idx').on(table.level),
    priorityIdx: index('tickets_priority_idx').on(table.priority),
    lastActivityIdx: index('tickets_last_activity_at_idx').on(table.last_activity_at),
  }),
);

export const ticketAttachments = pgTable(
  'ticket_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    ticket_id: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    comment_id: uuid('comment_id').references(() => ticketComments.id, { onDelete: 'cascade' }),
    file_url: text('file_url').notNull(),
    file_name: text('file_name').notNull(),
    file_type: text('file_type'),
    file_size: integer('file_size'),
    uploaded_by: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketIdx: index('ticket_attachments_ticket_id_idx').on(table.ticket_id),
    tenantIdx: index('ticket_attachments_tenant_id_idx').on(table.tenant_id),
    commentIdx: index('ticket_attachments_comment_id_idx').on(table.comment_id),
    createdIdx: index('ticket_attachments_created_at_idx').on(table.created_at),
  }),
);

export const ticketComments = pgTable(
  'ticket_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticket_id: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    tenant_id: uuid('tenant_id').notNull(),
    author_user_id: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    is_internal: boolean('is_internal').default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketIdx: index('ticket_comments_ticket_id_idx').on(table.ticket_id),
    tenantIdx: index('ticket_comments_tenant_id_idx').on(table.tenant_id),
    createdIdx: index('ticket_comments_created_at_idx').on(table.created_at),
  }),
);

export const ticketEvents = pgTable(
  'ticket_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    ticket_id: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    plant_id: uuid('plant_id'),
    level: ticketLevelEnum('level').notNull().default('fabrica'),
    event_type: text('event_type').notNull(),
    message: text('message'),
    meta: jsonb('meta'),
    actor_user_id: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketCreatedIdx: index('ticket_events_ticket_id_created_at_idx').on(table.ticket_id, table.created_at),
    tenantCreatedIdx: index('ticket_events_tenant_id_created_at_idx').on(table.tenant_id, table.created_at),
    plantCreatedIdx: index('ticket_events_plant_id_created_at_idx').on(table.plant_id, table.created_at),
    eventTypeIdx: index('ticket_events_event_type_idx').on(table.event_type),
  }),
);

// User Plants (N:N relationship)
export const userPlants = pgTable(
  'user_plants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    // Role efetivo do utilizador nesta fábrica (pode diferir do role global em users.role)
    role: text('role').notNull().default('tecnico'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userPlantIdx: uniqueIndex('user_plants_user_plant_idx').on(table.user_id, table.plant_id),
  }),
);

// RBAC: Roles (por tenant) + Permissões (globais) + Role-Permissions (por tenant)
export const rbacPermissions = pgTable(
  'rbac_permissions',
  {
    key: text('key').primaryKey(),
    label: text('label').notNull(),
    group_name: text('group_name').notNull().default('geral'),
    description: text('description'),
    is_system: boolean('is_system').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

export const rbacRoles = pgTable(
  'rbac_roles',
  {
    tenant_id: uuid('tenant_id').notNull(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    is_system: boolean('is_system').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantRoleIdx: uniqueIndex('rbac_roles_tenant_key_idx').on(table.tenant_id, table.key),
    tenantIdx: index('rbac_roles_tenant_id_idx').on(table.tenant_id),
  }),
);

export const rbacRolePermissions = pgTable(
  'rbac_role_permissions',
  {
    tenant_id: uuid('tenant_id').notNull(),
    role_key: text('role_key').notNull(),
    permission_key: text('permission_key')
      .notNull()
      .references(() => rbacPermissions.key, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    rolePermIdx: uniqueIndex('rbac_role_permissions_tenant_role_perm_idx').on(
      table.tenant_id,
      table.role_key,
      table.permission_key,
    ),
    tenantRoleIdx: index('rbac_role_permissions_tenant_role_idx').on(table.tenant_id, table.role_key),
  }),
);

// RBAC: Home pages per role (global + per plant override)
export const rbacRoleHomePages = pgTable(
  'rbac_role_home_pages',
  {
    tenant_id: uuid('tenant_id').notNull(),
    plant_id: uuid('plant_id'),
    role_key: text('role_key').notNull(),
    home_path: text('home_path').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantPlantRoleIdx: uniqueIndex('rbac_role_home_pages_tenant_plant_role_idx').on(
      table.tenant_id,
      table.plant_id,
      table.role_key,
    ),
    tenantIdx: index('rbac_role_home_pages_tenant_id_idx').on(table.tenant_id),
    tenantPlantIdx: index('rbac_role_home_pages_tenant_plant_idx').on(table.tenant_id, table.plant_id),
  }),
);

// Asset Categories
export const assetCategories = pgTable(
  'asset_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdIdx: index('asset_categories_tenant_id_idx').on(table.tenant_id),
  }),
);

// Assets (Equipamentos)
export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    category_id: uuid('category_id')
      .notNull()
      .references(() => assetCategories.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    qr_code: text('qr_code'),
    model: text('model'),
    manufacturer: text('manufacturer'),
    serial_number: text('serial_number'),
    location: text('location'),
    status: text('status').default('operacional'),
    acquisition_date: timestamp('acquisition_date', { withTimezone: true }),
    acquisition_cost: decimal('acquisition_cost', { precision: 15, scale: 2 }),
    meter_type: text('meter_type'), // 'hours', 'km', 'cycles', etc
    current_meter_value: decimal('current_meter_value', { precision: 15, scale: 2 }),
    is_critical: boolean('is_critical').default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('assets_tenant_id_idx').on(table.tenant_id),
    plantIdIdx: index('assets_plant_id_idx').on(table.plant_id),
    codeIdx: uniqueIndex('assets_plant_code_idx').on(table.plant_id, table.code),
  }),
);

// Maintenance Plans
export const maintenancePlans = pgTable(
  'maintenance_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    type: maintenanceTypeEnum('type').notNull().default('preventiva'),
    frequency_type: text('frequency_type').notNull(), // 'days', 'months', 'hours', 'meter'
    frequency_value: integer('frequency_value').notNull(),
    meter_threshold: decimal('meter_threshold', { precision: 15, scale: 2 }),
    auto_schedule: boolean('auto_schedule').default(true),
    // Define de onde vem a base para calcular o próximo agendamento automático:
    // - 'completion': a partir da conclusão
    // - 'scheduled': manter cadência a partir da data programada
    schedule_basis: text('schedule_basis').default('completion'),

    // Âncora de agendamento:
    // - interval: usa a data programada atual (pode haver drift após reagendamentos)
    // - fixed: mantém cadência usando a data original (rescheduled_from) quando existir
    schedule_anchor_mode: text('schedule_anchor_mode').default('interval'),
    // Janela/tolerância (informativo): permitir executar X antes/depois
    tolerance_unit: text('tolerance_unit').default('days'),
    tolerance_before_value: integer('tolerance_before_value').default(0),
    tolerance_after_value: integer('tolerance_after_value').default(0),
    // Modo de tolerância:
    // - soft: aviso (sem enforcement)
    // - hard: exige justificação fora da janela
    tolerance_mode: text('tolerance_mode').default('soft'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    assetIdIdx: index('maintenance_plans_asset_id_idx').on(table.asset_id),
    tenantIdIdx: index('maintenance_plans_tenant_id_idx').on(table.tenant_id),
  }),
);

// Maintenance Kits (tenant-level, optionally linked to plan or asset category)
export const maintenanceKits = pgTable(
  'maintenance_kits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    notes: text('notes'),
    plan_id: uuid('plan_id').references(() => maintenancePlans.id, { onDelete: 'set null' }),
    category_id: uuid('category_id').references(() => assetCategories.id, { onDelete: 'set null' }),
    is_active: boolean('is_active').default(true),
    created_by: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updated_by: uuid('updated_by').references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('maintenance_kits_tenant_id_idx').on(table.tenant_id),
    planIdIdx: index('maintenance_kits_plan_id_idx').on(table.plan_id),
    categoryIdIdx: index('maintenance_kits_category_id_idx').on(table.category_id),
  }),
);

export const maintenanceKitItems = pgTable(
  'maintenance_kit_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    kit_id: uuid('kit_id')
      .notNull()
      .references(() => maintenanceKits.id, { onDelete: 'cascade' }),
    spare_part_id: uuid('spare_part_id')
      .notNull()
      .references(() => spareParts.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    created_by: uuid('created_by')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('maintenance_kit_items_tenant_id_idx').on(table.tenant_id),
    kitIdIdx: index('maintenance_kit_items_kit_id_idx').on(table.kit_id),
    sparePartIdIdx: index('maintenance_kit_items_spare_part_id_idx').on(table.spare_part_id),
  }),
);

// Maintenance Tasks (Checklists)
export const maintenanceTasks = pgTable(
  'maintenance_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    plan_id: uuid('plan_id')
      .notNull()
      .references(() => maintenancePlans.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    sequence: integer('sequence').default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    planIdIdx: index('maintenance_tasks_plan_id_idx').on(table.plan_id),
  }),
);

// Preventive Maintenance Schedules
export const preventiveMaintenanceSchedules = pgTable(
  'preventive_maintenance_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    plan_id: uuid('plan_id')
      .notNull()
      .references(() => maintenancePlans.id, { onDelete: 'cascade' }),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),

    status: preventiveScheduleStatusEnum('status').notNull().default('agendada'),
    scheduled_for: timestamp('scheduled_for', { withTimezone: true }).notNull(),

    confirmed_at: timestamp('confirmed_at', { withTimezone: true }),
    confirmed_by: uuid('confirmed_by').references(() => users.id, { onDelete: 'set null' }),

    started_at: timestamp('started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),

    closed_at: timestamp('closed_at', { withTimezone: true }),
    closed_by: uuid('closed_by').references(() => users.id, { onDelete: 'set null' }),

    rescheduled_from: timestamp('rescheduled_from', { withTimezone: true }),
    rescheduled_at: timestamp('rescheduled_at', { withTimezone: true }),
    reschedule_reason: text('reschedule_reason'),

    notes: text('notes'),
    created_by: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdIdx: index('pms_tenant_id_idx').on(table.tenant_id),
    plantIdIdx: index('pms_plant_id_idx').on(table.plant_id),
    planIdIdx: index('pms_plan_id_idx').on(table.plan_id),
    assetIdIdx: index('pms_asset_id_idx').on(table.asset_id),
    scheduledForIdx: index('pms_scheduled_for_idx').on(table.scheduled_for),
    statusIdx: index('pms_status_idx').on(table.status),
  }),
);

// Planned Downtimes (Planner/Calendar)
export const plannedDowntimes = pgTable(
  'planned_downtimes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    description: text('description'),

    start_at: timestamp('start_at', { withTimezone: true }).notNull(),
    end_at: timestamp('end_at', { withTimezone: true }).notNull(),

    downtime_type: text('downtime_type').notNull(),
    downtime_category: text('downtime_category').notNull(),

    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('planned_downtimes_tenant_id_idx').on(table.tenant_id),
    plantIdIdx: index('planned_downtimes_plant_id_idx').on(table.plant_id),
    startAtIdx: index('planned_downtimes_start_at_idx').on(table.start_at),
  }),
);

// Work Orders
export const workOrders = pgTable(
  'work_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    plan_id: uuid('plan_id').references(() => maintenancePlans.id, {
      onDelete: 'set null',
    }),
    assigned_to: uuid('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    created_by: uuid('created_by')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    status: orderStatusEnum('status').notNull().default('aberta'),
    sub_status: text('sub_status'),
    priority: priorityEnum('priority').notNull().default('media'),
    scheduled_date: timestamp('scheduled_date', { withTimezone: true }),
    analysis_started_at: timestamp('analysis_started_at', { withTimezone: true }),
    started_at: timestamp('started_at', { withTimezone: true }),
    paused_at: timestamp('paused_at', { withTimezone: true }),
    pause_reason: text('pause_reason'),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    closed_at: timestamp('closed_at', { withTimezone: true }),
    closed_by: uuid('closed_by').references(() => users.id, { onDelete: 'set null' }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    cancel_reason: text('cancel_reason'),
    estimated_hours: decimal('estimated_hours', { precision: 8, scale: 2 }),
    actual_hours: decimal('actual_hours', { precision: 8, scale: 2 }),
    notes: text('notes'),
    work_performed: text('work_performed'),
    downtime_started_at: timestamp('downtime_started_at', { withTimezone: true }),
    downtime_ended_at: timestamp('downtime_ended_at', { withTimezone: true }),
    downtime_minutes: integer('downtime_minutes').default(0),
    downtime_reason: text('downtime_reason'),
    downtime_type: text('downtime_type'),
    downtime_category: text('downtime_category'),
    root_cause: text('root_cause'),
    corrective_action: text('corrective_action'),
    sla_deadline: timestamp('sla_deadline', { withTimezone: true }),

    // SLA / aging helpers
    // When true, time in pause should not count against SLA (effective deadline is extended by pause time)
    sla_exclude_pause: boolean('sla_exclude_pause').notNull().default(true),
    // Accumulated paused time (milliseconds)
    sla_paused_ms: integer('sla_paused_ms').notNull().default(0),
    // When currently paused, stores when the pause started (for accumulating delta on resume)
    sla_pause_started_at: timestamp('sla_pause_started_at', { withTimezone: true }),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdIdx: index('work_orders_tenant_id_idx').on(table.tenant_id),
    plantIdIdx: index('work_orders_plant_id_idx').on(table.plant_id),
    assetIdIdx: index('work_orders_asset_id_idx').on(table.asset_id),
    statusIdx: index('work_orders_status_idx').on(table.status),
  }),
);

// Work Order Tasks
export const workOrderTasks = pgTable(
  'work_order_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    work_order_id: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    task_id: uuid('task_id').references(() => maintenanceTasks.id, {
      onDelete: 'set null',
    }),
    description: text('description').notNull(),
    is_completed: boolean('is_completed').default(false),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    sequence: integer('sequence').default(0),
  },
  (table) => ({
    workOrderIdIdx: index('work_order_tasks_work_order_id_idx').on(table.work_order_id),
  }),
);

// Spare Parts
export const spareParts = pgTable(
  'spare_parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    unit_cost: decimal('unit_cost', { precision: 15, scale: 2 }),
    min_stock: integer('min_stock').default(0),
    supplier_id: uuid('supplier_id').references(() => suppliers.id, {
      onDelete: 'set null',
    }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdIdx: index('spare_parts_tenant_id_idx').on(table.tenant_id),
    codeIdx: uniqueIndex('spare_parts_tenant_code_idx').on(table.tenant_id, table.code),
  }),
);

// Stock Movements
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    spare_part_id: uuid('spare_part_id')
      .notNull()
      .references(() => spareParts.id, { onDelete: 'restrict' }),
    work_order_id: uuid('work_order_id').references(() => workOrders.id, {
      onDelete: 'set null',
    }),
    type: stockMovementTypeEnum('type').notNull(),
    quantity: integer('quantity').notNull(),
    unit_cost: decimal('unit_cost', { precision: 15, scale: 2 }),
    total_cost: decimal('total_cost', { precision: 15, scale: 2 }),
    notes: text('notes'),
    created_by: uuid('created_by')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('stock_movements_tenant_id_idx').on(table.tenant_id),
    plantIdIdx: index('stock_movements_plant_id_idx').on(table.plant_id),
  }),
);

// Stock Reservations (per work order)
export const stockReservations = pgTable(
  'stock_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    work_order_id: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    spare_part_id: uuid('spare_part_id')
      .notNull()
      .references(() => spareParts.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    status: stockReservationStatusEnum('status').notNull().default('ativa'),
    notes: text('notes'),
    created_by: uuid('created_by')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    released_at: timestamp('released_at', { withTimezone: true }),
    released_by: uuid('released_by').references(() => users.id),
    release_reason: text('release_reason'),
  },
  (table) => ({
    tenantIdIdx: index('stock_reservations_tenant_id_idx').on(table.tenant_id),
    plantIdIdx: index('stock_reservations_plant_id_idx').on(table.plant_id),
    workOrderIdIdx: index('stock_reservations_work_order_id_idx').on(table.work_order_id),
    sparePartIdIdx: index('stock_reservations_spare_part_id_idx').on(table.spare_part_id),
  }),
);

// Suppliers
export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    city: text('city'),
    country: text('country'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdIdx: index('suppliers_tenant_id_idx').on(table.tenant_id),
  }),
);

// Meter Readings
export const meterReadings = pgTable(
  'meter_readings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    reading_value: decimal('reading_value', { precision: 15, scale: 2 }).notNull(),
    reading_date: timestamp('reading_date', { withTimezone: true }).defaultNow().notNull(),
    recorded_by: uuid('recorded_by')
      .notNull()
      .references(() => users.id),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    assetIdIdx: index('meter_readings_asset_id_idx').on(table.asset_id),
    tenantIdIdx: index('meter_readings_tenant_id_idx').on(table.tenant_id),
  }),
);

// Attachments
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    work_order_id: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    file_url: text('file_url').notNull(),
    file_name: text('file_name').notNull(),
    file_type: text('file_type'),
    file_size: integer('file_size'),
    uploaded_by: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workOrderIdIdx: index('attachments_work_order_id_idx').on(table.work_order_id),
    tenantIdIdx: index('attachments_tenant_id_idx').on(table.tenant_id),
  }),
);

// Work Order Events (Timeline)
export const workOrderEvents = pgTable(
  'work_order_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    plant_id: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    work_order_id: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(),
    message: text('message'),
    meta: jsonb('meta'),
    actor_user_id: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workOrderCreatedIdx: index('work_order_events_work_order_id_created_at_idx').on(
      table.work_order_id,
      table.created_at,
    ),
    tenantCreatedIdx: index('work_order_events_tenant_id_created_at_idx').on(table.tenant_id, table.created_at),
    plantCreatedIdx: index('work_order_events_plant_id_created_at_idx').on(table.plant_id, table.created_at),
    eventTypeIdx: index('work_order_events_event_type_idx').on(table.event_type),
  }),
);

// Audit Logs
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    old_values: jsonb('old_values'),
    new_values: jsonb('new_values'),
    ip_address: text('ip_address'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('audit_logs_tenant_id_idx').on(table.tenant_id),
    userIdIdx: index('audit_logs_user_id_idx').on(table.user_id),
  }),
);

// SuperAdmin Audit Logs (global)
export const superadminAuditLogs = pgTable(
  'superadmin_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actor_user_id: uuid('actor_user_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    affected_tenant_id: uuid('affected_tenant_id'),
    metadata: jsonb('metadata'),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index('superadmin_audit_logs_created_at_idx').on(table.created_at),
    actorUserIdx: index('superadmin_audit_logs_actor_user_id_idx').on(table.actor_user_id),
    affectedTenantIdx: index('superadmin_audit_logs_affected_tenant_id_idx').on(table.affected_tenant_id),
    actionIdx: index('superadmin_audit_logs_action_idx').on(table.action),
  }),
);

// SLA Rules
export const slaRules = pgTable(
  'sla_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    priority: priorityEnum('priority').notNull(),
    response_time_hours: integer('response_time_hours').notNull(),
    resolution_time_hours: integer('resolution_time_hours').notNull(),
    entity_type: text('entity_type').notNull().default('work_order'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdIdx: index('sla_rules_tenant_id_idx').on(table.tenant_id),
    tenantEntityPriorityIdx: index('sla_rules_tenant_entity_priority_idx').on(
      table.tenant_id,
      table.entity_type,
      table.priority,
    ),
  }),
);

// Relations - COMMENTED OUT: tenant references disabled
/*
export const tenantsRelations = relations(tenants, ({ many }) => ({
  plants: many(plants),
  users: many(users),
  assets: many(assets),
  workOrders: many(workOrders),
}));

export const plantsRelations = relations(plants, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [plants.tenant_id],
    references: [tenants.id],
  }),
  assets: many(assets),
  userPlants: many(userPlants),
  workOrders: many(workOrders),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenant_id],
    references: [tenants.id],
  }),
  userPlants: many(userPlants),
  createdWorkOrders: many(workOrders, {
    relationName: 'createdBy',
  }),
  assignedWorkOrders: many(workOrders, {
    relationName: 'assignedTo',
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assets.tenant_id],
    references: [tenants.id],
  }),
  plant: one(plants, {
    fields: [assets.plant_id],
    references: [plants.id],
  }),
  category: one(assetCategories, {
    fields: [assets.category_id],
    references: [assetCategories.id],
  }),
  maintenancePlans: many(maintenancePlans),
  workOrders: many(workOrders),
  meterReadings: many(meterReadings),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [workOrders.tenant_id],
    references: [tenants.id],
  }),
  plant: one(plants, {
    fields: [workOrders.plant_id],
    references: [plants.id],
  }),
  asset: one(assets, {
    fields: [workOrders.asset_id],
    references: [assets.id],
  }),
  assignedUser: one(users, {
    fields: [workOrders.assigned_to],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  createdByUser: one(users, {
    fields: [workOrders.created_by],
    references: [users.id],
    relationName: 'createdBy',
  }),
  tasks: many(workOrderTasks),
  attachments: many(attachments),
  stockMovements: many(stockMovements),
}));
*/

// Basic relations without tenant references
export const plantsRelations = relations(plants, ({ many }) => ({
  assets: many(assets),
  userPlants: many(userPlants),
  workOrders: many(workOrders),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userPlants: many(userPlants),
  createdWorkOrders: many(workOrders, {
    relationName: 'createdBy',
  }),
  assignedWorkOrders: many(workOrders, {
    relationName: 'assignedTo',
  }),
}));

export const userPlantsRelations = relations(userPlants, ({ one }) => ({
  user: one(users, {
    fields: [userPlants.user_id],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [userPlants.plant_id],
    references: [plants.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  plant: one(plants, {
    fields: [assets.plant_id],
    references: [plants.id],
  }),
  category: one(assetCategories, {
    fields: [assets.category_id],
    references: [assetCategories.id],
  }),
  maintenancePlans: many(maintenancePlans),
  workOrders: many(workOrders),
  meterReadings: many(meterReadings),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  plant: one(plants, {
    fields: [workOrders.plant_id],
    references: [plants.id],
  }),
  asset: one(assets, {
    fields: [workOrders.asset_id],
    references: [assets.id],
  }),
  assignedUser: one(users, {
    fields: [workOrders.assigned_to],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  createdByUser: one(users, {
    fields: [workOrders.created_by],
    references: [users.id],
    relationName: 'createdBy',
  }),
  tasks: many(workOrderTasks),
  attachments: many(attachments),
  events: many(workOrderEvents),
  stockMovements: many(stockMovements),
}));
// Alert Configurations
export const alertConfigurations = pgTable(
  'alert_configurations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    alert_type: text('alert_type').notNull(), // 'sla_critical', 'high_failure_rate', 'stock_low', 'maintenance_overdue'
    threshold: integer('threshold').notNull(),
    time_unit: text('time_unit').notNull(), // 'hours', 'days'
    is_active: boolean('is_active').default(true),
    notify_roles: text('notify_roles')
      .array()
      .default(sql`ARRAY['admin','manager']::text[]`),
    notify_email: boolean('notify_email').default(true),
    notify_push: boolean('notify_push').default(false),
    escalate_after_hours: integer('escalate_after_hours'),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('alert_config_tenant_id_idx').on(table.tenant_id),
    assetIdIdx: index('alert_config_asset_id_idx').on(table.asset_id),
  }),
);

// Alert History
export const alertsHistory = pgTable(
  'alerts_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    alert_config_id: uuid('alert_config_id')
      .notNull()
      .references(() => alertConfigurations.id, { onDelete: 'cascade' }),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
    message: text('message').notNull(),
    is_resolved: boolean('is_resolved').default(false),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    resolved_by: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolution_notes: text('resolution_notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('alerts_history_tenant_id_idx').on(table.tenant_id),
    assetIdIdx: index('alerts_history_asset_id_idx').on(table.asset_id),
    severityIdx: index('alerts_history_severity_idx').on(table.severity),
  }),
);

// Notification Rules
export const notificationRules = pgTable(
  'notification_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    event_type: text('event_type').notNull(),
    channels: text('channels').array().default(sql`ARRAY['in_app']::text[]`),
    recipients: text('recipients')
      .array()
      .default(sql`ARRAY['assigned','creator','managers','plant_users']::text[]`),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantEventIdx: uniqueIndex('notification_rules_tenant_event_idx').on(
      table.tenant_id,
      table.event_type,
    ),
  }),
);

// Notifications (in-app inbox)
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plant_id: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
    event_type: text('event_type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    level: text('level').notNull().default('info'),
    entity: text('entity'),
    entity_id: text('entity_id'),
    meta: jsonb('meta'),
    is_read: boolean('is_read').default(false),
    read_at: timestamp('read_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantUserCreatedIdx: index('notifications_tenant_user_created_idx').on(
      table.tenant_id,
      table.user_id,
      table.created_at,
    ),
    tenantUserUnreadIdx: index('notifications_tenant_user_unread_idx').on(
      table.tenant_id,
      table.user_id,
      table.is_read,
    ),
  }),
);

// Asset Documents (Manuais, esquemas, certificados)
export const assetDocuments = pgTable(
  'asset_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenant_id: uuid('tenant_id')
      .notNull(),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    document_type: text('document_type').notNull(), // 'manual', 'schematic', 'warranty', 'sop', 'technical_spec', 'certification'
    title: text('title').notNull(),
    description: text('description'),
    file_url: text('file_url').notNull(),
    file_size_mb: decimal('file_size_mb', { precision: 5, scale: 2 }),
    file_extension: text('file_extension'),
    uploaded_by: uuid('uploaded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    version_number: integer('version_number').default(1),
    is_latest: boolean('is_latest').default(true),
    tags: text('tags').array(),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('asset_docs_tenant_id_idx').on(table.tenant_id),
    assetIdIdx: index('asset_docs_asset_id_idx').on(table.asset_id),
    docTypeIdx: index('asset_docs_type_idx').on(table.document_type),
  }),
);

// Asset Document Versions
export const assetDocumentVersions = pgTable(
  'asset_document_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    document_id: uuid('document_id')
      .notNull()
      .references(() => assetDocuments.id, { onDelete: 'cascade' }),
    version_number: integer('version_number').notNull(),
    change_log: text('change_log'),
    file_url: text('file_url').notNull(),
    uploaded_by: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    documentIdIdx: index('doc_versions_doc_id_idx').on(table.document_id),
  }),
);

// Relations for Alert Configurations - COMMENTED OUT: tenant references disabled
/*
export const alertConfigurationsRelations = relations(alertConfigurations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [alertConfigurations.tenant_id],
    references: [tenants.id],
  }),
  asset: one(assets, {
    fields: [alertConfigurations.asset_id],
    references: [assets.id],
  }),
  alerts: many(alertsHistory),
}));

// Relations for Alerts History
export const alertsHistoryRelations = relations(alertsHistory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [alertsHistory.tenant_id],
    references: [tenants.id],
  }),
  asset: one(assets, {
    fields: [alertsHistory.asset_id],
    references: [assets.id],
  }),
  alertConfig: one(alertConfigurations, {
    fields: [alertsHistory.alert_config_id],
    references: [alertConfigurations.id],
  }),
  resolvedBy: one(users, {
    fields: [alertsHistory.resolved_by],
    references: [users.id],
  }),
}));

// Relations for Asset Documents
export const assetDocumentsRelations = relations(assetDocuments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assetDocuments.tenant_id],
    references: [tenants.id],
  }),
  asset: one(assets, {
    fields: [assetDocuments.asset_id],
    references: [assets.id],
  }),
  uploadedByUser: one(users, {
    fields: [assetDocuments.uploaded_by],
    references: [users.id],
  }),
  versions: many(assetDocumentVersions),
}));
*/

// Basic Alert Relations
export const alertConfigurationsRelations = relations(alertConfigurations, ({ one, many }) => ({
  asset: one(assets, {
    fields: [alertConfigurations.asset_id],
    references: [assets.id],
  }),
  alerts: many(alertsHistory),
}));

// Basic Alert History Relations
export const alertsHistoryRelations = relations(alertsHistory, ({ one }) => ({
  asset: one(assets, {
    fields: [alertsHistory.asset_id],
    references: [assets.id],
  }),
  alertConfig: one(alertConfigurations, {
    fields: [alertsHistory.alert_config_id],
    references: [alertConfigurations.id],
  }),
  resolvedBy: one(users, {
    fields: [alertsHistory.resolved_by],
    references: [users.id],
  }),
}));

// Basic Asset Documents Relations
export const assetDocumentsRelations = relations(assetDocuments, ({ one, many }) => ({
  asset: one(assets, {
    fields: [assetDocuments.asset_id],
    references: [assets.id],
  }),
  uploadedByUser: one(users, {
    fields: [assetDocuments.uploaded_by],
    references: [users.id],
  }),
  versions: many(assetDocumentVersions),
}));

// Relations for Asset Document Versions
export const assetDocumentVersionsRelations = relations(assetDocumentVersions, ({ one }) => ({
  document: one(assetDocuments, {
    fields: [assetDocumentVersions.document_id],
    references: [assetDocuments.id],
  }),
  uploadedByUser: one(users, {
    fields: [assetDocumentVersions.uploaded_by],
    references: [users.id],
  }),
}));