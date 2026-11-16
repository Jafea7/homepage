import { asJson } from "utils/proxy/api-helpers";
import credentialedProxyHandler from "utils/proxy/handlers/credentialed";

const widget = {
  api: "{url}/api/{endpoint}",
  proxyHandler: credentialedProxyHandler,

  mappings: {
    containers: {
      endpoint: "agents/{env}/containers/counts",
      map: (data) => asJson(data).data,
    },
    images: {
      endpoint: "agents/{env}/images/counts",
      map: (data) => asJson(data).data,
    },
    updates: {
      endpoint: "agents/{env}/images/updates/summary",
      map: (data) => asJson(data).data,
    },
  },
};

export default widget;
