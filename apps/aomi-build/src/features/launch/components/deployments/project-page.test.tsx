import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=environment"),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@build/features/launch/hooks/use-project-detail", () => ({
  useProjectDetail: () => ({
    source: {
      id: 1,
      repositoryLink: "a/b",
      apps: [],
      latestDeployment: null,
      installationId: 5,
    },
    loading: false,
    error: null,
    sdk: null,
    history: null,
    historyError: null,
    secretsByApp: {},
    secretsError: null,
    loadHistory: vi.fn(),
    loadSecrets: vi.fn(),
    rollback: vi.fn(),
    reload: vi.fn(),
  }),
}));

import { ProjectPage } from "./project-page";

describe("ProjectPage", () => {
  it("renders the tab named by ?tab=", () => {
    render(<ProjectPage sourceId={1} />);
    expect(screen.getByRole("tab", { name: /environment/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
