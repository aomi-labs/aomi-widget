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
import { createPortal } from "react-dom";
import {
  SUPPORTED_CHAINS,
  getChainInfo,
  useControl,
  useThreadContext,
  type AgentMode,
} from "@aomi-labs/react";
import { getAppInfo } from "@/components/control-bar/app-metadata";
import { evmNetworkDescription } from "@/components/control-bar/network-metadata";
import {
  getAppIcon,
  getChainIcon,
  getSkillIcon,
  SolanaIcon,
} from "@/components/icons";
import { useOptionalAomiWalletNetworkPreferences } from "@/lib/wallet-kit/network-preferences";
import {
  conciseSkillDescription,
  skillLabel,
  useSkillCatalog,
} from "@/lib/capabilities/skill-catalog";
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

export type CapabilityMentionRequest = Pick<CapabilityMention, "kind" | "id">;

const CAPABILITY_MENTION_REQUEST_EVENT = "aomi:capability-mention-request";

/** Ask the mounted composer to insert a catalog capability as a rich mention. */
export function requestCapabilityMention(
  request: CapabilityMentionRequest,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CapabilityMentionRequest>(
      CAPABILITY_MENTION_REQUEST_EVENT,
      { detail: request },
    ),
  );
}

type CapabilityComposerContextValue = {
  mentions: CapabilityMention[];
  policy: ExecutionPolicy;
  routing: NormalizedAomiRouting;
  selectedDirectApp: DirectRoutingApp | null;
  showModeSelect: boolean;
  showDirectAppSelect: boolean;
  hintsEnabled: boolean;
  hostError: string | null;
  capabilityPickerRequest: number;
  setPolicy: (policy: ExecutionPolicy) => void;
  selectDirectApp: (target: DirectRoutingApp) => void;
  openCapabilityPicker: () => void;
  consumeCapabilityPickerRequest: () => void;
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
  const [capabilityPickerRequest, setCapabilityPickerRequest] = useState(0);

  useEffect(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps]);

  useEffect(() => {
    setMentions([]);
  }, [policy, threadContext.threadViewKey]);

  useEffect(() => {
    if (normalizedRouting.error) return;
    if (policy === "auto") {
      if (storedMode && storedMode !== "auto") {
        onAgentModeSelect("auto", { persist: false });
      }
      return;
    }
    if (
      selectedDirectApp &&
      (storedMode !== "direct" ||
        !currentDirectApp ||
        !sameDirectRoutingApp(selectedDirectApp, currentDirectApp))
    ) {
      onAgentTargetSelect(toAgentTarget(selectedDirectApp), { persist: false });
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

  const openCapabilityPicker = useCallback(() => {
    if (!hintsEnabled) return;
    setCapabilityPickerRequest((request) => request + 1);
  }, [hintsEnabled]);
  const consumeCapabilityPickerRequest = useCallback(() => {
    setCapabilityPickerRequest(0);
  }, []);

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
      capabilityPickerRequest,
      setPolicy,
      selectDirectApp,
      openCapabilityPicker,
      consumeCapabilityPickerRequest,
      addMention,
      retainMentions,
      prepareSubmit,
      enabledAppIds,
      allowAppMentions: hintsEnabled,
    }),
    [
      addMention,
      capabilityPickerRequest,
      consumeCapabilityPickerRequest,
      enabledAppIds,
      hintsEnabled,
      mentions,
      normalizedRouting,
      openCapabilityPicker,
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
  fullDescription?: string;
  chainIds?: number[];
};

type TriggerRange = {
  node: Text;
  start: number;
  end: number;
};

type ButtonTriggerRange = {
  marker: HTMLSpanElement;
  endNode: Node;
  end: number;
};

export function matchCapabilityMentionTrigger(beforeCaret: string): {
  query: string;
  start: number;
} | null {
  const match = beforeCaret.match(/(?:^|\s)@([^@\n]*)$/u);
  if (!match) return null;
  return {
    query: match[1] ?? "",
    start: beforeCaret.lastIndexOf("@"),
  };
}

function detectTrigger(): { query: string; range: TriggerRange } | null {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !(selection.anchorNode instanceof Text)) {
    return null;
  }
  const before = selection.anchorNode.data.slice(0, selection.anchorOffset);
  const match = matchCapabilityMentionTrigger(before);
  if (!match) return null;
  return {
    query: match.query,
    range: {
      node: selection.anchorNode,
      start: match.start,
      end: selection.anchorOffset,
    },
  };
}

