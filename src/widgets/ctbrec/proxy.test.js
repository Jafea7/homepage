import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServiceWidget, genericProxyHandler } = vi.hoisted(() => ({
  getServiceWidget: vi.fn(),
  genericProxyHandler: vi.fn(),
}));

vi.mock("utils/config/service-helpers", () => ({ default: getServiceWidget }));
vi.mock("utils/proxy/handlers/generic", () => ({ default: genericProxyHandler }));

import proxy from "./proxy";

function request(endpoint = "health") {
  return { method: "GET", query: { group: "Recorders", service: "CTBRec", index: "0", endpoint } };
}

function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("widgets/ctbrec/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    genericProxyHandler.mockResolvedValue(undefined);
    getServiceWidget.mockResolvedValue({ type: "ctbrec", key: Buffer.from("secret-key").toString("base64") });
  });

  it.each([["health", "health"], ["summary", "listAll"]])("signs the %s request using decoded Base64 bytes", async (endpoint, action) => {
    const req = request(endpoint);
    const res = response();
    const map = { endpoint };
    await proxy(req, res, map);
    const body = JSON.stringify({ action });
    expect(req.method).toBe("POST");
    expect(req.body).toBe(body);
    expect(req.extraHeaders).toEqual({
      "Content-Type": "application/json",
      "CTBREC-HMAC": createHmac("sha256", Buffer.from("secret-key")).update(body).digest("hex"),
    });
    expect(genericProxyHandler).toHaveBeenCalledWith(req, res, map);
  });

  it("supports legacy signed-byte array keys", async () => {
    getServiceWidget.mockResolvedValue({ type: "ctbrec", key: "[-1, 0, 127]" });
    const req = request();
    await proxy(req, response(), {});
    expect(req.extraHeaders["CTBREC-HMAC"]).toBe(
      createHmac("sha256", Buffer.from([255, 0, 127])).update('{"action":"health"}').digest("hex"),
    );
  });

  it.each(["not-base64!", "", "[]", "[256]"])("rejects invalid key %s", async (key) => {
    getServiceWidget.mockResolvedValue({ type: "ctbrec", key });
    const res = response();
    await proxy(request(), res, {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(genericProxyHandler).not.toHaveBeenCalled();
  });

  it("rejects unsupported endpoints", async () => {
    const res = response();
    await proxy(request("delete"), res, {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(genericProxyHandler).not.toHaveBeenCalled();
  });
});
