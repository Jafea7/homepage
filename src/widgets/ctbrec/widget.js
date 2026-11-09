import { asJson } from "utils/proxy/api-helpers";

import ctbrecProxyHandler from "./proxy";

const widget = {
  api: "{url}/rec",
  proxyHandler: ctbrecProxyHandler,
  mappings: {
    health: {
      endpoint: "health",
      body: { action: "health" },
      map: (data) => {
        const response = asJson(data);
        return { ...response.health, workload: response.workload };
      },
    },
    summary: {
      endpoint: "summary",
      body: { action: "listAll" },
    },
  },
};

export default widget;
