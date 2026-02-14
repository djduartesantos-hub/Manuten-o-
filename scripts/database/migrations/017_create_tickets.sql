-- 017_create_tickets.sql
-- Support tickets (tenant + SuperAdmin)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ticket_status'
  ) THEN
    CREATE TYPE ticket_status AS ENUM ('aberto','em_progresso','resolvido','fechado');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.tickets') IS NULL THEN
    CREATE TABLE tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      created_by_user_id uuid NULL,
      assigned_to_user_id uuid NULL,
      title text NOT NULL,
      description text NOT NULL,
      status ticket_status NOT NULL DEFAULT 'aberto',
      is_internal boolean DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_activity_at timestamptz NOT NULL DEFAULT now(),
      closed_at timestamptz NULL
    );

    CREATE INDEX tickets_tenant_id_idx ON tickets(tenant_id);
    CREATE INDEX tickets_status_idx ON tickets(status);
    CREATE INDEX tickets_last_activity_at_idx ON tickets(last_activity_at);
  END IF;

  IF to_regclass('public.ticket_comments') IS NULL THEN
    CREATE TABLE ticket_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      tenant_id uuid NOT NULL,
      author_user_id uuid NULL,
      body text NOT NULL,
      is_internal boolean DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX ticket_comments_ticket_id_idx ON ticket_comments(ticket_id);
    CREATE INDEX ticket_comments_tenant_id_idx ON ticket_comments(tenant_id);
    CREATE INDEX ticket_comments_created_at_idx ON ticket_comments(created_at);
  END IF;
END $$;
