"use client";

import {
  unstable_useComposerInput,
  useComposerRuntime,
} from "@assistant-ui/react";
import { AppWindowIcon, Globe2Icon, WandSparklesIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  SUPPORTED_CHAINS,
  useControl,
  useThreadContext,
  type AgentMode,
} from "@aomi-labs/react";
import { getAppInfo } from "@/components/control-bar/app-metadata";
import { getAppIcon, getChainIcon, SolanaIcon } from "@/components/icons";
import { useOptionalAomiWalletNetworkPreferences } from "@/lib/wallet-kit/network-preferences";
import { skillLabel, useSkillCatalog } from "@/lib/capabilities/skill-catalog";
import {
  normalizeAomiRouting,
  sameDirectRoutingApp,
  shouldShowDirectAppSelect,
  toAgentTarget,
  type AomiRoutingConfig,
  type DirectRoutingApp,
  type NormalizedAomiRouting,
} from "./routing";
import { buildCapabilityHintPayload } from "./capability-hint-payload";

export type ExecutionPolicy = AgentMode;
export type CapabilityKind = "app" | "skill" | "chain";

export type CapabilityMention = {
  key: string;
  kind: CapabilityKind;
  id: string;
  label: string;
  description?: string;
  applicationId?: string | number | null;
  appName?: string;
  chainTarget?:
    | { family: "evm"; chainId: number }
    | { family: "svm"; networkId: string };
};

type CapabilityComposerContextValue = {
  mentions: CapabilityMention[];
  policy: ExecutionPolicy;
  routing: NormalizedAomiRouting;
  selectedDirectApp: DirectRoutingApp | null;
  showModeSelect: boolean;
  showDirectAppSelect: boolean;
  hintsEnabled: boolean;
  hostError: string | null;
  setPolicy: (policy: ExecutionPolicy) => void;
  selectDirectApp: (target: DirectRoutingApp) => void;
  addMention: (mention: CapabilityMention) => void;
  retainMentions: (keys: ReadonlySet<string>) => void;
  prepareSubmit: (event: FormEvent<HTMLFormElement>) => void;
  enabledAppIds?: readonly string[];
  allowAppMentions: boolean;
};

const CapabilityComposerContext =
  createContext<CapabilityComposerContextValue | null>(null);

export function useCapabilityComposer(): CapabilityComposerContextValue {
  const value = useContext(CapabilityComposerContext);
  if (!value) {
    throw new Error(
      "useCapabilityComposer must be used inside CapabilityComposerProvider",
    );
  }
  return value;
}

