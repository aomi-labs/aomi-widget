import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HelpBadge } from "./help-badge";

describe("HelpBadge", () => {
  it("uses the shared Aomi help trigger and tooltip contract", () => {
    render(<HelpBadge label="About this setting">Helpful context.</HelpBadge>);

    const trigger = screen.getByRole("button", { name: "About this setting" });
    const tooltip = screen.getByRole("tooltip");

    expect(trigger).toHaveTextContent("?");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
    expect(trigger).toHaveClass("h-[18px]", "w-[18px]", "text-[11px]");
    expect(tooltip).toHaveTextContent("Helpful context.");
    expect(tooltip).toHaveClass("w-[190px]", "rounded-[8px]", "text-[11px]");
  });
});
