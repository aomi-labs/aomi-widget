import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@build/lib/chat-url", () => ({
  resolveChatUrl: () => "https://chat.aomi.dev",
}));

import { SettingsBillingPanel } from "./settings-billing-panel";

describe("SettingsBillingPanel", () => {
  it("keeps short product copy without rail jargon or fake invoices", () => {
    render(<SettingsBillingPanel />);

    expect(screen.getByText(/^payment setup$/i)).toBeInTheDocument();
    expect(screen.getByText(/managed in/i)).toBeInTheDocument();
    expect(screen.getByText(/^coming later$/i)).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /operate → usage/i }),
    ).toHaveAttribute("href", "/operate/usage");
    expect(
      screen.getByRole("link", { name: /secrets → environment/i }),
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