function detectAnchoredTrigger(
  trigger: ButtonTriggerRange | null,
  editor: HTMLDivElement,
): { query: string; range: ButtonTriggerRange } | null {
  const selection = window.getSelection();
  if (
    !trigger ||
    !trigger.marker.isConnected ||
    !selection?.isCollapsed ||
    !selection.anchorNode ||
    !editor.contains(selection.anchorNode) ||
    !(
      trigger.marker.compareDocumentPosition(selection.anchorNode) &
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  ) {
    return null;
  }
  try {
    const range = document.createRange();
    range.setStartAfter(trigger.marker);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return {
      query: range.toString(),
      range: {
        marker: trigger.marker,
        endNode: selection.anchorNode,
        end: selection.anchorOffset,
      },
    };
  } catch {
    return null;
  }
}

export function textFromEditor(editor: HTMLDivElement): string {
  const mirror = editor.cloneNode(true) as HTMLDivElement;
  mirror
    .querySelectorAll<HTMLElement>("[data-capability-key]")
    .forEach((mention) => {
      mention.replaceWith(
        document.createTextNode(mention.dataset.capabilityToken ?? ""),
      );
    });
  mirror
    .querySelectorAll<HTMLElement>("[data-capability-picker-anchor]")
    .forEach((anchor) => anchor.remove());
  mirror.contentEditable = "false";
  mirror.setAttribute("aria-hidden", "true");
  mirror.style.cssText =
    "position:fixed;left:-10000px;top:0;width:720px;pointer-events:none;opacity:0";
  document.body.append(mirror);
  const text = mirror.innerText ?? mirror.textContent ?? "";
  mirror.remove();
  return text.replaceAll("\u00a0", " ").replaceAll("\u200b", "");
}

export function clearEmptyEditorStructure(editor: HTMLDivElement): boolean {
  if (textFromEditor(editor).trim().length > 0) return false;
  const hadStructure = editor.childNodes.length > 0;
  editor.replaceChildren();
  return hadStructure;
}

function mentionKeysFromEditor(editor: HTMLDivElement): Set<string> {
  return new Set(
    [...editor.querySelectorAll<HTMLElement>("[data-capability-key]")]
      .map((node) => node.dataset.capabilityKey)
      .filter((key): key is string => Boolean(key)),
  );
}

function isCapabilityMention(node: Node | null): node is HTMLElement {
  return (
    node instanceof HTMLElement && node.hasAttribute("data-capability-key")
  );
}

export function removeCapabilityMentionBeforeCaret(
  editor: HTMLDivElement,
  selection: Selection | null = window.getSelection(),
): boolean {
  if (
    !selection?.isCollapsed ||
    !selection.anchorNode ||
    !editor.contains(selection.anchorNode)
  ) {
    return false;
  }

  const anchor = selection.anchorNode;
  const offset = selection.anchorOffset;
  let mention: HTMLElement | null = null;
  let separator: Text | null = null;
  let separatorOffset = 0;

  const containingMention =
    anchor instanceof Element
      ? anchor.closest<HTMLElement>("[data-capability-key]")
      : anchor.parentElement?.closest<HTMLElement>("[data-capability-key]");
  if (containingMention && editor.contains(containingMention)) {
    mention = containingMention;
  } else if (anchor instanceof Text) {
    const beforeCaret = anchor.data.slice(0, offset);
    if (
      /^\s*$/u.test(beforeCaret) &&
      isCapabilityMention(anchor.previousSibling)
    ) {
      mention = anchor.previousSibling;
      separator = anchor;
      separatorOffset = offset;
    }
  } else {
    const priorNode = anchor.childNodes[offset - 1] ?? null;
    if (isCapabilityMention(priorNode)) {
      mention = priorNode;
    } else if (
      priorNode instanceof Text &&
      /^\s*$/u.test(priorNode.data) &&
      isCapabilityMention(priorNode.previousSibling)
    ) {
      mention = priorNode.previousSibling;
      separator = priorNode;
      separatorOffset = priorNode.data.length;
    }
  }

  if (!mention) return false;

  const caretRange = document.createRange();
  if (separator) {
    separator.deleteData(0, separatorOffset);
    caretRange.setStart(separator, 0);
  } else {
    caretRange.setStartBefore(mention);
  }
  caretRange.collapse(true);
  mention.remove();
  selection.removeAllRanges();
  selection.addRange(caretRange);
  return true;
}

export function SupportedChainStack({ chainIds }: { chainIds?: number[] }) {
  const uniqueChainIds = [...new Set(chainIds ?? [])].filter(
    (chainId) => Number.isSafeInteger(chainId) && chainId > 0,
  );
  if (uniqueChainIds.length === 0) return null;

  const visibleChainIds = uniqueChainIds.slice(0, 3);
  const remaining = uniqueChainIds.length - visibleChainIds.length;
  const chainNames = uniqueChainIds.map(
    (chainId) => getChainInfo(chainId)?.name ?? `Chain ${chainId}`,
  );
  const label = `Supported on ${chainNames.join(", ")}`;

  return (
    <span
      aria-label={label}
      title={label}
      className="flex shrink-0 items-center pl-1"
    >
      {visibleChainIds.map((chainId, index) => {
        const ChainIcon = getChainIcon(chainId) ?? Globe2Icon;
        return (
          <span
            key={chainId}
            className={`border-aomi-raised bg-aomi-surface-2 text-aomi-muted flex size-5 items-center justify-center rounded-full border ${index > 0 ? "-ml-1" : ""}`}
            style={{ zIndex: visibleChainIds.length - index }}
          >
            <ChainIcon className="size-3" />
          </span>
        );
      })}
      {remaining > 0 ? (
        <span className="bg-aomi-surface-2 text-aomi-muted -ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-medium">
          +{remaining}
        </span>
      ) : null}
    </span>
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
  const buttonTriggerRef = useRef<ButtonTriggerRange | null>(null);
  const pickerSourceRef = useRef<"mention" | "button" | null>(null);
  const lastTextRef = useRef("");
  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(-1);
  const [hasText, setHasText] = useState(false);
  const [mentionIconPortals, setMentionIconPortals] = useState<
    Array<{
      target: HTMLSpanElement;
      Icon: PickerItem["Icon"];
    }>
  >([]);
  const { value, setText, isDisabled } = unstable_useComposerInput();
  const {
    mentions,
    addMention,
    retainMentions,
    enabledAppIds,
    allowAppMentions,
    hintsEnabled,
    capabilityPickerRequest,
    consumeCapabilityPickerRequest,
  } = useCapabilityComposer();
  const { state } = useControl();
  const networkPreferences = useOptionalAomiWalletNetworkPreferences();
  const { skills } = useSkillCatalog();

  useEffect(() => () => retainMentions(new Set()), [retainMentions]);

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
      description: conciseSkillDescription(skill.description),
      fullDescription: skill.description,
      chainIds: skill.chainIds,
      searchText: `${skill.name} ${skill.description} ${skill.tags.join(" ")} ${skill.chainIds
        .map((chainId) => getChainInfo(chainId)?.name ?? chainId)
        .join(" ")}`,
      Icon: getSkillIcon(skill.id) ?? WandSparklesIcon,
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
            const chainSearch = (app.chainIds ?? [])
              .map((chainId) => getChainInfo(chainId)?.name ?? chainId)
              .join(" ");
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
              chainIds: app.chainIds,
              applicationId: app.applicationId,
              appName: app.name,
              searchText: `${app.name} ${app.label ?? ""} ${info.displayName} ${info.category.label} ${chainSearch}`,
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
        description: evmNetworkDescription(chain),
        chainTarget: { family: "evm" as const, chainId: chain.id },
        searchText: `${chain.name} evm ${chain.id}`,
        Icon: getChainIcon(chain.id) ?? Globe2Icon,
      })),
      ...(networkPreferences?.supportedSolanaNetworks ?? []).map((network) => ({
        key: `chain:solana:${network.id}`,
        kind: "chain" as const,
        id: `solana:${network.id}`,
        label: network.label,
        description: `Solana network · ${network.cluster.replace("solana:", "")}`,
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

  const closePicker = useCallback(() => {
    buttonTriggerRef.current?.marker.remove();
    buttonTriggerRef.current = null;
    pickerSourceRef.current = null;
    triggerRef.current = null;
    setQuery(null);
  }, []);

  useEffect(() => {
    if (query === null) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        editorRef.current?.contains(target) ||
        pickerRef.current?.contains(target)
      ) {
        return;
      }
      closePicker();
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointerDown,
        true,
      );
  }, [closePicker, query]);

  const syncPicker = useCallback(() => {
    if (!hintsEnabled) {
      closePicker();
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    if (pickerSourceRef.current === "button") {
      const trigger = detectAnchoredTrigger(buttonTriggerRef.current, editor);
      if (!trigger) {
        closePicker();
        return;
      }
      buttonTriggerRef.current = trigger.range;
      setQuery(trigger.query);
      return;
    }

    const trigger = detectTrigger();
    if (!trigger) {
      closePicker();
      return;
    }
    pickerSourceRef.current = "mention";
    triggerRef.current = trigger.range;
    setQuery(trigger.query);
  }, [closePicker, hintsEnabled]);

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
    setMentionIconPortals((current) =>
      current.filter(({ target }) => target.isConnected),
    );
    syncPicker();
  }, [retainMentions, setText, syncPicker]);

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
    setMentionIconPortals([]);
    closePicker();
    syncEditor();
  }, [closePicker, hintsEnabled, syncEditor]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastTextRef.current) return;
    editor.textContent = value;
    setMentionIconPortals([]);
    lastTextRef.current = value;
    setHasText(value.trim().length > 0);
    closePicker();
    if (value.trim().length === 0) retainMentions(new Set());
  }, [closePicker, retainMentions, value]);

  useEffect(() => {
    if (capabilityPickerRequest === 0 || !hintsEnabled || isDisabled) return;
    const editor = editorRef.current;
    if (!editor) return;

    closePicker();
    clearEmptyEditorStructure(editor);
    const selection = window.getSelection();
    const selectionNode = selection?.anchorNode;
    const selectionInsideMention =
      selectionNode instanceof Text &&
      selectionNode.parentElement?.closest("[data-capability-key]");
    let node: Text;
    let offset: number;
    if (
      selection?.isCollapsed &&
      selectionNode instanceof Text &&
      editor.contains(selectionNode) &&
      !selectionInsideMention
    ) {
      node = selectionNode;
      offset = selection.anchorOffset;
    } else if (editor.lastChild instanceof Text) {
      node = editor.lastChild;
      offset = node.data.length;
    } else {
      node = document.createTextNode("");
      editor.append(node);
      offset = 0;
    }

    const marker = document.createElement("span");
    marker.contentEditable = "false";
    marker.dataset.capabilityPickerAnchor = "";
    marker.setAttribute("aria-hidden", "true");
    marker.className =
      "pointer-events-none inline-block h-0 w-0 overflow-hidden align-baseline";
    marker.textContent = "\u200b";
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    range.insertNode(marker);
    const inputNode = document.createTextNode("");
    marker.after(inputNode);
    range.setStart(inputNode, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();

    pickerSourceRef.current = "button";
    buttonTriggerRef.current = { marker, endNode: inputNode, end: 0 };
    setQuery("");
    setHighlighted(0);
    consumeCapabilityPickerRequest();
  }, [
    capabilityPickerRequest,
    closePicker,
    consumeCapabilityPickerRequest,
    hintsEnabled,
    isDisabled,
  ]);

  const insertItemAtRange = useCallback(
    (item: PickerItem, range: Range) => {
      const editor = editorRef.current;
      if (!editor) return;
      range.deleteContents();

      const mention = document.createElement("span");
      mention.contentEditable = "false";
      mention.dataset.capabilityKey = item.key;
      mention.dataset.capabilityKind = item.kind;
      mention.className =
        "text-aomi-accent relative top-px mx-0.5 inline-flex items-center gap-1 whitespace-nowrap align-baseline font-medium";
      const glyph =
        item.kind === "skill" ? "✦" : item.kind === "app" ? "▦" : "◇";
      mention.dataset.capabilityToken = `${glyph} ${item.label}`;
      const iconTarget = document.createElement("span");
      iconTarget.setAttribute("aria-hidden", "true");
      iconTarget.className =
        "inline-flex size-3.5 shrink-0 items-center justify-center";
      const label = document.createElement("span");
      label.textContent = item.label;
      mention.append(iconTarget, label);
      mention.setAttribute("aria-label", `${item.kind} ${item.label}`);
      range.insertNode(mention);
      setMentionIconPortals((current) => [
        ...current,
        { target: iconTarget, Icon: item.Icon },
      ]);
      const space = document.createTextNode(" ");
      mention.after(space);

      const selection = window.getSelection();
      range.setStartAfter(space);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);

      addMention(item);
      closePicker();
      syncEditor();
      editor.focus();
    },
    [addMention, closePicker, syncEditor],
  );

  const selectItem = useCallback(
    (item: PickerItem) => {
      const range = document.createRange();
      if (pickerSourceRef.current === "button") {
        const trigger = buttonTriggerRef.current;
        if (!trigger?.marker.isConnected || !trigger.endNode.isConnected)
          return;
        range.setStartBefore(trigger.marker);
        range.setEnd(trigger.endNode, trigger.end);
      } else {
        const trigger = triggerRef.current;
        if (!trigger?.node.isConnected) return;
        range.setStart(trigger.node, trigger.start);
        range.setEnd(trigger.node, trigger.end);
      }
      insertItemAtRange(item, range);
    },
    [insertItemAtRange],
  );

  useEffect(() => {
    const insertRequestedMention = (rawEvent: Event) => {
      if (!hintsEnabled || isDisabled) return;
      const request = (rawEvent as CustomEvent<CapabilityMentionRequest>)
        .detail;
      if (!request) return;
      const item = items.find(
        (candidate) =>
          candidate.kind === request.kind && candidate.id === request.id,
      );
      const editor = editorRef.current;
      if (!item || !editor) return;
      if (mentions.some((mention) => mention.key === item.key)) {
        editor.focus();
        return;
      }

      closePicker();
      clearEmptyEditorStructure(editor);
      const range = document.createRange();
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      const selectionInsideEditor =
        selection?.isCollapsed && anchor && editor.contains(anchor);
      const selectionInsideMention =
        anchor instanceof Text &&
        anchor.parentElement?.closest("[data-capability-key]");
      if (selectionInsideEditor && !selectionInsideMention) {
        range.setStart(anchor, selection.anchorOffset);
      } else {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      range.collapse(true);
      insertItemAtRange(item, range);
    };

    window.addEventListener(
      CAPABILITY_MENTION_REQUEST_EVENT,
      insertRequestedMention,
    );
    return () =>
      window.removeEventListener(
        CAPABILITY_MENTION_REQUEST_EVENT,
        insertRequestedMention,
      );
  }, [
    closePicker,
    hintsEnabled,
    insertItemAtRange,
    isDisabled,
    items,
    mentions,
  ]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (
      event.key === "Backspace" &&
      editorRef.current &&
      removeCapabilityMentionBeforeCaret(editorRef.current)
    ) {
      event.preventDefault();
      closePicker();
      syncEditor();
      return;
    }
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
      closePicker();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      editorRef.current?.closest("form")?.requestSubmit();
    }
  };

  return (
    <>
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
          aria-controls={query !== null ? pickerId : undefined}
          aria-activedescendant={
            query !== null && highlighted >= 0
              ? `${pickerId}-option-${highlighted}`
              : undefined
          }
          contentEditable={!isDisabled}
          suppressContentEditableWarning
          onInput={syncEditor}
          onKeyDown={handleKeyDown}
          className={`${className} min-h-[30px]`}
        />
        {hintsEnabled && query !== null ? (
          <div className="border-aomi-border bg-aomi-raised text-aomi-fg absolute bottom-full left-0 z-50 mb-8 flex max-h-[min(320px,calc(100dvh-11rem))] w-full flex-col overflow-hidden rounded-2xl border p-2 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            {visibleItems.length > 0 ? (
              <div
                id={pickerId}
                role="listbox"
                aria-label="Apps, skills, and chains"
                ref={pickerRef}
                className="aui-command-list min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
              >
                {visibleGroups.map((group, groupIndex) => {
                  const priorCount = visibleGroups
                    .slice(0, groupIndex)
                    .reduce((count, prior) => count + prior.items.length, 0);
                  return (
                    <section key={group.kind} aria-label={group.label}>
                      <div className="text-aomi-muted px-2.5 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.09em] first:pt-1.5">
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
                              className="hover:bg-aomi-surface-2 aria-selected:bg-aomi-surface-2 flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                            >
                              <span className="text-aomi-muted flex size-7 shrink-0 items-center justify-center">
                                <item.Icon className="size-3.5" />
                              </span>
                              <span className="min-w-0 flex-1 py-px">
                                <span className="block truncate text-[13px] font-medium leading-4">
                                  {item.label}
                                </span>
                                {item.description ? (
                                  <span
                                    title={
                                      item.fullDescription ?? item.description
                                    }
                                    className="text-aomi-muted mt-px block truncate text-[11px] leading-4"
                                  >
                                    {item.description}
                                  </span>
                                ) : null}
                              </span>
                              <span className="ml-2 flex shrink-0 items-center gap-2">
                                {item.kind !== "chain" ? (
                                  <SupportedChainStack
                                    chainIds={item.chainIds}
                                  />
                                ) : null}
                                <span className="bg-aomi-surface-2 text-aomi-muted min-w-12 rounded-full px-2 py-1 text-center text-[9px] font-medium uppercase tracking-[0.08em]">
                                  {item.kind}
                                </span>
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
              <div
                id={pickerId}
                role="listbox"
                aria-label="Apps, skills, and chains"
                className="min-h-0 flex-1 py-1"
              >
                <div
                  role="status"
                  className="text-aomi-muted px-3 py-7 text-center text-xs"
                >
                  No matching capabilities
                </div>
              </div>
            )}
            <div className="border-aomi-border/70 text-aomi-muted mt-1.5 flex min-h-8 shrink-0 items-center justify-between gap-3 border-t px-2.5 pb-0.5 pt-2 text-[11px]">
              <span className="truncate">
                Type to search apps, skills, and chains
              </span>
              <span
                aria-hidden="true"
                className="hidden shrink-0 items-center gap-2 text-[10px] sm:flex"
              >
                <span className="inline-flex items-center gap-1">
                  <kbd className="font-sans">↑↓</kbd>
                  navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="font-sans">↵</kbd>
                  add
                </span>
              </span>
            </div>
          </div>
        ) : null}
      </div>
      {mentionIconPortals.map(({ target, Icon }) =>
        createPortal(<Icon className="size-3.5" />, target),
      )}
    </>
  );
};
