import type { VitalFieldDef } from '../types';

/** Static vitals grid matching reference Create RX Pre Consult layout. */
export const CREATE_RX_VITAL_FIELDS: VitalFieldDef[] = [
  { code: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', placeholder: '120' },
  { code: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', placeholder: '80', pairedWith: 'systolic_bp' },
  { code: 'pulse_rate', label: 'Pulse Rate', unit: 'bpm', placeholder: '72' },
  { code: 'temperature', label: 'Temperature', unit: 'degf', placeholder: '98.6' },
  { code: 'spo2', label: 'SpO2', unit: '%', placeholder: '98' },
  { code: 'respiratory_rate', label: 'Respiratory Rate', unit: 'bpm', placeholder: '16' },
  { code: 'height', label: 'Height', unit: 'cm', placeholder: '170' },
  { code: 'weight', label: 'Weight', unit: 'kg', placeholder: '70' },
  { code: 'bmi', label: 'BMI', unit: 'kg/m²', placeholder: '24.2' },
  { code: 'random_blood_sugar', label: 'Random Blood Sugar', unit: 'mgdl', placeholder: '110' },
];
