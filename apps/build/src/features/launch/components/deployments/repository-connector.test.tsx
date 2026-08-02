import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const githubAppInstallUrl = vi.hoisted(() => vi.fn());

vi.mock("@build/features/launch/client", () => ({ githubAppInstallUrl }));

import { RepositoryConnector } from "./repository-connector";

describe("RepositoryConnector", () => {
  beforeEach(() => {
    githubAppInstallUrl.mockResolvedValue(
      "https://github.com/apps/aomi-build/installations/new",
    );
  });

  it("starts a repo-specific install and returns to the scoped project page", async () => {
    const navigate = vi.fn();
    render(<RepositoryConnector platform="somm.finance" navigate={navigate} />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "GitHub repository" }),
      {
        target: { value: "PeggyJV/somm-agent" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(githubAppInstallUrl).toHaveBeenCalledWith({
        platform: "somm.finance",
        repo: "PeggyJV/somm-agent",
        returnTo: "http://localhost:3000/projects?platform=somm.finance",
      }),
    );
    expect(navigate).toHaveBeenCalledWith(
      "https://github.com/apps/aomi-build/installations/new",
    );
  });

  it("explains invalid repository input without opening GitHub", () => {
    render(<RepositoryConnector platform="somm.finance" navigate={vi.fn()} />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "GitHub repository" }),
      {
        target: { value: "not-a-repository" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a GitHub repository as owner/name.",
    );
    expect(githubAppInstallUrl).not.toHaveBeenCalled();
  });
});
