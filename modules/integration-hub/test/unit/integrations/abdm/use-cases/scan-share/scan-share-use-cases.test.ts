import { describe, expect, it, vi } from "vitest";
import type {
  ScanShareRepository,
  ShareIssuance,
} from "../../../../../../src/integrations/abdm/use-cases/scan-share/ports.js";
import {
  buildRegistrationPrefill,
  listPatientSummary,
  mapGender,
  parseSharePatient,
} from "../../../../../../src/integrations/abdm/use-cases/scan-share/profile-mapping.js";
import { qrValue } from "../../../../../../src/integrations/abdm/use-cases/scan-share/qr.js";
import {
  activeWindowSince,
  endOfIstDay,
  istIssueDate,
} from "../../../../../../src/integrations/abdm/use-cases/scan-share/time.js";
import { issueShareToken } from "../../../../../../src/integrations/abdm/use-cases/scan-share/issue-share-token.js";
import { getShareStatus } from "../../../../../../src/integrations/abdm/use-cases/scan-share/get-share-status.js";
import { listActiveShares } from "../../../../../../src/integrations/abdm/use-cases/scan-share/list-active-shares.js";
import { lookupShareToken } from "../../../../../../src/integrations/abdm/use-cases/scan-share/lookup-share-token.js";
import { prefillFromToken } from "../../../../../../src/integrations/abdm/use-cases/scan-share/prefill-from-token.js";
import { redeemShareToken } from "../../../../../../src/integrations/abdm/use-cases/scan-share/redeem-share-token.js";
import type {
  EmpiClient,
  GatewayClient,
} from "../../../../../../src/integrations/abdm/ports.js";

/**
 * In-memory {@link ScanShareRepository} that faithfully models the production
 * guards (active window, per-facility/day counter, active + not-redeemed
 * redemption gate). Redeeming a token flips it inactive/redeemed so a second
 * redeem — or a lookup afterwards — behaves exactly like the SQL adapter.
 */
class FakeScanShareRepo implements ScanShareRepository {
  tablesExistResult = true;
  allocateCalls = 0;
  private seq = 1;
  private readonly counters = new Map<string, number>();
  private readonly rows: Array<{
    row: ShareIssuance;
    facility: string;
    issueDate: string;
    active: boolean;
    redeemed: boolean;
  }> = [];

  async tablesExist(): Promise<boolean> {
    return this.tablesExistResult;
  }

  async findActiveByAbha(input: {
    facilityIdRef: string;
    abhaAddress: string;
    since: Date;
  }): Promise<ShareIssuance | null> {
    const hit = [...this.rows]
      .reverse()
      .find(
        (r) =>
          r.facility === input.facilityIdRef &&
          r.row.abha_address === input.abhaAddress &&
          r.active &&
          !r.redeemed &&
          r.row.issued_at >= input.since,
      );
    return hit ? hit.row : null;
  }