export function CapabilityComposerProvider({
  children,
  enabledAppIds,
  routing,
}: {
  children: ReactNode;
  enabledAppIds?: readonly string[];
  routing?: AomiRoutingConfig;
}) {
  const { getAuthorizedApps, onAgentModeSelect, onAgentTargetSelect } =
    useControl();
  const threadContext = useThreadContext();
  const composerRuntime = useComposerRuntime();
  const normalizedRouting = useMemo(
    () => normalizeAomiRouting(routing),
    [routing],
  );
  if (normalizedRouting.error && process.env.NODE_ENV !== "production") {
    throw new Error(`[AomiWidget] ${normalizedRouting.error}`);
  }
  const currentControl = threadContext.getThreadMetadata(
    threadContext.currentThreadId,
  )?.control;
  const storedMode =
    currentControl?.agentMode ??
    (currentControl?.app || currentControl?.applicationId != null
      ? "direct"
      : undefined);
  const policy: ExecutionPolicy =
    storedMode && normalizedRouting.modes.includes(storedMode)
      ? storedMode
      : normalizedRouting.defaultMode;
  const currentDirectApp: DirectRoutingApp | null =
    currentControl?.applicationId != null &&
    Number.isSafeInteger(Number(currentControl.applicationId))
      ? {
          applicationId: Number(currentControl.applicationId),
          ...(currentControl.app ? { app: currentControl.app } : {}),
        }
      : currentControl?.app
        ? { app: currentControl.app }
        : null;
  const selectedDirectApp =
    (currentDirectApp
      ? normalizedRouting.directApps.find((candidate) =>
          sameDirectRoutingApp(candidate, currentDirectApp),
        )
      : undefined) ??
    normalizedRouting.directApps[0] ??
    null;
  const [mentions, setMentions] = useState<CapabilityMention[]>([]);

  useEffect(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps]);

  useEffect(() => {
    setMentions([]);
  }, [policy, threadContext.threadViewKey]);

  useEffect(() => {
    if (normalizedRouting.error) return;
    if (policy === "auto") {
      if (storedMode && storedMode !== "auto") onAgentModeSelect("auto");
      return;
    }
    if (
      selectedDirectApp &&
      (storedMode !== "direct" ||
        !currentDirectApp ||
        !sameDirectRoutingApp(selectedDirectApp, currentDirectApp))
    ) {
      onAgentTargetSelect(toAgentTarget(selectedDirectApp));
    }
  }, [
    currentDirectApp,
    normalizedRouting,
    onAgentModeSelect,
    onAgentTargetSelect,
    policy,
    selectedDirectApp,
    storedMode,
  ]);

  const selectDirectApp = useCallback(
    (target: DirectRoutingApp) => {
      if (
        !normalizedRouting.directApps.some((candidate) =>
          sameDirectRoutingApp(candidate, target),
        )
      ) {
        return;
      }
      setMentions([]);
      onAgentTargetSelect(toAgentTarget(target));
    },
    [normalizedRouting.directApps, onAgentTargetSelect],
  );

  const setPolicy = useCallback(
    (nextPolicy: ExecutionPolicy) => {
      if (!normalizedRouting.modes.includes(nextPolicy)) return;
      setMentions([]);
      if (nextPolicy === "auto") {
        onAgentModeSelect("auto");
        return;
      }
      const target = selectedDirectApp ?? normalizedRouting.directApps[0];
      if (target) {
        onAgentTargetSelect(toAgentTarget(target));
      }
    },
    [
      normalizedRouting.directApps,
      normalizedRouting.modes,
      onAgentModeSelect,
      onAgentTargetSelect,
      selectedDirectApp,
    ],
  );

  const hintsEnabled = policy === "auto";

  const addMention = useCallback(
    (mention: CapabilityMention) => {
      if (!hintsEnabled) return;
      setMentions((current) =>
        current.some((item) => item.key === mention.key)
          ? current
          : [...current, mention],
      );
    },
    [hintsEnabled],
  );

  const retainMentions = useCallback((keys: ReadonlySet<string>) => {
    setMentions((current) => current.filter((item) => keys.has(item.key)));
  }, []);

  const prepareSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (normalizedRouting.error) {
        event.preventDefault();
        return;
      }
      const current = composerRuntime.getState().runConfig;
      const custom = { ...(current.custom ?? {}) };
      const payload = buildCapabilityHintPayload(policy, mentions);
      if (!payload) {
        delete custom.aomiCapabilityHints;
      } else {
        custom.aomiCapabilityHints = payload;
      }
      composerRuntime.setRunConfig({ ...current, custom });
    },
    [composerRuntime, mentions, normalizedRouting.error, policy],
  );

  const value = useMemo<CapabilityComposerContextValue>(
    () => ({
      mentions,
      policy,
      routing: normalizedRouting,
      selectedDirectApp,
      showModeSelect: normalizedRouting.modes.length > 1,
      showDirectAppSelect: shouldShowDirectAppSelect(policy, normalizedRouting),
      hintsEnabled,
      hostError: normalizedRouting.error,
      setPolicy,
      selectDirectApp,
      addMention,
      retainMentions,
      prepareSubmit,
      enabledAppIds,
      allowAppMentions: hintsEnabled,
    }),
    [
      addMention,
      enabledAppIds,
      hintsEnabled,
      mentions,
      normalizedRouting,
      policy,
      prepareSubmit,
      retainMentions,
      selectDirectApp,
      selectedDirectApp,
      setPolicy,
    ],
  );

  return (
    <CapabilityComposerContext.Provider value={value}>
      {children}
    </CapabilityComposerContext.Provider>
  );
}

type PickerItem = CapabilityMention & {
  searchText: string;
  Icon: FC<{ className?: string }>;
};

type TriggerRange = {
  node: Text;
  start: number;
  end: number;
};

function detectTrigger(): { query: string; range: TriggerRange } | null {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !(selection.anchorNode instanceof Text)) {
    return null;
  }
  const before = selection.anchorNode.data.slice(0, selection.anchorOffset);
  const match = before.match(/(?:^|\s)@([^\s@]*)$/u);
  if (!match) return null;
  const atOffset = before.lastIndexOf("@");
  return {
    query: match[1] ?? "",
    range: {
      node: selection.anchorNode,
      start: atOffset,
      end: selection.anchorOffset,
    },
  };
}

function textFromEditor(editor: HTMLDivElement): string {
  return editor.innerText.replaceAll("\u00a0", " ");
}

function mentionKeysFromEditor(editor: HTMLDivElement): Set<string> {
  return new Set(
    [...editor.querySelectorAll<HTMLElement>("[data-capability-key]")]
      .map((node) => node.dataset.capabilityKey)
      .filter((key): key is string => Boolean(key)),
  );
}

