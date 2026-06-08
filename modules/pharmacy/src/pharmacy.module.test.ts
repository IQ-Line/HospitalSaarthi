import { describe, expect, it } from "vitest";
import { PHARMACY_MODULE_KEY } from "./domain/pharmacy.types.js";

describe("pharmacy module scaffold", () => {
  it("exports module key", () => {
    expect(PHARMACY_MODULE_KEY).toBe("pharmacy");
  });
});
