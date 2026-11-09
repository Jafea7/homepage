// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";

const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));
vi.mock("utils/proxy/use-widget-api", () => ({ default: useWidgetAPI }));

import Component from "./component";

const health = {
  trackedModels: 123,
  onlineModels: 31,
  activeRecordings: 8,
  activeFfmpegProcesses: 7,
  postProcessing: { queueSize: 3, activeCount: 2, completedTaskCount: 19 },
  workload: { recoveringRecordings: 1, missedHlsSegmentsLastHour: 5 },
  throughputBytes: 10000000,
  throughputTimeframeMillis: 1000,
  hostCpuUsagePercent: 22.5,
  disk: { freeBytes: 25000000000 },
  httpPool: { inUse: 4 },
  recorderRunning: true,
  recorderStartedAt: "2026-11-10T00:00:00Z",
  capturedAt: "2026-11-10T02:00:00Z",
};
const summary = {
  models: [{ suspended: true, bookmarked: true }, { suspended: false, bookmarked: false }],
  recordings: [{ status: "RECORDING" }, { status: "POST_PROCESSING" }],
};

function mockAPI(h = health, s = summary, errors = {}) {
  useWidgetAPI.mockImplementation((_widget, endpoint) => {
    if (endpoint === "health") return { data: h, error: errors.health };
    if (endpoint === "summary") return { data: s, error: errors.summary };
    return { data: undefined, error: undefined };
  });
}

function renderWidget(fields) {
  const widget = { type: "ctbrec", ...(fields ? { fields } : {}) };
  return { widget, ...renderWithProviders(<Component service={{ widget }} />, { settings: { hideErrors: false } }) };
}

describe("widgets/ctbrec/component", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders default counters and avoids the summary request", () => {
    mockAPI();
    const { container, widget } = renderWidget();
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "Tracked", 123);
    expectBlockValue(container, "Online", 31);
    expectBlockValue(container, "Recording", 8);
    expectBlockValue(container, "PP Queue", 3);
    expect(useWidgetAPI).toHaveBeenCalledWith(widget, "health");
    expect(useWidgetAPI).toHaveBeenCalledWith(widget, "");
  });

  it("honours configured order and caps fields at four", () => {
    mockAPI();
    const fields = ["cpu", "speed", "recovering", "hlsMissed", "tracked"];
    const { container, widget } = renderWidget(fields);
    const labels = Array.from(container.querySelectorAll(".service-block-label")).map((node) => node.textContent);
    expect(labels).toEqual(["CPU", "Speed", "Recovering", "HLS Missed"]);
    expectBlockValue(container, "CPU", "22.5%");
    expectBlockValue(container, "Speed", "10.0 MB/s");
    expectBlockValue(container, "Recovering", 1);
    expectBlockValue(container, "HLS Missed", 5);
    expect(widget.fields).toEqual(fields);
  });

  it("fetches summary only when selected fields require it", () => {
    mockAPI();
    const { container, widget } = renderWidget(["paused", "bookmarked", "processing", "totalRecordings"]);
    expect(useWidgetAPI).toHaveBeenCalledWith(widget, "summary");
    expectBlockValue(container, "Paused", 1);
    expectBlockValue(container, "Bookmarked", 1);
    expectBlockValue(container, "Processing", 1);
    expectBlockValue(container, "Recordings", 2);
  });

  it("shows loading placeholders for missing data", () => {
    mockAPI(undefined, undefined);
    const { container } = renderWidget();
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expect(screen.getAllByText("-")).toHaveLength(4);
  });

  it("does not invent zero values for unavailable metrics", () => {
    mockAPI({});
    const { container } = renderWidget(["tracked", "online", "recording", "ppQueue"]);
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expect(screen.getAllByText("-")).toHaveLength(4);
  });

  it("renders the API error instead of counters", () => {
    mockAPI(undefined, undefined, { health: { message: "CTBRec unavailable" } });
    const { container } = renderWidget();
    expect(container.querySelectorAll(".service-block")).toHaveLength(0);
    expect(screen.getByText("CTBRec unavailable")).toBeInTheDocument();
  });

  it("falls back to defaults for unrecognised fields", () => {
    mockAPI();
    const { container } = renderWidget(["notAField"]);
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "Tracked", 123);
  });
});
