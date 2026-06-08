import { describe, expect, it } from "vitest";
import { mapEmpiPayloadToQueuePatientFields } from "./empi-patient-summary.js";

describe("mapEmpiPayloadToQueuePatientFields", () => {
  it("maps nested EMPI patient detail payload", () => {
    expect(
      mapEmpiPayloadToQueuePatientFields({
        patient: {
          full_name: "Jane Doe",
          uhid: "123456789012345678",
          age_years: 33,
          gender: "female",
        },
      }),
    ).toEqual({
      patient_name: "Jane Doe",
      uhid: "123456789012345678",
      age_years: 33,
      gender: "female",
    });
  });

  it("returns nulls when payload is missing", () => {
    expect(mapEmpiPayloadToQueuePatientFields(null)).toEqual({
      patient_name: null,
      uhid: null,
      age_years: null,
      gender: null,
    });
  });
});
