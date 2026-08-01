"use client";

// Design playground for the Integrations page redesign. Fixture data only —
// no network, no auth. Interactions are real (expand/edit/save/remove work
// against local state) so the flow can be felt, not just seen.
//
// Layout under discussion with Cecilia:
//   provider rail (Telegram active · Discord/Slack greyed)
//   → bot cards (name · masked token · app chips)
//   → inline expand with a framed app table (checkbox | APP | SOURCE | PRIMARY)
//   → inline add flow with collapsible BotFather helper.

import {
  Check,
  ChevronDown,
  MessageCircle,
  Plug,
  Plus,
  Slack,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@build/lib/utils";

// ── fixtures ────────────────────────────────────────────────────────────────

type MockApp = {
  applicationId: number;
  name: string;
  sourceLabel: string;
};

type MockBot = {
  id: string;
  username: string;
  label: string | null;
  platformBotId: string;
  status: "active" | "disabled";
  threadMode: "single" | "multi";
  appIds: number[];
  primaryAppId: number;
  /** Apps still mapped but gone from the builder's sources. */
  ghostApps?: { applicationId: number; name: string; sourceLabel: string }[];
};

const SOURCES: MockApp[] = [
  {
    applicationId: 11,
    name: "playground-example",
    sourceLabel: "ceciliaz030/local-8",
  },
  { applicationId: 12, name: "goal-digger", sourceLabel: "ceciliaz030/local-8" },
  {
    applicationId: 21,
    name: "playground-example",
    sourceLabel: "ceciliaz030/local-6",
  },
  { applicationId: 22, name: "somm-agent", sourceLabel: "ceciliaz030/local-7" },
];

const INITIAL_BOTS: MockBot[] = [
  {
    id: "b1",
    username: "chico_chico_bot",
    label: null,
    platformBotId: "8184083135",
    status: "active",
    threadMode: "single",
    appIds: [11, 21],
    primaryAppId: 11,
  },
  {
    id: "b2",
    username: "trade_helper_bot",
    label: "Trading assistant",
    platformBotId: "7729918454",
    status: "active",
    threadMode: "multi",
    appIds: [22, 99],
    primaryAppId: 22,
    ghostApps: [
      {
        applicationId: 99,
        name: "gone-app",
        sourceLabel: "ceciliaz030/retired",
      },
    ],
  },
];

const BOTFATHER_COMMANDS = [
  "start - Start the bot",
  "sessions - View and switch threads",
  "wallet - Connect or manage wallet",
  "tx - Review pending transactions",
  "sign - Sign selected transactions",
  "app - View or change app",
  "model - View or change model",
  "network - View or switch network",
  "settings - Open bot settings",
].join("\n");

// ── shared glyphs (recipes from providers-view.tsx) ─────────────────────────

const TH =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.07em] text-dim";

function CheckboxGlyph({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "bg-accent-selected text-accent-selected-foreground border-transparent"
          : "border-border-hover bg-transparent",
        disabled && "opacity-40",
      )}
    >
      {checked ? <Check className="size-3" /> : null}
    </span>
  );
}

function RadioGlyph({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked ? "border-accent-selected" : "border-border-hover",
        disabled && "opacity-40",
      )}
    >
      {checked ? (
        <span className="bg-accent-selected size-2 rounded-full" />
      ) : null}
    </span>
  );
}

function maskedToken(platformBotId: string) {
  return `${platformBotId}:••••••••••••`;
}

