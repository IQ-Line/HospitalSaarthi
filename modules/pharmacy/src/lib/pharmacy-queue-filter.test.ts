import { describe, expect, it } from "vitest";
import type { PharmacyQueueItem } from "../domain/pharmacy.types.js";
import {
  matchesPharmacyQueueSearch,
  matchesPharmacyQueueStatus,
  pharmacyQueueNeedsFilteredScan,
} from "./pharmacy-queue-filter.js";

const row: PharmacyQueueItem = {
  walk_in_order: false,
  record_id: null,
  visit_id: "b1111111-1111-4111-8111-111111111101",
  patient_id: "a1111111-1111-4111-8111-111111111101",
  walk_in_patient_id: null,
  prescription_id: "c1111111-1111-4111-8111-111111111101",
  doctor_id: "d1111111-1111-4111-8111-111111111101",
  visit_status: "completed",
  prescription_status: "final",
  updated_at: "2026-06-04T05:41:20.369726Z",
  finalized_at: "2026-06-04T05:41:20.369726Z",
  medicine_count: 2,
  patient_name: "Jane Doe",
  uhid: "123456789012345678",
  phone: null,
  age_years: 33,
  gender: "female",
  doctor_name: "Dr. Demo DoctorOne",
  has_dispense: false,
};

describe("pharmacy-queue-filter", () => {
  it("matches patient name, uhid, doctor, and formatted rx token", () => {
    expect(matchesPharmacyQueueSearch(row, "jane")).toBe(true);
    expect(matchesPharmacyQueueSearch(row, "1234567890")).toBe(true);
    expect(matchesPharmacyQueueSearch(row, "doctorone")).toBe(true);
    expect(matchesPharmacyQueueSearch(row, "rx-111111111101")).toBe(true);
    expect(matchesPharmacyQueueSearch(row, "missing")).toBe(false);
  });

  it("filters by dispense status", () => {
    expect(matchesPharmacyQueueStatus(row, "pending")).toBe(true);
    expect(matchesPharmacyQueueStatus({ ...row, has_dispense: true }, "pending")).toBe(false);
    expect(matchesPharmacyQueueStatus({ ...row, has_dispense: true }, "issued")).toBe(true);
  });

  it("detects when filtered scan is required", () => {
    expect(pharmacyQueueNeedsFilteredScan("", "all")).toBe(false);
    expect(pharmacyQueueNeedsFilteredScan("jane", "all")).toBe(true);
    expect(pharmacyQueueNeedsFilteredScan("", "pending")).toBe(true);
  });
});
