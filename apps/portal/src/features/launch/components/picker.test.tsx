import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Picker } from "./picker";

describe("Picker", () => {
  it("renders both path cards", () => {
    render(<Picker onChoose={() => {}} />);
    expect(screen.getByText("One-click")).toBeInTheDocument();
    expect(screen.getByText("Fork & customize")).toBeInTheDocument();
  });

  it("shows the recommended badge on the oneshot card", () => {
    render(<Picker onChoose={() => {}} />);
    expect(screen.getByText("recommended")).toBeInTheDocument();
  });

  it("renders grant descriptions", () => {
    render(<Picker onChoose={() => {}} />);
    expect(
      screen.getByText(/broad — can create repositories/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/narrow — one repo, pull requests & checks/),
    ).toBeInTheDocument();
  });

  it("renders choose buttons", () => {
    render(<Picker onChoose={() => {}} />);
    const chooseButtons = screen.getAllByText("Choose");
    expect(chooseButtons.length).toBe(2);
  });

  it("renders the heading", () => {
    render(<Picker onChoose={() => {}} />);
    expect(screen.getByText("Deploy an example agent")).toBeInTheDocument();
  });
});
