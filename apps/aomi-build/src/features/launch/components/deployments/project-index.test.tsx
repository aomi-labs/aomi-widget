import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@portal/features/launch/hooks/use-projects", () => ({
  useProjects: () => ({
    state: {
      status: "ready",
      sources: [
        {
          id: 3,
          installationId: 1,
          repositoryLink: "alice/bot",
          apps: [],
          latestDeployment: null,
        },
      ],
      sdk: {
        ok: true,
        serverTags: [],
        sdkStatus: { requiredVersion: "3.0.1", status: "unknown" },
      },
      github: { signedIn: true, githubLogin: "alice", githubUserId: "u" },
    },
    reload: vi.fn(),
  }),
}));

import { ProjectIndex } from "./project-index";

describe("ProjectIndex", () => {
  it("lists projects with links", async () => {
    render(<ProjectIndex />);
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /alice\/bot/ }),
      ).toHaveAttribute("href", "/projects/3"),
    );
  });
});
