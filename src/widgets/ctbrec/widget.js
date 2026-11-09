import ctbrecProxyHandler from "./proxy";

const widget = {
  api: "{url}/rec",
  proxyHandler: ctbrecProxyHandler,
  mappings: {
    health: {
      endpoint: "health",
      body: { action: "health" },
    },
    summary: {
      endpoint: "summary",
      body: { action: "listAll" },
    },
  },
};

export default widget;
