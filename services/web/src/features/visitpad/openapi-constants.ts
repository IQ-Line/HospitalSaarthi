/**
 * Closed enums copied from `specs/openapi/master-data.v1.yaml` for Visitpad forms.
 * Keep in sync when OpenAPI enum lists change.
 */

export const VISITPAD_UNIT_DIMENSIONS = [
  { value: 'length', label: 'Length' },
  { value: 'mass', label: 'Mass' },
  { value: 'volume', label: 'Volume' },
  { value: 'time', label: 'Time' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'pressure', label: 'Pressure' },
  { value: 'concentration', label: 'Concentration' },
  { value: 'ratio', label: 'Ratio' },
  { value: 'count', label: 'Count' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_VITAL_CATEGORIES = [
  { value: 'vital_signs', label: 'Vital signs' },
  { value: 'anthropometric', label: 'Anthropometric' },
  { value: 'functional', label: 'Functional' },
  { value: 'score', label: 'Score' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_VITAL_DATA_TYPES = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'score', label: 'Score' },
] as const;

export const VISITPAD_VITAL_REFERENCE_KINDS = [
  { value: 'none', label: 'None' },
  { value: 'range', label: 'Range' },
  { value: 'categorical', label: 'Categorical' },
  { value: 'boolean', label: 'Boolean' },
] as const;

export const VISITPAD_VITAL_INPUT_METHODS = [
  { value: 'manual', label: 'Manual' },
  { value: 'device', label: 'Device' },
  { value: 'calculated', label: 'Calculated' },
] as const;

export const VISITPAD_BODY_SYSTEMS = [
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'neurological', label: 'Neurological' },
  { value: 'gastrointestinal', label: 'Gastrointestinal' },
  { value: 'musculoskeletal', label: 'Musculoskeletal' },
  { value: 'ent', label: 'ENT' },
  { value: 'skin', label: 'Skin' },
  { value: 'psychiatric', label: 'Psychiatric' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_TRIAGE_PRIORITIES = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'semi_urgent', label: 'Semi-urgent' },
  { value: 'non_urgent', label: 'Non-urgent' },
  { value: 'routine', label: 'Routine' },
] as const;

export const VISITPAD_ICD_VERSIONS = [
  { value: 'ICD-10', label: 'ICD-10' },
  { value: 'ICD-11', label: 'ICD-11' },
] as const;

export const VISITPAD_DIAGNOSIS_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'infectious', label: 'Infectious' },
  { value: 'neoplastic', label: 'Neoplastic' },
  { value: 'metabolic', label: 'Metabolic' },
  { value: 'psychiatric', label: 'Psychiatric' },
  { value: 'injury', label: 'Injury' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_ALLERGEN_TYPES = [
  { value: 'drug', label: 'Drug' },
  { value: 'food', label: 'Food' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_REACTION_SEVERITY_DEFAULTS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const VISITPAD_CHRONIC_ILLNESS_CATEGORIES = [
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'metabolic', label: 'Metabolic' },
  { value: 'renal', label: 'Renal' },
  { value: 'neurological', label: 'Neurological' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_PROCEDURE_CATEGORIES = [
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'therapeutic', label: 'Therapeutic' },
  { value: 'surgical', label: 'Surgical' },
  { value: 'ancillary', label: 'Ancillary' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_PROCEDURE_BILLING_CATEGORIES = [
  { value: 'professional', label: 'Professional' },
  { value: 'facility', label: 'Facility' },
  { value: 'ancillary', label: 'Ancillary' },
  { value: 'bundled', label: 'Bundled' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITPAD_MEDICINE_SCHEDULES = [
  { value: 'otc', label: 'OTC' },
  { value: 'h', label: 'H' },
  { value: 'h1', label: 'H1' },
  { value: 's', label: 'S' },
  { value: 'x', label: 'X' },
  { value: 'unscheduled', label: 'Unscheduled' },
] as const;
