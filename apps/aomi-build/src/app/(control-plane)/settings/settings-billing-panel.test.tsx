import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@build/lib/chat-url", () => ({
  resolveChatUrl: () => "https://chat.aomi.dev",
}));

import { SettingsBillingPanel } from "./settings-billing-panel";

describe("SettingsBillingPanel", () => {
  it("uses product language and does not expose rail jargon or fake invoices", () => {
    render(<SettingsBillingPanel />);

    expect(screen.getByText(/^payment methods$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/how chat users pay/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/chat account/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/does not show live invoices/i)).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /operate → usage/i }),
    ).toHaveAttribute("href", "/operate/usage");
    expect(
      screen.getByRole("link", { name: /account → secrets → environment/i }),
    ).toHaveAttribute("href", "/settings/secrets");
    expect(screen.getByRole("link", { name: /open chat/i })).toHaveAttribute(
      "href",
      "https://chat.aomi.dev",
    );

    expect(screen.queryByText(/tempo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/byok/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/x402/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invoice #/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
  });
});
