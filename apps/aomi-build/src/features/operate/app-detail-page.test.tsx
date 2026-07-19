import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appFixture } from "./fixtures";
import { AppDetailPage } from "./app-detail-page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("AppDetailPage", () => {
  beforeEach(() => push.mockReset());

  it("renders fixture detail under the clicked app identity", () => {
    const fixture = appFixture("goal-digger");
    expect(fixture).toBeDefined();
    render(
      <AppDetailPage
        app={fixture!}
        application="playground-example"
        project="1586"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "playground-example" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Example data")).toBeInTheDocument();
    expect(screen.getByText("Conversion funnel · 24h")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Back to observability" }),
    );
    expect(push).toHaveBeenCalledWith("/operate/observability?project=1586");
  });

  it("deep-links fixture rows through the real operate routes", () => {
    render(
      <AppDetailPage
        app={appFixture("goal-digger")!}
        application="goal-digger"
        project="1494"
      />,
    );

    fireEvent.click(screen.getByText("get_price"));
    expect(push).toHaveBeenCalledWith(
      "/operate/logs?app=goal-digger&tool=get_price&project=1494",
    );
  });
});