  async allocateToken(input: {
    facilityIdRef: string;
    abhaAddress: string;
    profile: Record<string, unknown>;
    patientId: string | null;
    issueDate: string;
    expiresAt: Date;
  }): Promise<ShareIssuance> {
    this.allocateCalls += 1;
    const key = `${input.facilityIdRef}|${input.issueDate}`;
    const n = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, n);
    const row: ShareIssuance = {
      id: `iss-${this.seq++}`,
      token_number: n,
      abha_address: input.abhaAddress,
      profile_json: input.profile,
      patient_id: input.patientId,
      issued_at: new Date(),
    };
    this.rows.push({
      row,
      facility: input.facilityIdRef,
      issueDate: input.issueDate,
      active: true,
      redeemed: false,
    });
    return row;
  }

  async listActive(input: {
    facilityIdRef: string;
    issueDate: string;
    since: Date;
  }): Promise<{ rows: ShareIssuance[]; runningToken: number }> {
    const live = this.rows.filter(
      (r) =>
        r.facility === input.facilityIdRef &&
        r.issueDate === input.issueDate &&
        r.active &&
        !r.redeemed &&
        r.row.issued_at >= input.since,
    );
    const rows = [...live].sort((a, b) => a.row.token_number - b.row.token_number).map((r) => r.row);
    const oldest = [...live].sort(
      (a, b) => a.row.issued_at.getTime() - b.row.issued_at.getTime(),
    )[0];
    return { rows, runningToken: oldest?.row.token_number ?? 0 };
  }

  async findByToken(input: {
    facilityIdRef: string;
    issueDate: string;
    tokenNumber: number;
    since: Date;
  }): Promise<ShareIssuance | null> {
    const hit = this.rows.find(
      (r) =>
        r.facility === input.facilityIdRef &&
        r.issueDate === input.issueDate &&
        r.row.token_number === input.tokenNumber &&
        r.active &&
        !r.redeemed &&
        r.row.issued_at >= input.since,
    );
    return hit ? hit.row : null;
  }

  async findByQuery(input: {
    facilityIdRef: string;
    issueDate: string;
    query: string;
    since: Date;
  }): Promise<ShareIssuance | null> {
    const numeric = Number.parseInt(input.query.trim(), 10);
    if (!Number.isNaN(numeric) && String(numeric) === input.query.trim()) {
      return this.findByToken({ ...input, tokenNumber: numeric });
    }
    const q = input.query.trim().toLowerCase();
    const hit = [...this.rows]
      .reverse()
      .find(
        (r) =>
          r.facility === input.facilityIdRef &&
          r.issueDate === input.issueDate &&
          r.active &&
          !r.redeemed &&
          r.row.issued_at >= input.since &&
          (r.row.abha_address.toLowerCase().includes(q) ||
            String(r.row.profile_json.abhaNumber ?? "")
              .toLowerCase()
              .includes(q)),
      );
    return hit ? hit.row : null;
  }

  async redeem(input: {
    facilityIdRef: string;
    issueDate: string;
    tokenNumber: number;
  }): Promise<boolean> {
    const hit = this.rows.find(
      (r) =>
        r.facility === input.facilityIdRef &&
        r.issueDate === input.issueDate &&
        r.row.token_number === input.tokenNumber &&
        r.active &&
        !r.redeemed,
    );
    if (!hit) return false;
    hit.active = false;
    hit.redeemed = true;
    return true;
  }
}

function fakeGateway(): GatewayClient & { post: ReturnType<typeof vi.fn> } {
  return {
    post: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    getPublicCertificate: vi.fn(),
    getDiagnosticsSnapshot: vi.fn(),
    invalidateBearer: vi.fn(),
  } as unknown as GatewayClient & { post: ReturnType<typeof vi.fn> };
}

const TENANT = "00000000-0000-4000-8000-0000000000aa";
const FACILITY = "IN-HIP-1";
const FIXED_NOW = new Date("2026-05-20T06:00:00.000Z"); // 11:30 IST
const now = () => FIXED_NOW;

function shareBody(over: Record<string, unknown> = {}) {
  return {
    profile: {
      patient: {
        abhaAddress: "walkin@sbx",
        name: "Asha Rani Devi",
        gender: "F",
        yearOfBirth: 1990,
        monthOfBirth: 3,
        dayOfBirth: 15,
        phoneNumber: "9876543210",
        abhaNumber: "12-3456-7890-1234",
        ...over,
      },
    },
    metaData: { context: "2" },
  };
}

describe("scan-share pure mappers", () => {
  it("parseSharePatient extracts abha + counter, rejects missing abha", () => {
    const ok = parseSharePatient(shareBody());
    expect(ok).toMatchObject({ abhaAddress: "walkin@sbx", counterContext: "2" });
    expect(parseSharePatient({ profile: { patient: {} } })).toBeNull();
    expect(parseSharePatient({})).toBeNull();
  });

  it("parseSharePatient defaults counter to 1", () => {
    const parsed = parseSharePatient({ profile: { patient: { abhaAddress: "x@sbx" } } });
    expect(parsed?.counterContext).toBe("1");
  });

  it("mapGender normalises variants", () => {
    expect(mapGender("F")).toBe("female");
    expect(mapGender("male")).toBe("male");
    expect(mapGender("x")).toBe("other");
    expect(mapGender("")).toBe("");
  });

  it("buildRegistrationPrefill maps name/dob/address", () => {
    const prefill = buildRegistrationPrefill(shareBody().profile.patient) as {
      patient: Record<string, unknown>;
    };
    expect(prefill.patient).toMatchObject({
      first_name: "Asha",
      middle_name: "Rani",
      last_name: "Devi",
      gender: "female",
      date_of_birth: "1990-03-15",
      abha_address: "walkin@sbx",
    });
  });

  it("listPatientSummary computes age from dob against the clock", () => {
    const summary = listPatientSummary(
      {
        id: "i1",
        token_number: 3,
        abha_address: "walkin@sbx",
        profile_json: shareBody().profile.patient,
        patient_id: null,
        issued_at: FIXED_NOW,
      },
      FIXED_NOW,
    );
    expect(summary).toMatchObject({ token_number: 3, patient_name: "Asha Rani Devi", age_years: 36 });
  });
});

