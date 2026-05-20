import { describe, expect, it } from "vitest";
import { hasDeskPricingOverrides, validateDeskPricingPolicy } from "./desk-pricing-policy.js";

describe("desk-pricing-policy", () => {
  it("detects override fields", () => {
    expect(hasDeskPricingOverrides({ unit_price_override: 10 } as never)).toBe(true);
    expect(hasDeskPricingOverrides({ item_code: "X" } as never)).toBe(false);
  });

  it("forbids overrides when gate is off", () => {
    const result = validateDeskPricingPolicy(
      {
        source_module: "registration",
        unit_price_override: 50,
      } as never,
      false,
    );
    expect(result?.ok).toBe(false);
    if (!result || result.ok) return;
    expect(result.code).toBe("FORBIDDEN");
  });
});
