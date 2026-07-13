import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ToastProvider } from "@build/components/control-plane/toast";

const searchParams = { current: new URLSearchParams("") };

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.current,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@build/features/operate/client", () => ({
  operateFetch: vi.fn(async () => ({ daily: [] })),
}));

vi.mock("@aomi-labs/deploy/lifecycle", () => ({
  deploymentLifecycleFromSource: () => ({
    kind: "empty",
    repo: "a/b",
    statusLabel: "No deployment",
    statusTone: "muted",
    message: "No deployment recorded yet.",
    appNames: [],
    releaseTags: [],
  }),
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
    recordsByApp: {},
    recordsError: null,
    deployFlow: { phase: "idle" },
    loadHistory: vi.fn(),
    loadSecrets: vi.fn(),
    loadRecords: vi.fn(),
    rollback: vi.fn(),
    reload: vi.fn(),
    deployNewVersion: vi.fn(),
    promote: vi.fn(),
    deactivate: vi.fn(),
  }),
}));

import { ProjectPage } from "./project-page";

function renderPage() {
  return render(
    <ToastProvider>
      <ProjectPage sourceId={1} tabBaseHref="/projects/1" />
    </ToastProvider>,
  );
}

describe("ProjectPage", () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams("");
  });

  it("defaults to the Home tab", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: /^home$/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Project home")).toBeInTheDocument();
  });

  it("renders the tab named by ?tab=", () => {
    searchParams.current = new URLSearchParams("tab=deployments");
    renderPage();
    const projectTabs = screen.getAllByRole("tablist")[0];
    expect(
      within(projectTabs).getByRole("tab", { name: /^deployments$/i }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Project home")).not.toBeInTheDocument();
  });
});