export const CapabilityMentionInput: FC<{
  placeholder: string;
  className: string;
}> = ({ placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<TriggerRange | null>(null);
  const lastTextRef = useRef("");
  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [hasText, setHasText] = useState(false);
  const { value, setText, isDisabled } = unstable_useComposerInput();
  const {
    mentions,
    addMention,
    retainMentions,
    enabledAppIds,
    allowAppMentions,
    hintsEnabled,
  } = useCapabilityComposer();
  const { state } = useControl();
  const networkPreferences = useOptionalAomiWalletNetworkPreferences();
  const { skills } = useSkillCatalog();

  const enabled = useMemo(
    () => (enabledAppIds ? new Set(["default", ...enabledAppIds]) : null),
    [enabledAppIds],
  );
  const items = useMemo<PickerItem[]>(() => {
    const skillItems: PickerItem[] = (skills ?? []).map((skill) => ({
      key: `skill:${skill.id}`,
      kind: "skill",
      id: skill.id,
      label: skillLabel(skill),
      description: skill.description,
      searchText: `${skill.name} ${skill.description} ${skill.tags.join(" ")}`,
      Icon: WandSparklesIcon,
    }));
    const appItems: PickerItem[] = allowAppMentions
      ? state.appDescriptors
          .filter(
            (app) =>
              app.name !== "orchestrator" &&
              (!enabled || enabled.has(app.name)),
          )
          .map((app) => {
            const info = getAppInfo(app.name);
            const sourceId =
              app.applicationId !== null && app.applicationId !== undefined
                ? `application:${app.applicationId}`
                : `name:${app.name}`;
            return {
              key: `app:${sourceId}`,
              kind: "app" as const,
              id: sourceId,
              label: app.label ?? info.displayName,
              description: info.category.label,
              applicationId: app.applicationId,
              appName: app.name,
              searchText: `${app.name} ${app.label ?? ""} ${info.displayName} ${info.category.label}`,
              Icon: getAppIcon(app.name) ?? AppWindowIcon,
            };
          })
      : [];
    const evmChains =
      networkPreferences?.supportedEvmChains ?? SUPPORTED_CHAINS;
    const chainItems: PickerItem[] = [
      ...evmChains.map((chain) => ({
        key: `chain:eip155:${chain.id}`,
        kind: "chain" as const,
        id: `eip155:${chain.id}`,
        label: chain.name,
        description: "EVM execution chain",
        chainTarget: { family: "evm" as const, chainId: chain.id },
        searchText: `${chain.name} evm ${chain.id}`,
        Icon: getChainIcon(chain.id) ?? Globe2Icon,
      })),
      ...(networkPreferences?.supportedSolanaNetworks ?? []).map((network) => ({
        key: `chain:solana:${network.id}`,
        kind: "chain" as const,
        id: `solana:${network.id}`,
        label: network.label,
        description: "Solana execution cluster",
        chainTarget: {
          family: "svm" as const,
          networkId: network.id,
        },
        searchText: `${network.label} solana svm ${network.id}`,
        Icon: SolanaIcon,
      })),
    ];
    return [...appItems, ...skillItems, ...chainItems];
  }, [
    allowAppMentions,
    enabled,
    networkPreferences,
    skills,
    state.appDescriptors,
  ]);

  const visibleGroups = useMemo(() => {
    if (!hintsEnabled || query === null) return [];
    const needle = query.trim().toLowerCase();
    const selectedKeys = new Set(mentions.map((mention) => mention.key));
    const matching = items.filter(
      (item) =>
        !selectedKeys.has(item.key) &&
        (needle
          ? `${item.label} ${item.searchText}`.toLowerCase().includes(needle)
          : true),
    );
    const resultLimit = needle ? 18 : 6;
    return (
      [
        { kind: "app", label: "Apps" },
        { kind: "skill", label: "Skills" },
        { kind: "chain", label: "Chains" },
      ] as const
    )
      .map((group) => ({
        ...group,
        items: matching
          .filter((item) => item.kind === group.kind)
          .slice(0, resultLimit),
      }))
      .filter((group) => group.items.length > 0);
  }, [hintsEnabled, items, mentions, query]);

  const visibleItems = useMemo(
    () => visibleGroups.flatMap((group) => group.items),
    [visibleGroups],
  );

  const syncEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = textFromEditor(editor);
    const normalizedText = text.trim().length === 0 ? "" : text;
    if (!normalizedText && editor.textContent) editor.textContent = "";
    lastTextRef.current = normalizedText;
    setHasText(normalizedText.length > 0);
    setText(normalizedText);
    retainMentions(mentionKeysFromEditor(editor));
    const trigger = hintsEnabled ? detectTrigger() : null;
    triggerRef.current = trigger?.range ?? null;
    setQuery(trigger?.query ?? null);
    setHighlighted(0);
  }, [hintsEnabled, retainMentions, setText]);

  useEffect(() => {
    if (hintsEnabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor
      .querySelectorAll<HTMLElement>("[data-capability-key]")
      .forEach((node) => node.remove());
    triggerRef.current = null;
    setQuery(null);
    syncEditor();
  }, [hintsEnabled, syncEditor]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastTextRef.current) return;
    editor.textContent = value;
    lastTextRef.current = value;
    setHasText(value.trim().length > 0);
    if (value.trim().length === 0) retainMentions(new Set());
  }, [retainMentions, value]);

  const selectItem = useCallback(
    (item: PickerItem) => {
      const trigger = triggerRef.current;
      const editor = editorRef.current;
      if (!trigger || !editor || !trigger.node.isConnected) return;

      const range = document.createRange();
      range.setStart(trigger.node, trigger.start);
      range.setEnd(trigger.node, trigger.end);
      range.deleteContents();

      const mention = document.createElement("span");
      mention.contentEditable = "false";
      mention.dataset.capabilityKey = item.key;
      mention.dataset.capabilityKind = item.kind;
      mention.className =
        "text-aomi-accent mx-0.5 inline whitespace-nowrap font-medium";
      const glyph =
        item.kind === "skill" ? "✦" : item.kind === "app" ? "▦" : "◇";
      mention.textContent = `${glyph} ${item.label}`;
      mention.setAttribute("aria-label", `${item.kind} ${item.label}`);
      range.insertNode(mention);
      const space = document.createTextNode(" ");
      mention.after(space);

      const selection = window.getSelection();
      range.setStartAfter(space);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);

      addMention(item);
      triggerRef.current = null;
      setQuery(null);
      syncEditor();
      editor.focus();
    },
    [addMention, syncEditor],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (query !== null && visibleItems.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((value) => (value + 1) % visibleItems.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted(
          (value) => (value - 1 + visibleItems.length) % visibleItems.length,
        );
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        selectItem(visibleItems[highlighted] ?? visibleItems[0]!);
        return;
      }
    }
    if (event.key === "Escape" && query !== null) {
      event.preventDefault();
      setQuery(null);
      triggerRef.current = null;
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      editorRef.current?.closest("form")?.requestSubmit();
    }
  };

  return (
    <div className="relative">
      {!hasText ? (
        <span className="text-aomi-muted pointer-events-none absolute left-4 top-1.5 z-10 text-[13px]">
          {placeholder}
        </span>
      ) : null}
      <div
        ref={editorRef}
        role="textbox"
        aria-label="Message input"
        aria-multiline="true"
        aria-autocomplete="list"
        aria-expanded={query !== null}
        contentEditable={!isDisabled}
        suppressContentEditableWarning
        onInput={syncEditor}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          const trigger = hintsEnabled ? detectTrigger() : null;
          triggerRef.current = trigger?.range ?? null;
          setQuery(trigger?.query ?? null);
        }}
        className={`${className} min-h-[30px]`}
      />
      {hintsEnabled && query !== null ? (
        <div
          role="listbox"
          aria-label="Apps, skills, and chains"
          className="border-aomi-border bg-aomi-raised text-aomi-fg absolute bottom-full left-3 z-50 mb-2 max-h-[310px] w-[min(340px,calc(100%-24px))] overflow-y-auto rounded-2xl border p-1.5 shadow-xl"
        >
          {visibleItems.length > 0 ? (
            visibleGroups.map((group, groupIndex) => {
              const priorCount = visibleGroups
                .slice(0, groupIndex)
                .reduce((count, prior) => count + prior.items.length, 0);
              return (
                <section key={group.kind} aria-label={group.label}>
                  <div className="text-aomi-muted px-2.5 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.08em] first:pt-1">
                    {group.label}
                  </div>
                  {group.items.map((item, itemIndex) => {
                    const index = priorCount + itemIndex;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="option"
                        aria-selected={highlighted === index}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHighlighted(index)}
                        onClick={() => selectItem(item)}
                        className="hover:bg-aomi-hover aria-selected:bg-aomi-hover flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors"
                      >
                        <span className="bg-aomi-surface-2 text-aomi-muted flex size-8 shrink-0 items-center justify-center rounded-xl">
                          <item.Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {item.label}
                          </span>
                          {item.description ? (
                            <span className="text-aomi-muted mt-0.5 line-clamp-2 block text-[11px] leading-4">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </section>
              );
            })
          ) : (
            <div className="text-aomi-muted px-3 py-8 text-center text-xs">
              No matching capabilities
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
