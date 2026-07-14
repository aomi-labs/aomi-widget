import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import {
  CommandPalette,
  openCommandPalette,
} from "./command-palette";

describe("CommandPalette", () => {
  beforeEach(() => {
    push.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens from the header Search event", async () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog", { name: /command palette/i })).toBeNull();

    openCommandPalette();

    expect(
      await screen.findByRole("dialog", { name: /command palette/i }),
    ).toBeInTheDocument();
  });

  it("toggles open on ⌘K / Ctrl+K", async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, {
      key: "k",
      code: "KeyK",
      metaKey: true,
    });

    expect(
      await screen.findByRole("dialog", { name: /command palette/i }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, {
      key: "k",
      code: "KeyK",
      metaKey: true,
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /command palette/i }),
      ).toBeNull();
    });
  });
});
