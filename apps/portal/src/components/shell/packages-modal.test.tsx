import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { inferLibraryCategory, PackagesModal } from "./packages-modal";
import { PackageRow } from "./package-row";
import { toCatalogPackage } from "./packages-catalog";
import { seedAccountOverview } from "@portal/lib/account-overview";

type FetchCall = { input: string | URL | Request; init?: RequestInit };

/** `GET /api/account/apps` wire rows (backend `AppSpec`, snake_case). */
const CATALOG = [
  { name: "default" },
  { name: "uniswap", is_public: true, application_id: 7 },
  {
    name: "stablefx",
    is_public: true,
    application_id: 8,
    chain_ids: [5_042_002],
  },
  {
    name: "treasury-ops",
    is_public: false,
    application_id: 9,
    label: "Treasury Ops",
  },
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
      if (url.pathname === "/api/resource/skills" && method === "GET") {
        return Response.json({
          skills: [
            {
              id: "aave",
              name: "aave",
              description: "Supply and borrow through Aave V3.",
              tags: ["lending"],
              chain_ids: [1, 8453],
              injected_tools: ["aave_position"],
            },
          ],
        });
      }
      if (url.pathname === "/api/resource/skills/aave" && method === "GET") {
        return Response.json({
          id: "aave",
          name: "aave",
          description: "Supply and borrow through Aave V3.",
          tags: ["lending"],
          chain_ids: [1, 8453],
          injected_tools: ["aave_position"],
          tool_names: ["aomi_call_tool"],
          instructions: "Use the Aave procedure.",
        });
      }
      return new Response(`Unexpected ${method} ${url.pathname}`, {
        status: 500,
      });
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
  let view: ReturnType<typeof render> | undefined;
  await act(async () => {
    view = render(<PackagesModal onClose={() => undefined} />);
  });
  if (!view) throw new Error("Packages modal did not render");
  return view;
}

