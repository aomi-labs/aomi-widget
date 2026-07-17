import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  creditMeterPercent,
  SettingsUsageMeter,
} from "./settings-primitives";

describe("creditMeterPercent", () => {
  it("calculates and clamps credit usage", () => {
    expect(creditMeterPercent(25, 100)).toBe(25);
    expect(creditMeterPercent(150, 100)).toBe(100);
    expect(creditMeterPercent(-10, 100)).toBe(0);
    expect(creditMeterPercent(10, 0)).toBe(0);
  });
});

describe("SettingsUsageMeter", () => {
  it("exposes credit usage as an accessible progress bar", () => {
    render(<SettingsUsageMeter used={25} limit={100} />);

    const meter = screen.getByRole("progressbar", { name: "Credits used" });
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuenow", "25");
    expect(meter).toHaveAttribute(
      "aria-valuetext",
      "25 of 100 credits used",
    );
    expect(screen.getByText("75 remaining")).toBeInTheDocument();
  });
});
