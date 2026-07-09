CREATE TABLE "registration"."sequence_counters" (
	"iq_tenant_id" uuid NOT NULL,
	"sequence_name" text NOT NULL,
	"current_value" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "sequence_counters_iq_tenant_id_sequence_name_pk" PRIMARY KEY("iq_tenant_id","sequence_name")
);
