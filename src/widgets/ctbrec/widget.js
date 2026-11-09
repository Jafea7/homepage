import ctbrecProxyHandler from "./proxy";

const widget = {
  api: "{url}/rec",
  proxyHandler: ctbrecProxyHandler,
  mappings: {
    health: {
      endpoint: "health",
      body: { action: "health" },
      map: (data) => ({ ...data.health, workload: data.workload }),
    },
    summary: {
      endpoint: "summary",
      body: { action: "listAll" },
    },
  },
};

export default widget;
