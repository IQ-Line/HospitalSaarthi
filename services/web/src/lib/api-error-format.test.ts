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
});
