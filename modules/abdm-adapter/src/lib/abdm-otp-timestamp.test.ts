import { describe, expect, it, vi } from "vitest";
import { abdmOtpTimestampIst } from "./abdm-otp-timestamp.js";

describe("abdmOtpTimestampIst", () => {
  it("formats wall-clock IST independent of host timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    expect(abdmOtpTimestampIst()).toBe("2026-01-15 17:30:00");
    vi.useRealTimers();
  });

  it("matches YYYY-MM-DD HH:mm:ss pattern", () => {
    expect(abdmOtpTimestampIst()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
