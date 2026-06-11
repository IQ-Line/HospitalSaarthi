-- IPD inpatient orders — Order Tracker + New Order (LLD §6, UI categories).
-- Apply after 0002_vital_signs.sql

CREATE TABLE IF NOT EXISTS ipd.inpatient_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  episode_id uuid NOT NULL,
  order_number text NOT NULL,
  order_category text NOT NULL,
  item_code text NOT NULL,
  item_name text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  dosage_instruction text,
  frequency text,
  duration_days integer,
  priority text NOT NULL DEFAULT 'routine',
  status text NOT NULL DEFAULT 'placed',
  completed_at timestamptz,
  cancelled_reason text,
  billing_status text NOT NULL DEFAULT 'pending',
  notes text,
  idempotency_key text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inpatient_orders_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT inpatient_orders_category_chk CHECK (
    order_category IN ('medication', 'procedure', 'laboratory', 'radiology', 'consumable')
  ),
  CONSTRAINT inpatient_orders_priority_chk CHECK (
    priority IN ('routine', 'urgent', 'stat')
  ),
  CONSTRAINT inpatient_orders_status_chk CHECK (
    status IN ('placed', 'acknowledged', 'in_progress', 'completed', 'cancelled', 'on_hold')
  ),
  CONSTRAINT inpatient_orders_billing_status_chk CHECK (
    billing_status IN ('pending', 'billed', 'waived')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inpatient_orders_number
  ON ipd.inpatient_orders (iq_tenant_id, order_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inpatient_orders_idempotency
  ON ipd.inpatient_orders (iq_tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inpatient_orders_episode_status
  ON ipd.inpatient_orders (iq_tenant_id, episode_id, status);

CREATE INDEX IF NOT EXISTS idx_inpatient_orders_category_status
  ON ipd.inpatient_orders (iq_tenant_id, order_category, status);
