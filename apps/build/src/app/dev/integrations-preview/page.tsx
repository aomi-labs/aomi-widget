"use client";

// Visual harness for the REAL Integrations page (same pattern as
// /dev/operate-preview): window.fetch is stubbed to serve the operate/bots
// BFF wire shape from in-memory fixtures, so the actual IntegrationsView —
// including add/edit/remove flows — is fully interactive without a GitHub
// session or backend. Design iteration happened here before the port; this
// file now only carries fixtures + the theme switch.

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GitHubSessionProvider } from "@build/components/control-plane/github-session-context";
import { IntegrationsView } from "@build/features/integrations/integrations-view";
import {
  readColorTheme,
  saveColorTheme,
  type ColorTheme,
} from "@build/lib/color-theme";
import { cn } from "@build/lib/utils";

const SESSION = {
  signedIn: true,
  githubLogin: "ceciliaz030",
  githubAvatarUrl: null,
  installationId: 1,
};

const SOURCES = [
  {
    id: 1,
    repositoryLink: "ceciliaz030/local-8",
    apps: [
      { id: 11, name: "playground-example" },
      { id: 12, name: "goal-digger" },
    ],
  },
  {
    id: 2,
    repositoryLink: "ceciliaz030/local-6",
    apps: [{ id: 21, name: "playground-example" }],
  },
  {
    id: 3,
    repositoryLink: "ceciliaz030/local-7",
    apps: [{ id: 22, name: "somm-agent" }],
  },
];

type FixtureBotApp = {
  applicationId: number;
  appSourceId: number | null;
  sourceLabel: string | null;
  name: string;
  label: string;
  isPrimary: boolean;
};

function appsFor(ids: number[], primary: number | null): FixtureBotApp[] {
  const known = new Map(
    SOURCES.flatMap((source) =>
      source.apps.map((app) => [
        app.id,
        {
          applicationId: app.id,
          appSourceId: source.id,
          sourceLabel: source.repositoryLink,
          name: app.name,
          label: app.name,
        },
      ]),
    ),
  );
  return ids.map((id) => ({
    ...(known.get(id) ?? {
      applicationId: id,
      appSourceId: null,
      sourceLabel: "ceciliaz030/retired",
      name: "gone-app",
      label: "gone-app",
    }),
    isPrimary: id === primary,
  }));
}

let BOTS = [
  {
    id: "b1",
    platform: "telegram",
    status: "active",
    label: null as string | null,
    defaultApp: "playground-example",
    apps: appsFor([11, 21], 11),
    platformBotId: "8184083135",
    platformUsername: "chico_chico_bot",
    webhookUrl: "https://api.example.test/api/bots/telegram/secret",
    threadMode: "single",
    createdAt: 1_753_000_000,
  },
  {
    id: "b2",
    platform: "telegram",
    status: "active",
    label: "Trading assistant" as string | null,
    defaultApp: "somm-agent",
    apps: appsFor([22, 99], 22),
    platformBotId: "7729918454",
    platformUsername: "trade_helper_bot",
    webhookUrl: "https://api.example.test/api/bots/telegram/secret2",
    threadMode: "multi",
    createdAt: 1_753_100_000,
  },
];

function stubFetch() {
  if (typeof window === "undefined") return;
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = (init?.method ?? "GET").toUpperCase();

    if (url.includes("/api/bff/auth/github/status"))
      return Response.json(SESSION);

    if (url.includes("/api/bff/operate/bots")) {
      if (method === "GET")
        return Response.json({ sources: SOURCES, bots: BOTS });
      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          label?: string;
          threadMode?: string;
          applicationIds: number[];
          primaryApplicationId: number;
        };
        const bot = {
          id: `new-${BOTS.length + 1}`,
          platform: "telegram",
          status: "active",
          label: body.label ?? null,
          defaultApp: "playground-example",
          apps: appsFor(body.applicationIds, body.primaryApplicationId),
          platformBotId: "5550001234",
          platformUsername: "your_new_bot",
          webhookUrl: "https://api.example.test/api/bots/telegram/secret3",
          threadMode: body.threadMode ?? "single",
          createdAt: 1_753_200_000,
        };
        BOTS = [bot, ...BOTS];
        return Response.json({ bot }, { status: 201 });
      }
      if (method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          botId: string;
          applicationIds: number[];
          primaryApplicationId: number;
          threadMode?: string;
        };
        const bot = BOTS.find((b) => b.id === body.botId);
        if (!bot)
          return Response.json({ error: "not found" }, { status: 404 });
        bot.apps = appsFor(body.applicationIds, body.primaryApplicationId);
        if (body.threadMode) bot.threadMode = body.threadMode;
        return Response.json({ bot });
      }
      if (method === "DELETE") {
        const botId = new URL(url, window.location.origin).searchParams.get(
          "botId",
        );
        BOTS = BOTS.filter((b) => b.id !== botId);
        return Response.json({ ok: true });
      }
    }
    return real(input, init);
  };
}

function ThemeSwitch() {
  const [theme, setTheme] = useState<ColorTheme>("dark");
  useEffect(() => {
    setTheme(readColorTheme());
  }, []);
  const set = (next: ColorTheme) => {
    saveColorTheme(next);
    setTheme(next);
  };
  return (
    <div className="border-border bg-surface inline-flex h-8 items-center rounded-full border p-1">
      {(
        [
          ["light", Sun],
          ["dark", Moon],
        ] as const
      ).map(([mode, Icon]) => (
        <button
          key={mode}
          type="button"
          aria-label={`Switch to ${mode} mode`}
          aria-pressed={theme === mode}
          onClick={() => set(mode)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-colors",
            theme === mode
              ? "bg-accent-selected text-accent-selected-foreground"
              : "text-dim hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}

export default function MockIntegrationPage() {
  const [client] = useState(() => {
    stubFetch();
    return new QueryClient();
  });
  return (
    <QueryClientProvider client={client}>
      <GitHubSessionProvider>
        <main className="bg-background min-h-screen">
          <div className="mx-auto flex w-full max-w-6xl justify-end px-4 pt-4 sm:px-6 lg:px-8">
            <ThemeSwitch />
          </div>
          <IntegrationsView />
        </main>
      </GitHubSessionProvider>
    </QueryClientProvider>
  );
}