function monogram(name: string) {
  const parts = name.replace(/^@/, "").split(/[_\s-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "B";
}

// ── app mapping table ───────────────────────────────────────────────────────

type Draft = {
  selected: number[];
  primary: number | null;
};

function AppTable({
  draft,
  onChange,
  ghostApps,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  ghostApps?: MockBot["ghostApps"];
}) {
  const toggle = (id: number) => {
    const selected = draft.selected.includes(id)
      ? draft.selected.filter((v) => v !== id)
      : [...draft.selected, id];
    const primary =
      draft.primary !== null && selected.includes(draft.primary)
        ? draft.primary
        : (selected.find((v) => SOURCES.some((s) => s.applicationId === v)) ??
          null);
    onChange({ selected, primary });
  };

  const ghostSelected = (ghostApps ?? []).filter((g) =>
    draft.selected.includes(g.applicationId),
  );

  return (
    <div>
      <div className="border-border bg-surface-1 overflow-hidden rounded-md border">
        <table className="w-full table-fixed text-[13px]">
          <thead className="border-border border-b">
            <tr>
              <th className={cn(TH, "w-11")} aria-label="Attached" />
              <th className={TH}>App</th>
              <th className={TH}>Source</th>
              <th className={cn(TH, "w-24")}>Primary</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {SOURCES.map((app) => {
              const isChecked = draft.selected.includes(app.applicationId);
              const isPrimary = draft.primary === app.applicationId;
              return (
                <tr
                  key={app.applicationId}
                  className={cn(
                    "transition-colors",
                    isChecked ? "bg-accent" : "hover:bg-surface-2/60",
                  )}
                >
                  <td className="px-3 py-2">
                    <label className="flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => toggle(app.applicationId)}
                        aria-label={`Attach ${app.name} (${app.sourceLabel})`}
                      />
                      <CheckboxGlyph checked={isChecked} />
                    </label>
                  </td>
                  <td
                    className={cn(
                      "truncate px-3 py-2",
                      isChecked ? "text-foreground font-medium" : "text-foreground",
                    )}
                  >
                    {app.name}
                  </td>
                  <td className="text-dim truncate px-3 py-2 font-mono text-xs">
                    {app.sourceLabel}
                  </td>
                  <td className="px-3 py-2">
                    <label
                      className={cn(
                        "flex items-center",
                        isChecked ? "cursor-pointer" : "cursor-not-allowed",
                      )}
                    >
                      <input
                        type="radio"
                        name="primary-app"
                        className="sr-only"
                        checked={isPrimary}
                        disabled={!isChecked}
                        onChange={() =>
                          onChange({ ...draft, primary: app.applicationId })
                        }
                        aria-label={`Make ${app.name} (${app.sourceLabel}) primary`}
                      />
                      <RadioGlyph checked={isPrimary} disabled={!isChecked} />
                    </label>
                  </td>
                </tr>
              );
            })}
            {(ghostApps ?? []).map((app) => {
              const isChecked = draft.selected.includes(app.applicationId);
              return (
                <tr key={app.applicationId} className="bg-surface-2/40">
                  <td className="px-3 py-2">
                    <label
                      className={cn(
                        "flex items-center",
                        isChecked ? "cursor-pointer" : "cursor-not-allowed",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        disabled={!isChecked}
                        onChange={() => toggle(app.applicationId)}
                        aria-label={`Detach ${app.name} (no longer available)`}
                      />
                      <CheckboxGlyph checked={isChecked} disabled={!isChecked} />
                    </label>
                  </td>
                  <td className="text-dim truncate px-3 py-2">{app.name}</td>
                  <td className="text-dim truncate px-3 py-2 font-mono text-xs">
                    {app.sourceLabel}
                  </td>
                  <td className="text-warning px-3 py-2 text-[11px]">
                    no longer available
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ghostSelected.length > 0 ? (
        <p className="text-warning mt-2 text-xs">
          Uncheck the apps that are no longer available to save.
        </p>
      ) : null}
    </div>
  );
}

// ── bot card ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: MockBot["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "active"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border text-dim border",
      )}
    >
      {status === "active" ? <Check className="size-3" aria-hidden /> : null}
      {status === "active" ? "Active" : "Disabled"}
    </span>
  );
}

function BotCard({
  bot,
  editing,
  onBeginEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  bot: MockBot;
  editing: boolean;
  onBeginEdit: () => void;
  onCancel: () => void;
  onSave: (draft: Draft) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    selected: bot.appIds,
    primary: bot.primaryAppId,
  });

  const displayName = bot.label ?? `@${bot.username}`;
  const chips = useMemo(
    () =>
      bot.appIds
        .map((id) => {
          const app =
            SOURCES.find((s) => s.applicationId === id) ??
            bot.ghostApps?.find((g) => g.applicationId === id);
          return app ? { ...app, isPrimary: id === bot.primaryAppId } : null;
        })
        .filter((v): v is MockApp & { isPrimary: boolean } => v !== null),
    [bot],
  );

  const ghostStillSelected = (bot.ghostApps ?? []).some((g) =>
    draft.selected.includes(g.applicationId),
  );
  const canSave =
    draft.selected.length > 0 && draft.primary !== null && !ghostStillSelected;

  return (
    <div
      className={cn(
        "border-border bg-surface-1 rounded-xl border",
        editing && "border-border-hover",
      )}
    >
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="bg-accent text-accent-selected flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold">
          {monogram(bot.label ?? bot.username)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground text-sm font-medium">
              {displayName}
            </span>
            {bot.label ? (
              <span className="text-dim text-xs">@{bot.username}</span>
            ) : null}
            <StatusPill status={bot.status} />
          </div>
          <div className="text-dim font-mono text-xs">
            {maskedToken(bot.platformBotId)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-dim text-xs">
            {bot.threadMode === "single" ? "Single thread" : "Multiple threads"}
          </span>
          {editing ? (
            <span className="text-accent-selected text-xs font-medium">
              Editing
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={onBeginEdit}
                className="border-border hover:bg-accent-hover text-foreground h-8 rounded-md border px-3 text-xs font-medium"
              >
                Change apps
              </button>
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${displayName}`}
                className="border-border hover:bg-accent-hover text-dim flex size-8 items-center justify-center rounded-md border"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="border-border border-t p-4">
          <AppTable draft={draft} onChange={setDraft} ghostApps={bot.ghostApps} />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-dim text-xs">
              {draft.selected.length}{" "}
              {draft.selected.length === 1 ? "app" : "apps"} attached · primary
              answers when no app is named
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft({ selected: bot.appIds, primary: bot.primaryAppId });
                  onCancel();
                }}
                className="border-border hover:bg-accent-hover text-foreground h-8 rounded-md border px-3 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => onSave(draft)}
                className="bg-foreground text-background disabled:bg-surface-3 disabled:text-dim h-8 rounded-md px-3.5 text-xs font-medium disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-border flex flex-wrap gap-1.5 border-t px-4 py-3">
          {chips.map((app) => (
            <span
              key={app.applicationId}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
                app.isPrimary
                  ? "border-accent-selected/40 bg-accent text-accent-selected"
                  : "border-border text-dim",
              )}
            >
              {app.isPrimary ? (
                <Star className="size-3 fill-current" aria-hidden />
              ) : null}
              {app.name}
              <span className="opacity-60">· {app.sourceLabel}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── add flow ────────────────────────────────────────────────────────────────

function AddBotCard({
  onCancel,
  onRegister,
}: {
  onCancel: () => void;
  onRegister: (input: {
    label: string;
    token: string;
    threadMode: MockBot["threadMode"];
    draft: Draft;
  }) => void;
}) {
  const [label, setLabel] = useState("");
  const [token, setToken] = useState("");
  const [threadMode, setThreadMode] = useState<MockBot["threadMode"]>("single");
  const [draft, setDraft] = useState<Draft>({ selected: [], primary: null });
  const [helperOpen, setHelperOpen] = useState(false);

  const canRegister =
    token.trim().length > 0 &&
    draft.selected.length > 0 &&
    draft.primary !== null;

  return (
    <div className="border-border-hover bg-surface-1 rounded-xl border">
      <div className="border-border border-b p-4">
        <h2 className="text-foreground text-sm font-medium">
          Add a Telegram bot
        </h2>
        <p className="text-dim mt-1 text-xs">
          Create the bot in BotFather, paste its token, pick its apps. We
          verify the token with Telegram and activate the webhook
          automatically.
        </p>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1 text-xs">
            <span className="text-dim">Bot token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste BotFather token"
              className="border-border bg-surface text-foreground h-9 w-full rounded-md border px-2 text-sm"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-dim">Label (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Trading assistant"
              className="border-border bg-surface text-foreground h-9 w-full rounded-md border px-2 text-sm"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-dim">Thread mode</span>
            <select
              value={threadMode}
              onChange={(e) =>
                setThreadMode(e.target.value as MockBot["threadMode"])
              }
              className="border-border bg-surface text-foreground h-9 w-full rounded-md border px-2 text-sm"
            >
              <option value="single">Single thread</option>
              <option value="multi">Multiple threads</option>
            </select>
          </label>
        </div>

        <AppTable draft={draft} onChange={setDraft} />

        <div className="border-border rounded-md border">
          <button
            type="button"
            onClick={() => setHelperOpen((v) => !v)}
            className="text-dim hover:text-foreground flex w-full items-center justify-between px-3 py-2 text-xs font-medium"
          >
            BotFather setup (optional slash commands)
            <ChevronDown
              className={cn("size-3.5 transition-transform", helperOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {helperOpen ? (
            <pre className="border-border bg-surface text-foreground overflow-x-auto border-t p-3 font-mono text-xs leading-6">
              {BOTFATHER_COMMANDS}
            </pre>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border-border hover:bg-accent-hover text-foreground h-8 rounded-md border px-3 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canRegister}
            onClick={() =>
              onRegister({ label: label.trim(), token, threadMode, draft })
            }
            className="bg-foreground text-background disabled:bg-surface-3 disabled:text-dim h-8 rounded-md px-3.5 text-xs font-medium disabled:cursor-not-allowed"
          >
            Register bot
          </button>
        </div>
      </div>
    </div>
  );
}

// ── provider rail ───────────────────────────────────────────────────────────

function ProviderRail({
  botCount,
  onAdd,
  addOpen,
}: {
  botCount: number;
  onAdd: () => void;
  addOpen: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="border-accent-selected/40 bg-surface-1 flex items-center gap-2 rounded-lg border px-3.5 py-2">
        <MessageCircle className="text-accent-selected size-4" aria-hidden />
        <span className="text-foreground text-[13px] font-medium">
          Telegram
        </span>
        <span className="bg-emerald-500/10 rounded-full px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          {botCount} {botCount === 1 ? "bot" : "bots"}
        </span>
      </div>
      <div className="border-border bg-surface-1 flex items-center gap-2 rounded-lg border px-3.5 py-2 opacity-55">
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03Z" />
        </svg>
        <span className="text-[13px]">Discord</span>
        <span className="border-border text-dim rounded-full border px-2 py-0.5 text-[10px] font-medium">
          Soon
        </span>
      </div>
      <div className="border-border bg-surface-1 flex items-center gap-2 rounded-lg border px-3.5 py-2 opacity-55">
        <Slack className="size-4" aria-hidden />
        <span className="text-[13px]">Slack</span>
        <span className="border-border text-dim rounded-full border px-2 py-0.5 text-[10px] font-medium">
          Soon
        </span>
      </div>
      {!addOpen ? (
        <button
          type="button"
          onClick={onAdd}
          className="bg-foreground text-background ml-auto flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-medium"
        >
          <Plus className="size-4" aria-hidden />
          Add bot
        </button>
      ) : null}
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────

export default function MockIntegrationPage() {
  const [bots, setBots] = useState<MockBot[]>(INITIAL_BOTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <div className="space-y-3">
          <p className="text-dim text-[12px] uppercase tracking-wide">
            Account
          </p>
          <div className="flex items-center gap-2">
            <Plug className="text-dim size-5" aria-hidden />
            <h1 className="font-display text-foreground text-2xl font-normal tracking-tight">
              Integrations
            </h1>
          </div>
          <p className="text-subtle max-w-2xl text-sm">
            Connect the channels where your users already work. Each bot is
            configured once and can serve one or more Aomi apps.
          </p>
        </div>

        <ProviderRail
          botCount={bots.length}
          addOpen={adding}
          onAdd={() => setAdding(true)}
        />

        {adding ? (
          <AddBotCard
            onCancel={() => setAdding(false)}
            onRegister={({ label, threadMode, draft }) => {
              setBots((current) => [
                {
                  id: `new-${Date.now()}`,
                  username: "your_new_bot",
                  label: label || null,
                  platformBotId: "5550001234",
                  status: "active",
                  threadMode,
                  appIds: draft.selected,
                  primaryAppId: draft.primary ?? draft.selected[0],
                },
                ...current,
              ]);
              setAdding(false);
            }}
          />
        ) : null}

        <div className="flex flex-col gap-3">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              editing={editingId === bot.id}
              onBeginEdit={() => setEditingId(bot.id)}
              onCancel={() => setEditingId(null)}
              onSave={(draft) => {
                setBots((current) =>
                  current.map((b) =>
                    b.id === bot.id
                      ? {
                          ...b,
                          appIds: draft.selected,
                          primaryAppId: draft.primary ?? draft.selected[0],
                          ghostApps: b.ghostApps?.filter((g) =>
                            draft.selected.includes(g.applicationId),
                          ),
                        }
                      : b,
                  ),
                );
                setEditingId(null);
              }}
              onRemove={() =>
                setBots((current) => current.filter((b) => b.id !== bot.id))
              }
            />
          ))}
          {bots.length === 0 && !adding ? (
            <div className="border-border bg-surface-1 text-dim rounded-xl border px-4 py-14 text-center text-sm">
              No Telegram bots yet. Add one to start receiving messages.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
