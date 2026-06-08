import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpMasterDataGateway } from "./http-master-data-gateway.js";

describe("HttpMasterDataGateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the v1 master-data medicine endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: {
          id: "3f32fbb1-ae80-4505-b02f-dc5c207ec551",
          display_name: "Sumo",
          strength_display: "500mg",
          is_active: true,
          is_deleted: false,
          price: 12,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpMasterDataGateway("http://localhost:8010");
    const row = await gateway.getMedicineById(
      "94478596-14d1-4e7e-b8d2-2995c61c3c90",
      "3f32fbb1-ae80-4505-b02f-dc5c207ec551",
      "token-1",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8010/api/v1/master-data/visitpad/medicines/3f32fbb1-ae80-4505-b02f-dc5c207ec551",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          iq_tenant_id: "94478596-14d1-4e7e-b8d2-2995c61c3c90",
        }),
      }),
    );
    expect(row?.display_name).toBe("Sumo");
  });
});
