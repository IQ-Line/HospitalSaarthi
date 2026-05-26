import type { WizardStep } from './types';

export const CONSENT_ITEMS = [
  'I am voluntarily sharing my Aadhaar / identity information with the National Health Authority (NHA) for the sole purpose of creation of ABHA number.',
  'I understand that my ABHA number can be used in any healthcare interaction across India.',
  'I consent to NHA using my Aadhaar number for performing Aadhaar based authentication with UIDAI for ABHA number creation.',
  'I authorize NHA to use my Aadhaar number for communicating with me for ABHA number creation.',
  'I consent to linking of my legacy health records with ABHA number.',
  'I consent to sharing my health records with healthcare providers for providing healthcare services.',
  'I consent to anonymization and subsequent use of my health records for public health purposes.',
] as const;

export const MAX_OTP_SENDS = 3;
export const RESEND_COOLDOWN_SEC = 60;
export const ABHA_ADDRESS_SUFFIX = '@sbx';

export const WIZARD_STEP_CONFIG: Record<
  WizardStep,
  { wide: boolean; showFooter: boolean; showBack: boolean }
> = {
  method: { wide: false, showFooter: false, showBack: false },
  'login-soon': { wide: false, showFooter: true, showBack: true },
  consent: { wide: true, showFooter: true, showBack: true },
  otp: { wide: true, showFooter: true, showBack: true },
  profile: { wide: true, showFooter: true, showBack: false },
  'address-edit': { wide: true, showFooter: true, showBack: true },
};
