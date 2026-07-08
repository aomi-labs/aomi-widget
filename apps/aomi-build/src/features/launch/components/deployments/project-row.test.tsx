import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectRow } from "./project-row";

describe("ProjectRow", () => {
  it("links to the project page and shows the repo", () => {
    render(
      <ProjectRow
        source={{
          id: 42,
          installationId: 1,
          repositoryLink: "alice/bot",
          apps: [],
          latestDeployment: null,
        }}
        requiredSdk="3.0.1"
      />,
    );
    const link = screen.getByRole("link", { name: /alice\/bot/ });
    expect(link).toHaveAttribute("href", "/operate/deployments?project=42");
  });

  it("shows deployment status instead of a live app count", () => {
    render(
      <ProjectRow
        source={{
          id: 42,
          installationId: 1,
          repositoryLink: "alice/bot",
          apps: [
            {
              name: "my-bot",
              isActive: false,
              loaded: false,
              appReleaseTag: "tag-old",
            },
          ],
          latestDeployment: { state: "recorded", sdkVersion: "3.0.1" },
        }}
        requiredSdk="3.0.1"
      />,
    );

    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByText("my-bot")).toBeInTheDocument();
    expect(screen.queryByText(/live app/i)).not.toBeInTheDocument();
  });
});
