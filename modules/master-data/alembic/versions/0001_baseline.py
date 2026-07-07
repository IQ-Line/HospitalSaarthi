"""Squash the Master Data Alembic chain into a single baseline.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-07-07

Reproduces the EXACT final state of the former 54-file chain (previous head
``049_inventory_authorization_catalog``):

* full ``master_global`` + ``master_tenant`` schema (38 tables, constraints,
  indexes) with the same server defaults and physical column order the chain
  produced, so ``pg_dump --schema-only`` is byte-identical;
* Citus reference-table registration for the 11 catalog tables that the chain
  registered (guarded so plain PostgreSQL / test DBs skip it);
* the migration-owned catalog reference data: ``modules`` (48), ``permissions``
  (73), ``module_permissions`` (227), ``picklist`` (8), ``picklist_values`` (33).

Seeded primary keys are derived deterministically from natural keys via
``uuid5`` -- no hardcoded PKs (the collision hazard that motivated the squash).
Foreign keys between seeded rows are resolved through the same derivation, so
no lookups are needed.

Runtime data owned by ``pnpm seed`` (User-Management capability sync,
Configurator tenant bootstrap) is intentionally NOT reproduced here -- the
baseline owns SCHEMA + the catalog reference data the migrations owned.
"""

from __future__ import annotations

import json
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_baseline"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Citus reference tables the former chain registered (order: parents before the
# tables whose foreign keys reference them). Registration happens AFTER tables +
# primary keys/indexes but BEFORE foreign keys are added -- matching the original
# per-migration timing, which keeps CHECK-constraint deparse identical to the
# reference DB (Citus re-deparses constraints on FK-chained metadata add).
_REF_TABLES: tuple[str, ...] = (
    "master_global.modules",
    "master_global.permissions",
    "master_global.system_roles",
    "master_global.departments",
    "master_global.picklist",
    "master_global.module_permissions",
    "master_global.picklist_values",
    "master_tenant.modules",
    "master_tenant.permissions",
    "master_tenant.system_roles",
    "master_tenant.module_permissions",
)

# Deterministic namespace for natural-key-derived seed PKs (uuid5).
_NS = uuid.UUID("0d442472-bf0a-5026-b2ee-4c8ab6671c9d")


def _uid(kind: str, natural_key: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"{kind}:{natural_key}")