describe("qrValue", () => {
  it("sandbox emits the phrsbx deep link", () => {
    const qr = qrValue({ hipId: "IN-HIP-1", hipDisplayName: "Clinic", gatewayEnvironment: "sandbox" });
    expect(qr.is_live).toBe(false);
    expect(qr.qr_value).toContain("phrsbx.abdm.gov.in/share-profile?hip-id=IN-HIP-1");
  });
  it("production emits a JSON payload", () => {
    const qr = qrValue({ hipId: "IN-HIP-1", hipDisplayName: "Clinic", gatewayEnvironment: "production" });
    expect(qr.is_live).toBe(true);
    expect(JSON.parse(qr.qr_value)).toEqual({ hipId: "IN-HIP-1", code: "1", facilityName: "Clinic" });
  });
});

describe("time helpers", () => {
  it("derive IST day + end-of-day + active window from a fixed clock", () => {
    expect(istIssueDate(FIXED_NOW)).toBe("2026-05-20");
    expect(endOfIstDay(FIXED_NOW).toISOString()).toBe("2026-05-20T18:29:59.999Z");
    expect(activeWindowSince(FIXED_NOW).toISOString()).toBe("2026-05-20T05:00:00.000Z");
  });
});

describe("issueShareToken", () => {
  const empi = (patientId: string | null): EmpiClient =>
    ({
      findPatientByAbhaAddress: vi
        .fn()
        .mockResolvedValue(patientId ? { patientId, demographics: {} } : null),
    }) as unknown as EmpiClient;

  const base = {
    iqTenantId: TENANT,
    facilityIdRef: FACILITY,
    integrationId: "11111111-1111-4111-8111-111111111111",
    requestId: "req-1",
    xCmId: "sbx",
    gatewayEnvironment: "sandbox" as const,
    body: shareBody(),
  };

  it("allocates a token and acks SUCCESS for a fresh walk-in", async () => {
    const repo = new FakeScanShareRepo();
    const gateway = fakeGateway();
    await issueShareToken(base, { repo, gateway, empi: empi("pat-1"), now });

    expect(repo.allocateCalls).toBe(1);
    const [ackCall] = gateway.post.mock.calls;
    expect(ackCall?.[0].path).toBe("/api/hiecm/patient-share/v3/on-share");
    expect(ackCall?.[0].body.acknowledgement.status).toBe("SUCCESS");
    expect(ackCall?.[0].body.acknowledgement.profile.tokenNumber).toBe("1");
  });

  it("dedupes an already-active ABHA: acks error, does NOT allocate again", async () => {
    const repo = new FakeScanShareRepo();
    const gateway = fakeGateway();
    await issueShareToken(base, { repo, gateway, empi: empi("pat-1"), now });
    gateway.post.mockClear();

    await issueShareToken(base, { repo, gateway, empi: empi("pat-1"), now });

    expect(repo.allocateCalls).toBe(1); // guard held: no second allocation
    const [ackCall] = gateway.post.mock.calls;
    expect(ackCall?.[0].body.error.message).toBe("Token Already generated for the patient");
  });

  it("tolerates EMPI failure (patient_id stays null) and still allocates", async () => {
    const repo = new FakeScanShareRepo();
    const gateway = fakeGateway();
    const failingEmpi = {
      findPatientByAbhaAddress: vi.fn().mockRejectedValue(new Error("empi down")),
    } as unknown as EmpiClient;

    await issueShareToken(base, { repo, gateway, empi: failingEmpi, now });
    expect(repo.allocateCalls).toBe(1);
    const active = await repo.listActive({ facilityIdRef: FACILITY, issueDate: "2026-05-20", since: activeWindowSince(FIXED_NOW) });
    expect(active.rows[0]?.patient_id).toBeNull();
  });

  it("throws on an unusable profile payload", async () => {
    const repo = new FakeScanShareRepo();
    await expect(
      issueShareToken({ ...base, body: { profile: { patient: {} } } }, {
        repo,
        gateway: fakeGateway(),
        empi: empi(null),
        now,
      }),
    ).rejects.toThrow("invalid scan-and-share profile payload");
  });
});

