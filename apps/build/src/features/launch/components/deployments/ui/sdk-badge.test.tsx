import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SdkBadge } from "./sdk-badge";

describe("SdkBadge", () => {
  it("shows ok when stamped matches required", () => {
    render(<SdkBadge stamped="3.0.1" required="3.0.1" />);
    expect(screen.getByTestId("sdk-badge")).toHaveAttribute("data-state", "ok");
  });
  it("shows outdated when they differ", () => {
    render(<SdkBadge stamped="3.0.0" required="3.0.1" />);
    expect(screen.getByTestId("sdk-badge")).toHaveAttribute(
      "data-state",
      "outdated",
    );
  });
  it("shows missing when stamp absent", () => {
    render(<SdkBadge stamped={null} required="3.0.1" />);
    expect(screen.getByTestId("sdk-badge")).toHaveAttribute(
      "data-state",
      "missing",
    );
  });
});
