import { describe, expect, it } from "vitest";
import { planRoleTemplateCapabilitySync } from "../../../src/data-access/role-template-grant-writes.js";

const ROLE_ID = "role-1";

describe("planRoleTemplateCapabilitySync", () => {
  it("revokes active role_template grants for this role outside the desired set", () => {
    const plan = planRoleTemplateCapabilitySync(
      ["cap-a"],
      [
        {
          id: "g1",
          capability_id: "cap-a",
          grant_source: "role_template",
          source_role_id: ROLE_ID,
          revoked_at: null,
        },
        {
          id: "g2",
          capability_id: "cap-b",
          grant_source: "role_template",
          source_role_id: ROLE_ID,
          revoked_at: null,
        },
        {
          id: "g3",
          capability_id: "cap-c",
          grant_source: "role_template",
          source_role_id: "other-role",
          revoked_at: null,
        },
      ],
      ROLE_ID,
    );

    expect(plan.revokeGrantIds).toEqual(["g2"]);
    expect(plan.upsertCapabilityIds).toEqual([]);
  });

  it("upserts missing and reactivates revoked role_template grants for this role", () => {
    const plan = planRoleTemplateCapabilitySync(
      ["cap-a", "cap-b"],
      [
        {
          id: "g1",
          capability_id: "cap-a",
          grant_source: "role_template",
          source_role_id: ROLE_ID,
          revoked_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "g2",
          capability_id: "cap-b",
          grant_source: "role_template",
          source_role_id: ROLE_ID,
          revoked_at: null,
        },
      ],
      ROLE_ID,
    );

    expect(plan.revokeGrantIds).toEqual([]);
    expect(plan.upsertCapabilityIds).toEqual(["cap-a"]);
  });

  it("does not revoke or upsert over active manual grants", () => {
    const plan = planRoleTemplateCapabilitySync(
      ["cap-manual", "cap-new"],
      [
        {
          id: "g-manual",
          capability_id: "cap-manual",
          grant_source: "manual",
          source_role_id: null,
          revoked_at: null,
        },
      ],
      ROLE_ID,
    );

    expect(plan.revokeGrantIds).toEqual([]);
    expect(plan.upsertCapabilityIds).toEqual(["cap-new"]);
  });

  it("revokes every active role_template grant for the role when the desired set is empty", () => {
    const plan = planRoleTemplateCapabilitySync(
      [],
      [
        {
          id: "g1",
          capability_id: "cap-a",
          grant_source: "role_template",
          source_role_id: ROLE_ID,
          revoked_at: null,
        },
        {
          id: "g2",
          capability_id: "cap-b",
          grant_source: "role_template",
          source_role_id: ROLE_ID,
          revoked_at: null,
        },
        {
          id: "g-manual",
          capability_id: "cap-manual",
          grant_source: "manual",
          source_role_id: null,
          revoked_at: null,
        },
        {
          id: "g-delegated",
          capability_id: "cap-delegated",
          grant_source: "delegated",
          source_role_id: ROLE_ID,
          revoked_at: null,
        },
      ],
      ROLE_ID,
    );

    expect(plan.revokeGrantIds).toEqual(["g1", "g2"]);
    expect(plan.upsertCapabilityIds).toEqual([]);
  });

  it("skips upsert when a manual row exists even if revoked", () => {
    const plan = planRoleTemplateCapabilitySync(
      ["cap-manual"],
      [
        {
          id: "g-manual",
          capability_id: "cap-manual",
          grant_source: "manual",
          source_role_id: null,
          revoked_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      ROLE_ID,
    );

    expect(plan.upsertCapabilityIds).toEqual([]);
  });
});
