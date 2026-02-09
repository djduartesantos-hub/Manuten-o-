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
import { relations } from 'drizzle-orm';

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
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userPlantIdx: uniqueIndex('user_plants_user_plant_idx').on(table.user_id, table.plant_id),
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
    acquisition_date: timestamp('acquisition_date'),
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
    frequency_type: text('frequency_type').notNull(), // 'days', 'months', 'meter'
    frequency_value: integer('frequency_value').notNull(),
    meter_threshold: decimal('meter_threshold', { precision: 15, scale: 2 }),
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
    scheduled_date: timestamp('scheduled_date'),
    started_at: timestamp('started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    closed_at: timestamp('closed_at', { withTimezone: true }),
    closed_by: uuid('closed_by').references(() => users.id, { onDelete: 'set null' }),
    estimated_hours: decimal('estimated_hours', { precision: 8, scale: 2 }),
    actual_hours: decimal('actual_hours', { precision: 8, scale: 2 }),
    notes: text('notes'),
    work_performed: text('work_performed'),
    sla_deadline: timestamp('sla_deadline', { withTimezone: true }),
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
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdIdx: index('sla_rules_tenant_id_idx').on(table.tenant_id),
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
    notify_roles: text('notify_roles').array().default(['admin', 'manager']),
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
    channels: text('channels').array().default(['in_app']),
    recipients: text('recipients').array().default(['assigned', 'creator', 'managers', 'plant_users']),
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