import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsBillingPanel } from "./settings-billing-panel";

describe("SettingsBillingPanel", () => {
  it("teaches Usage vs Environment and does not fake invoices", () => {
    render(<SettingsBillingPanel />);

    expect(
      screen.getByText(/billing is not connected yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not show live invoices/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /operate → usage/i }),
    ).toHaveAttribute("href", "/operate/usage");
    expect(
      screen.getByRole("link", { name: /account → secrets → environment/i }),
    ).toHaveAttribute("href", "/settings/secrets");
    expect(screen.queryByText(/invoice #/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
  });
});
