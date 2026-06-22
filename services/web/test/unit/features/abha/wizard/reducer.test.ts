import { describe, expect, it } from 'vitest';
import { RESEND_COOLDOWN_SEC } from '../../../../../src/features/abha/wizard/constants';
import { abhaWizardReducer, createInitialAbhaWizardState } from '../../../../../src/features/abha/wizard/reducer';

describe('abhaWizardReducer', () => {
  it('TICK_RESEND_COOLDOWN decrements enrol resend cooldown', () => {
    let state = createInitialAbhaWizardState();
    state = abhaWizardReducer(state, { type: 'START_RESEND_COOLDOWN' });
    expect(state.otpSession.resendCooldown).toBe(RESEND_COOLDOWN_SEC);
    state = abhaWizardReducer(state, { type: 'TICK_RESEND_COOLDOWN' });
    expect(state.otpSession.resendCooldown).toBe(RESEND_COOLDOWN_SEC - 1);
  });

  it('SELECT_ALL_CONSENT clears names when unchecking', () => {
    let state = createInitialAbhaWizardState();
    state = abhaWizardReducer(state, {
      type: 'SET_HEALTHCARE_WORKER_NAME',
      name: 'Dr. Pat',
    });
    state = abhaWizardReducer(state, { type: 'SET_BENEFICIARY_NAME', name: 'Patient' });
    state = abhaWizardReducer(state, { type: 'SELECT_ALL_CONSENT', checked: false });
    expect(state.consent.healthcareWorkerName).toBe('');
    expect(state.consent.beneficiaryName).toBe('');
  });

  it('RESET_ADDRESS_EDIT clears suggestions and returns to profile', () => {
    let state = createInitialAbhaWizardState();
    state = abhaWizardReducer(state, {
      type: 'SET_ADDRESS_SUGGESTIONS',
      suggestions: ['user@sbx'],
    });
    state = abhaWizardReducer(state, { type: 'SET_STEP', step: 'address-edit' });
    state = abhaWizardReducer(state, { type: 'RESET_ADDRESS_EDIT' });
    expect(state.step).toBe('profile');
    expect(state.address.suggestions).toEqual([]);
  });

  it('SET_OTP_SESSION_ID updates session id without resetting enrol otp fields', () => {
    let state = createInitialAbhaWizardState();
    state = abhaWizardReducer(state, {
      type: 'INIT_OTP_SESSION',
      sessionId: 'sid-1',
      aadhaarNumber: '123456789012',
    });
    state = abhaWizardReducer(state, { type: 'SET_OTP', otp: '123456' });
    state = abhaWizardReducer(state, { type: 'SET_OTP_SESSION_ID', sessionId: 'sid-2' });
    expect(state.otpSession.sessionId).toBe('sid-2');
    expect(state.otpSession.aadhaarNumber).toBe('123456789012');
    expect(state.otpSession.otp).toBe('123456');
  });
});
