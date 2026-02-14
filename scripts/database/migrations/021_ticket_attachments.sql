-- 021_ticket_attachments.sql
-- Ticket attachments (uploads)

DO $$
BEGIN
  IF to_regclass('public.ticket_attachments') IS NULL THEN
    CREATE TABLE ticket_attachments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      comment_id uuid NULL REFERENCES ticket_comments(id) ON DELETE CASCADE,
      file_url text NOT NULL,
      file_name text NOT NULL,
      file_type text NULL,
      file_size integer NULL,
      uploaded_by uuid NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX ticket_attachments_ticket_id_idx ON ticket_attachments(ticket_id);
    CREATE INDEX ticket_attachments_tenant_id_idx ON ticket_attachments(tenant_id);
    CREATE INDEX ticket_attachments_comment_id_idx ON ticket_attachments(comment_id);
    CREATE INDEX ticket_attachments_created_at_idx ON ticket_attachments(created_at);
  END IF;
END $$;
