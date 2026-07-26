import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { PackagesModal } from "./packages-modal";
import { seedAccountOverview } from "@portal/lib/account-overview";

type FetchCall = { input: string | URL | Request; init?: RequestInit };

/** `GET /api/account/apps` wire rows (backend `AppSpec`, snake_case). */
const CATALOG = [
  { name: "default" },
  { name: "uniswap", is_public: true, application_id: 7 },
  { name: "treasury-ops", is_public: false, application_id: 9, label: "Treasury Ops" },
];

function installFetchRecorder() {
  const calls: FetchCall[] = [];
  let installed = ["default", "uniswap"];
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init });
      const url = new URL(input.toString(), "https://portal.test");
      const method = init?.method ?? "GET";
      if (url.pathname === "/api/account/apps" && method === "GET") {
        return Response.json(CATALOG);
      }
      if (url.pathname === "/api/account/apps" && method === "PUT") {
        installed = (JSON.parse(String(init?.body)) as { apps: string[] }).apps;
        return Response.json({ apps: installed });
      }
      return new Response(`Unexpected ${method} ${url.pathname}`, { status: 500 });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return { calls };
}

const paths = (calls: FetchCall[]) =>
  calls.map(
    (c) =>
      `${c.init?.method ?? "GET"} ${new URL(c.input.toString(), "https://portal.test").pathname}`,
  );

async function renderModal() {
  await act(async () => {
    render(<PackagesModal onClose={() => undefined} />);
  });
}

describe("packages modal wiring", () => {
  beforeEach(() => {
    seedAccountOverview({
      user: { user_id: "acct-1", apps: ["default", "uniswap"] },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    seedAccountOverview(null);
  });

  it("loads the catalog from the account apps route", async () => {
    const { calls } = installFetchRecorder();

    await renderModal();

    expect(paths(calls)).toContain("GET /api/account/apps");
    // Wire row + decoration: uniswap gets its brand name; installed from the
    // account overview.
    expect(screen.getAllByText("Uniswap").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Remove Uniswap")).toBeTruthy();
    // The pinned core app shows as built in, never removable.
    expect(screen.getByText("Built in")).toBeTruthy();
    expect(screen.queryByLabelText("Remove Aomi Core")).toBeNull();
  });

  it("uninstalls by PUTting the replaced list", async () => {
    const { calls } = installFetchRecorder();

    await renderModal();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Remove Uniswap"));
    });

    const put = calls.find((c) => c.init?.method === "PUT");
    expect(put).toBeTruthy();
    expect(JSON.parse(String(put?.init?.body))).toEqual({ apps: ["default"] });
    // The row flips from the PUT response, not optimistically.
    expect(screen.queryByLabelText("Remove Uniswap")).toBeNull();
  });

  it("installs a personal app through the same replace", async () => {
    const { calls } = installFetchRecorder();

    await renderModal();
    await act(async () => {
      fireEvent.click(screen.getByText("Personal"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Install"));
    });

    const put = calls.find((c) => c.init?.method === "PUT");
    expect(JSON.parse(String(put?.init?.body))).toEqual({
      apps: ["default", "uniswap", "treasury-ops"],
    });
    expect(paths(calls)).toContain("PUT /api/account/apps");
  });
});
