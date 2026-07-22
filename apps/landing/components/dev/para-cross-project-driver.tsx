"use client";

import {
  Environment,
  ParaProvider,
  useAccount,
  useIssueJwt,
  useModal,
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type ProjectId = "existing" | "temporary";

type CapturedToken = {
  label: string;
  token: string;
  keyId?: string;
};

type ComparisonResponse = {
  claims: Array<{
    label: string;
    audience: string;
    subject: string;
    dataUserId: string | null;
    authType: string | null;
    identifierKind: string | null;
    issuedAt: number | null;
    expiresAt: number;
    wallets: Array<{
      id: string | null;
      type: string | null;
      address: string | null;
    }>;
    connectedWallets: Array<{
      id: string | null;
      type: string | null;
      address: string | null;
    }>;
  }>;
  comparison: {
    audiencesDiffer: boolean;
    sameSubject: boolean;
    sameDataUserId: boolean;
    sharedWalletAddresses: string[];
    sharedConnectedWalletAddresses: string[];
  } | null;
};

const projects = {
  existing: {
    label: "Existing BETA project",
    apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY?.trim() ?? "",
  },
  temporary: {
    label: "Temporary BETA project",
    apiKey: process.env.NEXT_PUBLIC_PARA_SECONDARY_API_KEY?.trim() ?? "",
  },
} satisfies Record<ProjectId, { label: string; apiKey: string }>;

export function ParaCrossProjectDriver() {
  const [queryClient] = useState(() => new QueryClient());
  const [activeProject, setActiveProject] = useState<ProjectId>("existing");
  const [tokens, setTokens] = useState<
    Partial<Record<ProjectId, CapturedToken>>
  >({});
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const project = projects[activeProject];
  const providerConfig = useMemo(
    () => ({ apiKey: project.apiKey, env: Environment.BETA }),
    [project.apiKey],
  );

  const capture = async (captured: CapturedToken) => {
    const next = { ...tokens, [activeProject]: captured };
    setTokens(next);
    setResult(null);
    setError(null);

    const available = (["existing", "temporary"] as const)
      .map((id) => next[id])
      .filter((value): value is CapturedToken => Boolean(value));
    const response = await fetch("/api/dev/para-jwt-compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: available }),
    });
    const body = (await response.json().catch(() => null)) as
      | ComparisonResponse
      | { message?: string; error?: string }
      | null;
    if (!response.ok || !body || !("claims" in body)) {
      setError(
        body && "message" in body
          ? (body.message ?? body.error ?? "JWT verification failed")
          : "JWT verification failed",
      );
      return;
    }
    setResult(body);
  };

  const missingKey = !project.apiKey;

  return (
    <main className="min-h-screen bg-stone-950 px-6 py-10 text-stone-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">
            Para cross-project identity test
          </h1>
          <p className="max-w-3xl text-sm text-stone-300">
            Authenticate the same real user in both BETA projects. JWTs stay in
            browser memory and are sent only to the local verification route.
          </p>
        </header>

        <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-300">
          <li>Use the existing project, log in, then capture its JWT.</li>
          <li>Switch to the temporary project and log in as the same user.</li>
          <li>Capture its JWT and inspect the automatic comparison.</li>
        </ol>

        <div className="flex flex-wrap gap-3">
          {(Object.keys(projects) as ProjectId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveProject(id);
                setError(null);
              }}
              className={`rounded-md border px-4 py-2 text-sm ${
                activeProject === id
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                  : "border-stone-700 text-stone-300"
              }`}
            >
              {projects[id].label} {tokens[id] ? "✓" : ""}
            </button>
          ))}
        </div>

        {missingKey ? (
          <div className="rounded-md border border-red-700 bg-red-950/40 p-4 text-red-200">
            This project API key is not configured.
          </div>
        ) : (
          <QueryClientProvider client={queryClient}>
            <ParaProvider
              key={activeProject}
              paraClientConfig={providerConfig}
              config={{
                appName: `Aomi identity test — ${project.label}`,
                disableAutoSessionKeepAlive: true,
              }}
              paraModalConfig={{
                disableEmailLogin: false,
                oAuthMethods: ["GOOGLE"],
              }}
              externalWalletConfig={{
                appDescription: "Local Para cross-project identity experiment",
                appUrl:
                  typeof window === "undefined"
                    ? "http://localhost:3000"
                    : window.location.origin,
                wallets: [],
                walletConnect: undefined,
              }}
            >
              <ProjectPanel project={project} onCapture={capture} />
            </ParaProvider>
          </QueryClientProvider>
        )}

        {error ? (
          <div className="rounded-md border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {result ? <Comparison result={result} /> : null}
      </div>
    </main>
  );
}

function ProjectPanel({
  onCapture,
  project,
}: {
  onCapture: (token: CapturedToken) => Promise<void>;
  project: { label: string; apiKey: string };
}) {
  const account = useAccount() as {
    isConnected?: boolean;
    isLoading?: boolean;
  };
  const modal = useModal();
  const { issueJwtAsync, isPending } = useIssueJwt();
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    setCapturing(true);
    try {
      const issued = await issueJwtAsync({});
      if (!issued?.token) throw new Error("Para did not return a JWT");
      await onCapture({
        label: project.label,
        token: issued.token,
        keyId: issued.keyId,
      });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-medium">{project.label}</h2>
          <p className="text-sm text-stone-400">
            Status:{" "}
            {account.isLoading
              ? "loading"
              : account.isConnected
                ? "connected"
                : "not connected"}
          </p>
        </div>
        <div className="flex gap-3">
          {!account.isConnected ? (
            <button
              type="button"
              onClick={() => modal.openModal({ step: "AUTH_MAIN" })}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-950"
            >
              Log in with Para
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void capture()}
              disabled={capturing || isPending}
              className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-stone-950 disabled:opacity-50"
            >
              {capturing || isPending ? "Capturing…" : "Capture and verify JWT"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Comparison({ result }: { result: ComparisonResponse }) {
  return (
    <section className="space-y-4 rounded-lg border border-stone-800 bg-stone-900 p-5">
      <h2 className="text-xl font-semibold">Verified claims</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {result.claims.map((claims) => (
          <pre
            key={claims.label}
            className="overflow-auto rounded-md bg-black/40 p-4 text-xs text-stone-200"
          >
            {JSON.stringify(claims, null, 2)}
          </pre>
        ))}
      </div>
      {result.comparison ? (
        <div className="rounded-md border border-stone-700 p-4">
          <h3 className="mb-2 font-medium">Comparison</h3>
          <pre className="overflow-auto text-xs text-stone-200">
            {JSON.stringify(result.comparison, null, 2)}
          </pre>
          <p className="mt-3 text-sm text-stone-300">
            Automatic cross-consumer identity matching is supported by this
            sample only if audiences differ while both subject and dataUserId
            stay the same.
          </p>
        </div>
      ) : (
        <p className="text-sm text-stone-400">
          Capture the second project to produce the comparison.
        </p>
      )}
    </section>
  );
}
