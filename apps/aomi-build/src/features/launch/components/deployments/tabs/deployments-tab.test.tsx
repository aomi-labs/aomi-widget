import { describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { ToastProvider } from "@build/components/control-plane/toast";
import { DeploymentsTab } from "./deployments-tab";

function renderTab(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const promote = vi.fn(async () => ({
  ok: true,
  promote: {
    deploymentId: "dep_1_ra_bbbb",
    releaseTags: ["t1"],
    status: "promoted",
  },
}));
const deactivate = vi.fn(async () => ({ ok: true, apps: ["my-bot"] }));

const detail = {
  source: {
    id: 1,
    repositoryLink: "a/b",
    apps: [
      {
        name: "my-bot",
        isActive: true,
        loaded: true,
        appReleaseTag: "t-current",
      },
    ],
  },
  loading: false,
  loadRecords: vi.fn(),
  refreshRecords: vi.fn(),
  deployNewVersion: vi.fn(),
  deployFlow: { phase: "idle" },
  recordsByApp: {
    "my-bot": [
      {
        deploymentId: "dep_1_ra_currentcmt",
        releaseTag: "t-current",
        actor: "alice",
        createdAt: 200,
        sdkVersion: "3.0.1",
        current: true,
      },
      {
        deploymentId: "dep_1_ra_oldcommit1",
        releaseTag: "t-old",
        actor: "alice",
        createdAt: 100,
        sdkVersion: "3.0.1",
        current: false,
      },
    ],
  },
  promote,
  deactivate,
  reload: vi.fn(),
} as unknown as ReturnType<
  typeof import("@build/features/launch/hooks/use-project-detail").useProjectDetail
>;

describe("DeploymentsTab", () => {
  it("renders deployments from the DB timeline, current first", async () => {
    renderTab(<DeploymentsTab detail={detail} />);
    expect(detail.loadRecords).toHaveBeenCalled();
    expect(await screen.findByText("dep_1_ra_currentcmt")).toBeInTheDocument();
    expect(screen.getByText("dep_1_ra_oldcommit1")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /activity/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders promotion activity in the Activity subtab", async () => {
    renderTab(<DeploymentsTab detail={detail} />);
    fireEvent.click(screen.getByRole("tab", { name: /activity/i }));
    expect(screen.getByRole("tab", { name: /activity/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      await screen.findByText(/promoted · dep_1_ra_currentcmt/),
    ).toBeInTheDocument();
  });

  it("offers Deactivate in the toolbar and Promote on older deployments", () => {
    renderTab(<DeploymentsTab detail={detail} />);
    expect(
      screen.getByRole("button", { name: /deactivate/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /promote/i }),
    ).toBeInTheDocument();
  });

  it("confirms before promoting an older deployment", async () => {
    renderTab(<DeploymentsTab detail={detail} />);
    fireEvent.click(screen.getByRole("button", { name: /promote/i }));
    expect(promote).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: /promote deployment/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /promote/i }));
    await waitFor(() =>
      expect(promote).toHaveBeenCalledWith("dep_1_ra_oldcommit1"),
    );
  });

  it("confirms before deactivating the current deployment", async () => {
    renderTab(<DeploymentsTab detail={detail} />);
    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    expect(deactivate).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", {
      name: /deactivate deployment/i,
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /deactivate/i }),
    );
    await waitFor(() => expect(deactivate).toHaveBeenCalledWith(["my-bot"]));
  });

  it("shows a deactivated state and makes the previous current deployment promotable", async () => {
    renderTab(<DeploymentsTab detail={detail} />);
    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    const dialog = screen.getByRole("dialog", {
      name: /deactivate deployment/i,
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /deactivate/i }),
    );

    await screen.findByText(/No deployment is currently live/i);

    expect(screen.queryByText("Current")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deactivate/i })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /promote/i })).toHaveLength(2);
  });

  it("triggers a new-version deploy", () => {
    renderTab(<DeploymentsTab detail={detail} />);
    fireEvent.click(
      screen.getByRole("button", { name: /deploy new version/i }),
    );
    expect(detail.deployNewVersion).toHaveBeenCalled();
  });
});
