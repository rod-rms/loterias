import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { InfoHelp } from "../../src/shared/components/InfoHelp";

/**
 * Regression test for a mobile defect: the popover was always centered
 * under its trigger (`left-1/2 -translate-x-1/2`), so a trigger near either
 * screen edge produced a popover that visually clipped outside the
 * viewport. It must instead measure the trigger's position on open and pick
 * a collision-safe alignment.
 */
describe("InfoHelp — collision-safe popover positioning", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("aligns to the left edge of the trigger when centering would overflow the left side of a narrow viewport", () => {
    vi.stubGlobal("innerWidth", 375);
    render(<InfoHelp title="Título" body="Explicação" label="Ajuda" />);
    const button = screen.getByRole("button", { name: "Ajuda" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      left: 4,
      right: 24,
      width: 20,
      top: 0,
      bottom: 20,
      height: 20,
      x: 4,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(button);

    const popover = screen.getByRole("tooltip");
    expect(popover.className).toContain("left-0");
    expect(popover.className).not.toContain("left-1/2");
    expect(popover.className).not.toContain("right-0");
  });

  it("aligns to the right edge of the trigger when centering would overflow the right side of a narrow viewport", () => {
    vi.stubGlobal("innerWidth", 375);
    render(<InfoHelp title="Título" body="Explicação" label="Ajuda" />);
    const button = screen.getByRole("button", { name: "Ajuda" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      left: 355,
      right: 371,
      width: 16,
      top: 0,
      bottom: 20,
      height: 20,
      x: 355,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(button);

    const popover = screen.getByRole("tooltip");
    expect(popover.className).toContain("right-0");
    expect(popover.className).not.toContain("left-1/2");
  });

  it("centers under the trigger when there is enough room on both sides", () => {
    vi.stubGlobal("innerWidth", 1280);
    render(<InfoHelp title="Título" body="Explicação" label="Ajuda" />);
    const button = screen.getByRole("button", { name: "Ajuda" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      left: 620,
      right: 660,
      width: 40,
      top: 0,
      bottom: 20,
      height: 20,
      x: 620,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(button);

    const popover = screen.getByRole("tooltip");
    expect(popover.className).toContain("left-1/2");
    expect(popover.className).toContain("-translate-x-1/2");
  });

  it("caps the popover width to the viewport regardless of alignment", () => {
    render(<InfoHelp title="Título" body="Explicação" label="Ajuda" />);
    fireEvent.click(screen.getByRole("button", { name: "Ajuda" }));
    const popover = screen.getByRole("tooltip");
    expect(popover.className).toContain("max-w-[calc(100vw-2rem)]");
  });
});
