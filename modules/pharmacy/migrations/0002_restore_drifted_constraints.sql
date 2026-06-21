CREATE INDEX "ix_pharmacy_dispense_line_items_record" ON "pharmacy"."dispense_line_items" USING btree ("iq_tenant_id","dispense_record_id");--> statement-breakpoint
CREATE INDEX "ix_pharmacy_dispense_line_items_tenant_medicine" ON "pharmacy"."dispense_line_items" USING btree ("iq_tenant_id","medicine_id") WHERE "pharmacy"."dispense_line_items"."medicine_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pharmacy_dispense_records_tenant_visit_opd" ON "pharmacy"."dispense_records" USING btree ("iq_tenant_id","visit_id") WHERE "pharmacy"."dispense_records"."walk_in_order" = false and "pharmacy"."dispense_records"."visit_id" is not null;--> statement-breakpoint
CREATE INDEX "ix_pharmacy_dispense_records_tenant_patient" ON "pharmacy"."dispense_records" USING btree ("iq_tenant_id","patient_id") WHERE "pharmacy"."dispense_records"."patient_id" is not null;--> statement-breakpoint
CREATE INDEX "ix_pharmacy_dispense_records_walk_in_patient" ON "pharmacy"."dispense_records" USING btree ("iq_tenant_id","walk_in_patient_id") WHERE "pharmacy"."dispense_records"."walk_in_patient_id" is not null;--> statement-breakpoint
CREATE INDEX "ix_pharmacy_opd_queue_projection_tenant_status_queued" ON "pharmacy"."opd_queue_projection" USING btree ("iq_tenant_id","dispense_status","queued_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_pharmacy_opd_queue_projection_tenant_queued" ON "pharmacy"."opd_queue_projection" USING btree ("iq_tenant_id","queued_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_pharmacy_walk_in_patients_tenant_created" ON "pharmacy"."walk_in_patients" USING btree ("iq_tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_qty_nonneg_chk" CHECK (quantity_dispensed >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_unit_amount_nonneg_chk" CHECK (unit_amount >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_line_discount_nonneg_chk" CHECK (line_discount >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_tax_percent_nonneg_chk" CHECK (tax_percent >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_tax_amount_nonneg_chk" CHECK (tax_amount >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_line_items" ADD CONSTRAINT "dispense_line_items_line_total_nonneg_chk" CHECK (line_total >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_records" ADD CONSTRAINT "dispense_records_subtotal_nonneg_chk" CHECK (subtotal >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_records" ADD CONSTRAINT "dispense_records_discount_nonneg_chk" CHECK (discount >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_records" ADD CONSTRAINT "dispense_records_total_nonneg_chk" CHECK (total_amount >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_records" ADD CONSTRAINT "dispense_records_dispense_status_check" CHECK (dispense_status in ('issued', 'partial_issue'));--> statement-breakpoint
ALTER TABLE "pharmacy"."dispense_records" ADD CONSTRAINT "dispense_records_order_kind_chk" CHECK ((
      walk_in_order = true
      and walk_in_patient_id is not null
      and visit_id is null
      and patient_id is null
      and opd_prescription_id is null
    )
    or (
      walk_in_order = false
      and walk_in_patient_id is null
      and visit_id is not null
      and patient_id is not null
    ));--> statement-breakpoint
ALTER TABLE "pharmacy"."opd_queue_projection" ADD CONSTRAINT "opd_queue_projection_dispense_status_check" CHECK (dispense_status in ('pending', 'issued', 'partial_issue'));--> statement-breakpoint
ALTER TABLE "pharmacy"."opd_queue_projection" ADD CONSTRAINT "opd_queue_projection_medicine_count_nonneg_chk" CHECK (medicine_count >= 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."walk_in_patients" ADD CONSTRAINT "walk_in_patients_first_name_nonempty_chk" CHECK (length(trim(first_name)) > 0);--> statement-breakpoint
ALTER TABLE "pharmacy"."walk_in_patients" ADD CONSTRAINT "walk_in_patients_gender_chk" CHECK (gender in ('male', 'female', 'other'));