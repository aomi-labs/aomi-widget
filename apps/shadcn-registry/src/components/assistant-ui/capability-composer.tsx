"use client";

import {
  unstable_useComposerInput,
  useComposerRuntime,
} from "@assistant-ui/react";
import {
  AppWindowIcon,
  BlocksIcon,
  Globe2Icon,
  WandSparklesIcon,
} from "lucide-react";
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
} from "@aomi-labs/react";
import { getAppInfo } from "@/components/control-bar/app-metadata";
import { getAppIcon, getChainIcon, SolanaIcon } from "@/components/icons";
import { useOptionalAomiWalletNetworkPreferences } from "@/lib/wallet-kit/network-preferences";
import { skillLabel, useSkillCatalog } from "@/lib/capabilities/skill-catalog";

export type ExecutionPolicy = "auto" | "direct" | "coordinate";
export type ResolvedExecutionMode = "direct" | "coordinate";
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
  resolvedMode: ResolvedExecutionMode;
  conflict: string | null;
  pickerRequest: number;
  setPolicy: (policy: ExecutionPolicy) => void;
  addMention: (mention: CapabilityMention) => void;
  retainMentions: (keys: ReadonlySet<string>) => void;
  requestPicker: () => void;
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
  allowAppMentions,
}: {
  children: ReactNode;
  enabledAppIds?: readonly string[];
  allowAppMentions: boolean;
}) {
  const {
    state,
    getAuthorizedApps,
    getCurrentThreadApp,
    getCurrentThreadApplicationId,
    onAppSelect,
  } = useControl();
  const networkPreferences = useOptionalAomiWalletNetworkPreferences();
  const { threadViewKey } = useThreadContext();
  const composerRuntime = useComposerRuntime();
  const managedAppSelectionRef = useRef(false);
  const [mentions, setMentions] = useState<CapabilityMention[]>([]);
  const [policy, setPolicy] = useState<ExecutionPolicy>("auto");
  const [pickerRequest, setPickerRequest] = useState(0);

  useEffect(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps]);

  useEffect(() => {
    managedAppSelectionRef.current = false;
    setMentions([]);
    setPolicy("auto");
  }, [threadViewKey]);

  const appCount = new Set(
    mentions.filter((item) => item.kind === "app").map((item) => item.id),
  ).size;
  const chainCount = new Set(
    mentions.filter((item) => item.kind === "chain").map((item) => item.id),
  ).size;
  const autoNeedsCoordinate = appCount > 1 || chainCount > 1;
  const resolvedMode: ResolvedExecutionMode =
    policy === "coordinate" || (policy === "auto" && autoNeedsCoordinate)
      ? "coordinate"
      : "direct";
  const orchestratorAvailable = state.authorizedApps.includes("orchestrator");
  const conflict =
    policy === "direct" && autoNeedsCoordinate
      ? "Multiple apps or chains need Coordinate."
      : resolvedMode === "coordinate" && !orchestratorAvailable
        ? "Coordinate isn’t available for this account."
        : null;

  const addMention = useCallback(
    (mention: CapabilityMention) => {
      setMentions((current) =>
        current.some((item) => item.key === mention.key)
          ? current
          : [...current, mention],
      );
      if (mention.chainTarget) {
        networkPreferences?.selectTarget(mention.chainTarget);
      }
    },
    [networkPreferences],
  );

  const retainMentions = useCallback((keys: ReadonlySet<string>) => {
    setMentions((current) => current.filter((item) => keys.has(item.key)));
  }, []);

  useEffect(() => {
    if (!allowAppMentions || state.authorizedApps.length === 0) return;

    const lastApp = mentions.findLast((item) => item.kind === "app");
    const target = (() => {
      if (resolvedMode === "coordinate") {
        managedAppSelectionRef.current = true;
        return (
          state.appDescriptors.find((app) => app.name === "orchestrator") ?? {
            name: "orchestrator",
            applicationId: null,
          }
        );
      }
      if (lastApp) {
        managedAppSelectionRef.current = true;
        return {
          name: lastApp.appName ?? lastApp.id,
          applicationId: lastApp.applicationId ?? null,
        };
      }
      if (!managedAppSelectionRef.current) return null;
      managedAppSelectionRef.current = false;
      return { name: "default", applicationId: null };
    })();

    if (!target) return;

    if (
      getCurrentThreadApp() === target.name &&
      String(getCurrentThreadApplicationId() ?? "") ===
        String(target.applicationId ?? "")
    ) {
      return;
    }
    onAppSelect(target.name, { applicationId: target.applicationId });
  }, [
    allowAppMentions,
    getCurrentThreadApp,
    getCurrentThreadApplicationId,
    mentions,
    onAppSelect,
    resolvedMode,
    state.appDescriptors,
    state.authorizedApps,
  ]);

  const prepareSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (conflict) {
        event.preventDefault();
        return;
      }
      const current = composerRuntime.getState().runConfig;
      const custom = { ...(current.custom ?? {}) };
      if (mentions.length === 0) {
        delete custom.aomiCapabilityHints;
      } else {
        custom.aomiCapabilityHints = {
          policy,
          resolvedMode,
          capabilities: mentions.map(({ kind, id }) => ({ kind, id })),
        };
      }
      composerRuntime.setRunConfig({ ...current, custom });
    },
    [composerRuntime, conflict, mentions, policy, resolvedMode],
  );

  const value = useMemo<CapabilityComposerContextValue>(
    () => ({
      mentions,
      policy,
      resolvedMode,
      conflict,
      pickerRequest,
      setPolicy,
      addMention,
      retainMentions,
      requestPicker: () => setPickerRequest((value) => value + 1),
      prepareSubmit,
      enabledAppIds,
      allowAppMentions,
    }),
    [
      addMention,
      allowAppMentions,
      conflict,
      enabledAppIds,
      mentions,
      pickerRequest,
      policy,
      prepareSubmit,
      resolvedMode,
      retainMentions,
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

function appendTextAtCaret(editor: HTMLDivElement, text: string) {
  editor.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  if (
    selection?.rangeCount &&
    editor.contains(selection.getRangeAt(0).commonAncestorContainer)
  ) {
    range.setStart(
      selection.getRangeAt(0).startContainer,
      selection.getRangeAt(0).startOffset,
    );
  } else {
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  range.collapse(true);
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export const CapabilityMentionInput: FC<{
  placeholder: string;
  className: string;
}> = ({ placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<TriggerRange | null>(null);
  const lastTextRef = useRef("");
  const handledPickerRequestRef = useRef(0);
  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [hasText, setHasText] = useState(false);
  const { value, setText, isDisabled } = unstable_useComposerInput();
  const {
    mentions,
    addMention,
    retainMentions,
    pickerRequest,
    enabledAppIds,
    allowAppMentions,
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
    if (query === null) return [];
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
  }, [items, mentions, query]);

  const visibleItems = useMemo(
    () => visibleGroups.flatMap((group) => group.items),
    [visibleGroups],
  );

  const syncEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = textFromEditor(editor);
    lastTextRef.current = text;
    setHasText(text.length > 0);
    setText(text);
    retainMentions(mentionKeysFromEditor(editor));
    const trigger = detectTrigger();
    triggerRef.current = trigger?.range ?? null;
    setQuery(trigger?.query ?? null);
    setHighlighted(0);
  }, [retainMentions, setText]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastTextRef.current) return;
    editor.textContent = value;
    lastTextRef.current = value;
    setHasText(value.length > 0);
    if (value.length === 0) retainMentions(new Set());
  }, [retainMentions, value]);

  useEffect(() => {
    if (
      pickerRequest === 0 ||
      pickerRequest === handledPickerRequestRef.current ||
      !editorRef.current
    ) {
      return;
    }
    handledPickerRequestRef.current = pickerRequest;
    appendTextAtCaret(editorRef.current, "@");
    syncEditor();
  }, [pickerRequest, syncEditor]);

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
        <span className="text-aomi-muted pointer-events-none absolute left-4 top-1.5 text-[13px]">
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
          const trigger = detectTrigger();
          triggerRef.current = trigger?.range ?? null;
          setQuery(trigger?.query ?? null);
        }}
        className={`${className} min-h-[30px]`}
      />
      {query !== null ? (
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

export const CapabilityHintButton: FC = () => {
  const { requestPicker } = useCapabilityComposer();
  return (
    <button
      type="button"
      onClick={requestPicker}
      className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors"
      aria-label="Add an app, skill, or chain"
      title="Add an app, skill, or chain"
    >
      <BlocksIcon className="size-3.5" />
      <span className="hidden sm:inline">Add</span>
    </button>
  );
};
