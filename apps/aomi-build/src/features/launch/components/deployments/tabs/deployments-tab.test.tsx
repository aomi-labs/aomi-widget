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

/** Builds the `detail` prop DeploymentsTab expects. Defaults have no
 *  required-secret gaps; pass `hasMissingSecrets` to simulate one. */
function makeDetail(
  overrides: {
    hasMissingSecrets?: (app: string) => boolean;
    sdkVersion?: string;
    requiredSdk?: string;
    upgradeSdk?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const sdkVersion = overrides.sdkVersion ?? "3.0.1";
  return {
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
    sdk: {
      sdkStatus: { requiredVersion: overrides.requiredSdk ?? "3.0.1" },
    },
    loadRecords: vi.fn(),
    loadRequiredSecrets: vi.fn(),
    hasMissingSecrets: overrides.hasMissingSecrets ?? (() => false),
    refreshRecords: vi.fn(),
    redeploySource: vi.fn(),
    upgradeSdk:
      overrides.upgradeSdk ??
      vi.fn(async () => ({
        status: "current",
        requiredSdkVersion: "3.0.1",
        sourceRef: "abc1234",
      })),
    deployFlow: { phase: "idle" },
    recordsByApp: {
      "my-bot": [
        {
          deploymentId: "dep_1_ra_currentcmt",
          releaseTag: "t-current",
          actor: "alice",
          createdAt: 200,
          sdkVersion,
          current: true,
        },
        {
          deploymentId: "dep_1_ra_oldcommit1",
          releaseTag: "t-old",
          actor: "alice",
          createdAt: 100,
          sdkVersion,
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
}

const detail = makeDetail();

describe("DeploymentsTab", () => {
  it("renders deployments from the DB timeline, current first", async () => {
    renderTab(<DeploymentsTab detail={detail} />);
    expect(detail.loadRecords).toHaveBeenCalled();
    expect(
      await screen.findByText(/Live · my-bot · 2 deployments/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("my-bot").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("dep_1_ra_currentcmt")).toBeInTheDocument();
    expect(screen.getByText("dep_1_ra_oldcommit1")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /promotions/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders promotion activity in the Promotions subtab", async () => {
    renderTab(<DeploymentsTab detail={detail} />);
    fireEvent.click(screen.getByRole("tab", { name: /promotions/i }));
    expect(screen.getByRole("tab", { name: /promotions/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect((await screen.findAllByText(/promoted ·/)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("dep_1_ra_currentcmt").length).toBeGreaterThan(
      0,
    );
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

  it("redeploys from the linked repository", () => {
    renderTab(<DeploymentsTab detail={detail} />);
    fireEvent.click(
      screen.getByRole("button", { name: /redeploy from linked repository/i }),
    );
    expect(detail.redeploySource).toHaveBeenCalled();
  });

  it("marks the current row outdated and creates an SDK upgrade PR", async () => {
    const upgradeSdk = vi.fn(async () => ({
      status: "pull_request" as const,
      requiredSdkVersion: "3.0.3",
      sourceRef: "abc1234",
      branch: "aomi/sdk-3.0.3",
      files: ["Cargo.toml"],
      pullRequest: {
        number: 7,
        url: "https://github.com/alice/bot/pull/7",
        created: true,
      },
    }));
    const outdated = makeDetail({
      sdkVersion: "3.0.2",
      requiredSdk: "3.0.3",
      upgradeSdk,
    });
    renderTab(<DeploymentsTab detail={outdated} />);

    expect(screen.getByText("Outdated")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to 3.0.3" }));
    expect(
      await screen.findByRole("link", { name: "Review upgrade PR" }),
    ).toHaveAttribute("href", "https://github.com/alice/bot/pull/7");
    expect(upgradeSdk).toHaveBeenCalledOnce();
  });

  it("disables Promote for a deployment whose app has a missing required secret", () => {
    const blockedDetail = makeDetail({
      hasMissingSecrets: (app) => app === "my-bot",
    });
    renderTab(<DeploymentsTab detail={blockedDetail} />);
    expect(blockedDetail.loadRequiredSecrets).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /promote/i })).toBeDisabled();
    expect(screen.getByText(/required secrets missing/i)).toBeInTheDocument();
  });

  it("is honest when live but deployment history is empty", () => {
    const liveEmpty = {
      ...detail,
      recordsByApp: { "my-bot": [] },
    } as typeof detail;
    renderTab(<DeploymentsTab detail={liveEmpty} />);
    expect(screen.getByText("No deployment history yet")).toBeInTheDocument();
    expect(
      screen.getByText(/project is live, but no deployment records/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("No deployments yet")).not.toBeInTheDocument();
  });
});
