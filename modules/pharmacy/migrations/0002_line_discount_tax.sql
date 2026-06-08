-- Per-line discount (amount) and tax (percent) on dispense line items.

ALTER TABLE pharmacy.dispense_line_items
  ADD COLUMN IF NOT EXISTS line_discount numeric(18, 4) NOT NULL DEFAULT 0;

ALTER TABLE pharmacy.dispense_line_items
  ADD COLUMN IF NOT EXISTS tax_percent numeric(8, 4) NOT NULL DEFAULT 0;

ALTER TABLE pharmacy.dispense_line_items
  ADD COLUMN IF NOT EXISTS tax_amount numeric(18, 4) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dispense_line_items_line_discount_nonneg_chk'
  ) THEN
    ALTER TABLE pharmacy.dispense_line_items
      ADD CONSTRAINT dispense_line_items_line_discount_nonneg_chk CHECK (line_discount >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dispense_line_items_tax_percent_nonneg_chk'
  ) THEN
    ALTER TABLE pharmacy.dispense_line_items
      ADD CONSTRAINT dispense_line_items_tax_percent_nonneg_chk CHECK (tax_percent >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dispense_line_items_tax_amount_nonneg_chk'
  ) THEN
    ALTER TABLE pharmacy.dispense_line_items
      ADD CONSTRAINT dispense_line_items_tax_amount_nonneg_chk CHECK (tax_amount >= 0);
  END IF;
END $$;
