import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { useProjectDetail } from "../../../hooks/use-project-detail";
import { AttemptControls } from "./deployment-attempts";

type Detail = ReturnType<typeof useProjectDetail>;
function detail(branch?: string) {
  return {
    redeploySource: vi.fn(),
    attempts: {
      attempts: branch === undefined ? [] : [{ branch, conclusion: "failure" }],
      busy: false,
      isSuccess: true,
    },
  } as unknown as Detail;
}

describe("deployment branch selection", () => {
  it("retries pinned-commit builds using the repository default branch", () => {
    const state = detail("");
    render(<AttemptControls detail={state} blocked={false} />);
    expect(screen.getByLabelText("Deployment branch")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Retry deployment" }));
    expect(state.redeploySource).toHaveBeenCalledWith("");
  });

  it("does not carry a previous project's branch into a project without attempts", () => {
    const { rerender } = render(
      <AttemptControls detail={detail("feature/previous")} blocked={false} />,
    );
    expect(screen.getByLabelText("Deployment branch")).toHaveValue(
      "feature/previous",
    );
    const next = detail();
    rerender(<AttemptControls detail={next} blocked={false} />);
    expect(screen.getByLabelText("Deployment branch")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
    expect(next.redeploySource).toHaveBeenCalledWith("");
  });
});
