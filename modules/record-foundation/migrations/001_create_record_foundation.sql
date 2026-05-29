-- ============================================================================
-- Record Foundation — simplified schema (care_contexts + bundles, 1:1)
-- ============================================================================
-- All tables distributed by iq_tenant_id for Citus co-location.

CREATE SCHEMA IF NOT EXISTS record_foundation;

-- ─── care_contexts ───────────────────────────────────────────────────────────

CREATE TABLE record_foundation.care_contexts (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    iq_tenant_id        UUID        NOT NULL,
    patient_id          UUID        NOT NULL,
    source_origin       TEXT        NOT NULL,
    source_system_id    TEXT        NOT NULL,
    source_record_type  TEXT        NOT NULL,
    source_record_id    TEXT,
    encounter_id        UUID,
    display             TEXT        NOT NULL,
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ,
    status              TEXT        NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT pk_care_contexts PRIMARY KEY (iq_tenant_id, id),
    CONSTRAINT uq_care_contexts_source
        UNIQUE (iq_tenant_id, source_origin, source_system_id, source_record_id, source_record_type),
    CONSTRAINT chk_care_contexts_status
        CHECK (status IN ('active','inactive','archived'))
);

CREATE INDEX idx_care_contexts_patient_time
    ON record_foundation.care_contexts (iq_tenant_id, patient_id, period_start);
CREATE INDEX idx_care_contexts_encounter
    ON record_foundation.care_contexts (iq_tenant_id, encounter_id);

SELECT create_distributed_table('record_foundation.care_contexts', 'iq_tenant_id');

-- ─── bundles ─────────────────────────────────────────────────────────────────

CREATE TABLE record_foundation.bundles (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    iq_tenant_id        UUID        NOT NULL,
    care_context_id     UUID        NOT NULL,
    bundle_kind         TEXT        NOT NULL,
    fhir_profile_url    TEXT        NOT NULL,
    fhir_profile_version TEXT       NOT NULL,
    producer_kind       TEXT        NOT NULL,
    producer_id         TEXT        NOT NULL,
    bundle_json         JSONB       NOT NULL,
    bundle_size_bytes   INTEGER     NOT NULL,
    produced_at         TIMESTAMPTZ NOT NULL,
    stored_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT pk_bundles PRIMARY KEY (iq_tenant_id, id),
    CONSTRAINT uq_bundles_care_context UNIQUE (iq_tenant_id, care_context_id)
);

CREATE INDEX idx_bundles_kind
    ON record_foundation.bundles (iq_tenant_id, bundle_kind);

SELECT create_distributed_table('record_foundation.bundles', 'iq_tenant_id');
