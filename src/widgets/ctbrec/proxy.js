import { createHmac } from "node:crypto";

import getServiceWidget from "utils/config/service-helpers";
import genericProxyHandler from "utils/proxy/handlers/generic";

// CTBRec's remote client displays its key as a Java signed-byte array.
// Accept that array (as YAML list or JSON string), or an already-decoded
// ASCII key. Never silently base64-decode the key.
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
  if (typeof parsed === "string" && parsed.length > 0) return Buffer.from(parsed, "utf8");
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
