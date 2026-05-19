-- Phase 1 billing transactions — bills, bill_items, payments.
-- Apply: psql "$DATABASE_URL" -f modules/billing/migrations/0001_bills_payments.sql

-- ─── bills ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing.bills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  bill_number varchar(64) NOT NULL,
  patient_id uuid NOT NULL,
  visit_id uuid,
  visit_type varchar(16),
  bill_type varchar(32) NOT NULL DEFAULT 'STANDALONE',
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(18, 4) NOT NULL DEFAULT 0,
  discount_amount numeric(18, 4) NOT NULL DEFAULT 0,
  discount_reason text,
  tax_amount numeric(18, 4) NOT NULL DEFAULT 0,
  total_amount numeric(18, 4) NOT NULL DEFAULT 0,
  round_off_amount numeric(18, 4) NOT NULL DEFAULT 0,
  net_amount numeric(18, 4) NOT NULL DEFAULT 0,
  paid_amount numeric(18, 4) NOT NULL DEFAULT 0,
  outstanding_amount numeric(18, 4) NOT NULL DEFAULT 0,
  status varchar(16) NOT NULL DEFAULT 'DRAFT',
  tax_breakup jsonb,
  notes text,
  cancellation_reason text,
  created_by uuid,
  approved_by uuid,
  cancelled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT bills_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT bills_status_chk CHECK (
    status IN ('DRAFT', 'FINALIZED', 'PARTIALLY_PAID', 'PAID', 'CLOSED', 'CANCELLED', 'REPLACED')
  ),
  CONSTRAINT bills_visit_type_chk CHECK (
    visit_type IS NULL OR visit_type IN ('OPD', 'IPD', 'ER', 'DAYCARE', 'WALK_IN')
  ),
  CONSTRAINT bills_bill_type_chk CHECK (bill_type IN ('INTERIM', 'FINAL', 'STANDALONE')),
  CONSTRAINT bills_net_nonneg_chk CHECK (net_amount >= 0),
  CONSTRAINT bills_paid_nonneg_chk CHECK (paid_amount >= 0),
  CONSTRAINT bills_outstanding_nonneg_chk CHECK (outstanding_amount >= 0),
  CONSTRAINT bills_draft_unpaid_chk CHECK (status != 'DRAFT' OR paid_amount = 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bills_tenant_bill_number
  ON billing.bills (iq_tenant_id, bill_number);

CREATE INDEX IF NOT EXISTS idx_bills_tenant_patient_date
  ON billing.bills (iq_tenant_id, patient_id, bill_date DESC);

CREATE INDEX IF NOT EXISTS idx_bills_tenant_visit_status
  ON billing.bills (iq_tenant_id, visit_id, status);

CREATE INDEX IF NOT EXISTS idx_bills_tenant_status_date
  ON billing.bills (iq_tenant_id, status, bill_date);

-- ─── bill_items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing.bill_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  bill_id uuid NOT NULL,
  service_id uuid,
  item_type varchar(32) NOT NULL DEFAULT 'SERVICE',
  item_code varchar(64) NOT NULL,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price numeric(18, 4) NOT NULL,
  gross_amount numeric(18, 4) NOT NULL,
  discount_percentage numeric(7, 4) NOT NULL DEFAULT 0,
  discount_amount numeric(18, 4) NOT NULL DEFAULT 0,
  net_amount numeric(18, 4) NOT NULL,
  tax_percentage numeric(7, 4) NOT NULL DEFAULT 0,
  tax_amount numeric(18, 4) NOT NULL DEFAULT 0,
  total_amount numeric(18, 4) NOT NULL,
  source_module varchar(32) NOT NULL,
  source_ref uuid,
  performed_date timestamptz,
  performed_by uuid,
  department varchar(64),
  status varchar(16) NOT NULL DEFAULT 'ACTIVE',
  idempotency_key text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bill_items_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT bill_items_item_type_chk CHECK (
    item_type IN ('SERVICE', 'PACKAGE', 'PACKAGE_LINE', 'ADJUSTMENT')
  ),
  CONSTRAINT bill_items_status_chk CHECK (status IN ('ACTIVE', 'VOIDED')),
  CONSTRAINT bill_items_qty_chk CHECK (quantity > 0),
  CONSTRAINT bill_items_unit_price_chk CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bill_items_tenant_bill_status
  ON billing.bill_items (iq_tenant_id, bill_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_items_tenant_idempotency
  ON billing.bill_items (iq_tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─── payments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  payment_number varchar(64) NOT NULL,
  receipt_number varchar(64),
  bill_id uuid,
  patient_id uuid NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  amount numeric(18, 4) NOT NULL,
  payment_method varchar(32) NOT NULL,
  transaction_id text,
  reference_number text,
  status varchar(16) NOT NULL DEFAULT 'SUCCESS',
  received_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT payments_method_chk CHECK (
    payment_method IN ('CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER')
  ),
  CONSTRAINT payments_status_chk CHECK (status IN ('SUCCESS', 'FAILED', 'VOIDED')),
  CONSTRAINT payments_amount_chk CHECK (amount > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_payment_number
  ON billing.payments (iq_tenant_id, payment_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_receipt_number
  ON billing.payments (iq_tenant_id, receipt_number)
  WHERE receipt_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_tenant_bill_date
  ON billing.payments (iq_tenant_id, bill_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_patient_date
  ON billing.payments (iq_tenant_id, patient_id, payment_date);
