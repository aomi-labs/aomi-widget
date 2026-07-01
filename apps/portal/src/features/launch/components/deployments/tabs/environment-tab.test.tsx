import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EnvironmentTab } from "./environment-tab";

const detail = {
  source: {
    id: 1,
    installationId: 5,
    repositoryLink: "a/b",
    apps: [{ name: "demo", isActive: true, loaded: true }],
    latestDeployment: null,
  },
  loadSecrets: vi.fn(),
  secretsByApp: { demo: ["$SECRET:APP:demo::API_KEY"] },
} as unknown as ReturnType<
  typeof import("@portal/features/launch/hooks/use-project-detail").useProjectDetail
>;

describe("EnvironmentTab", () => {
  it("shows handle names but not values", async () => {
    render(<EnvironmentTab detail={detail} />);
    await waitFor(() =>
      expect(
        screen.getByText("$SECRET:APP:demo::API_KEY"),
      ).toBeInTheDocument(),
    );
    expect(detail.loadSecrets).toHaveBeenCalled();
  });
});
