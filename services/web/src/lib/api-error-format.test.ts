import { describe, expect, it } from 'vitest';
import { formatApiErrorBody } from './api-error-format';

describe('formatApiErrorBody', () => {
  it('joins FastAPI validation detail array messages', () => {
    const body = JSON.stringify({
      detail: [
        { type: 'missing', loc: ['body', 'official_descriptor'], msg: 'Field required', input: {} },
      ],
    });
    expect(formatApiErrorBody(422, body)).toBe('Field required');
  });

  it('uses string detail when present', () => {
    expect(formatApiErrorBody(400, JSON.stringify({ detail: 'Bad request' }))).toBe('Bad request');
  });

  it('uses error field from Fastify-style bodies', () => {
    expect(
      formatApiErrorBody(
        409,
        JSON.stringify({ error: 'tenant slug already exists', code: 'CONFLICT' }),
      ),
    ).toBe('tenant slug already exists');
  });

  it('prefers message over generic Fastify error label', () => {
    expect(
      formatApiErrorBody(
        409,
        JSON.stringify({
          statusCode: 409,
          error: 'Conflict',
          message:
            'provider_department_tariff_already_exists: this doctor already has a tariff in this department',
        }),
      ),
    ).toBe('This doctor already has a tariff in this department.');
  });

  it('humanizes registration fee duplicate message', () => {
    expect(
      formatApiErrorBody(
        409,
        JSON.stringify({
          statusCode: 409,
          error: 'Conflict',
          message:
            'registration_fee_already_exists: only one active registration fee is allowed per tenant',
        }),
      ),
    ).toBe(
      'Only one active registration fee is allowed. Deactivate the existing registration fee first.',
    );
  });
});
