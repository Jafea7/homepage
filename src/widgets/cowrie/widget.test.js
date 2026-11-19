import { describe, it } from "vitest";
import { expectWidgetConfigShape } from "test-utils/widget-config";
import widget from "./widget";
describe("cowrie widget config", () => {
  it("has a valid proxy configuration", () => expectWidgetConfigShape(widget));
});