# --- Schema DDL captured from the former chain's final state (faithful) --------
# Buckets applied in order: CREATE TABLE -> primary keys/unique constraints ->
# indexes -> (reference-table registration) -> foreign keys.
_DDL = json.loads(
    r"""{
"tables": [
"CREATE TABLE master_global.allergens (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    allergen_type character varying(32) NOT NULL,\n    drug_class character varying(256),\n    reaction_severity_default character varying(32) NOT NULL,\n    snomed_code character varying(64),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.allergy_reactions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    display_name character varying(256) NOT NULL,\n    code character varying(64) NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    short_name character varying(120),\n    snomed_code character varying(64),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.chief_complaints (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    body_system character varying(64) NOT NULL,\n    triage_priority character varying(32) NOT NULL,\n    synonyms jsonb DEFAULT '[]'::jsonb NOT NULL,\n    is_paediatric_relevant boolean DEFAULT false NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    snomed_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    short_name character varying(120),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.chronic_illnesses (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    display_name character varying(512) NOT NULL,\n    icd10_code character varying(16) NOT NULL,\n    category character varying(64) NOT NULL,\n    snomed_code character varying(64),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    chronic_illness_prompt boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.departments (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    name character varying(200) NOT NULL,\n    code character varying(64) NOT NULL,\n    type character varying(32) NOT NULL,\n    description text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    CONSTRAINT departments_type_check CHECK ((type IN ('clinical', 'diagnostic', 'administrative', 'support')))\n);",
"CREATE TABLE master_global.diagnoses (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    icd10_code character varying(16),\n    icd_version character varying(32),\n    official_descriptor character varying(512),\n    display_name character varying(512) NOT NULL,\n    category character varying(64),\n    is_chronic_flag boolean DEFAULT false NOT NULL,\n    is_notifiable boolean DEFAULT false NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    snomed_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    code character varying(64) NOT NULL,\n    short_name character varying(120),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.manufacturers (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    code character varying(64) NOT NULL,\n    short_name character varying(120),\n    display_name character varying(512) NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.medicines (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(512) NOT NULL,\n    generic_name character varying(512) NOT NULL,\n    short_name character varying(256),\n    brand_names jsonb DEFAULT '[]'::jsonb NOT NULL,\n    drug_class character varying(256) NOT NULL,\n    drug_subclass character varying(256),\n    dosage_form character varying(128) NOT NULL,\n    route_of_admin jsonb DEFAULT '[]'::jsonb NOT NULL,\n    strength_value double precision,\n    strength_unit character varying(32),\n    strength_display character varying(256) DEFAULT ''::character varying NOT NULL,\n    concentration_value double precision,\n    concentration_unit character varying(32),\n    volume_per_unit double precision,\n    sku_code character varying(64),\n    barcode character varying(64),\n    pack_size integer,\n    pack_unit character varying(32),\n    manufacturer character varying(256),\n    storage_condition character varying(64),\n    expiry_tracking boolean DEFAULT false NOT NULL,\n    is_dispensable boolean DEFAULT true NOT NULL,\n    schedule character varying(16) NOT NULL,\n    is_controlled_substance boolean DEFAULT false NOT NULL,\n    is_narcotic boolean DEFAULT false NOT NULL,\n    requires_prescription boolean DEFAULT false NOT NULL,\n    is_restricted_antibiotic boolean DEFAULT false NOT NULL,\n    allergen_classes jsonb DEFAULT '[]'::jsonb NOT NULL,\n    contraindications jsonb DEFAULT '[]'::jsonb NOT NULL,\n    search_tags jsonb DEFAULT '[]'::jsonb NOT NULL,\n    atc_code character varying(32),\n    rxnorm_code character varying(32),\n    snomed_substance_code character varying(64),\n    snomed_product_code character varying(64),\n    pregnancy_category character varying(8),\n    lactation_safety character varying(32),\n    pediatric_use character varying(32),\n    max_dose_per_day_value double precision,\n    max_dose_per_day_unit character varying(32),\n    black_box_warning boolean DEFAULT false NOT NULL,\n    black_box_warning_text character varying(2048),\n    default_dose_value double precision,\n    default_dose_unit character varying(32),\n    default_frequency character varying(64),\n    default_duration_days integer,\n    default_route character varying(64),\n    default_instructions character varying(1024),\n    typical_quantity double precision,\n    notes character varying(2048),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    price double precision\n);",
"CREATE TABLE master_global.module_permissions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    slug text NOT NULL,\n    module_id uuid NOT NULL,\n    permission_id uuid NOT NULL,\n    is_default boolean DEFAULT false NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE master_global.modules (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    name character varying(100) NOT NULL,\n    category character varying(32) NOT NULL,\n    version character varying(32) NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    parent_id uuid,\n    slug text NOT NULL,\n    description text,\n    level integer DEFAULT 1 NOT NULL,\n    icon text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    module_kind character varying(16) DEFAULT 'product'::character varying NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    visibility_scope character varying(16) DEFAULT 'tenant'::character varying NOT NULL,\n    CONSTRAINT modules_category_check CHECK ((category IN ('core', 'clinical', 'administrative', 'support'))),\n    CONSTRAINT modules_level_check CHECK (((level >= 1) AND (level <= 10))),\n    CONSTRAINT modules_module_kind_check CHECK ((module_kind IN ('platform', 'foundation', 'product'))),\n    CONSTRAINT modules_visibility_scope_check CHECK ((visibility_scope IN ('superadmin', 'tenant')))\n);",
"CREATE TABLE master_global.permissions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    name text NOT NULL,\n    slug text NOT NULL,\n    action character varying(16) NOT NULL,\n    description text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    CONSTRAINT permissions_action_check CHECK ((action IN ('create', 'read', 'update', 'delete', 'manage')))\n);",
"CREATE TABLE master_global.picklist (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    name text NOT NULL,\n    slug text NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE master_global.picklist_values (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    category_id uuid NOT NULL,\n    value text NOT NULL,\n    label text NOT NULL,\n    description text,\n    metadata jsonb,\n    is_active boolean DEFAULT true NOT NULL,\n    is_global boolean DEFAULT false NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE master_global.procedures (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    cpt_code character varying(16) NOT NULL,\n    official_descriptor character varying(512) NOT NULL,\n    display_name character varying(512) NOT NULL,\n    category character varying(64) NOT NULL,\n    billing_category character varying(64) NOT NULL,\n    duration_minutes integer DEFAULT 0 NOT NULL,\n    requires_consent boolean DEFAULT false NOT NULL,\n    type_modality character varying(128),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    snomed_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    short_name character varying(64),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.rx_columns (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    section character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    code character varying(64) NOT NULL,\n    extra_unit character varying(128),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.system_roles (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    name text NOT NULL,\n    slug text NOT NULL,\n    is_template boolean DEFAULT true NOT NULL,\n    description text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE master_global.unit_conversions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    from_unit_code character varying(64) NOT NULL,\n    to_unit_code character varying(64) NOT NULL,\n    factor double precision NOT NULL,\n    offset_value double precision DEFAULT 0 NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.units (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    dimension character varying(32) NOT NULL,\n    ucum_code character varying(64),\n    is_canonical boolean DEFAULT false NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.vaccines (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    code character varying(64) NOT NULL,\n    short_name character varying(120),\n    display_name character varying(512) NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_global.vitals (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    code character varying(64) NOT NULL,\n    name character varying(256) NOT NULL,\n    short_name character varying(64) NOT NULL,\n    category character varying(32) NOT NULL,\n    data_type character varying(32) NOT NULL,\n    unit character varying(128) NOT NULL,\n    default_unit_code character varying(64) NOT NULL,\n    allowed_units jsonb DEFAULT '[]'::jsonb NOT NULL,\n    critical_low double precision,\n    critical_high double precision,\n    reference_kind character varying(64) NOT NULL,\n    reference_json jsonb DEFAULT '{}'::jsonb NOT NULL,\n    normal_range_adult jsonb DEFAULT '{}'::jsonb NOT NULL,\n    normal_range_paediatric jsonb DEFAULT '{}'::jsonb NOT NULL,\n    input_method character varying(32) NOT NULL,\n    is_paired boolean DEFAULT false NOT NULL,\n    pair_code character varying(64),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    loinc_code character varying(32),\n    snomed_observable_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.allergens (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    allergen_type character varying(32) NOT NULL,\n    drug_class character varying(256),\n    reaction_severity_default character varying(32) NOT NULL,\n    snomed_code character varying(64),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.allergy_reactions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    display_name character varying(256) NOT NULL,\n    code character varying(64) NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    short_name character varying(120),\n    snomed_code character varying(64),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.chief_complaints (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    body_system character varying(64) NOT NULL,\n    triage_priority character varying(32) NOT NULL,\n    synonyms jsonb DEFAULT '[]'::jsonb NOT NULL,\n    is_paediatric_relevant boolean DEFAULT false NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    snomed_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    short_name character varying(120),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.chronic_illnesses (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    display_name character varying(512) NOT NULL,\n    icd10_code character varying(16) NOT NULL,\n    category character varying(64) NOT NULL,\n    snomed_code character varying(64),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    chronic_illness_prompt boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.departments (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    name character varying(200) NOT NULL,\n    code character varying(64) NOT NULL,\n    type character varying(32) NOT NULL,\n    description text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    CONSTRAINT tm_departments_type_check CHECK ((type IN ('clinical', 'diagnostic', 'administrative', 'support')))\n);",
"CREATE TABLE master_tenant.diagnoses (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    icd10_code character varying(16),\n    icd_version character varying(32),\n    official_descriptor character varying(512),\n    display_name character varying(512) NOT NULL,\n    category character varying(64),\n    is_chronic_flag boolean DEFAULT false NOT NULL,\n    is_notifiable boolean DEFAULT false NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    snomed_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    code character varying(64) NOT NULL,\n    short_name character varying(120),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.manufacturers (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    code character varying(64) NOT NULL,\n    short_name character varying(120),\n    display_name character varying(512) NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.medicines (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(512) NOT NULL,\n    generic_name character varying(512) NOT NULL,\n    short_name character varying(256),\n    brand_names jsonb DEFAULT '[]'::jsonb NOT NULL,\n    drug_class character varying(256) NOT NULL,\n    drug_subclass character varying(256),\n    dosage_form character varying(128) NOT NULL,\n    route_of_admin jsonb DEFAULT '[]'::jsonb NOT NULL,\n    strength_value double precision,\n    strength_unit character varying(32),\n    strength_display character varying(256) DEFAULT ''::character varying NOT NULL,\n    concentration_value double precision,\n    concentration_unit character varying(32),\n    volume_per_unit double precision,\n    sku_code character varying(64),\n    barcode character varying(64),\n    pack_size integer,\n    pack_unit character varying(32),\n    manufacturer character varying(256),\n    storage_condition character varying(64),\n    expiry_tracking boolean DEFAULT false NOT NULL,\n    is_dispensable boolean DEFAULT true NOT NULL,\n    schedule character varying(16) NOT NULL,\n    is_controlled_substance boolean DEFAULT false NOT NULL,\n    is_narcotic boolean DEFAULT false NOT NULL,\n    requires_prescription boolean DEFAULT false NOT NULL,\n    is_restricted_antibiotic boolean DEFAULT false NOT NULL,\n    allergen_classes jsonb DEFAULT '[]'::jsonb NOT NULL,\n    contraindications jsonb DEFAULT '[]'::jsonb NOT NULL,\n    search_tags jsonb DEFAULT '[]'::jsonb NOT NULL,\n    atc_code character varying(32),\n    rxnorm_code character varying(32),\n    snomed_substance_code character varying(64),\n    snomed_product_code character varying(64),\n    pregnancy_category character varying(8),\n    lactation_safety character varying(32),\n    pediatric_use character varying(32),\n    max_dose_per_day_value double precision,\n    max_dose_per_day_unit character varying(32),\n    black_box_warning boolean DEFAULT false NOT NULL,\n    black_box_warning_text character varying(2048),\n    default_dose_value double precision,\n    default_dose_unit character varying(32),\n    default_frequency character varying(64),\n    default_duration_days integer,\n    default_route character varying(64),\n    default_instructions character varying(1024),\n    typical_quantity double precision,\n    notes character varying(2048),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    price double precision\n);",
"CREATE TABLE master_tenant.module_permissions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    slug text NOT NULL,\n    module_id uuid NOT NULL,\n    permission_id uuid NOT NULL,\n    is_default boolean DEFAULT false NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE master_tenant.modules (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    parent_id uuid,\n    name character varying(100) NOT NULL,\n    slug text NOT NULL,\n    description text,\n    category character varying(32) NOT NULL,\n    version character varying(32) NOT NULL,\n    level integer DEFAULT 1 NOT NULL,\n    icon text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    module_kind character varying(16) DEFAULT 'product'::character varying NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    visibility_scope character varying(16) DEFAULT 'tenant'::character varying NOT NULL,\n    CONSTRAINT tm_modules_category_check CHECK ((category IN ('core', 'clinical', 'administrative', 'support'))),\n    CONSTRAINT tm_modules_level_check CHECK (((level >= 1) AND (level <= 10))),\n    CONSTRAINT tm_modules_module_kind_check CHECK ((module_kind IN ('platform', 'foundation', 'product'))),\n    CONSTRAINT tm_modules_visibility_scope_check CHECK ((visibility_scope IN ('superadmin', 'tenant')))\n);",
"CREATE TABLE master_tenant.permissions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    name text NOT NULL,\n    slug text NOT NULL,\n    action character varying(16) NOT NULL,\n    description text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    CONSTRAINT tm_permissions_action_check CHECK (((action)::text = ANY (ARRAY[('create'::character varying)::text, ('read'::character varying)::text, ('update'::character varying)::text, ('delete'::character varying)::text, ('manage'::character varying)::text])))\n);",
"CREATE TABLE master_tenant.procedures (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    cpt_code character varying(16) NOT NULL,\n    official_descriptor character varying(512) NOT NULL,\n    display_name character varying(512) NOT NULL,\n    category character varying(64) NOT NULL,\n    billing_category character varying(64) NOT NULL,\n    duration_minutes integer DEFAULT 0 NOT NULL,\n    requires_consent boolean DEFAULT false NOT NULL,\n    type_modality character varying(128),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    snomed_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    short_name character varying(64),\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.rx_columns (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    section character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    code character varying(64) NOT NULL,\n    extra_unit character varying(128),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.system_roles (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    name text NOT NULL,\n    slug text NOT NULL,\n    is_template boolean DEFAULT true NOT NULL,\n    description text,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE master_tenant.unit_conversions (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    from_unit_code character varying(64) NOT NULL,\n    to_unit_code character varying(64) NOT NULL,\n    factor double precision NOT NULL,\n    offset_value double precision DEFAULT 0 NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.units (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    code character varying(64) NOT NULL,\n    display_name character varying(256) NOT NULL,\n    dimension character varying(32) NOT NULL,\n    ucum_code character varying(64),\n    is_canonical boolean DEFAULT false NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.vaccines (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    code character varying(64) NOT NULL,\n    short_name character varying(120),\n    display_name character varying(512) NOT NULL,\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE master_tenant.vitals (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    code character varying(64) NOT NULL,\n    name character varying(256) NOT NULL,\n    short_name character varying(64) NOT NULL,\n    category character varying(32) NOT NULL,\n    data_type character varying(32) NOT NULL,\n    unit character varying(128) NOT NULL,\n    default_unit_code character varying(64) NOT NULL,\n    allowed_units jsonb DEFAULT '[]'::jsonb NOT NULL,\n    critical_low double precision,\n    critical_high double precision,\n    reference_kind character varying(64) NOT NULL,\n    reference_json jsonb DEFAULT '{}'::jsonb NOT NULL,\n    normal_range_adult jsonb DEFAULT '{}'::jsonb NOT NULL,\n    normal_range_paediatric jsonb DEFAULT '{}'::jsonb NOT NULL,\n    input_method character varying(32) NOT NULL,\n    is_paired boolean DEFAULT false NOT NULL,\n    pair_code character varying(64),\n    display_order integer DEFAULT 0 NOT NULL,\n    is_active boolean DEFAULT true NOT NULL,\n    is_deleted boolean DEFAULT false NOT NULL,\n    loinc_code character varying(32),\n    snomed_observable_code character varying(64),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);"
],
"pk_uc": [
"ALTER TABLE ONLY master_global.allergens\n    ADD CONSTRAINT allergens_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.allergy_reactions\n    ADD CONSTRAINT allergy_reactions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.chief_complaints\n    ADD CONSTRAINT chief_complaints_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.chronic_illnesses\n    ADD CONSTRAINT chronic_illnesses_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.departments\n    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.diagnoses\n    ADD CONSTRAINT diagnoses_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.manufacturers\n    ADD CONSTRAINT manufacturers_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.medicines\n    ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.module_permissions\n    ADD CONSTRAINT module_permissions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.modules\n    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.permissions\n    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.picklist\n    ADD CONSTRAINT picklist_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.picklist_values\n    ADD CONSTRAINT picklist_values_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.procedures\n    ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.rx_columns\n    ADD CONSTRAINT rx_columns_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.system_roles\n    ADD CONSTRAINT system_roles_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.unit_conversions\n    ADD CONSTRAINT unit_conversions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.units\n    ADD CONSTRAINT units_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.vaccines\n    ADD CONSTRAINT vaccines_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_global.vitals\n    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.allergens\n    ADD CONSTRAINT allergens_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.allergy_reactions\n    ADD CONSTRAINT allergy_reactions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.chief_complaints\n    ADD CONSTRAINT chief_complaints_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.chronic_illnesses\n    ADD CONSTRAINT chronic_illnesses_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.departments\n    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.diagnoses\n    ADD CONSTRAINT diagnoses_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.manufacturers\n    ADD CONSTRAINT manufacturers_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.medicines\n    ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.module_permissions\n    ADD CONSTRAINT module_permissions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.modules\n    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.permissions\n    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.procedures\n    ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.rx_columns\n    ADD CONSTRAINT rx_columns_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.system_roles\n    ADD CONSTRAINT system_roles_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.unit_conversions\n    ADD CONSTRAINT unit_conversions_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.units\n    ADD CONSTRAINT units_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.vaccines\n    ADD CONSTRAINT vaccines_pkey PRIMARY KEY (id);",
"ALTER TABLE ONLY master_tenant.vitals\n    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);"
],
"idx": [
"CREATE UNIQUE INDEX allergens_global_code_active_key ON master_global.allergens USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX allergy_reactions_global_code_active_key ON master_global.allergy_reactions USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX chief_complaints_global_code_active_key ON master_global.chief_complaints USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX chronic_illnesses_global_icd_active_key ON master_global.chronic_illnesses USING btree (icd10_code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX departments_code_active_key ON master_global.departments USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX diagnoses_global_code_active_key ON master_global.diagnoses USING btree (code) WHERE (NOT is_deleted);",
"CREATE INDEX idx_departments_is_deleted ON master_global.departments USING btree (is_deleted);",
"CREATE INDEX idx_departments_type ON master_global.departments USING btree (type);",
"CREATE INDEX idx_module_permissions_module ON master_global.module_permissions USING btree (module_id);",
"CREATE INDEX idx_module_permissions_permission ON master_global.module_permissions USING btree (permission_id);",
"CREATE INDEX idx_modules_category ON master_global.modules USING btree (category);",
"CREATE INDEX idx_modules_is_deleted ON master_global.modules USING btree (is_deleted);",
"CREATE INDEX idx_modules_parent ON master_global.modules USING btree (parent_id);",
"CREATE INDEX idx_picklist_values_category ON master_global.picklist_values USING btree (category_id);",
"CREATE INDEX idx_picklist_values_order ON master_global.picklist_values USING btree (category_id, display_order);",
"CREATE INDEX ix_visitpad_unit_conversions_order ON master_global.unit_conversions USING btree (display_order, from_unit_code);",
"CREATE INDEX ix_visitpad_units_display_order ON master_global.units USING btree (display_order, code);",
"CREATE UNIQUE INDEX manufacturers_global_code_active_key ON master_global.manufacturers USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX medicines_global_code_active_key ON master_global.medicines USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX module_permissions_module_permission_active_key ON master_global.module_permissions USING btree (module_id, permission_id) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX module_permissions_slug_active_key ON master_global.module_permissions USING btree (slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX modules_name_active_key ON master_global.modules USING btree (name) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX modules_slug_active_key ON master_global.modules USING btree (slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX permissions_slug_active_key ON master_global.permissions USING btree (slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX picklist_slug_active_key ON master_global.picklist USING btree (slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX procedures_global_cpt_active_key ON master_global.procedures USING btree (cpt_code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX rx_columns_global_section_code_active_key ON master_global.rx_columns USING btree (section, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX system_roles_slug_active_key ON master_global.system_roles USING btree (slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX unit_conversions_global_from_to_active_key ON master_global.unit_conversions USING btree (from_unit_code, to_unit_code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX units_global_code_active_key ON master_global.units USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX uq_picklist_values_category_value ON master_global.picklist_values USING btree (category_id, value);",
"CREATE UNIQUE INDEX vaccines_global_code_active_key ON master_global.vaccines USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX vitals_global_code_active_key ON master_global.vitals USING btree (code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX allergens_tenant_id_code_idx ON master_tenant.allergens USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX allergy_reactions_tenant_id_code_idx ON master_tenant.allergy_reactions USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX chief_complaints_tenant_id_code_idx ON master_tenant.chief_complaints USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX chronic_illnesses_tenant_id_icd10_code_idx ON master_tenant.chronic_illnesses USING btree (iq_tenant_id, icd10_code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX diagnoses_tenant_code_active_key ON master_tenant.diagnoses USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX diagnoses_tenant_id_icd10_code_icd_version_idx ON master_tenant.diagnoses USING btree (iq_tenant_id, icd10_code, icd_version) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX manufacturers_tenant_code_active_key ON master_tenant.manufacturers USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX medicines_tenant_id_code_idx ON master_tenant.medicines USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX procedures_tenant_id_cpt_code_idx ON master_tenant.procedures USING btree (iq_tenant_id, cpt_code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX rx_columns_tenant_id_section_code_idx ON master_tenant.rx_columns USING btree (iq_tenant_id, section, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX tm_departments_code_active_key ON master_tenant.departments USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE INDEX tm_idx_departments_iq_tenant_id ON master_tenant.departments USING btree (iq_tenant_id);",
"CREATE INDEX tm_idx_departments_is_deleted ON master_tenant.departments USING btree (is_deleted);",
"CREATE INDEX tm_idx_departments_type ON master_tenant.departments USING btree (type);",
"CREATE INDEX tm_idx_module_permissions_module ON master_tenant.module_permissions USING btree (module_id);",
"CREATE INDEX tm_idx_module_permissions_permission ON master_tenant.module_permissions USING btree (permission_id);",
"CREATE INDEX tm_idx_modules_category ON master_tenant.modules USING btree (category);",
"CREATE INDEX tm_idx_modules_is_deleted ON master_tenant.modules USING btree (is_deleted);",
"CREATE INDEX tm_idx_modules_parent ON master_tenant.modules USING btree (parent_id);",
"CREATE UNIQUE INDEX tm_module_permissions_module_permission_active_key ON master_tenant.module_permissions USING btree (iq_tenant_id, module_id, permission_id) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX tm_module_permissions_slug_active_key ON master_tenant.module_permissions USING btree (iq_tenant_id, slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX tm_modules_name_active_key ON master_tenant.modules USING btree (iq_tenant_id, name) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX tm_modules_slug_active_key ON master_tenant.modules USING btree (iq_tenant_id, slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX tm_permissions_slug_active_key ON master_tenant.permissions USING btree (iq_tenant_id, slug) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX tm_system_roles_slug_active_key ON master_tenant.system_roles USING btree (iq_tenant_id, slug) WHERE (NOT is_deleted);",
"CREATE INDEX unit_conversions_tenant_id_display_order_from_unit_code_idx ON master_tenant.unit_conversions USING btree (iq_tenant_id, display_order, from_unit_code);",
"CREATE UNIQUE INDEX unit_conversions_tenant_id_from_unit_code_to_unit_code_idx ON master_tenant.unit_conversions USING btree (iq_tenant_id, from_unit_code, to_unit_code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX units_tenant_id_code_idx ON master_tenant.units USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE INDEX units_tenant_id_display_order_code_idx ON master_tenant.units USING btree (iq_tenant_id, display_order, code);",
"CREATE UNIQUE INDEX vaccines_tenant_code_active_key ON master_tenant.vaccines USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);",
"CREATE UNIQUE INDEX vitals_tenant_id_code_idx ON master_tenant.vitals USING btree (iq_tenant_id, code) WHERE (NOT is_deleted);"
],
"fk": [
"ALTER TABLE ONLY master_global.module_permissions\n    ADD CONSTRAINT module_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES master_global.modules(id) ON DELETE RESTRICT;",
"ALTER TABLE ONLY master_global.module_permissions\n    ADD CONSTRAINT module_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES master_global.permissions(id) ON DELETE RESTRICT;",
"ALTER TABLE ONLY master_global.modules\n    ADD CONSTRAINT modules_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES master_global.modules(id) ON DELETE RESTRICT;",
"ALTER TABLE ONLY master_global.picklist_values\n    ADD CONSTRAINT picklist_values_category_id_fkey FOREIGN KEY (category_id) REFERENCES master_global.picklist(id) ON DELETE RESTRICT;",
"ALTER TABLE ONLY master_tenant.module_permissions\n    ADD CONSTRAINT tm_module_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES master_tenant.modules(id) ON DELETE RESTRICT;",
"ALTER TABLE ONLY master_tenant.module_permissions\n    ADD CONSTRAINT tm_module_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES master_tenant.permissions(id) ON DELETE RESTRICT;",
"ALTER TABLE ONLY master_tenant.modules\n    ADD CONSTRAINT tm_modules_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES master_tenant.modules(id) ON DELETE RESTRICT;"
]
}"""
)

