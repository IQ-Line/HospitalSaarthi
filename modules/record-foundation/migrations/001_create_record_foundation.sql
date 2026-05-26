-- ============================================================================
-- Record Foundation — Phase 1 schema
-- Per ADR-0028, schema-reference.json (LLD), and build-plan.md
-- ============================================================================
-- All tables distributed by iq_tenant_id for Citus co-location.

CREATE SCHEMA IF NOT EXISTS record_foundation;

-- ─── care_contexts ───────────────────────────────────────────────────────────

CREATE TABLE record_foundation.care_contexts (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    iq_tenant_id        UUID        NOT NULL,
    patient_id          UUID        NOT NULL,
    abha_linkage_status TEXT        NOT NULL DEFAULT 'not_linked',
    abdm_reference_number TEXT,
    source_origin       TEXT        NOT NULL,
    source_system_id    TEXT        NOT NULL,
    source_record_type  TEXT        NOT NULL,
    source_record_id    TEXT,
    encounter_id        UUID,
    display             TEXT        NOT NULL,
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ,
    status              TEXT        NOT NULL DEFAULT 'draft',
    supersedes_id       UUID,
    sensitivity_labels  TEXT[],
    consent_disclosable BOOLEAN     NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,
    linked_at           TIMESTAMPTZ,
    data_erase_at       TIMESTAMPTZ,

    CONSTRAINT pk_care_contexts PRIMARY KEY (iq_tenant_id, id),
    CONSTRAINT uq_care_contexts_source
        UNIQUE (iq_tenant_id, source_origin, source_system_id, source_record_id, source_record_type),
    CONSTRAINT uq_care_contexts_abdm_ref
        UNIQUE (iq_tenant_id, abdm_reference_number),
    CONSTRAINT chk_care_contexts_abha_linkage_status
        CHECK (abha_linkage_status IN ('not_linked','linkable','linked','revoked')),
    CONSTRAINT chk_care_contexts_source_origin
        CHECK (source_origin IN ('platform_module','legacy_system','external_abdm')),
    CONSTRAINT chk_care_contexts_source_record_type
        CHECK (source_record_type IN (
            'opd_visit','ipd_admission','lab_report','prescription',
            'radiology_report','discharge_summary','immunisation_record',
            'wellness_record','health_document','external_record'
        )),
    CONSTRAINT chk_care_contexts_status
        CHECK (status IN ('draft','final','superseded','cancelled','archived'))
);

CREATE INDEX idx_care_contexts_patient_time
    ON record_foundation.care_contexts (iq_tenant_id, patient_id, period_start);
CREATE INDEX idx_care_contexts_linkable
    ON record_foundation.care_contexts (iq_tenant_id, patient_id, status, abha_linkage_status);
CREATE INDEX idx_care_contexts_erase_due
    ON record_foundation.care_contexts (data_erase_at) WHERE data_erase_at IS NOT NULL;
CREATE INDEX idx_care_contexts_encounter
    ON record_foundation.care_contexts (iq_tenant_id, encounter_id);
CREATE INDEX idx_care_contexts_supersedes
    ON record_foundation.care_contexts (iq_tenant_id, supersedes_id);

SELECT create_distributed_table('record_foundation.care_contexts', 'iq_tenant_id');

-- ─── record_bundle_manifests ─────────────────────────────────────────────────

CREATE TABLE record_foundation.record_bundle_manifests (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    iq_tenant_id        UUID        NOT NULL,
    care_context_id     UUID        NOT NULL,
    bundle_kind         TEXT        NOT NULL,
    fhir_profile_url    TEXT        NOT NULL,
    fhir_profile_version TEXT       NOT NULL,
    producer_kind       TEXT        NOT NULL,
    producer_id         TEXT        NOT NULL,
    validation_status   TEXT        NOT NULL DEFAULT 'pending',
    validation_errors   JSONB,
    bundle_storage_id   UUID        NOT NULL,
    bundle_size_bytes   INTEGER     NOT NULL,
    bundle_hash         TEXT        NOT NULL,
    signature_storage_ref TEXT,
    produced_at         TIMESTAMPTZ NOT NULL,
    received_at         TIMESTAMPTZ,
    stored_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT pk_record_bundle_manifests PRIMARY KEY (iq_tenant_id, id),
    CONSTRAINT chk_manifests_bundle_kind
        CHECK (bundle_kind IN (
            'OpConsultRecord','Prescription','DischargeSummary','DiagnosticReport',
            'HealthDocumentRecord','ImmunizationRecord','WellnessRecord'
        )),
    CONSTRAINT chk_manifests_producer_kind
        CHECK (producer_kind IN ('platform_module','external_hip')),
    CONSTRAINT chk_manifests_validation_status
        CHECK (validation_status IN ('pending','valid','invalid','not_validated'))
);

CREATE INDEX idx_manifests_care_context
    ON record_foundation.record_bundle_manifests (iq_tenant_id, care_context_id);
CREATE INDEX idx_manifests_kind
    ON record_foundation.record_bundle_manifests (iq_tenant_id, bundle_kind);
