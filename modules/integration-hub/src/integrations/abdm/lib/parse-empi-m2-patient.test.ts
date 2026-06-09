import { describe, expect, it } from "vitest";
import { parseEmpiPatientDetail } from "./parse-empi-m2-patient.js";

describe("parseEmpiPatientDetail", () => {
  it("reads abha_address from identifiers and maps gender", () => {
    const profile = parseEmpiPatientDetail({
      patient: {
        full_name: "Kamal Singh",
        gender: "male",
        year_of_birth: 1992,
        abha_number: "91-1234-5678-9012",
      },
      identifiers: [
        { identifier_type: "abha_address", identifier_value: "kamal@sbx" },
      ],
    });
    expect(profile).toEqual({
      abhaAddress: "kamal@sbx",
      abhaNumber: "91-1234-5678-9012",
      patientName: "Kamal Singh",
      gender: "M",
      yearOfBirth: 1992,
      phoneNo: undefined,
    });
  });

  it("returns null when ABHA address is missing", () => {
    expect(
      parseEmpiPatientDetail({
        patient: { full_name: "No ABHA", gender: "female" },
        identifiers: [],
      }),
    ).toBeNull();
  });

  it("returns null when year of birth cannot be resolved", () => {
    expect(
      parseEmpiPatientDetail({
        patient: { full_name: "No YOB", gender: "male" },
        identifiers: [{ identifier_type: "abha_address", identifier_value: "user@sbx" }],
      }),
    ).toBeNull();
  });
});