# --- Catalog reference data (natural keys; FKs resolved via _uid) --------------
_SEED = json.loads(
    r"""{
"modules": [
{
"name": "Billing & Finance",
"slug": "billing-and-finance",
"description": "Tariff master, chargeable services, and billing configuration.",
"category": "core",
"version": "1.0.0",
"level": 1,
"module_kind": "product",
"display_order": 120,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "Onboarding",
"slug": "configurator",
"description": "Tenant configuration and module enablement.",
"category": "core",
"version": "1.0.0",
"level": 1,
"module_kind": "platform",
"display_order": 10,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "EMPI",
"slug": "empi",
"description": "Enterprise master patient index.",
"category": "core",
"version": "1.0.0",
"level": 1,
"module_kind": "foundation",
"display_order": 20,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "Frontdesk",
"slug": "frontdesk",
"description": "Front desk registration and OPD workflows.",
"category": "clinical",
"version": "1.0.0",
"level": 1,
"module_kind": "product",
"display_order": 100,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "Inventory",
"slug": "inventory",
"description": "Operational inventory \u2014 stores, items, GRN, stock, indents, and transfers.",
"category": "administrative",
"version": "1.0.0",
"level": 1,
"module_kind": "product",
"display_order": 0,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "Master Data",
"slug": "master-data",
"description": "Platform catalog and reference data.",
"category": "core",
"version": "1.0.0",
"level": 1,
"module_kind": "platform",
"display_order": 30,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "opd",
"slug": "opd",
"description": "Outpatient department visits and patients.",
"category": "clinical",
"version": "1.0.0",
"level": 1,
"module_kind": "product",
"display_order": 110,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "Pharmacy",
"slug": "pharmacy",
"description": "Pharmacy counter \u2014 OPD dispense queue and manual billing.",
"category": "clinical",
"version": "1.0.0",
"level": 1,
"module_kind": "product",
"display_order": 0,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "User Management",
"slug": "user-management",
"description": "User and role administration.",
"category": "core",
"version": "1.0.0",
"level": 1,
"module_kind": "platform",
"display_order": 40,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": null
},
{
"name": "visitpad_templates",
"slug": "visitpad-templates",
"description": "Visitpad clinical templates (units, vitals, picklists).",
"category": "clinical",
"version": "1.0.0",
"level": 1,
"module_kind": "product",
"display_order": 0,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": true,
"parent_slug": null
},
{
"name": "Billing Account",
"slug": "billing-account",
"description": "Patient billing accounts and balances.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "product",
"display_order": 1202,
"visibility_scope": "tenant",
"icon": null,
"is_active": false,
"is_deleted": false,
"parent_slug": "billing-and-finance"
},
{
"name": "Departments",
"slug": "departments",
"description": "Hospital departments and organizational units.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 301,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "master-data"
},
{
"name": "Dispense",
"slug": "dispense",
"description": "Dispense orders, partial rounds, and counter billing.",
"category": "clinical",
"version": "1.0.0",
"level": 2,
"module_kind": "product",
"display_order": 0,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "pharmacy"
},
{
"name": "Invoice",
"slug": "invoice",
"description": "Patient invoices and billing documents.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "product",
"display_order": 1203,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "billing-and-finance"
},
{
"name": "Modules",
"slug": "modules",
"description": "Platform module registry.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 305,
"visibility_scope": "superadmin",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "master-data"
},
{
"name": "Organizations",
"slug": "organizations",
"description": "Hospital organizations and hierarchy.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 302,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "configurator"
},
{
"name": "Permissions",
"slug": "permissions",
"description": "Permission definitions catalog.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 306,
"visibility_scope": "superadmin",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "master-data"
},
{
"name": "Picklist",
"slug": "picklist",
"description": "Picklist domain headers.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 303,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "master-data"
},
{
"name": "Picklist Items",
"slug": "picklist-items",
"description": "Values for picklist domains.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 304,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "master-data"
},
{
"name": "Registration",
"slug": "registration",
"description": "Visit registration and front-desk intake.",
"category": "clinical",
"version": "1.0.0",
"level": 2,
"module_kind": "product",
"display_order": 1001,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "frontdesk"
},
{
"name": "Role Capabilities",
"slug": "role-capabilities",
"description": "Capabilities granted to roles.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 403,
"visibility_scope": "superadmin",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "user-management"
},
{
"name": "Tariff Master",
"slug": "tariff-master",
"description": "Chargeable services and tariff catalog.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "product",
"display_order": 1201,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "billing-and-finance"
},
{
"name": "Tenant Modules",
"slug": "tenant-modules",
"description": "Per-tenant module enablement.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 0,
"visibility_scope": "superadmin",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "configurator"
},
{
"name": "Tenants",
"slug": "tenants",
"description": "Tenant registry and lifecycle.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 0,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "configurator"
},
{
"name": "User Capabilities",
"slug": "user-capabilities",
"description": "Capabilities granted directly to users.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 404,
"visibility_scope": "superadmin",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "user-management"
},
{
"name": "User Roles",
"slug": "user-roles",
"description": "Roles assigned to users.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 402,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "user-management"
},
{
"name": "Users",
"slug": "users",
"description": "Tenant-scoped platform users.",
"category": "core",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 401,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "user-management"
},
{
"name": "Visitpad Master",
"slug": "visitpad-master",
"description": "Visitpad clinical reference catalogs.",
"category": "clinical",
"version": "1.0.0",
"level": 2,
"module_kind": "platform",
"display_order": 307,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "master-data"
},
{
"name": "Allergens",
"slug": "allergens",
"description": "Allergen definitions.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3007,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Reactions",
"slug": "allergy-reactions",
"description": "Allergy reaction catalog.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3011,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Chief Complaints",
"slug": "chief-complaints",
"description": "Chief complaint catalog.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 0,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Chronic Illnesses",
"slug": "chronic-illnesses",
"description": "Chronic illness catalog.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3010,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Diagnoses",
"slug": "diagnoses",
"description": "Diagnosis / ICD catalog.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3004,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Manufacturers",
"slug": "manufacturers",
"description": "Vaccine / medicine manufacturers.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3009,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Medicines",
"slug": "medicines",
"description": "Medicine catalog.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3005,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Procedures",
"slug": "procedures",
"description": "Procedure catalog.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3008,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Rx Columns",
"slug": "rxcolumns",
"description": "Prescription column templates (frequency, route, etc.).",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 0,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Unit conversions",
"slug": "unit-conversions",
"description": "Measurement unit conversion rules.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3002,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Units",
"slug": "units",
"description": "Measurement units and unit conversions.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3001,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Vaccines",
"slug": "vaccines",
"description": "Vaccine catalog.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3006,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Vitals",
"slug": "vitals",
"description": "Vital sign definitions.",
"category": "clinical",
"version": "1.0.0",
"level": 3,
"module_kind": "platform",
"display_order": 3003,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "visitpad-master"
},
{
"name": "Diet Type",
"slug": "diet-type",
"description": "Rx column section: diet type.",
"category": "clinical",
"version": "1.0.0",
"level": 4,
"module_kind": "platform",
"display_order": 3105,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "rxcolumns"
},
{
"name": "Frequency",
"slug": "frequency",
"description": "Rx column section: frequency.",
"category": "clinical",
"version": "1.0.0",
"level": 4,
"module_kind": "platform",
"display_order": 3101,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "rxcolumns"
},
{
"name": "Medication Type",
"slug": "medication-type",
"description": "Rx column section: medication type.",
"category": "clinical",
"version": "1.0.0",
"level": 4,
"module_kind": "platform",
"display_order": 3104,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "rxcolumns"
},
{
"name": "Method Strength",
"slug": "method-strength",
"description": "Rx column section: method / strength.",
"category": "clinical",
"version": "1.0.0",
"level": 4,
"module_kind": "platform",
"display_order": 3106,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "rxcolumns"
},
{
"name": "Route",
"slug": "route",
"description": "Rx column section: route.",
"category": "clinical",
"version": "1.0.0",
"level": 4,
"module_kind": "platform",
"display_order": 3102,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "rxcolumns"
},
{
"name": "Time Of Administration",
"slug": "time-of-administration",
"description": "Rx column section: time of administration.",
"category": "clinical",
"version": "1.0.0",
"level": 4,
"module_kind": "platform",
"display_order": 3107,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "rxcolumns"
},
{
"name": "Unit",
"slug": "unit",
"description": "Rx column section: unit.",
"category": "clinical",
"version": "1.0.0",
"level": 4,
"module_kind": "platform",
"display_order": 3103,
"visibility_scope": "tenant",
"icon": null,
"is_active": true,
"is_deleted": false,
"parent_slug": "rxcolumns"
}
],
"permissions": [
{
"name": "Create branding",
"slug": "configurator.branding.create",
"action": "create",
"description": "Configurator authorization catalog (configurator.branding.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create organization",
"slug": "configurator.organization.create",
"action": "create",
"description": "Configurator authorization catalog (configurator.organization.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read organization",
"slug": "configurator.organization.read",
"action": "read",
"description": "Configurator authorization catalog (configurator.organization.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update organization",
"slug": "configurator.organization.update",
"action": "update",
"description": "Configurator authorization catalog (configurator.organization.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read sequence configuration",
"slug": "configurator.sequence.configuration.read",
"action": "read",
"description": "Configurator authorization catalog (configurator.sequence.configuration.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update sequence configuration",
"slug": "configurator.sequence.configuration.update",
"action": "update",
"description": "Configurator authorization catalog (configurator.sequence.configuration.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create tenant api key",
"slug": "configurator.tenant.api.key.create",
"action": "create",
"description": "Configurator authorization catalog (configurator.tenant.api.key.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read tenant api key",
"slug": "configurator.tenant.api.key.read",
"action": "read",
"description": "Configurator authorization catalog (configurator.tenant.api.key.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update tenant api key",
"slug": "configurator.tenant.api.key.update",
"action": "update",
"description": "Configurator authorization catalog (configurator.tenant.api.key.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create tenant",
"slug": "configurator.tenant.create",
"action": "create",
"description": "Configurator authorization catalog (configurator.tenant.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create tenant integration profile",
"slug": "configurator.tenant.integration.profile.create",
"action": "create",
"description": "Configurator authorization catalog (configurator.tenant.integration.profile.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete tenant integration profile",
"slug": "configurator.tenant.integration.profile.delete",
"action": "delete",
"description": "Configurator authorization catalog (configurator.tenant.integration.profile.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read tenant integration profile",
"slug": "configurator.tenant.integration.profile.read",
"action": "read",
"description": "Configurator authorization catalog (configurator.tenant.integration.profile.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update tenant integration profile",
"slug": "configurator.tenant.integration.profile.update",
"action": "update",
"description": "Configurator authorization catalog (configurator.tenant.integration.profile.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create tenant module",
"slug": "configurator.tenant.module.create",
"action": "create",
"description": "Configurator authorization catalog (configurator.tenant.module.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete tenant module",
"slug": "configurator.tenant.module.delete",
"action": "delete",
"description": "Configurator authorization catalog (configurator.tenant.module.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read tenant module",
"slug": "configurator.tenant.module.read",
"action": "read",
"description": "Configurator authorization catalog (configurator.tenant.module.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update tenant module",
"slug": "configurator.tenant.module.update",
"action": "update",
"description": "Configurator authorization catalog (configurator.tenant.module.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create tenant onboarding",
"slug": "configurator.tenant.onboarding.create",
"action": "create",
"description": "Configurator authorization catalog (configurator.tenant.onboarding.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update tenant",
"slug": "configurator.tenant.update",
"action": "update",
"description": "Configurator authorization catalog (configurator.tenant.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create",
"slug": "create",
"action": "create",
"description": "Create Master Data platform catalog rows.",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete",
"slug": "delete",
"action": "delete",
"description": "Soft-delete Master Data platform catalog rows.",
"is_active": true,
"is_deleted": false
},
{
"name": "Edit",
"slug": "edit",
"action": "update",
"description": "Update Master Data platform catalog rows.",
"is_active": true,
"is_deleted": false
},
{
"name": "Register patient",
"slug": "empi.patient.create",
"action": "create",
"description": "Platform demo authorization catalog (empi.patient.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Remove patient identifier",
"slug": "empi.patient.delete",
"action": "delete",
"description": "EMPI authorization catalog (empi.patient.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read patient",
"slug": "empi.patient.read",
"action": "read",
"description": "Platform demo authorization catalog (empi.patient.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update patient",
"slug": "empi.patient.update",
"action": "update",
"description": "EMPI authorization catalog (empi.patient.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create inventory GRN",
"slug": "inventory.grn.create",
"action": "create",
"description": "Inventory authorization catalog (inventory.grn.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read inventory GRN",
"slug": "inventory.grn.read",
"action": "read",
"description": "Inventory authorization catalog (inventory.grn.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update inventory GRN",
"slug": "inventory.grn.update",
"action": "update",
"description": "Inventory authorization catalog (inventory.grn.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create inventory indent",
"slug": "inventory.indent.create",
"action": "create",
"description": "Inventory authorization catalog (inventory.indent.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read inventory indent",
"slug": "inventory.indent.read",
"action": "read",
"description": "Inventory authorization catalog (inventory.indent.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update inventory indent",
"slug": "inventory.indent.update",
"action": "update",
"description": "Inventory authorization catalog (inventory.indent.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create inventory item",
"slug": "inventory.item.create",
"action": "create",
"description": "Inventory authorization catalog (inventory.item.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read inventory item",
"slug": "inventory.item.read",
"action": "read",
"description": "Inventory authorization catalog (inventory.item.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read inventory stock",
"slug": "inventory.stock.read",
"action": "read",
"description": "Inventory authorization catalog (inventory.stock.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create inventory store",
"slug": "inventory.store.create",
"action": "create",
"description": "Inventory authorization catalog (inventory.store.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read inventory store",
"slug": "inventory.store.read",
"action": "read",
"description": "Inventory authorization catalog (inventory.store.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update inventory store",
"slug": "inventory.store.update",
"action": "update",
"description": "Inventory authorization catalog (inventory.store.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create inventory transfer",
"slug": "inventory.transfer.create",
"action": "create",
"description": "Inventory authorization catalog (inventory.transfer.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read inventory transfer",
"slug": "inventory.transfer.read",
"action": "read",
"description": "Inventory authorization catalog (inventory.transfer.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create department",
"slug": "master-data.department.create",
"action": "create",
"description": "Master Data authorization catalog (master-data.department.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete department",
"slug": "master-data.department.delete",
"action": "delete",
"description": "Master Data authorization catalog (master-data.department.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update department",
"slug": "master-data.department.update",
"action": "update",
"description": "Master Data authorization catalog (master-data.department.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create module",
"slug": "master-data.module.create",
"action": "create",
"description": "Master Data authorization catalog (master-data.module.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete module",
"slug": "master-data.module.delete",
"action": "delete",
"description": "Master Data authorization catalog (master-data.module.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create module-permission",
"slug": "master-data.module.permission.create",
"action": "create",
"description": "Master Data authorization catalog (master-data.module.permission.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete module-permission",
"slug": "master-data.module.permission.delete",
"action": "delete",
"description": "Master Data authorization catalog (master-data.module.permission.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update module-permission",
"slug": "master-data.module.permission.update",
"action": "update",
"description": "Master Data authorization catalog (master-data.module.permission.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update module",
"slug": "master-data.module.update",
"action": "update",
"description": "Master Data authorization catalog (master-data.module.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create permission",
"slug": "master-data.permission.create",
"action": "create",
"description": "Master Data authorization catalog (master-data.permission.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete permission",
"slug": "master-data.permission.delete",
"action": "delete",
"description": "Master Data authorization catalog (master-data.permission.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update permission",
"slug": "master-data.permission.update",
"action": "update",
"description": "Master Data authorization catalog (master-data.permission.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create system role",
"slug": "master-data.system.role.create",
"action": "create",
"description": "Master Data authorization catalog (master-data.system.role.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete system role",
"slug": "master-data.system.role.delete",
"action": "delete",
"description": "Master Data authorization catalog (master-data.system.role.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update system role",
"slug": "master-data.system.role.update",
"action": "update",
"description": "Master Data authorization catalog (master-data.system.role.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Upload OPD health document",
"slug": "opd.health.document.create",
"action": "create",
"description": "OPD authorization catalog (opd.health.document.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read OPD health document",
"slug": "opd.health.document.read",
"action": "read",
"description": "OPD authorization catalog (opd.health.document.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read OPD patient",
"slug": "opd.patient.read",
"action": "read",
"description": "Platform demo authorization catalog (opd.patient.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create OPD prescription",
"slug": "opd.prescription.create",
"action": "create",
"description": "OPD authorization catalog (opd.prescription.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Delete OPD prescription",
"slug": "opd.prescription.delete",
"action": "delete",
"description": "OPD authorization catalog (opd.prescription.delete).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read OPD prescription",
"slug": "opd.prescription.read",
"action": "read",
"description": "OPD authorization catalog (opd.prescription.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Update OPD prescription",
"slug": "opd.prescription.update",
"action": "update",
"description": "OPD authorization catalog (opd.prescription.update).",
"is_active": true,
"is_deleted": false
},
{
"name": "Create OPD visit",
"slug": "opd.visit.create",
"action": "create",
"description": "Platform demo authorization catalog (opd.visit.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read OPD visit",
"slug": "opd.visit.read",
"action": "read",
"description": "Platform demo authorization catalog (opd.visit.read).",
"is_active": true,
"is_deleted": false
},
{
"name": "Read",
"slug": "read",
"action": "read",
"description": "Read Master Data platform catalog rows.",
"is_active": true,
"is_deleted": false
},
{
"name": "Assign role",
"slug": "role.assign",
"action": "manage",
"description": "Platform demo authorization catalog (role.assign).",
"is_active": true,
"is_deleted": false
},
{
"name": "Master Data shell",
"slug": "shell.access",
"action": "read",
"description": "Platform demo authorization catalog (shell.access).",
"is_active": true,
"is_deleted": false
},
{
"name": "Visitpad create",
"slug": "visitpad.create",
"action": "create",
"description": "Platform demo authorization catalog (visitpad.create).",
"is_active": true,
"is_deleted": false
},
{
"name": "Visitpad templates catalog manage",
"slug": "visitpad-templates-catalog-manage",
"action": "manage",
"description": "Full Visitpad template catalog (scope resolved by Cerbos / tenant context).",
"is_active": true,
"is_deleted": true
},
{
"name": "Visitpad catalog read",
"slug": "visitpad-templates-catalog-read",
"action": "read",
"description": "Read Visitpad template catalog.",
"is_active": true,
"is_deleted": true
},
{
"name": "Visitpad catalog write",
"slug": "visitpad-templates-catalog-write",
"action": "update",
"description": "Create or update Visitpad template catalog rows.",
"is_active": true,
"is_deleted": true
},
{
"name": "Visitpad view",
"slug": "visitpad.view",
"action": "read",
"description": "Platform demo authorization catalog (visitpad.view).",
"is_active": true,
"is_deleted": false
}
],
"module_permissions": [
{
"slug": "allergens:create",
"module_slug": "allergens",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "allergens:delete",
"module_slug": "allergens",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "allergens:edit",
"module_slug": "allergens",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "allergens:read",
"module_slug": "allergens",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "allergy-reactions:create",
"module_slug": "allergy-reactions",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "allergy-reactions:delete",
"module_slug": "allergy-reactions",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "allergy-reactions:edit",
"module_slug": "allergy-reactions",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "allergy-reactions:read",
"module_slug": "allergy-reactions",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "billing-account:create",
"module_slug": "billing-account",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "billing-account:delete",
"module_slug": "billing-account",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "billing-account:edit",
"module_slug": "billing-account",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "billing-account:read",
"module_slug": "billing-account",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "billing-and-finance:shell.access",
"module_slug": "billing-and-finance",
"permission_slug": "shell.access",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "chief-complaints:create",
"module_slug": "chief-complaints",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "chief-complaints:delete",
"module_slug": "chief-complaints",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "chief-complaints:edit",
"module_slug": "chief-complaints",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "chief-complaints:read",
"module_slug": "chief-complaints",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "chronic-illnesses:create",
"module_slug": "chronic-illnesses",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "chronic-illnesses:delete",
"module_slug": "chronic-illnesses",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "chronic-illnesses:edit",
"module_slug": "chronic-illnesses",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "chronic-illnesses:read",
"module_slug": "chronic-illnesses",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.branding.create",
"module_slug": "configurator",
"permission_slug": "configurator.branding.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.organization.create",
"module_slug": "configurator",
"permission_slug": "configurator.organization.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.organization.read",
"module_slug": "configurator",
"permission_slug": "configurator.organization.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.organization.update",
"module_slug": "configurator",
"permission_slug": "configurator.organization.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.sequence.configuration.read",
"module_slug": "configurator",
"permission_slug": "configurator.sequence.configuration.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.sequence.configuration.update",
"module_slug": "configurator",
"permission_slug": "configurator.sequence.configuration.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.api.key.create",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.api.key.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.api.key.read",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.api.key.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.api.key.update",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.api.key.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.create",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.integration.profile.create",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.integration.profile.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.integration.profile.delete",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.integration.profile.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.integration.profile.read",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.integration.profile.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.integration.profile.update",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.integration.profile.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.module.create",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.module.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.module.delete",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.module.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.module.read",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.module.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.module.update",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.module.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.onboarding.create",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.onboarding.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:configurator.tenant.update",
"module_slug": "configurator",
"permission_slug": "configurator.tenant.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "configurator:shell.access",
"module_slug": "configurator",
"permission_slug": "shell.access",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "departments:create",
"module_slug": "departments",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "departments:delete",
"module_slug": "departments",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "departments:edit",
"module_slug": "departments",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "departments:read",
"module_slug": "departments",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diagnoses:create",
"module_slug": "diagnoses",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diagnoses:delete",
"module_slug": "diagnoses",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diagnoses:edit",
"module_slug": "diagnoses",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diagnoses:read",
"module_slug": "diagnoses",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diet-type:create",
"module_slug": "diet-type",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diet-type:delete",
"module_slug": "diet-type",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diet-type:edit",
"module_slug": "diet-type",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "diet-type:read",
"module_slug": "diet-type",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "dispense:create",
"module_slug": "dispense",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "dispense:delete",
"module_slug": "dispense",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "dispense:edit",
"module_slug": "dispense",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "dispense:read",
"module_slug": "dispense",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "empi:empi.patient.create",
"module_slug": "empi",
"permission_slug": "empi.patient.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "empi:empi.patient.delete",
"module_slug": "empi",
"permission_slug": "empi.patient.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "empi:empi.patient.read",
"module_slug": "empi",
"permission_slug": "empi.patient.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "empi:empi.patient.update",
"module_slug": "empi",
"permission_slug": "empi.patient.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "frequency:create",
"module_slug": "frequency",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "frequency:delete",
"module_slug": "frequency",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "frequency:edit",
"module_slug": "frequency",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "frequency:read",
"module_slug": "frequency",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "frontdesk:shell.access",
"module_slug": "frontdesk",
"permission_slug": "shell.access",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.grn.create",
"module_slug": "inventory",
"permission_slug": "inventory.grn.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.grn.read",
"module_slug": "inventory",
"permission_slug": "inventory.grn.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.grn.update",
"module_slug": "inventory",
"permission_slug": "inventory.grn.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.indent.create",
"module_slug": "inventory",
"permission_slug": "inventory.indent.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.indent.read",
"module_slug": "inventory",
"permission_slug": "inventory.indent.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.indent.update",
"module_slug": "inventory",
"permission_slug": "inventory.indent.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.item.create",
"module_slug": "inventory",
"permission_slug": "inventory.item.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.item.read",
"module_slug": "inventory",
"permission_slug": "inventory.item.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.stock.read",
"module_slug": "inventory",
"permission_slug": "inventory.stock.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.store.create",
"module_slug": "inventory",
"permission_slug": "inventory.store.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.store.read",
"module_slug": "inventory",
"permission_slug": "inventory.store.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.store.update",
"module_slug": "inventory",
"permission_slug": "inventory.store.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.transfer.create",
"module_slug": "inventory",
"permission_slug": "inventory.transfer.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "inventory:inventory.transfer.read",
"module_slug": "inventory",
"permission_slug": "inventory.transfer.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "invoice:create",
"module_slug": "invoice",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "invoice:delete",
"module_slug": "invoice",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "invoice:edit",
"module_slug": "invoice",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "invoice:read",
"module_slug": "invoice",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "manufacturers:create",
"module_slug": "manufacturers",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "manufacturers:delete",
"module_slug": "manufacturers",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "manufacturers:edit",
"module_slug": "manufacturers",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "manufacturers:read",
"module_slug": "manufacturers",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.department.create",
"module_slug": "master-data",
"permission_slug": "master-data.department.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.department.delete",
"module_slug": "master-data",
"permission_slug": "master-data.department.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.department.update",
"module_slug": "master-data",
"permission_slug": "master-data.department.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.module.create",
"module_slug": "master-data",
"permission_slug": "master-data.module.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.module.delete",
"module_slug": "master-data",
"permission_slug": "master-data.module.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.module.permission.create",
"module_slug": "master-data",
"permission_slug": "master-data.module.permission.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.module.permission.delete",
"module_slug": "master-data",
"permission_slug": "master-data.module.permission.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.module.permission.update",
"module_slug": "master-data",
"permission_slug": "master-data.module.permission.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.module.update",
"module_slug": "master-data",
"permission_slug": "master-data.module.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.permission.create",
"module_slug": "master-data",
"permission_slug": "master-data.permission.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.permission.delete",
"module_slug": "master-data",
"permission_slug": "master-data.permission.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.permission.update",
"module_slug": "master-data",
"permission_slug": "master-data.permission.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.system.role.create",
"module_slug": "master-data",
"permission_slug": "master-data.system.role.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.system.role.delete",
"module_slug": "master-data",
"permission_slug": "master-data.system.role.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:master-data.system.role.update",
"module_slug": "master-data",
"permission_slug": "master-data.system.role.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "master-data:shell.access",
"module_slug": "master-data",
"permission_slug": "shell.access",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "medication-type:create",
"module_slug": "medication-type",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "medication-type:delete",
"module_slug": "medication-type",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "medication-type:edit",
"module_slug": "medication-type",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "medication-type:read",
"module_slug": "medication-type",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "medicines:create",
"module_slug": "medicines",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "medicines:delete",
"module_slug": "medicines",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "medicines:edit",
"module_slug": "medicines",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "medicines:read",
"module_slug": "medicines",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "method-strength:create",
"module_slug": "method-strength",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "method-strength:delete",
"module_slug": "method-strength",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "method-strength:edit",
"module_slug": "method-strength",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "method-strength:read",
"module_slug": "method-strength",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "modules:create",
"module_slug": "modules",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "modules:delete",
"module_slug": "modules",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "modules:edit",
"module_slug": "modules",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "modules:read",
"module_slug": "modules",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.health.document.create",
"module_slug": "opd",
"permission_slug": "opd.health.document.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.health.document.read",
"module_slug": "opd",
"permission_slug": "opd.health.document.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.patient.read",
"module_slug": "opd",
"permission_slug": "opd.patient.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.prescription.create",
"module_slug": "opd",
"permission_slug": "opd.prescription.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.prescription.delete",
"module_slug": "opd",
"permission_slug": "opd.prescription.delete",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.prescription.read",
"module_slug": "opd",
"permission_slug": "opd.prescription.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.prescription.update",
"module_slug": "opd",
"permission_slug": "opd.prescription.update",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.visit.create",
"module_slug": "opd",
"permission_slug": "opd.visit.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "opd:opd.visit.read",
"module_slug": "opd",
"permission_slug": "opd.visit.read",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "organizations:create",
"module_slug": "organizations",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "organizations:delete",
"module_slug": "organizations",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "organizations:edit",
"module_slug": "organizations",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "organizations:read",
"module_slug": "organizations",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "permissions:create",
"module_slug": "permissions",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "permissions:delete",
"module_slug": "permissions",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "permissions:edit",
"module_slug": "permissions",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "permissions:read",
"module_slug": "permissions",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "pharmacy:shell.access",
"module_slug": "pharmacy",
"permission_slug": "shell.access",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist:create",
"module_slug": "picklist",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist:delete",
"module_slug": "picklist",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist:edit",
"module_slug": "picklist",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist-items:create",
"module_slug": "picklist-items",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist-items:delete",
"module_slug": "picklist-items",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist-items:edit",
"module_slug": "picklist-items",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist-items:read",
"module_slug": "picklist-items",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "picklist:read",
"module_slug": "picklist",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "procedures:create",
"module_slug": "procedures",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "procedures:delete",
"module_slug": "procedures",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "procedures:edit",
"module_slug": "procedures",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "procedures:read",
"module_slug": "procedures",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "registration:create",
"module_slug": "registration",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "registration:delete",
"module_slug": "registration",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "registration:edit",
"module_slug": "registration",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "registration:read",
"module_slug": "registration",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "role-capabilities:create",
"module_slug": "role-capabilities",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "role-capabilities:delete",
"module_slug": "role-capabilities",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "role-capabilities:edit",
"module_slug": "role-capabilities",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "role-capabilities:read",
"module_slug": "role-capabilities",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "route:create",
"module_slug": "route",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "route:delete",
"module_slug": "route",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "route:edit",
"module_slug": "route",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "route:read",
"module_slug": "route",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "rxcolumns:create",
"module_slug": "rxcolumns",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "rxcolumns:delete",
"module_slug": "rxcolumns",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "rxcolumns:edit",
"module_slug": "rxcolumns",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "rxcolumns:read",
"module_slug": "rxcolumns",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tariff-master:create",
"module_slug": "tariff-master",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tariff-master:delete",
"module_slug": "tariff-master",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tariff-master:edit",
"module_slug": "tariff-master",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tariff-master:read",
"module_slug": "tariff-master",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenant-modules:create",
"module_slug": "tenant-modules",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenant-modules:delete",
"module_slug": "tenant-modules",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenant-modules:edit",
"module_slug": "tenant-modules",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenant-modules:read",
"module_slug": "tenant-modules",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenants:create",
"module_slug": "tenants",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenants:delete",
"module_slug": "tenants",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenants:edit",
"module_slug": "tenants",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "tenants:read",
"module_slug": "tenants",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "time-of-administration:create",
"module_slug": "time-of-administration",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "time-of-administration:delete",
"module_slug": "time-of-administration",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "time-of-administration:edit",
"module_slug": "time-of-administration",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "time-of-administration:read",
"module_slug": "time-of-administration",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit-conversions:create",
"module_slug": "unit-conversions",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit-conversions:delete",
"module_slug": "unit-conversions",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit-conversions:edit",
"module_slug": "unit-conversions",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit-conversions:read",
"module_slug": "unit-conversions",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit:create",
"module_slug": "unit",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit:delete",
"module_slug": "unit",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit:edit",
"module_slug": "unit",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "unit:read",
"module_slug": "unit",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "units:create",
"module_slug": "units",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "units:delete",
"module_slug": "units",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "units:edit",
"module_slug": "units",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "units:read",
"module_slug": "units",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-capabilities:create",
"module_slug": "user-capabilities",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-capabilities:delete",
"module_slug": "user-capabilities",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-capabilities:edit",
"module_slug": "user-capabilities",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-capabilities:read",
"module_slug": "user-capabilities",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-roles:create",
"module_slug": "user-roles",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-roles:delete",
"module_slug": "user-roles",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-roles:edit",
"module_slug": "user-roles",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-roles:read",
"module_slug": "user-roles",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "user-roles:role.assign",
"module_slug": "user-roles",
"permission_slug": "role.assign",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "users:create",
"module_slug": "users",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "users:delete",
"module_slug": "users",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "users:edit",
"module_slug": "users",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "users:read",
"module_slug": "users",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "vaccines:create",
"module_slug": "vaccines",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "vaccines:delete",
"module_slug": "vaccines",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "vaccines:edit",
"module_slug": "vaccines",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "vaccines:read",
"module_slug": "vaccines",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "visitpad-master:create",
"module_slug": "visitpad-master",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "visitpad-master:delete",
"module_slug": "visitpad-master",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "visitpad-master:edit",
"module_slug": "visitpad-master",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "visitpad-master:read",
"module_slug": "visitpad-master",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "visitpad-master:visitpad.create",
"module_slug": "visitpad-master",
"permission_slug": "visitpad.create",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "visitpad-master:visitpad.view",
"module_slug": "visitpad-master",
"permission_slug": "visitpad.view",
"is_default": false,
"is_active": true,
"is_deleted": false
},
{
"slug": "visitpad-templates-catalog-manage",
"module_slug": "visitpad-templates",
"permission_slug": "visitpad-templates-catalog-manage",
"is_default": false,
"is_active": true,
"is_deleted": true
},
{
"slug": "visitpad-templates-catalog-read",
"module_slug": "visitpad-templates",
"permission_slug": "visitpad-templates-catalog-read",
"is_default": true,
"is_active": true,
"is_deleted": true
},
{
"slug": "visitpad-templates-catalog-write",
"module_slug": "visitpad-templates",
"permission_slug": "visitpad-templates-catalog-write",
"is_default": true,
"is_active": true,
"is_deleted": true
},
{
"slug": "visitpad-templates:visitpad.create",
"module_slug": "visitpad-templates",
"permission_slug": "visitpad.create",
"is_default": false,
"is_active": true,
"is_deleted": true
},
{
"slug": "visitpad-templates:visitpad.view",
"module_slug": "visitpad-templates",
"permission_slug": "visitpad.view",
"is_default": false,
"is_active": true,
"is_deleted": true
},
{
"slug": "vitals:create",
"module_slug": "vitals",
"permission_slug": "create",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "vitals:delete",
"module_slug": "vitals",
"permission_slug": "delete",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "vitals:edit",
"module_slug": "vitals",
"permission_slug": "edit",
"is_default": true,
"is_active": true,
"is_deleted": false
},
{
"slug": "vitals:read",
"module_slug": "vitals",
"permission_slug": "read",
"is_default": true,
"is_active": true,
"is_deleted": false
}
],
"picklist": [
{
"name": "Blood Group",
"slug": "blood-group",
"is_active": true,
"is_deleted": false
},
{
"name": "Gender",
"slug": "gender",
"is_active": true,
"is_deleted": false
},
{
"name": "Nationality",
"slug": "nationality",
"is_active": true,
"is_deleted": false
},
{
"name": "Registration Status",
"slug": "registration-status",
"is_active": true,
"is_deleted": false
},
{
"name": "Religion",
"slug": "religion",
"is_active": true,
"is_deleted": false
},
{
"name": "Role Types",
"slug": "role-types",
"is_active": true,
"is_deleted": false
},
{
"name": "Tariff-type",
"slug": "tariff-type",
"is_active": true,
"is_deleted": false
},
{
"name": "Visit Types",
"slug": "visit-types",
"is_active": true,
"is_deleted": false
}
],
"picklist_values": [
{
"picklist_slug": "blood-group",
"value": "A+",
"label": "A+",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 1
},
{
"picklist_slug": "blood-group",
"value": "A-",
"label": "A-",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 2
},
{
"picklist_slug": "blood-group",
"value": "B+",
"label": "B+",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 3
},
{
"picklist_slug": "blood-group",
"value": "B-",
"label": "B-",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 4
},
{
"picklist_slug": "blood-group",
"value": "AB+",
"label": "AB+",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 5
},
{
"picklist_slug": "blood-group",
"value": "AB-",
"label": "AB-",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 6
},
{
"picklist_slug": "blood-group",
"value": "O+",
"label": "O+",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 7
},
{
"picklist_slug": "blood-group",
"value": "O-",
"label": "O-",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 8
},
{
"picklist_slug": "gender",
"value": "male",
"label": "Male",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 1
},
{
"picklist_slug": "gender",
"value": "female",
"label": "Female",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 2
},
{
"picklist_slug": "gender",
"value": "other",
"label": "Other",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 3
},
{
"picklist_slug": "registration-status",
"value": "pending",
"label": "Registered",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 1
},
{
"picklist_slug": "registration-status",
"value": "in_progress",
"label": "Pre-consultation",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 2
},
{
"picklist_slug": "registration-status",
"value": "completed",
"label": "Consulted",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 3
},
{
"picklist_slug": "registration-status",
"value": "cancelled",
"label": "Cancelled",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 4
},
{
"picklist_slug": "role-types",
"value": "doctor",
"label": "Doctor",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 1
},
{
"picklist_slug": "role-types",
"value": "nurse",
"label": "Nurse",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 2
},
{
"picklist_slug": "role-types",
"value": "pharmacist",
"label": "Pharmacist",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 3
},
{
"picklist_slug": "role-types",
"value": "lab-technician",
"label": "Lab Technician",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 4
},
{
"picklist_slug": "role-types",
"value": "admin",
"label": "Administrator",
"description": null,
"metadata": null,
"is_active": true,
"is_global": true,
"display_order": 5
},
{
"picklist_slug": "role-types",
"value": "receptionist",
"label": "Receptionist",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 6
},
{
"picklist_slug": "role-types",
"value": "radiologist",
"label": "Radiologist",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 7
},
{
"picklist_slug": "role-types",
"value": "super_admin",
"label": "Super Admin",
"description": null,
"metadata": null,
"is_active": true,
"is_global": true,
"display_order": 8
},
{
"picklist_slug": "role-types",
"value": "tenant-admin",
"label": "Tenant Admin",
"description": null,
"metadata": null,
"is_active": false,
"is_global": false,
"display_order": 9
},
{
"picklist_slug": "role-types",
"value": "tenant_admin",
"label": "Tenant Admin",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 9
},
{
"picklist_slug": "tariff-type",
"value": "consultation-fee",
"label": "Consultation fee",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 1
},
{
"picklist_slug": "tariff-type",
"value": "registration-fee",
"label": "Registration fee",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 2
},
{
"picklist_slug": "visit-types",
"value": "opd_first",
"label": "OPD \u2014 First visit",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 1
},
{
"picklist_slug": "visit-types",
"value": "opd_follow_up",
"label": "OPD \u2014 Follow-up",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 2
},
{
"picklist_slug": "visit-types",
"value": "opd_free_follow_up",
"label": "OPD \u2014 Free follow-up",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 2
},
{
"picklist_slug": "visit-types",
"value": "ipd_admission",
"label": "IPD admission",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 3
},
{
"picklist_slug": "visit-types",
"value": "emergency",
"label": "Emergency",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 4
},
{
"picklist_slug": "visit-types",
"value": "daycare",
"label": "Day care",
"description": null,
"metadata": null,
"is_active": true,
"is_global": false,
"display_order": 5
}
]
}"""
)

