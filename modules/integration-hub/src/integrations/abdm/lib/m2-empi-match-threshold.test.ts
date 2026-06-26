import { describe, expect, it } from "vitest";
import { MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE } from "./m2-empi-match-threshold.js";

describe("MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE", () => {
  it("requires a high-confidence demographic match", () => {
    expect(MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE).toBeGreaterThanOrEqual(0.8);
  });
});