describe("packages modal wiring", () => {
  beforeEach(() => {
    seedAccountOverview({
      user: { user_id: "acct-1", apps: ["default", "uniswap"] },
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await act(async () => {
      seedAccountOverview(null);
    });
  });

  it("loads the catalog from the account apps route", async () => {
    const { calls } = installFetchRecorder();

    await renderModal();

    expect(paths(calls)).toContain("GET /api/account/apps");
    // Wire row + decoration: installed apps are presented first and open into
    // the shared inspector rather than exposing destructive row controls.
    expect(screen.getAllByText("Uniswap").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("Open Uniswap details"));
    expect(screen.getByLabelText("Remove Uniswap")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Open Aomi Core details"));
    expect(screen.getByText("Built in")).toBeTruthy();
    expect(screen.queryByLabelText("Remove Aomi Core")).toBeNull();
    expect(screen.getByText("Circle StableFX")).toBeTruthy();
    expect(screen.getByText("Arc only")).toBeTruthy();
  });

  it("keeps apps and skills in the directory with a persistent inspector", async () => {
    const { calls } = installFetchRecorder();

    await renderModal();

    expect(screen.getByRole("dialog", { name: "Library" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Library" })).toHaveClass(
      "text-[15px]",
    );
    expect(screen.getByRole("button", { name: /Discover/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Discover/ })).toHaveClass(
      "text-[13px]",
    );
    expect(screen.getByRole("textbox", { name: "Search library" })).toHaveClass(
      "text-[14px]",
    );
    expect(screen.getByLabelText("Aave details").className).toContain(
      "border-l",
    );
    expect(screen.getByLabelText("Try Aave")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Skills/ }));
    expect(screen.getByRole("heading", { name: "Skills" })).toBeTruthy();
    expect(await screen.findByText("How it works")).toBeTruthy();
    expect(await screen.findByText("2 actions available")).toBeTruthy();
    expect(paths(calls)).toContain("GET /api/resource/skills/aave");
  });

  it("puts token operations in Tokens & wallets before broad research matches", () => {
    expect(
      inferLibraryCategory({
        kind: "skill",
        item: {
          id: "common_erc20",
          name: "common erc20",
          description: "Check balances, allowances, and token transfers.",
          tags: ["tokens"],
          chainIds: [1, 8453],
          injectedTools: [],
        },
      }),
    ).toBe("wallets");
  });

  it("sends a skill to chat as a capability mention", async () => {
    installFetchRecorder();
    const onMention = vi.fn();
    window.addEventListener("aomi:capability-mention-request", onMention);

    await renderModal();
    fireEvent.click(screen.getAllByLabelText("Try Aave")[0]);

    expect(onMention).toHaveBeenCalledOnce();
    expect((onMention.mock.calls[0][0] as CustomEvent).detail).toEqual({
      kind: "skill",
      id: "aave",
    });
    window.removeEventListener("aomi:capability-mention-request", onMention);
  });

  it("uses the same full-frame modal geometry as settings", async () => {
    installFetchRecorder();

    await renderModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog.style.width).toBe("1080px");
    expect(dialog.style.height).toBe("620px");
    expect(dialog.style.maxWidth).toBe("96%");
    expect(dialog.style.maxHeight).toBe("92%");
    expect(dialog.parentElement?.className).toContain("absolute");
    expect(dialog.parentElement?.className).not.toContain("fixed");
  });

  it("does not render an HTML proxy failure inside the window", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("<!DOCTYPE html><html>proxy failure</html>", {
        status: 500,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderModal();

    expect(
      await screen.findByText("Couldn’t load packages. Please try again."),
    ).toBeTruthy();
    expect(screen.queryByText(/DOCTYPE/)).toBeNull();

    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => {
      const appRequests = fetchMock.mock.calls.filter(([input]) =>
        input.toString().startsWith("/api/account/apps"),
      );
      expect(appRequests).toHaveLength(2);
    });
  });

  it("uninstalls by PUTting the replaced list", async () => {
    const { calls } = installFetchRecorder();

    const view = await renderModal();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Open Uniswap details"));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Remove Uniswap"));
    });

    const put = calls.find((c) => c.init?.method === "PUT");
    expect(put).toBeTruthy();
    expect(JSON.parse(String(put?.init?.body))).toEqual({ apps: ["default"] });
    // The row flips from the PUT response, not optimistically.
    expect(screen.queryByLabelText("Remove Uniswap")).toBeNull();

    view.unmount();
    await renderModal();
    expect(screen.queryByLabelText("Remove Uniswap")).toBeNull();
  });

  it("installs a personal app through the same replace", async () => {
    const { calls } = installFetchRecorder();

    await renderModal();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Add Treasury Ops"));
    });

    const put = calls.find((c) => c.init?.method === "PUT");
    expect(JSON.parse(String(put?.init?.body))).toEqual({
      apps: ["default", "uniswap", "treasury-ops"],
    });
    expect(paths(calls)).toContain("PUT /api/account/apps");
  });

  it("blocks replacement until the installed-app baseline is available", async () => {
    seedAccountOverview(null);
    const { calls } = installFetchRecorder();

    await renderModal();

    const install = screen.getByLabelText(
      "Add Treasury Ops",
    ) as HTMLButtonElement;
    expect(install.disabled).toBe(true);
    fireEvent.click(install);
    expect(paths(calls)).not.toContain("PUT /api/account/apps");

    await act(async () => {
      seedAccountOverview({
        user: { user_id: "acct-1", apps: ["default", "uniswap"] },
      });
    });
    fireEvent.click(screen.getByLabelText("Open Uniswap details"));
    expect(
      (screen.getByLabelText("Remove Uniswap") as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("serializes full-set replacements", async () => {
    const calls: FetchCall[] = [];
    let finishPut: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        calls.push({ input, init });
        const url = new URL(input.toString(), "https://portal.test");
        if (url.pathname === "/api/account/apps" && !init?.method) {
          return Response.json(CATALOG);
        }
        if (url.pathname === "/api/account/apps" && init?.method === "PUT") {
          return new Promise<Response>((resolve) => {
            finishPut = resolve;
          });
        }
        return new Response("unexpected", { status: 500 });
      }),
    );

    await renderModal();
    fireEvent.click(screen.getByLabelText("Open Uniswap details"));
    const remove = screen.getByLabelText("Remove Uniswap");
    fireEvent.click(remove);
    fireEvent.click(remove);

    expect(
      paths(calls).filter((path) => path === "PUT /api/account/apps"),
    ).toHaveLength(1);

    await act(async () => {
      finishPut?.(Response.json({ apps: ["default"] }));
    });
  });
});

describe("chain-scoped package rows", () => {
  it("blocks StableFX installation until Arc Testnet is selected", () => {
    const app = toCatalogPackage({
      name: "stablefx",
      chainIds: [5_042_002],
    });

    render(
      <PackageRow
        app={app}
        installed={false}
        busy={false}
        disabled={false}
        activeChainId={1}
        onInstall={() => undefined}
        onUninstall={() => undefined}
      />,
    );

    const button = screen.getByLabelText(
      "Switch to Arc Testnet to install Circle StableFX",
    );
    expect(button).toBeDisabled();
  });

  it("keeps chain-scoped installation disabled while the wallet chain is unknown", () => {
    const app = toCatalogPackage({
      name: "stablefx",
      chainIds: [5_042_002],
    });

    render(
      <PackageRow
        app={app}
        installed={false}
        busy={false}
        disabled={false}
        onInstall={() => undefined}
        onUninstall={() => undefined}
      />,
    );

    expect(
      screen.getByLabelText("Switch to Arc Testnet to install Circle StableFX"),
    ).toBeDisabled();
  });
});