_UUID = postgresql.UUID(as_uuid=True)


def _register_reference_tables() -> None:
    """Register the catalog reference tables when running on Citus; no-op elsewhere."""
    bind = op.get_bind()
    for qualified in _REF_TABLES:
        bind.exec_driver_sql(
            "DO $$ BEGIN "
            "IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN "
            f"PERFORM create_reference_table('{qualified}'); "
            "END IF; END $$;"
        )


def _seed_catalog() -> None:
    modules = sa.table(
        "modules",
        sa.column("id", _UUID), sa.column("parent_id", _UUID),
        sa.column("name", sa.Text), sa.column("slug", sa.Text),
        sa.column("description", sa.Text), sa.column("category", sa.String),
        sa.column("version", sa.String), sa.column("level", sa.Integer),
        sa.column("module_kind", sa.String), sa.column("display_order", sa.Integer),
        sa.column("visibility_scope", sa.String), sa.column("icon", sa.Text),
        sa.column("is_active", sa.Boolean), sa.column("is_deleted", sa.Boolean),
        schema="master_global",
    )
    op.bulk_insert(modules, [
        {
            "id": _uid("module", r["slug"]),
            "parent_id": _uid("module", r["parent_slug"]) if r["parent_slug"] else None,
            "name": r["name"], "slug": r["slug"], "description": r["description"],
            "category": r["category"], "version": r["version"], "level": r["level"],
            "module_kind": r["module_kind"], "display_order": r["display_order"],
            "visibility_scope": r["visibility_scope"], "icon": r["icon"],
            "is_active": r["is_active"], "is_deleted": r["is_deleted"],
        }
        for r in _SEED["modules"]
    ])

    permissions = sa.table(
        "permissions",
        sa.column("id", _UUID), sa.column("name", sa.Text), sa.column("slug", sa.Text),
        sa.column("action", sa.String), sa.column("description", sa.Text),
        sa.column("is_active", sa.Boolean), sa.column("is_deleted", sa.Boolean),
        schema="master_global",
    )
    op.bulk_insert(permissions, [
        {
            "id": _uid("permission", r["slug"]), "name": r["name"], "slug": r["slug"],
            "action": r["action"], "description": r["description"],
            "is_active": r["is_active"], "is_deleted": r["is_deleted"],
        }
        for r in _SEED["permissions"]
    ])

    module_permissions = sa.table(
        "module_permissions",
        sa.column("id", _UUID), sa.column("slug", sa.Text),
        sa.column("module_id", _UUID), sa.column("permission_id", _UUID),
        sa.column("is_default", sa.Boolean),
        sa.column("is_active", sa.Boolean), sa.column("is_deleted", sa.Boolean),
        schema="master_global",
    )
    op.bulk_insert(module_permissions, [
        {
            "id": _uid("module_permission", r["slug"]), "slug": r["slug"],
            "module_id": _uid("module", r["module_slug"]),
            "permission_id": _uid("permission", r["permission_slug"]),
            "is_default": r["is_default"],
            "is_active": r["is_active"], "is_deleted": r["is_deleted"],
        }
        for r in _SEED["module_permissions"]
    ])

    picklist = sa.table(
        "picklist",
        sa.column("id", _UUID), sa.column("name", sa.Text), sa.column("slug", sa.Text),
        sa.column("is_active", sa.Boolean), sa.column("is_deleted", sa.Boolean),
        schema="master_global",
    )
    op.bulk_insert(picklist, [
        {
            "id": _uid("picklist", r["slug"]), "name": r["name"], "slug": r["slug"],
            "is_active": r["is_active"], "is_deleted": r["is_deleted"],
        }
        for r in _SEED["picklist"]
    ])

    picklist_values = sa.table(
        "picklist_values",
        sa.column("id", _UUID), sa.column("category_id", _UUID),
        sa.column("value", sa.Text), sa.column("label", sa.Text),
        sa.column("description", sa.Text), sa.column("metadata", sa.JSON),
        sa.column("is_active", sa.Boolean), sa.column("is_global", sa.Boolean),
        sa.column("display_order", sa.Integer),
        schema="master_global",
    )
    op.bulk_insert(picklist_values, [
        {
            "id": _uid("picklist_value", f"{r['picklist_slug']}:{r['value']}"),
            "category_id": _uid("picklist", r["picklist_slug"]),
            "value": r["value"], "label": r["label"], "description": r["description"],
            "metadata": r["metadata"], "is_active": r["is_active"],
            "is_global": r["is_global"], "display_order": r["display_order"],
        }
        for r in _SEED["picklist_values"]
    ])


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("CREATE SCHEMA IF NOT EXISTS master_global")
    bind.exec_driver_sql("CREATE SCHEMA IF NOT EXISTS master_tenant")

    for stmt in _DDL["tables"]:
        bind.exec_driver_sql(stmt)
    for stmt in _DDL["pk_uc"]:
        bind.exec_driver_sql(stmt)
    for stmt in _DDL["idx"]:
        bind.exec_driver_sql(stmt)

    _register_reference_tables()

    for stmt in _DDL["fk"]:
        bind.exec_driver_sql(stmt)

    _seed_catalog()


def downgrade() -> None:
    bind = op.get_bind()
    # master_tenant holds only domain tables -> drop it wholesale.
    bind.exec_driver_sql("DROP SCHEMA IF EXISTS master_tenant CASCADE")
    # master_global also hosts Alembic's version table (version_table_schema),
    # so drop the domain tables individually and leave the schema (+ alembic_version)
    # intact for Alembic to finish its own bookkeeping.
    bind.exec_driver_sql(
        "DO $$ DECLARE r record; BEGIN "
        "FOR r IN SELECT tablename FROM pg_tables "
        "WHERE schemaname = 'master_global' AND tablename <> 'alembic_version' LOOP "
        "EXECUTE 'DROP TABLE IF EXISTS master_global.' || quote_ident(r.tablename) || ' CASCADE'; "
        "END LOOP; END $$;"
    )
