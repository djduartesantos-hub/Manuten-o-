-- Compliance + asset lifecycle + tags (QR/NFC)

DO $$
BEGIN
  IF to_regclass('public.asset_lifecycle') IS NULL THEN
    CREATE TABLE asset_lifecycle (
      asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL,
      commissioning_date TIMESTAMPTZ,
      warranty_expires_at TIMESTAMPTZ,
      expected_lifespan_years INTEGER,
      depreciation_method TEXT,
      depreciation_years INTEGER,
      depreciation_rate DECIMAL(5, 2),
      residual_value DECIMAL(15, 2),
      replacement_due_at TIMESTAMPTZ,
      decommissioned_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX asset_lifecycle_tenant_id_idx ON asset_lifecycle(tenant_id);
    CREATE INDEX asset_lifecycle_replacement_due_at_idx ON asset_lifecycle(replacement_due_at);
    CREATE INDEX asset_lifecycle_decommissioned_at_idx ON asset_lifecycle(decommissioned_at);
  END IF;

  IF to_regclass('public.asset_tags') IS NULL THEN
    CREATE TABLE asset_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
      plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
      tag_type TEXT NOT NULL,
      tag_code TEXT NOT NULL,
      status TEXT DEFAULT 'assigned',
      assigned_at TIMESTAMPTZ,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX asset_tags_tag_code_idx ON asset_tags(tag_code);
    CREATE INDEX asset_tags_tenant_id_idx ON asset_tags(tenant_id);
    CREATE INDEX asset_tags_asset_id_idx ON asset_tags(asset_id);
    CREATE INDEX asset_tags_plant_id_idx ON asset_tags(plant_id);
    CREATE INDEX asset_tags_tag_type_idx ON asset_tags(tag_type);
  END IF;

  IF to_regclass('public.asset_certifications') IS NULL THEN
    CREATE TABLE asset_certifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      certification_type TEXT NOT NULL,
      standard TEXT,
      issuer TEXT,
      reference_code TEXT,
      issued_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      status TEXT DEFAULT 'valid',
      document_id UUID REFERENCES asset_documents(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX asset_certifications_tenant_id_idx ON asset_certifications(tenant_id);
    CREATE INDEX asset_certifications_asset_id_idx ON asset_certifications(asset_id);
    CREATE INDEX asset_certifications_expires_at_idx ON asset_certifications(expires_at);
    CREATE INDEX asset_certifications_status_idx ON asset_certifications(status);
  END IF;

  IF to_regclass('public.asset_inspections') IS NULL THEN
    CREATE TABLE asset_inspections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      certification_id UUID REFERENCES asset_certifications(id) ON DELETE SET NULL,
      inspection_date TIMESTAMPTZ NOT NULL,
      inspector TEXT,
      result TEXT DEFAULT 'passed',
      next_due_at TIMESTAMPTZ,
      document_id UUID REFERENCES asset_documents(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX asset_inspections_tenant_id_idx ON asset_inspections(tenant_id);
    CREATE INDEX asset_inspections_asset_id_idx ON asset_inspections(asset_id);
    CREATE INDEX asset_inspections_next_due_at_idx ON asset_inspections(next_due_at);
  END IF;

  IF to_regclass('public.asset_calibrations') IS NULL THEN
    CREATE TABLE asset_calibrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      calibration_date TIMESTAMPTZ NOT NULL,
      due_at TIMESTAMPTZ,
      provider TEXT,
      reference_code TEXT,
      status TEXT DEFAULT 'valid',
      document_id UUID REFERENCES asset_documents(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX asset_calibrations_tenant_id_idx ON asset_calibrations(tenant_id);
    CREATE INDEX asset_calibrations_asset_id_idx ON asset_calibrations(asset_id);
    CREATE INDEX asset_calibrations_due_at_idx ON asset_calibrations(due_at);
  END IF;
END $$;
