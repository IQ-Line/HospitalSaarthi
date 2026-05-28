import { describe, expect, it } from "vitest";
import {
  exportKeyToShareSpkiB64,
  isSpkiKeyToShareB64,
  normalizePeerPublicKeyToPointB64,
} from "./fidelius-public-key.js";

const RAW_POINT =
  "BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=";

/** From Java FideliusKeyToShare on the same raw point. */
const JAVA_KEY_TO_SHARE =
  "MIIBMTCB6gYHKoZIzj0CATCB3gIBATArBgcqhkjOPQEBAiB/////////////////////////////////////////7TBEBCAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqYSRShRAQge0Je0Je0Je0Je0Je0Je0Je0Je0Je0Je0JgtenHcQyGQEQQQqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq0kWiCuGaG4oIa04B7dLHdI0UySPU1+bXxhsinpxaJ+ztPZAiAQAAAAAAAAAAAAAAAAAAAAFN753qL3nNZYEmMaXPXT7QIBCANCAAQqbAVt+yoHy8o8SStMxxxtuoQ48cyt+vAxDuD2qcxYUDNHIIWc4irryYef2p05x4rVRyjJ9DsK9R73B9X5tA6Q";

describe("fidelius-public-key", () => {
  it("exportKeyToShareSpkiB64 matches Java FideliusKeyToShare output", () => {
    expect(exportKeyToShareSpkiB64(RAW_POINT)).toBe(JAVA_KEY_TO_SHARE);
    expect(isSpkiKeyToShareB64(JAVA_KEY_TO_SHARE)).toBe(true);
    expect(isSpkiKeyToShareB64(RAW_POINT)).toBe(false);
  });

  it("normalizePeerPublicKeyToPointB64 accepts raw point and SPKI keyToShare", () => {
    expect(normalizePeerPublicKeyToPointB64(RAW_POINT)).toBe(RAW_POINT);
    expect(normalizePeerPublicKeyToPointB64(JAVA_KEY_TO_SHARE)).toBe(RAW_POINT);
  });

  it("rejects invalid key material", () => {
    expect(() => normalizePeerPublicKeyToPointB64("not-a-key")).toThrow(
      /65-byte uncompressed EC point or X509\/SPKI keyToShare/,
    );
  });
});