describe("getShareStatus", () => {
  const profile = { hipId: "IN-HIP-1", hipDisplayName: "Clinic", gatewayEnvironment: "sandbox" };

  it("unavailable when HIP id missing", async () => {
    const res = await getShareStatus({ profile: { ...profile, hipId: "" } }, { repo: new FakeScanShareRepo() });
    expect(res.available).toBe(false);
    expect(res.reason).toContain("HIP ID is not configured");
  });
  it("unavailable when DB not connected", async () => {
    const res = await getShareStatus({ profile }, { repo: null });
    expect(res).toMatchObject({ available: false, hip_id: "IN-HIP-1" });
    expect(res.reason).toContain("database is not connected");
  });
  it("unavailable when tables missing", async () => {
    const repo = new FakeScanShareRepo();
    repo.tablesExistResult = false;
    const res = await getShareStatus({ profile }, { repo });
    expect(res.reason).toContain("Scan-and-share tables are missing");
  });
  it("available with QR when tables present", async () => {
    const res = await getShareStatus({ profile }, { repo: new FakeScanShareRepo() });
    expect(res).toMatchObject({ available: true, hip_id: "IN-HIP-1", is_live: false });
    expect(res.qr_value).toContain("phrsbx");
  });
});

describe("read + redeem use-cases", () => {
  async function seeded() {
    const repo = new FakeScanShareRepo();
    await repo.allocateToken({
      facilityIdRef: FACILITY,
      abhaAddress: "walkin@sbx",
      profile: shareBody().profile.patient,
      patientId: null,
      issueDate: "2026-05-20",
      expiresAt: endOfIstDay(FIXED_NOW),
    });
    return repo;
  }

  it("listActiveShares returns token-ordered summaries + running token", async () => {
    const repo = await seeded();
    const res = await listActiveShares({ iqTenantId: TENANT, facilityIdRef: FACILITY }, { repo, now });
    expect(res.running_token).toBe(1);
    expect(res.patients).toHaveLength(1);
    expect(res.patients[0]).toMatchObject({ token_number: 1, abha_address: "walkin@sbx" });
  });

  it("lookupShareToken resolves by token number and by abha text", async () => {
    const repo = await seeded();
    const byToken = await lookupShareToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, query: "1" }, { repo, now });
    expect(byToken).toMatchObject({ token_number: 1, freeze_abha: true });
    const byText = await lookupShareToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, query: "walkin" }, { repo, now });
    expect(byText?.token_number).toBe(1);
  });

  it("lookupShareToken returns null when nothing matches", async () => {
    const repo = await seeded();
    const miss = await lookupShareToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, query: "nobody" }, { repo, now });
    expect(miss).toBeNull();
  });

  it("prefillFromToken resolves an active token and null for unknown", async () => {
    const repo = await seeded();
    expect(await prefillFromToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, tokenNumber: 1 }, { repo, now })).toMatchObject({ token_number: 1 });
    expect(await prefillFromToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, tokenNumber: 99 }, { repo, now })).toBeNull();
  });

  it("redeemShareToken succeeds once then fails (used-token guard)", async () => {
    const repo = await seeded();
    expect(await redeemShareToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, tokenNumber: 1 }, { repo, now })).toBe(true);
    // Second redeem must fail — token is now inactive/redeemed.
    expect(await redeemShareToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, tokenNumber: 1 }, { repo, now })).toBe(false);
    // And it disappears from the active queue + lookups.
    expect((await listActiveShares({ iqTenantId: TENANT, facilityIdRef: FACILITY }, { repo, now })).patients).toHaveLength(0);
    expect(await prefillFromToken({ iqTenantId: TENANT, facilityIdRef: FACILITY, tokenNumber: 1 }, { repo, now })).toBeNull();
  });
});