CREATE INDEX idx_manifests_invalid
    ON record_foundation.record_bundle_manifests (iq_tenant_id, validation_status);

SELECT create_distributed_table('record_foundation.record_bundle_manifests', 'iq_tenant_id');

-- ─── bundle_storage ──────────────────────────────────────────────────────────

CREATE TABLE record_foundation.bundle_storage (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    iq_tenant_id        UUID        NOT NULL,
    storage_kind        TEXT        NOT NULL DEFAULT 'inline_jsonb',
    bundle_jsonb        JSONB,
    object_storage_ref  TEXT,
    encryption_kind     TEXT        NOT NULL DEFAULT 'at_rest_pg',
    stored_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT pk_bundle_storage PRIMARY KEY (iq_tenant_id, id),
    CONSTRAINT chk_bundle_storage_kind
        CHECK (storage_kind IN ('inline_jsonb','object_storage_ref')),
    CONSTRAINT chk_bundle_encryption_kind
        CHECK (encryption_kind IN ('at_rest_pg','at_rest_object_kms','app_encrypted'))
);

SELECT create_distributed_table('record_foundation.bundle_storage', 'iq_tenant_id');

-- ─── external_health_records ─────────────────────────────────────────────────

CREATE TABLE record_foundation.external_health_records (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    iq_tenant_id            UUID        NOT NULL,
    patient_id              UUID        NOT NULL,
    care_context_id         UUID        NOT NULL,
    bundle_manifest_id      UUID        NOT NULL,
    consent_artifact_id     UUID        NOT NULL,
    source_hip_id           TEXT        NOT NULL,
    source_hip_display_name TEXT,
    received_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    display_summary         JSONB,
    doctor_viewed_at        TIMESTAMPTZ,
    data_erase_at           TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT pk_external_health_records PRIMARY KEY (iq_tenant_id, id)
);

CREATE INDEX idx_external_records_patient_time
    ON record_foundation.external_health_records (iq_tenant_id, patient_id, received_at);
CREATE INDEX idx_external_records_consent
    ON record_foundation.external_health_records (iq_tenant_id, consent_artifact_id);
CREATE INDEX idx_external_records_erase_due
    ON record_foundation.external_health_records (data_erase_at) WHERE data_erase_at IS NOT NULL;

SELECT create_distributed_table('record_foundation.external_health_records', 'iq_tenant_id');

-- ─── timeline_index ──────────────────────────────────────────────────────────

CREATE TABLE record_foundation.timeline_index (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    iq_tenant_id        UUID        NOT NULL,
    patient_id          UUID        NOT NULL,
    care_context_id     UUID        NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL,
    kind                TEXT        NOT NULL,
    title               TEXT        NOT NULL,
    subtitle            TEXT,
    origin_label        TEXT        NOT NULL,
    consent_disclosable BOOLEAN     NOT NULL DEFAULT false,
    sensitivity_labels  TEXT[],
    rebuilt_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT pk_timeline_index PRIMARY KEY (iq_tenant_id, id),
    CONSTRAINT uq_timeline_context UNIQUE (iq_tenant_id, care_context_id)
);

CREATE INDEX idx_timeline_patient_time
    ON record_foundation.timeline_index (iq_tenant_id, patient_id, occurred_at);
CREATE INDEX idx_timeline_disclosable
    ON record_foundation.timeline_index (iq_tenant_id, patient_id, consent_disclosable);

SELECT create_distributed_table('record_foundation.timeline_index', 'iq_tenant_id');

-- ─── erasure_log ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS record_foundation.erasure_log_id_seq;

CREATE TABLE record_foundation.erasure_log (
    id                  BIGINT      NOT NULL DEFAULT nextval('record_foundation.erasure_log_id_seq'),
    iq_tenant_id        UUID        NOT NULL,
    erased_entity_kind  TEXT        NOT NULL,
    erased_entity_id    UUID        NOT NULL,
    consent_artifact_id UUID,
    patient_id          UUID        NOT NULL,
    original_size_bytes INTEGER,
    original_hash       TEXT,
    data_erase_at       TIMESTAMPTZ NOT NULL,
    erased_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    erasure_actor       TEXT        NOT NULL DEFAULT 'scheduler',
    reason              TEXT        NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT pk_erasure_log PRIMARY KEY (iq_tenant_id, id),
    CONSTRAINT chk_erasure_entity_kind
        CHECK (erased_entity_kind IN ('external_health_record','bundle_storage','care_context')),
    CONSTRAINT chk_erasure_reason
        CHECK (reason IN ('consent_expired','consent_revoked','manual_purge','retention_policy'))
);

CREATE INDEX idx_erasure_log_patient
    ON record_foundation.erasure_log (iq_tenant_id, patient_id, erased_at);
CREATE INDEX idx_erasure_log_consent
    ON record_foundation.erasure_log (iq_tenant_id, consent_artifact_id);

SELECT create_distributed_table('record_foundation.erasure_log', 'iq_tenant_id');
