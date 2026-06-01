import {
  CreditCard,
  FileText,
  HeartPulse,
  Receipt,
  Siren,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { IdentifierType } from './sequence-format';

export const SEQUENCE_IDENTIFIER_META: Record<
  IdentifierType,
  { title: string; description: string; icon: LucideIcon; listColumn: string }
> = {
  patient_uhid: {
    title: 'Patient UHID',
    description: 'Unique Health ID assigned to every patient on first registration',
    icon: UserRound,
    listColumn: 'UHID',
  },
  op_visit: {
    title: 'OP Visit ID',
    description: 'Identifier for each outpatient visit or consultation',
    icon: Stethoscope,
    listColumn: 'OP visit',
  },
  ip_visit: {
    title: 'IP Visit ID',
    description: 'Identifier for each inpatient admission',
    icon: HeartPulse,
    listColumn: 'IP visit',
  },
  emergency_visit: {
    title: 'Emergency Visit ID',
    description: 'Identifier for each emergency department visit',
    icon: Siren,
    listColumn: 'Emergency',
  },
  op_bill: {
    title: 'OP Bill ID',
    description: 'Bill number for outpatient / OPD invoices',
    icon: Receipt,
    listColumn: 'OP bill',
  },
  ip_bill: {
    title: 'IP Bill ID',
    description: 'Bill number for inpatient / IPD invoices',
    icon: FileText,
    listColumn: 'IP bill',
  },
  emergency_bill: {
    title: 'Emergency Bill ID',
    description: 'Bill number for emergency department invoices',
    icon: CreditCard,
    listColumn: 'Emergency bill',
  },
};
