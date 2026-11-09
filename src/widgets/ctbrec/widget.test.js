import { describe, expect, it } from "vitest";

import { expectWidgetConfigShape } from "test-utils/widget-config";

import widget from "./widget";

describe("ctbrec widget config", () => {
  it("exports a valid widget config", () => {
    expectWidgetConfigShape(widget);
    expect(widget.api).toBe("{url}/rec");
    expect(widget.mappings.health.body).toEqual({ action: "health" });
    expect(widget.mappings.summary.body).toEqual({ action: "listAll" });
  });

  it("merges health and workload from a JSON response", () => {
    const payload = Buffer.from(JSON.stringify({
      health: { trackedModels: 12, activeRecordings: 3 },
      workload: { recoveringRecordings: 1, missedHlsSegmentsLastHour: 2 },
    }));
    expect(widget.mappings.health.map(payload)).toEqual({
      trackedModels: 12,
      activeRecordings: 3,
      workload: { recoveringRecordings: 1, missedHlsSegmentsLastHour: 2 },
    });
  });
});
