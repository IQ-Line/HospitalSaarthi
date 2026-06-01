import { describe, expect, it } from "vitest";
import { extractConsentCareContextRefs } from "./extract-consent-care-context-refs.js";

describe("extractConsentCareContextRefs", () => {
  it("prefers m3 artefact careContexts", () => {
    const refs = extractConsentCareContextRefs({
      m3Artefact: {
        careContexts: [
          { patientReference: "p", careContextReference: "VISIT-2026-010" },
        ],
      } as never,
      consentArtefact: null,
    });
    expect(refs).toEqual(["VISIT-2026-010"]);
  });

  it("falls back to M2 hip notify artefact (top-level consentDetail)", () => {
    const refs = extractConsentCareContextRefs({
      m3Artefact: null,
      consentArtefact: {
        artefactJson: {
          consentDetail: {
            careContexts: [
              { patientReference: "kamalthefirst@sbx", careContextReference: "VISIT-2026-008" },
            ],
          },
        },
      } as never,
    });
    expect(refs).toEqual(["VISIT-2026-008"]);
  });

  it("falls back to on-fetch artefact (consent.consentDetail)", () => {
    const refs = extractConsentCareContextRefs({
      m3Artefact: null,
      consentArtefact: {
        artefactJson: {
          consent: {
            consentDetail: {
              careContexts: [
                { patientReference: "kamalthefirst@sbx", careContextReference: "VISIT-2026-010" },
              ],
            },
          },
        },
      } as never,
    });
    expect(refs).toEqual(["VISIT-2026-010"]);
  });

  it("falls back to nested notification.consentDetail", () => {
    const refs = extractConsentCareContextRefs({
      m3Artefact: null,
      consentArtefact: {
        artefactJson: {
          notification: {
            consentDetail: {
              careContexts: [
                { patientReference: "kamalthefirst@sbx", careContextReference: "VISIT-2026-004" },
              ],
            },
          },
        },
      } as never,
    });
    expect(refs).toEqual(["VISIT-2026-004"]);
  });
});
