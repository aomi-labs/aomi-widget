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
    expect(link).toHaveAttribute("href", "/deployments/42");
  });
});
