import type { AbhaWizardFlow, WizardStep } from './types';

export const CONSENT_ITEMS = [
  'I am voluntarily sharing my Aadhaar / identity information with the National Health Authority (NHA) for the sole purpose of creation of ABHA number.',
  'I understand that my ABHA number can be used in any healthcare interaction across India.',
  'I consent to NHA using my Aadhaar number for performing Aadhaar based authentication with UIDAI for ABHA number creation.',
  'I authorize NHA to use my Aadhaar number for communicating with me for ABHA number creation.',
  'I consent to linking of my legacy health records with ABHA number.',
  'I consent to sharing my health records with healthcare providers for providing healthcare services.',
  'I consent to anonymization and subsequent use of my health records for public health purposes.',
] as const;

export const LOGIN_METHODS = [
  { id: 'abha-number', label: 'ABHA Number' },
  { id: 'abha-address', label: 'ABHA Address' },
  { id: 'mobile', label: 'Mobile Number' },
  { id: 'aadhaar', label: 'Aadhaar Number' },
] as const;

export const MAX_OTP_SENDS = 3;
export const RESEND_COOLDOWN_SEC = 60;
export const ABHA_ADDRESS_SUFFIX = '@sbx';

export const DIALOG_SHELL =
  'flex min-h-[min(560px,85dvh)] max-h-[min(92dvh,780px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl';

export const CONTENT_MIN_H = 'min-h-[360px]';

const LOGIN_BACK_STEPS: WizardStep[] = [
  'login-abha-number',
  'login-abha-channel',
  'login-abha-address',
  'login-abha-address-channel',
  'login-mobile',
  'login-otp',
  'login-account-select',
];

export const WIZARD_STEP_CONFIG: Record<
  WizardStep,
  { showFooter: boolean; showBack: boolean }
> = {
  method: { showFooter: false, showBack: false },
  'login-method': { showFooter: false, showBack: false },
  'login-abha-number': { showFooter: true, showBack: true },
  'login-abha-channel': { showFooter: true, showBack: true },
  'login-abha-address': { showFooter: true, showBack: true },
  'login-abha-address-channel': { showFooter: true, showBack: true },
  'login-mobile': { showFooter: true, showBack: true },
  'login-otp': { showFooter: true, showBack: true },
  'login-account-select': { showFooter: true, showBack: true },
  consent: { showFooter: true, showBack: true },
  otp: { showFooter: true, showBack: true },
  profile: { showFooter: true, showBack: false },
  'address-edit': { showFooter: true, showBack: true },
};

export function stepShowsBack(step: WizardStep, flow: AbhaWizardFlow): boolean {
  const cfg = WIZARD_STEP_CONFIG[step];
  if (step === 'login-method') return flow === 'create';
  return cfg.showBack;
}

export function isLoginBackStep(step: WizardStep): boolean {
  return LOGIN_BACK_STEPS.includes(step);
}
