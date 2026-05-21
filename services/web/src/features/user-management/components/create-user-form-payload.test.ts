import { describe, expect, it } from 'vitest';
import { buildCreateUserRequestBody } from './create-user-form.js';
import type { CreateUserFormValues } from './create-user-form-sections.js';

const baseValues: CreateUserFormValues = {
  full_name: 'Manish Gupta',
  email: 'manish@gmail.com',
  password: 'manish@123',
  phone: '',
  username: 'manishusername',
  department: '',
  clearance_tier_required: 0,
  role_template_ids: ['a107b93a-c083-4a66-9c88-c6706d99a49d'],
  role_capability_selection_ids: ['cap-create-user'],
};

describe('buildCreateUserRequestBody', () => {
  it('includes role_template_capability_ids when all role capabilities are selected (default UI)', () => {
    const body = buildCreateUserRequestBody(baseValues, true, ['cap-create-user']);

    expect(body.role_template_ids).toEqual(['a107b93a-c083-4a66-9c88-c6706d99a49d']);
    expect(body.role_template_capability_ids).toEqual(['cap-create-user']);
    expect(body.capability_ids).toEqual([]);
  });

  it('includes only the picked subset when partially selected', () => {
    const body = buildCreateUserRequestBody(
      {
        ...baseValues,
        role_capability_selection_ids: ['cap-create-user'],
      },
      true,
      ['cap-create-user', 'cap-read-user'],
    );

    expect(body.role_template_capability_ids).toEqual(['cap-create-user']);
  });

  it('falls back to all role capabilities when selection state is empty but catalog is known', () => {
    const body = buildCreateUserRequestBody(
      {
        ...baseValues,
        role_capability_selection_ids: [],
      },
      true,
      ['cap-create-user'],
    );

    expect(body.role_template_capability_ids).toEqual(['cap-create-user']);
  });

  it('omits role and capabilities when access cannot be managed', () => {
    const body = buildCreateUserRequestBody(baseValues, false, ['cap-create-user']);

    expect(body.role_template_ids).toEqual([]);
    expect(body.role_template_capability_ids).toBeUndefined();
  });
});
