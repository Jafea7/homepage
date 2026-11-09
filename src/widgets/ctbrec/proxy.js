import { createHmac } from "node:crypto";

import getServiceWidget from "utils/config/service-helpers";
import genericProxyHandler from "utils/proxy/handlers/generic";

// CTBRec signs the exact UTF-8 JSON request body with the ASCII bytes of
// the configured key (which happens to be base64-looking text). Do NOT decode it.
export default async function ctbrecProxyHandler(req, res, map) {
  const { group, service, index, endpoint } = req.query;
  const widget = await getServiceWidget(group, service, index);

  if (widget?.type !== "ctbrec" || !widget.key || !["health", "summary"].includes(endpoint)) {
    return res.status(400).json({ error: "Invalid CTBRec widget configuration or endpoint" });
  }

  const action = endpoint === "health" ? "health" : "listAll";
  const body = JSON.stringify({ action });
  const signature = createHmac("sha256", Buffer.from(widget.key, "utf8")).update(body, "utf8").digest("hex");

  req.method = "POST";
  req.body = body;
  req.extraHeaders = {
    "Content-Type": "application/json",
    "CTBREC-HMAC": signature,
  };

  return genericProxyHandler(req, res, map);
}
