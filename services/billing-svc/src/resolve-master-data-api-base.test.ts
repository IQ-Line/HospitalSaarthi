import { afterEach, describe, expect, it } from "vitest";
import { resolveMasterDataApiBase } from "./resolve-master-data-api-base.js";

describe("resolveMasterDataApiBase", () => {
  const prevBase = process.env["MASTER_DATA_BASE_URL"];
  const prevUrl = process.env["MASTER_DATA_URL"];

  afterEach(() => {
    if (prevBase === undefined) delete process.env["MASTER_DATA_BASE_URL"];
    else process.env["MASTER_DATA_BASE_URL"] = prevBase;
    if (prevUrl === undefined) delete process.env["MASTER_DATA_URL"];
    else process.env["MASTER_DATA_URL"] = prevUrl;
  });

  it("returns undefined when no env is set", () => {
    delete process.env["MASTER_DATA_BASE_URL"];
    delete process.env["MASTER_DATA_URL"];
    expect(resolveMasterDataApiBase()).toBeUndefined();
  });

  it("appends /api/v1/master-data to service root", () => {
    delete process.env["MASTER_DATA_BASE_URL"];
    process.env["MASTER_DATA_URL"] = "http://localhost:8010";
    expect(resolveMasterDataApiBase()).toBe("http://localhost:8010/api/v1/master-data");
  });

  it("accepts a full API prefix", () => {
    process.env["MASTER_DATA_BASE_URL"] = "http://localhost:8010/api/v1/master-data/";
    expect(resolveMasterDataApiBase()).toBe("http://localhost:8010/api/v1/master-data");
  });
});
