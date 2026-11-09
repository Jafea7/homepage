import ctbrecProxyHandler from "./proxy";

const widget = {
  api: "{url}/rec",
  proxyHandler: ctbrecProxyHandler,
  mappings: {
    health: {
      endpoint: "health",
      method: "POST",
      body: { action: "health" },
    },
    summary: {
      endpoint: "summary",
      method: "POST",
      body: { action: "listAll" },
    },
  },
};

export default widget;
