ALTER TABLE "tenants" ADD COLUMN "password_min_length" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "password_expiration_days" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "password_max_failed_attempts" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "password_lockout_minutes" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone DEFAULT now() NOT NULL;