import { describe, expect, it } from "vitest";
import { NRCeS_PROFILES } from "../../../src/profile-registry/index.js";
import { validateAgainstProfile } from "../../../src/validators/profile-validator.js";
import { buildDocumentBundle } from "../../../src/builders/bundle.js";
import { buildComposition } from "../../../src/builders/composition.js";
import { buildEncounter } from "../../../src/builders/encounter.js";

describe("document bundle assembly", () => {
  it("builds a document bundle and passes structural profile validation", () => {
    const pinned = NRCeS_PROFILES.OpConsultRecord;
    const composition = buildComposition({
      profile: "OpConsultRecord",
      type: { text: "OP Consult" },
      subject: { reference: "Patient/p1" },
      date: "2026-01-01T00:00:00.000Z",
      author: [{ reference: "Practitioner/doc1" }],
      title: "OP Consult note",
      sections: [],
    });
    const encounter = buildEncounter({
      status: "finished",
      class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "AMB",
      },
      subject: { reference: "Patient/p1" },
    });
    const bundle = buildDocumentBundle({ composition, entries: [encounter] });
    const result = validateAgainstProfile(bundle, pinned.canonicalUrl, pinned.version);
    expect(result.valid).toBe(true);
    expect(bundle.type).toBe("document");
    expect(bundle.entry?.[0]?.resource?.resourceType).toBe("Composition");
    expect(bundle.entry?.[1]?.resource?.resourceType).toBe("Encounter");
  });
});
