DO $$ BEGIN
 CREATE TYPE "maintenance_type" AS ENUM('preventiva', 'corretiva');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "order_status" AS ENUM('aberta', 'em_analise', 'em_execucao', 'em_pausa', 'concluida', 'fechada', 'cancelada');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "preventive_schedule_status" AS ENUM('agendada', 'em_execucao', 'concluida', 'fechada', 'reagendada');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "priority" AS ENUM('baixa', 'media', 'alta', 'critica');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "stock_movement_type" AS ENUM('entrada', 'saida', 'ajuste');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "stock_reservation_status" AS ENUM('ativa', 'libertada', 'cancelada');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"alert_type" text NOT NULL,
	"threshold" integer NOT NULL,
	"time_unit" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"notify_roles" text[] DEFAULT ARRAY['admin','manager']::text[],
	"notify_email" boolean DEFAULT true,
	"notify_push" boolean DEFAULT false,
	"escalate_after_hours" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"alert_config_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"change_log" text,
	"file_url" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_size_mb" numeric(5, 2),
	"file_extension" text,
	"uploaded_by" uuid NOT NULL,
	"version_number" integer DEFAULT 1,
	"is_latest" boolean DEFAULT true,
	"tags" text[],
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"qr_code" text,
	"model" text,
	"manufacturer" text,
	"serial_number" text,
	"location" text,
	"status" text DEFAULT 'operacional',
	"acquisition_date" timestamp with time zone,
	"acquisition_cost" numeric(15, 2),
	"meter_type" text,
	"current_meter_value" numeric(15, 2),
	"is_critical" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_kit_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kit_id" uuid NOT NULL,
	"spare_part_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_kits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"plan_id" uuid,
	"category_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "maintenance_type" DEFAULT 'preventiva' NOT NULL,
	"frequency_type" text NOT NULL,
	"frequency_value" integer NOT NULL,
	"meter_threshold" numeric(15, 2),
	"auto_schedule" boolean DEFAULT true,
	"schedule_basis" text DEFAULT 'completion',
	"schedule_anchor_mode" text DEFAULT 'interval',
	"tolerance_unit" text DEFAULT 'days',
	"tolerance_before_value" integer DEFAULT 0,
	"tolerance_after_value" integer DEFAULT 0,
	"tolerance_mode" text DEFAULT 'soft',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sequence" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meter_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"reading_value" numeric(15, 2) NOT NULL,
	"reading_date" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"channels" text[] DEFAULT ARRAY['in_app']::text[],
	"recipients" text[] DEFAULT ARRAY['assigned','creator','managers','plant_users']::text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"plant_id" uuid,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"entity" text,
	"entity_id" text,
	"meta" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"city" text,
	"country" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preventive_maintenance_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"status" "preventive_schedule_status" DEFAULT 'agendada' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"rescheduled_from" timestamp with time zone,
	"rescheduled_at" timestamp with time zone,
	"reschedule_reason" text,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rbac_permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"group_name" text DEFAULT 'geral' NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rbac_role_home_pages" (
	"tenant_id" uuid NOT NULL,
	"plant_id" uuid,
	"role_key" text NOT NULL,
	"home_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rbac_role_permissions" (
	"tenant_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"permission_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rbac_roles" (
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sla_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"priority" "priority" NOT NULL,
	"response_time_hours" integer NOT NULL,
	"resolution_time_hours" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spare_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_cost" numeric(15, 2),
	"min_stock" integer DEFAULT 0,
	"supplier_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"spare_part_id" uuid NOT NULL,
	"work_order_id" uuid,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(15, 2),
	"total_cost" numeric(15, 2),
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"spare_part_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "stock_reservation_status" DEFAULT 'ativa' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"released_by" uuid,
	"release_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "superadmin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"affected_tenant_id" uuid,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"subscription_plan" text DEFAULT 'basic',
	"is_active" boolean DEFAULT true,
	"is_read_only" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "is_read_only" boolean DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"role" text DEFAULT 'tecnico' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'tecnico' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_order_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"task_id" uuid,
	"description" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp with time zone,
	"notes" text,
	"sequence" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"plan_id" uuid,
	"assigned_to" uuid,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "order_status" DEFAULT 'aberta' NOT NULL,
	"sub_status" text,
	"priority" "priority" DEFAULT 'media' NOT NULL,
	"scheduled_date" timestamp with time zone,
	"analysis_started_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"pause_reason" text,
	"completed_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"estimated_hours" numeric(8, 2),
	"actual_hours" numeric(8, 2),
	"notes" text,
	"work_performed" text,
	"downtime_started_at" timestamp with time zone,
	"downtime_ended_at" timestamp with time zone,
	"downtime_minutes" integer DEFAULT 0,
	"downtime_reason" text,
	"downtime_type" text,
	"downtime_category" text,
	"root_cause" text,
	"corrective_action" text,
	"sla_deadline" timestamp with time zone,
	"sla_exclude_pause" boolean DEFAULT true NOT NULL,
	"sla_paused_ms" integer DEFAULT 0 NOT NULL,
	"sla_pause_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_config_tenant_id_idx" ON "alert_configurations" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_config_asset_id_idx" ON "alert_configurations" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_history_tenant_id_idx" ON "alerts_history" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_history_asset_id_idx" ON "alerts_history" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_history_severity_idx" ON "alerts_history" ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_categories_tenant_id_idx" ON "asset_categories" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_versions_doc_id_idx" ON "asset_document_versions" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_docs_tenant_id_idx" ON "asset_documents" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_docs_asset_id_idx" ON "asset_documents" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_docs_type_idx" ON "asset_documents" ("document_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_tenant_id_idx" ON "assets" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_plant_id_idx" ON "assets" ("plant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assets_plant_code_idx" ON "assets" ("plant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_work_order_id_idx" ON "attachments" ("work_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_tenant_id_idx" ON "attachments" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_idx" ON "audit_logs" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_kit_items_tenant_id_idx" ON "maintenance_kit_items" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_kit_items_kit_id_idx" ON "maintenance_kit_items" ("kit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_kit_items_spare_part_id_idx" ON "maintenance_kit_items" ("spare_part_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_kits_tenant_id_idx" ON "maintenance_kits" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_kits_plan_id_idx" ON "maintenance_kits" ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_kits_category_id_idx" ON "maintenance_kits" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_plans_asset_id_idx" ON "maintenance_plans" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_plans_tenant_id_idx" ON "maintenance_plans" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_tasks_plan_id_idx" ON "maintenance_tasks" ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meter_readings_asset_id_idx" ON "meter_readings" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meter_readings_tenant_id_idx" ON "meter_readings" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_rules_tenant_event_idx" ON "notification_rules" ("tenant_id","event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_tenant_user_created_idx" ON "notifications" ("tenant_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_tenant_user_unread_idx" ON "notifications" ("tenant_id","user_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plants_tenant_id_idx" ON "plants" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plants_tenant_code_idx" ON "plants" ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pms_tenant_id_idx" ON "preventive_maintenance_schedules" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pms_plant_id_idx" ON "preventive_maintenance_schedules" ("plant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pms_plan_id_idx" ON "preventive_maintenance_schedules" ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pms_asset_id_idx" ON "preventive_maintenance_schedules" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pms_scheduled_for_idx" ON "preventive_maintenance_schedules" ("scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pms_status_idx" ON "preventive_maintenance_schedules" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rbac_role_home_pages_tenant_plant_role_idx" ON "rbac_role_home_pages" ("tenant_id","plant_id","role_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_role_home_pages_tenant_id_idx" ON "rbac_role_home_pages" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_role_home_pages_tenant_plant_idx" ON "rbac_role_home_pages" ("tenant_id","plant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rbac_role_permissions_tenant_role_perm_idx" ON "rbac_role_permissions" ("tenant_id","role_key","permission_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_role_permissions_tenant_role_idx" ON "rbac_role_permissions" ("tenant_id","role_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rbac_roles_tenant_key_idx" ON "rbac_roles" ("tenant_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_roles_tenant_id_idx" ON "rbac_roles" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_rules_tenant_id_idx" ON "sla_rules" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spare_parts_tenant_id_idx" ON "spare_parts" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spare_parts_tenant_code_idx" ON "spare_parts" ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_idx" ON "stock_movements" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_plant_id_idx" ON "stock_movements" ("plant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reservations_tenant_id_idx" ON "stock_reservations" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reservations_plant_id_idx" ON "stock_reservations" ("plant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reservations_work_order_id_idx" ON "stock_reservations" ("work_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reservations_spare_part_id_idx" ON "stock_reservations" ("spare_part_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "superadmin_audit_logs_created_at_idx" ON "superadmin_audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "superadmin_audit_logs_actor_user_id_idx" ON "superadmin_audit_logs" ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "superadmin_audit_logs_affected_tenant_id_idx" ON "superadmin_audit_logs" ("affected_tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "superadmin_audit_logs_action_idx" ON "superadmin_audit_logs" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_tenant_id_idx" ON "suppliers" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_plants_user_plant_idx" ON "user_plants" ("user_id","plant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_username_idx" ON "users" ("tenant_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_email_idx" ON "users" ("tenant_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_id_idx" ON "users" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_order_tasks_work_order_id_idx" ON "work_order_tasks" ("work_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_idx" ON "work_orders" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_plant_id_idx" ON "work_orders" ("plant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_asset_id_idx" ON "work_orders" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_status_idx" ON "work_orders" ("status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_configurations" ADD CONSTRAINT "alert_configurations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts_history" ADD CONSTRAINT "alerts_history_alert_config_id_alert_configurations_id_fk" FOREIGN KEY ("alert_config_id") REFERENCES "alert_configurations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts_history" ADD CONSTRAINT "alerts_history_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts_history" ADD CONSTRAINT "alerts_history_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_document_versions" ADD CONSTRAINT "asset_document_versions_document_id_asset_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "asset_documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_document_versions" ADD CONSTRAINT "asset_document_versions_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_kit_items" ADD CONSTRAINT "maintenance_kit_items_kit_id_maintenance_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "maintenance_kits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_kit_items" ADD CONSTRAINT "maintenance_kit_items_spare_part_id_spare_parts_id_fk" FOREIGN KEY ("spare_part_id") REFERENCES "spare_parts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_kit_items" ADD CONSTRAINT "maintenance_kit_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_kits" ADD CONSTRAINT "maintenance_kits_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "maintenance_plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_kits" ADD CONSTRAINT "maintenance_kits_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_kits" ADD CONSTRAINT "maintenance_kits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_kits" ADD CONSTRAINT "maintenance_kits_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rbac_role_permissions" ADD CONSTRAINT "rbac_role_permissions_permission_key_rbac_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "rbac_permissions"("key") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_spare_part_id_spare_parts_id_fk" FOREIGN KEY ("spare_part_id") REFERENCES "spare_parts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_spare_part_id_spare_parts_id_fk" FOREIGN KEY ("spare_part_id") REFERENCES "spare_parts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "superadmin_audit_logs" ADD CONSTRAINT "superadmin_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_order_tasks" ADD CONSTRAINT "work_order_tasks_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_order_tasks" ADD CONSTRAINT "work_order_tasks_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "maintenance_tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "maintenance_plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
