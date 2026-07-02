-- Indent number sequences (IND-YYYYMM-NNNNN on submit).

CREATE TABLE IF NOT EXISTS inventory.indent_sequences (
  iq_tenant_id uuid NOT NULL,
  period_key text NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indent_sequences_pkey PRIMARY KEY (iq_tenant_id, period_key)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_distributed_table') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_dist_partition
    WHERE logicalrelid = 'inventory.indent_sequences'::regclass
  ) THEN
    RETURN;
  END IF;

  PERFORM create_distributed_table('inventory.indent_sequences', 'iq_tenant_id');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
