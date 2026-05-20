import type {
  CareContextRef,
  EmpiClient,
  HealthRecordBundleEntry,
  RecordFoundationClient,
} from "../ports.js";

/** Dev-only mocks when EMPI/RF are not running (see `ABDM_M2_MOCK_PLATFORM=true`). */
export class MockEmpiClient implements EmpiClient {
  constructor(
    private readonly defaultAbhaAddress = "test.user@sbx",
    private readonly patientId = "00000000-0000-4000-8000-000000000001",
  ) {}

  async findPatientByAbhaAddress(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<{ patientId: string; demographics: Record<string, unknown> } | null> {
    const addr = input.abhaAddress.trim().toLowerCase();
    if (!addr) return null;
    return {
      patientId: this.patientId,
      demographics: {
        abhaAddress: addr || this.defaultAbhaAddress,
        displayName: "M2 Mock Patient",
      },
    };
  }

  async findPatientByDemographics(): Promise<null> {
    return null;
  }

  async findAbhaAddressByPatientId(input: {
    patientId: string;
  }): Promise<string | null> {
    if (input.patientId === this.patientId) {
      return this.defaultAbhaAddress;
    }
    return null;
  }
}

export class MockRecordFoundationClient implements RecordFoundationClient {
  private readonly contexts: CareContextRef[] = [
    {
      id: "visit-mock-001",
      referenceNumber: "VISIT-MOCK-001",
      display: "OP consultation (mock)",
      hiType: "OPCONSULTATION",
    },
    {
      id: "visit-mock-002",
      referenceNumber: "VISIT-MOCK-002",
      display: "Lab report (mock)",
      hiType: "OPCONSULTATION",
    },
  ];

  async listUnlinkedCareContexts(_input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<CareContextRef[]> {
    return [...this.contexts];
  }

  async markCareContextLinked(_input: {
    iqTenantId: string;
    careContextId: string;
  }): Promise<void> {
    /* no-op for mock */
  }

  async fetchBundlesForConsent(_input: {
    iqTenantId: string;
    patientId: string;
    consentId: string;
  }): Promise<HealthRecordBundleEntry[]> {
    return [
      {
        careContextReference: "VISIT-MOCK-001",
        media: "application/fhir+json",
        contentJson: JSON.stringify({
          resourceType: "Bundle",
          type: "document",
          id: "mock-bundle-001",
        }),
      },
    ];
  }
}
