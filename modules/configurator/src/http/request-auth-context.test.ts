import { describe, expect, it } from "vitest";
import {
  getRequestAuthContext,
  isPlatformSuperAdmin,
} from "./request-auth-context.js";

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function mockRequest(input: {
  user?: { roles: string[]; orgId?: string; userId?: string };
  authorization?: string;
}): Parameters<typeof getRequestAuthContext>[0] {
  return {
    headers: input.authorization ? { authorization: input.authorization } : {},
    user: input.user as never,
  } as Parameters<typeof getRequestAuthContext>[0];
}

describe("getRequestAuthContext", () => {
  it("reads roles from request.user when identity plugin ran", () => {
    const ctx = getRequestAuthContext(
      mockRequest({
        user: { roles: ["super-admin"], orgId: "org-1", userId: "user-1" },
      }),
    );
    expect(ctx.roles).toEqual(["super-admin"]);
    expect(ctx.orgId).toBe("org-1");
    expect(isPlatformSuperAdmin(ctx.roles)).toBe(true);
  });

  it("decodes roles and org_id from Bearer JWT when user is absent", () => {
    const token = `hdr.${b64urlJson({
      sub: "user-2",
      org_id: "org-2",
      roles: ["tenant-admin"],
    })}.sig`;
    const ctx = getRequestAuthContext(mockRequest({ authorization: `Bearer ${token}` }));
    expect(ctx.roles).toEqual(["tenant-admin"]);
    expect(ctx.orgId).toBe("org-2");
    expect(isPlatformSuperAdmin(ctx.roles)).toBe(false);
  });
});
