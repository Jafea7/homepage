// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";

const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));
vi.mock("utils/proxy/use-widget-api", () => ({ default: useWidgetAPI }));

import Component from "./component";

const service = { widget: { type: "wyl" } };

describe("widgets/wyl/component", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders placeholders while loading", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: undefined });
    const { container } = renderWithProviders(<Component service={service} />, {
      settings: { hideErrors: false },
    });
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expect(screen.getByText("wyl.total")).toBeInTheDocument();
    expect(screen.getByText("wyl.unknown")).toBeInTheDocument();
  });

  it("renders numeric status values including zeros", () => {
    useWidgetAPI.mockReturnValue({
      data: { Total: 15, Online: 15, Offline: 0, Known: 0, Unknown: 15 },
      error: undefined,
    });
    const { container } = renderWithProviders(<Component service={service} />, {
      settings: { hideErrors: false },
    });
    expect(useWidgetAPI).toHaveBeenCalledWith(service.widget, "status");
    expectBlockValue(container, "wyl.total", 15);
    expectBlockValue(container, "wyl.online", 15);
    expectBlockValue(container, "wyl.offline", 0);
    expectBlockValue(container, "wyl.unknown", 15);
  });

  it("supports the optional known field and configured ordering", () => {
    useWidgetAPI.mockReturnValue({
      data: { Total: 15, Online: 15, Offline: 0, Known: 0, Unknown: 15 },
      error: undefined,
    });
    const custom = { widget: { type: "wyl", fields: ["known", "online"] } };
    const { container } = renderWithProviders(<Component service={custom} />, {
      settings: { hideErrors: false },
    });
    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expectBlockValue(container, "wyl.known", 0);
    expectBlockValue(container, "wyl.online", 15);
  });

  it("does not invent values for missing fields", () => {
    useWidgetAPI.mockReturnValue({ data: { Total: 2 }, error: undefined });
    const { container } = renderWithProviders(<Component service={service} />, {
      settings: { hideErrors: false },
    });
    expectBlockValue(container, "wyl.total", 2);
  });

  it("renders an API error", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: { message: "Unavailable" } });
    renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });
    expect(useWidgetAPI).toHaveBeenCalledWith(service.widget, "status");
  });
});
