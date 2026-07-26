"use client";

// TEMPORARY visual harness for the Providers page (sibling of
// dev-operate-preview): renders the REAL ProvidersView with window.fetch
// stubbed — a fake signed-in GitHub session, one source with three apps,
// and an in-memory key store so create/rotate/grants/remove all mutate.

import { useState } from "react";
import { GitHubSessionProvider } from "@build/components/control-plane/github-session-context";
import {
  ProvidersView,
  type ModelKey,
} from "@build/features/operate/providers-view";

const SESSION = {
  signedIn: true,
  githubLogin: "cecilia",
  githubAvatarUrl: null,
  installationId: 1,
};

const SOURCES = [
  {
    id: 141779906,
    repositoryLink: "aomi-labs/apps",
    githubAccount: "aomi-labs",
    apps: [
      { id: 88, name: "defillama" },
      { id: 87, name: "marinade" },
      { id: 86, name: "kalshi" },
    ],
  },
];

let NEXT_ID = 3;
const KEYS: ModelKey[] = [
  {
    id: 1,
    provider: "anthropic",
    label: "prod-main",
    keyPrefix: "sk-ant-",
    createdAt: 1753300000,
    updatedAt: 1753300000,
    applicationIds: [88, 87],
  },
  {
    id: 2,
    provider: "openai",
    label: null,
    keyPrefix: "sk-proj",
    createdAt: 1753380000,
    updatedAt: 1753380000,
    applicationIds: [],
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
    if (url.includes("/api/bff/auth/github/status"))
      return Response.json(SESSION);
    if (url.includes("/api/bff/operate/model-keys")) {
      const parsed = new URL(url, window.location.href);
      const method = (init?.method ?? "GET").toUpperCase();
      const now = Math.floor(Date.now() / 1000);
      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          keyId?: number;
          provider?: string;
          key?: string;
          label?: string;
        };
        if (body.keyId !== undefined) {
          const existing = KEYS.find((k) => k.id === body.keyId);
          if (existing) {
            existing.keyPrefix = String(body.key ?? "").slice(0, 7);
            existing.updatedAt = now;
          }
          return Response.json({ key: existing }, { status: 201 });
        }
        const created: ModelKey = {
          id: NEXT_ID++,
          provider: String(body.provider ?? "openai"),
          label: body.label ?? null,
          keyPrefix: String(body.key ?? "").slice(0, 7),
          createdAt: now,
          updatedAt: now,
          applicationIds: [],
        };
        KEYS.push(created);
        return Response.json({ key: created }, { status: 201 });
      }
      if (method === "PUT") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          keyId?: number;
          applicationIds?: number[];
        };
        const target = KEYS.find((k) => k.id === body.keyId);
        if (target) {
          const ids = body.applicationIds ?? [];
          // steal: drop these apps from same-provider siblings
          for (const other of KEYS) {
            if (other.provider === target.provider && other.id !== target.id) {
              other.applicationIds = other.applicationIds.filter(
                (id) => !ids.includes(id),
              );
            }
          }
          target.applicationIds = ids;
        }
        return Response.json({ key: target });
      }
      if (method === "DELETE") {
        const keyId = Number(parsed.searchParams.get("keyId"));
        const index = KEYS.findIndex((k) => k.id === keyId);
        if (index >= 0) KEYS.splice(index, 1);
        return Response.json({ ok: true });
      }
      return Response.json({ sources: SOURCES, keys: [...KEYS] });
    }
    return real(input, init);
  };
}

export default function DevModelKeysPreview() {
  const [ready] = useState(() => {
    stubFetch();
    return true;
  });
  if (!ready) return null;
  return (
    <GitHubSessionProvider>
      <ProvidersView />
    </GitHubSessionProvider>
  );
}
