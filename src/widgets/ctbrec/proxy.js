import { createHmac } from "node:crypto";

import getServiceWidget from "utils/config/service-helpers";
import genericProxyHandler from "utils/proxy/handlers/generic";

// CTBRec's Settings.key is byte[]. Jackson serializes it as Base64 in JSON.
// Decode Base64 strings to the original key bytes. Also accept legacy
// signed-byte arrays as YAML arrays or JSON array strings.
function keyBytes(value) {
  let parsed = value;
  if (typeof parsed === "string" && parsed.trim().startsWith("[")) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (Array.isArray(parsed)) {
    if (!parsed.length || !parsed.every((n) => Number.isInteger(n) && n >= -128 && n <= 255)) return null;
    return Buffer.from(parsed.map((n) => n & 0xff));
  }
  if (typeof parsed === "string" && parsed.length > 0) {
    const encoded = parsed.trim();
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null;
    const decoded = Buffer.from(encoded, "base64");
    return decoded.length > 0 ? decoded : null;
  }
  return null;
}
export default async function ctbrecProxyHandler(req, res, map) {
  const { group, service, index, endpoint } = req.query;
  const widget = await getServiceWidget(group, service, index);

  if (widget?.type !== "ctbrec" || !widget.key || !["health", "summary"].includes(endpoint)) {
    return res.status(400).json({ error: "Invalid CTBRec widget configuration or endpoint" });
  }

  const key = keyBytes(widget.key);
  if (!key) return res.status(400).json({ error: "Invalid CTBRec HMAC key format" });

  const action = endpoint === "health" ? "health" : "listAll";
  const body = JSON.stringify({ action });
  const signature = createHmac("sha256", key).update(body, "utf8").digest("hex");

  req.method = "POST";
  req.body = body;
  req.extraHeaders = {
    "Content-Type": "application/json",
    "CTBREC-HMAC": signature,
  };

  return genericProxyHandler(req, res, map);
}
