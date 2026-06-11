-- IPD clinical notes — doctor/nurse documentation (LLD §4, Notes tab).
-- Apply after 0000_ipd_admission_schema.sql

CREATE TABLE IF NOT EXISTS ipd.clinical_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  episode_id uuid NOT NULL,
  note_type text NOT NULL,
  author_id uuid NOT NULL,
  author_role text NOT NULL,
  author_specialty_code text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  finalized_at timestamptz,
  finalized_by uuid,
  signed_at timestamptz,
  signed_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clinical_notes_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT clinical_notes_type_chk CHECK (
    note_type IN (
      'admission_note',
      'progress_note',
      'procedure_note',
      'consultation_note',
      'discharge_summary_note',
      'operation_note',
      'transfer_note',
      'handover_note',
      'nursing_note'
    )
  ),
  CONSTRAINT clinical_notes_status_chk CHECK (
    status IN ('draft', 'finalized', 'signed')
  ),
  CONSTRAINT clinical_notes_role_chk CHECK (
    author_role IN (
      'consultant',
      'resident',
      'registrar',
      'nurse',
      'specialist',
      'intern'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_episode
  ON ipd.clinical_notes (iq_tenant_id, episode_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_author_status
  ON ipd.clinical_notes (iq_tenant_id, author_id, status);
