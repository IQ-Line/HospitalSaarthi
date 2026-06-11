import { describe, expect, it } from "vitest";
import { buildOrderDescription, mapUiStatusToDb } from "./inpatient-order.js";

describe("buildOrderDescription", () => {
  it("combines item name with dosage and frequency", () => {
    const description = buildOrderDescription({
      id: "1",
      iq_tenant_id: "t",
      episode_id: "e",
      order_number: "ORD-1",
      order_category: "medication",
      item_code: "manual:paracetamol",
      item_name: "Paracetamol",
      quantity: "10",
      dosage_instruction: "500mg · Oral",
      frequency: "BD",
      duration_days: 5,
      priority: "routine",
      status: "placed",
      completed_at: null,
      cancelled_reason: null,
      billing_status: "pending",
      notes: null,
      idempotency_key: null,
      created_at: "2026-06-10T00:00:00.000Z",
      updated_at: "2026-06-10T00:00:00.000Z",
    });
    expect(description).toBe("Paracetamol · 500mg · Oral · BD");
  });
});

describe("mapUiStatusToDb", () => {
  it("maps pending to placed", () => {
    expect(mapUiStatusToDb("pending")).toBe("placed");
  });
});
