import { describe, expect, it } from 'vitest';
import { buildApplyRoleTemplateRequestBody } from './role-template-capability-picker.js';

const ROLE_ID = 'a107b93a-c083-4a66-9c88-c6706d99a49d';
const CAP_A = 'f47ac10b-58cc-4372-a567-0e02b2c3d611';
const CAP_B = 'f47ac10b-58cc-4372-a567-0e02b2c3d612';

describe('buildApplyRoleTemplateRequestBody', () => {
  it('omits role_template_capability_ids when the full role set is selected', () => {
    const body = buildApplyRoleTemplateRequestBody(ROLE_ID, [CAP_A, CAP_B], [CAP_A, CAP_B]);

    expect(body).toEqual({ role_id: ROLE_ID });
    expect(body.role_template_capability_ids).toBeUndefined();
  });

  it('includes only the picked subset when partially selected', () => {
    const body = buildApplyRoleTemplateRequestBody(ROLE_ID, [CAP_A], [CAP_A, CAP_B]);

    expect(body.role_id).toBe(ROLE_ID);
    expect(body.role_template_capability_ids).toEqual([CAP_A]);
  });

  it('treats empty selection as full role set and omits role_template_capability_ids', () => {
    const body = buildApplyRoleTemplateRequestBody(ROLE_ID, [], [CAP_A, CAP_B]);

    expect(body).toEqual({ role_id: ROLE_ID });
    expect(body.role_template_capability_ids).toBeUndefined();
  });

  it('returns role_id only when the role has no capabilities', () => {
    const body = buildApplyRoleTemplateRequestBody(ROLE_ID, [], []);

    expect(body).toEqual({ role_id: ROLE_ID });
  });
});
