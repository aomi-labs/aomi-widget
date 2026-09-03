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
  useId,
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
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerId = useId();
  const triggerRef = useRef<TriggerRange | null>(null);
  const lastTextRef = useRef("");
  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(-1);
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
    return (
      [
        { kind: "app", label: "Apps" },
        { kind: "skill", label: "Skills" },
        { kind: "chain", label: "Chains" },
      ] as const
    )
      .map((group) => ({
        ...group,
        items: matching.filter((item) => item.kind === group.kind),
      }))
      .filter((group) => group.items.length > 0);
  }, [hintsEnabled, items, mentions, query]);

  const visibleItems = useMemo(
    () => visibleGroups.flatMap((group) => group.items),
    [visibleGroups],
  );

  useEffect(() => {
    setHighlighted(query !== null && visibleItems.length > 0 ? 0 : -1);
  }, [query, visibleItems.length]);

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
    if (highlighted < 0) return;
    const picker = pickerRef.current;
    const option = picker?.querySelector<HTMLElement>(
      `[data-capability-index="${highlighted}"]`,
    );
    if (!picker || !option) return;

    const pickerBounds = picker.getBoundingClientRect();
    const optionBounds = option.getBoundingClientRect();
    if (optionBounds.top < pickerBounds.top) {
      picker.scrollTop -= pickerBounds.top - optionBounds.top;
    } else if (optionBounds.bottom > pickerBounds.bottom) {
      picker.scrollTop += optionBounds.bottom - pickerBounds.bottom;
    }
  }, [highlighted]);

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
        setHighlighted((value) =>
          value < 0 ? 0 : (value + 1) % visibleItems.length,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((value) =>
          value < 0
            ? visibleItems.length - 1
            : (value - 1 + visibleItems.length) % visibleItems.length,
        );
        return;
      }
      if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey) {
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
        aria-activedescendant={
          query !== null && highlighted >= 0
            ? `${pickerId}-option-${highlighted}`
            : undefined
        }
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
          className="border-aomi-border bg-aomi-raised text-aomi-fg absolute bottom-full left-3 z-50 mb-2 w-[min(380px,calc(100%-24px))] overflow-hidden rounded-xl border p-1 shadow-xl"
        >
          {visibleItems.length > 0 ? (
            <div
              ref={pickerRef}
              className="aui-command-list max-h-[268px] overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
            >
              {visibleGroups.map((group, groupIndex) => {
                const priorCount = visibleGroups
                  .slice(0, groupIndex)
                  .reduce((count, prior) => count + prior.items.length, 0);
                return (
                  <section key={group.kind} aria-label={group.label}>
                    <div className="text-aomi-muted px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] first:pt-1.5">
                      {group.label}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item, itemIndex) => {
                        const index = priorCount + itemIndex;
                        return (
                          <button
                            key={item.key}
                            id={`${pickerId}-option-${index}`}
                            data-capability-index={index}
                            type="button"
                            role="option"
                            aria-selected={highlighted === index}
                            onMouseDown={(event) => event.preventDefault()}
                            onPointerMove={() => setHighlighted(index)}
                            onClick={() => selectItem(item)}
                            className="hover:bg-aomi-hover aria-selected:bg-aomi-hover flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors"
                          >
                            <span className="bg-aomi-surface-2 text-aomi-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
                              <item.Icon className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 py-px">
                              <span className="block truncate text-[13px] font-medium leading-4">
                                {item.label}
                              </span>
                              {item.description ? (
                                <span
                                  title={item.description}
                                  className="text-aomi-muted mt-px block truncate text-[11px] leading-4"
                                >
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="text-aomi-muted px-3 py-7 text-center text-xs">
              No matching capabilities
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
