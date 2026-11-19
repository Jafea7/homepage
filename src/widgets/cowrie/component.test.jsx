// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";
const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));
vi.mock("utils/proxy/use-widget-api", () => ({ default: useWidgetAPI }));
import Component from "./component";
const summary = { last24h: { sessions: 4, login_attempts: 8, unique_ips: 3, commands: 2 }, lifetime: { sessions: 20, login_attempts: 70, unique_ips: 12, commands: 11 } };
describe("cowrie component", () => {
  beforeEach(() => vi.clearAllMocks());
  it("renders four default counters from last24h", () => {
    useWidgetAPI.mockReturnValue({ data: summary });
    const { container } = renderWithProviders(<Component service={{ widget: { type: "cowrie" } }} />);
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "cowrie.sessions", 4);
    expectBlockValue(container, "cowrie.commands", 2);
  });
  it("supports lifetime and field order/cap", () => {
    useWidgetAPI.mockReturnValue({ data: summary });
    const { container } = renderWithProviders(<Component service={{ widget: { type: "cowrie", period: "lifetime", fields: ["commands", "sessions", "unique_ips", "login_attempts", "login_success"] } }} />);
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "cowrie.commands", 11);
  });
  it("shows loading placeholders instead of fabricated zeroes", () => {
    useWidgetAPI.mockReturnValue({ data: undefined });
    const { container } = renderWithProviders(<Component service={{ widget: { type: "cowrie" } }} />);
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expect(screen.getByText("cowrie.sessions")).toBeInTheDocument();
  });
  it("propagates errors", () => {
    useWidgetAPI.mockReturnValue({ error: { message: "Unauthorized" } });
    renderWithProviders(<Component service={{ widget: { type: "cowrie" } }} />, { settings: { hideErrors: false } });
    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });
});
