"use client";
import {
  AomiWalletKitProvider,
  FullTestnetWalletRouter,
  isFullTestnet,
  useFullTestnet
} from "./chunk-JUSFHFWL.js";
import {
  AOMI_SESSION_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY,
  AomiWalletKitContextProvider,
  canonicalWalletKey,
  formatAuthMethod,
  formatWalletAddress,
  formatWalletProvider,
  inferAuthMethod,
  normalizeWalletOptionId,
  publicEnv,
  useAomiWalletKit,
  useOptionalAomiWalletNetworkPreferences,
  walletDebug
} from "./chunk-3GP4B2BE.js";

// src/components/aomi-frame.tsx
import {
  createContext as createContext3,
  useContext as useContext3
} from "react";
import {
  AomiRuntimeProvider,
  cn as cn29,
  useAomiRuntime as useAomiRuntime2
} from "@aomi-labs/react";

// src/components/assistant-ui/thread.tsx
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon as CheckIcon8,
  ChevronLeftIcon as ChevronLeftIcon2,
  ChevronRightIcon as ChevronRightIcon3,
  CopyIcon as CopyIcon2,
  PencilIcon as PencilIcon2,
  RefreshCwIcon,
  Square,
  WalletIcon as WalletIcon4,
  ArrowLeftRightIcon,
  LayersIcon as LayersIcon2,
  CableIcon as CableIcon2
} from "lucide-react";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive
} from "@assistant-ui/react";
import { useEffect as useEffect8 } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import * as m from "motion/react-m";

// src/components/ui/button.tsx
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@aomi-labs/react";
import { jsx } from "react/jsx-runtime";
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "button",
      "data-variant": variant,
      "data-size": size,
      className: cn(buttonVariants({ variant, size, className })),
      ...props
    }
  );
}

// src/components/ui/skeleton.tsx
import { cn as cn2 } from "@aomi-labs/react";
import { jsx as jsx2 } from "react/jsx-runtime";
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx2(
    "div",
    {
      "data-slot": "skeleton",
      className: cn2("bg-accent animate-pulse rounded-md", className),
      ...props
    }
  );
}

// src/components/assistant-ui/markdown-text.tsx
import "@assistant-ui/react-markdown/styles/dot.css";
import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

// src/components/assistant-ui/tooltip-icon-button.tsx
import { forwardRef } from "react";
import { Slottable } from "@radix-ui/react-slot";

// src/components/ui/tooltip.tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn as cn3 } from "@aomi-labs/react";
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return /* @__PURE__ */ jsx3(
    TooltipPrimitive.Provider,
    {
      "data-slot": "tooltip-provider",
      delayDuration,
      ...props
    }
  );
}
function Tooltip({
  ...props
}) {
  return /* @__PURE__ */ jsx3(TooltipProvider, { children: /* @__PURE__ */ jsx3(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props }) });
}
function TooltipTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx3(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx3(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
    TooltipPrimitive.Content,
    {
      "data-slot": "tooltip-content",
      sideOffset,
      className: cn3(
        "origin-(--radix-tooltip-content-transform-origin) animate-in bg-primary text-primary-foreground fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-fit text-balance rounded-md px-3 py-1.5 text-xs",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsx3(TooltipPrimitive.Arrow, { className: "bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" })
      ]
    }
  ) });
}

// src/components/assistant-ui/tooltip-icon-button.tsx
import { cn as cn4 } from "@aomi-labs/react";
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
var TooltipIconButton = forwardRef(({ children, tooltip, side = "bottom", className, ...rest }, ref) => {
  return /* @__PURE__ */ jsxs2(Tooltip, { children: [
    /* @__PURE__ */ jsx4(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs2(
      Button,
      {
        variant: "ghost",
        size: "icon",
        ...rest,
        className: cn4("aui-button-icon size-6 rounded-xl p-1", className),
        ref,
        children: [
          /* @__PURE__ */ jsx4(Slottable, { children }),
          /* @__PURE__ */ jsx4("span", { className: "aui-sr-only sr-only", children: tooltip })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx4(TooltipContent, { side, children: tooltip })
  ] });
});
TooltipIconButton.displayName = "TooltipIconButton";

// src/components/assistant-ui/markdown-text.tsx
import { cn as cn5 } from "@aomi-labs/react";
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
var MarkdownTextImpl = () => {
  return /* @__PURE__ */ jsx5(
    MarkdownTextPrimitive,
    {
      remarkPlugins: [remarkGfm],
      className: "aui-md",
      components: defaultComponents
    }
  );
};
var MarkdownText = memo(MarkdownTextImpl);
var CodeHeader = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };
  return /* @__PURE__ */ jsxs3("div", { className: "aui-code-header-root mt-2.5 flex items-center justify-between rounded-t-lg border border-border/50 border-b-0 bg-muted/50 px-3 py-1.5 text-xs", children: [
    /* @__PURE__ */ jsx5("span", { className: "aui-code-header-language font-medium text-muted-foreground lowercase", children: language }),
    /* @__PURE__ */ jsxs3(TooltipIconButton, { tooltip: "Copy", onClick: onCopy, children: [
      !isCopied && /* @__PURE__ */ jsx5(CopyIcon, {}),
      isCopied && /* @__PURE__ */ jsx5(CheckIcon, {})
    ] })
  ] });
};
var useCopyToClipboard = ({
  copiedDuration = 3e3
} = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };
  return { isCopied, copyToClipboard };
};
var defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "h1",
    {
      className: cn5(
        "aui-md-h1 mb-2 scroll-m-20 font-semibold text-base first:mt-0 last:mb-0",
        className
      ),
      ...props
    }
  ),
  h2: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "h2",
    {
      className: cn5(
        "aui-md-h2 mt-3 mb-1.5 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
        className
      ),
      ...props
    }
  ),
  h3: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "h3",
    {
      className: cn5(
        "aui-md-h3 mt-2.5 mb-1 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
        className
      ),
      ...props
    }
  ),
  h4: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "h4",
    {
      className: cn5(
        "aui-md-h4 mt-2 mb-1 scroll-m-20 font-medium text-sm first:mt-0 last:mb-0",
        className
      ),
      ...props
    }
  ),
  h5: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "h5",
    {
      className: cn5(
        "aui-md-h5 mt-2 mb-1 font-medium text-sm first:mt-0 last:mb-0",
        className
      ),
      ...props
    }
  ),
  h6: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "h6",
    {
      className: cn5(
        "aui-md-h6 mt-2 mb-1 font-medium text-sm first:mt-0 last:mb-0",
        className
      ),
      ...props
    }
  ),
  p: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "p",
    {
      className: cn5(
        "aui-md-p my-2.5 leading-normal first:mt-0 last:mb-0",
        className
      ),
      ...props
    }
  ),
  a: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "a",
    {
      className: cn5(
        "aui-md-a text-primary underline underline-offset-2 hover:text-primary/80",
        className
      ),
      ...props
    }
  ),
  blockquote: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "blockquote",
    {
      className: cn5(
        "aui-md-blockquote my-2.5 border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground italic",
        className
      ),
      ...props
    }
  ),
  ul: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "ul",
    {
      className: cn5(
        "aui-md-ul my-2 ml-4 list-disc marker:text-muted-foreground [&>li]:mt-1",
        className
      ),
      ...props
    }
  ),
  ol: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "ol",
    {
      className: cn5(
        "aui-md-ol my-2 ml-4 list-decimal marker:text-muted-foreground [&>li]:mt-1",
        className
      ),
      ...props
    }
  ),
  hr: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "hr",
    {
      className: cn5("aui-md-hr my-2 border-muted-foreground/20", className),
      ...props
    }
  ),
  table: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "table",
    {
      className: cn5(
        "aui-md-table my-2 w-full border-separate border-spacing-0 overflow-y-auto",
        className
      ),
      ...props
    }
  ),
  th: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "th",
    {
      className: cn5(
        "aui-md-th bg-muted px-2 py-1 text-left font-medium first:rounded-tl-lg last:rounded-tr-lg [[align=center]]:text-center [[align=right]]:text-right",
        className
      ),
      ...props
    }
  ),
  td: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "td",
    {
      className: cn5(
        "aui-md-td border-muted-foreground/20 border-b border-l px-2 py-1 text-left last:border-r [[align=center]]:text-center [[align=right]]:text-right",
        className
      ),
      ...props
    }
  ),
  tr: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "tr",
    {
      className: cn5(
        "aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
        className
      ),
      ...props
    }
  ),
  li: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "li",
    {
      className: cn5("aui-md-li leading-normal", className),
      ...props
    }
  ),
  sup: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "sup",
    {
      className: cn5("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className),
      ...props
    }
  ),
  pre: ({ className, ...props }) => /* @__PURE__ */ jsx5(
    "pre",
    {
      className: cn5(
        "aui-md-pre overflow-x-auto rounded-t-none rounded-b-lg border border-border/50 border-t-0 bg-muted/30 p-3 text-xs leading-relaxed",
        className
      ),
      ...props
    }
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return /* @__PURE__ */ jsx5(
      "code",
      {
        className: cn5(
          !isCodeBlock && "aui-md-inline-code rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.85em]",
          className
        ),
        ...props
      }
    );
  },
  CodeHeader
});

// src/components/assistant-ui/tool-fallback.tsx
import { CheckIcon as CheckIcon2, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState as useState2 } from "react";
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
var ToolFallback = ({
  toolName,
  argsText,
  result
}) => {
  const [isCollapsed, setIsCollapsed] = useState2(true);
  return /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-root mb-4 flex w-full flex-col gap-3 overflow-hidden rounded-2xl border py-3", children: [
    /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-header flex items-center gap-2 px-4", children: [
      /* @__PURE__ */ jsx6(CheckIcon2, { className: "aui-tool-fallback-icon size-4" }),
      /* @__PURE__ */ jsxs4("p", { className: "aui-tool-fallback-title flex-grow", children: [
        "Used tool: ",
        /* @__PURE__ */ jsx6("b", { children: toolName })
      ] }),
      /* @__PURE__ */ jsx6(
        Button,
        {
          className: "rounded-xl",
          onClick: () => setIsCollapsed(!isCollapsed),
          children: isCollapsed ? /* @__PURE__ */ jsx6(ChevronUpIcon, {}) : /* @__PURE__ */ jsx6(ChevronDownIcon, {})
        }
      )
    ] }),
    !isCollapsed && /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-content bg-muted flex flex-col gap-2 border-t pt-2", children: [
      /* @__PURE__ */ jsx6("div", { className: "aui-tool-fallback-args-root px-4", children: /* @__PURE__ */ jsx6("pre", { className: "aui-tool-fallback-args-value whitespace-pre-wrap", children: argsText }) }),
      result !== void 0 && /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-result-root border-t border-dashed px-4 pt-2", children: [
        /* @__PURE__ */ jsx6("p", { className: "aui-tool-fallback-result-header font-semibold", children: "Result:" }),
        /* @__PURE__ */ jsx6("pre", { className: "aui-tool-fallback-result-content whitespace-pre-wrap text-[012px]", children: typeof result === "string" ? result : JSON.stringify(result, null, 2) })
      ] })
    ] })
  ] });
};

// src/components/assistant-ui/working-trace.tsx
import { useEffect, useLayoutEffect, useRef, useState as useState3 } from "react";
import {
  TextMessagePartProvider,
  useMessage
} from "@assistant-ui/react";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { cn as cn6, useCurrentThreadMetadata } from "@aomi-labs/react";

// src/components/assistant-ui/tool-interpreter/normalize.ts
import { getChainInfo, SUPPORTED_CHAINS } from "@aomi-labs/react";
var asRecord = (value) => typeof value === "object" && value !== null ? value : null;
var asString = (value) => typeof value === "string" && value.length > 0 ? value : void 0;
var asNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : void 0;
var humanize = (value) => {
  const readable = value.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
  if (!readable) return "Tool";
  return readable.charAt(0).toUpperCase() + readable.slice(1);
};
var uniqueFacts = (facts) => {
  const seen = /* @__PURE__ */ new Set();
  return facts.filter((fact) => {
    const key = `${fact.kind}:${fact.role ?? ""}:${fact.label ?? fact.value}`;
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};
var normalizeChainLabel = (value) => value.toLowerCase().replace(/[_-]+/g, " ").trim();
var chainInfoFromName = (name) => {
  if (!name) return void 0;
  const normalized = normalizeChainLabel(name);
  return SUPPORTED_CHAINS.find(
    (chain) => normalizeChainLabel(chain.name) === normalized || chain.ticker.toLowerCase() === normalized
  );
};
var chainFact = (chainId, chainName, source = "result") => {
  const id = asNumber(chainId);
  const name = asString(chainName);
  const chain = id != null ? getChainInfo(id) : chainInfoFromName(name);
  const resolvedId = chain?.id ?? id;
  if (resolvedId == null && !name) return null;
  return {
    kind: "chain",
    value: resolvedId != null ? String(resolvedId) : name ?? "",
    label: chain?.name ?? (name ? humanize(name) : `chain ${id}`),
    source
  };
};
var chainFactFromRecord = (record, source = "result") => {
  if (!record) return null;
  return chainFact(
    record.chain_id,
    record.chain_name ?? record.chain ?? record.network,
    source
  );
};
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var normalizeAddress = (value) => {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(lower) ? lower : null;
};
var addressFact = (value, role, source = "result") => {
  const address = normalizeAddress(value);
  if (!address) return null;
  return {
    kind: "address",
    role: address === ZERO_ADDRESS ? "null" : role,
    value: address,
    source
  };
};
var tokenFact = (symbol, source = "result") => {
  const value = asString(symbol);
  return value ? { kind: "token", value, source } : null;
};
var amountFact = (value, unit, source = "result") => {
  const raw = typeof value === "bigint" ? value.toString() : typeof value === "number" && Number.isFinite(value) ? String(value) : asString(value);
  if (!raw) return null;
  return {
    kind: "amount",
    value: raw,
    label: unit ? `${raw} ${unit}` : raw,
    source
  };
};
var statusFact = (value, source = "result") => {
  if (value === true) return { kind: "status", value: "success", source };
  if (value === false) return { kind: "status", value: "failed", source };
  const raw = asString(value);
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("pending")) {
    return { kind: "status", value: "pending", source };
  }
  if (normalized.includes("queued")) {
    return { kind: "status", value: "queued", source };
  }
  if (normalized.includes("success") || normalized.includes("complete")) {
    return { kind: "status", value: "success", source };
  }
  if (normalized.includes("fail") || normalized.includes("error")) {
    return { kind: "status", value: "failed", source };
  }
  if (normalized.includes("revoked")) {
    return { kind: "status", value: "revoked", source };
  }
  return { kind: "status", value: raw, label: humanize(raw), source };
};
var selectorFact = (value, label, source = "decoded") => {
  const selector = typeof value === "string" && value.startsWith("0x") && value.length >= 10 ? value.slice(0, 10).toLowerCase() : null;
  return selector ? { kind: "selector", value: selector, label, source } : null;
};
var calldataWord = (input, index) => {
  const start = 10 + index * 64;
  const word = input.slice(start, start + 64);
  return word.length === 64 ? word : null;
};
var addressFromWord = (word) => {
  if (!word) return null;
  return normalizeAddress(`0x${word.slice(24)}`);
};
var bigintFromWord = (word) => {
  if (!word) return null;
  try {
    return BigInt(`0x${word}`).toString();
  } catch {
    return null;
  }
};
var decodedValue = (result) => {
  const decodedRoot = asRecord(result.result_decoded);
  const decoded = asRecord(decodedRoot?.decoded);
  return decoded?.decoded;
};
var topicTokenFact = (topic) => {
  const matches = topic.match(/\b[A-Z][A-Z0-9]{1,9}\b/g);
  const ignored = /* @__PURE__ */ new Set(["URL", "USD"]);
  const token = matches?.find((match) => !ignored.has(match));
  return token ? { kind: "token", value: token, source: "label" } : null;
};
var hostnameFromUrl = (urlText) => {
  try {
    return new URL(urlText).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

// src/components/assistant-ui/tool-interpreter/families/simple.ts
var op = (id, rawLabel, facts, confidence = "high") => ({
  id,
  facts: uniqueFacts(facts.filter((fact) => fact != null)),
  confidence,
  rawLabel
});
var displaySkillLabel = (skillId) => {
  if (skillId === "lifi_swap") return "Lifi";
  return void 0;
};
var matchWebSearch = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const body = asString(resultRecord.args) ?? asString(resultRecord.result);
  if (!body || !/Found\s+\d+\s+results/i.test(body)) return null;
  const count = body.match(/Found\s+(\d+)\s+results/i)?.[1];
  const firstUrl = body.match(/URL:\s*(https?:\/\/\S+)/i)?.[1];
  const source = firstUrl ? hostnameFromUrl(firstUrl) : null;
  return op("web.search", rawLabel, [
    topicTokenFact(rawLabel),
    count ? { kind: "count", role: "results", value: count, source: "result" } : null,
    source ? { kind: "sourceHost", value: source, source: "result" } : null
  ]);
};
var matchSkillActivation = ({
  rawLabel,
  resultRecord
}) => {
  if (!resultRecord) return null;
  if (!("activated" in resultRecord || "applied_scope" in resultRecord)) {
    return null;
  }
  const activated = Array.isArray(resultRecord.activated) ? resultRecord.activated.filter(
    (value) => typeof value === "string"
  ) : [];
  return op(
    "skill.activate",
    rawLabel,
    activated.length > 0 ? activated.map((value) => ({
      kind: "skill",
      value,
      label: displaySkillLabel(value),
      source: "result"
    })) : [{ kind: "skill", value: "Skill", source: "result" }]
  );
};
var matchChainContext = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  if (!("supported_chains" in resultRecord || "rpc_endpoint" in resultRecord || "block_number" in resultRecord)) {
    return null;
  }
  return op("evm.context", rawLabel, [
    chainFact(resultRecord.chain_id, resultRecord.chain_name),
    typeof resultRecord.block_number === "number" ? {
      kind: "block",
      value: String(resultRecord.block_number),
      source: "result"
    } : null
  ]);
};
var matchNativeBalance = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const address = addressFact(resultRecord.address, "owner");
  const balance = amountFact(resultRecord.balance_eth, "ETH");
  if (!address || !balance) return null;
  return op("evm.account.native_balance", rawLabel, [
    chainFactFromRecord(resultRecord),
    address,
    { ...balance, role: "native" }
  ]);
};
var matchTokenLookup = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  if (!("found" in resultRecord && "contracts" in resultRecord)) return null;
  const contracts = Array.isArray(resultRecord.contracts) ? resultRecord.contracts.map(asRecord).filter((item) => !!item) : [];
  const first = contracts[0];
  const found = resultRecord.found === true;
  return op(`evm.contract.lookup.${found ? "found" : "missing"}`, rawLabel, [
    chainFactFromRecord(first) ?? chainFactFromRecord(resultRecord),
    tokenFact(first?.symbol) ?? topicTokenFact(rawLabel)
  ]);
};
var matchError = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const rawError = resultRecord.error;
  if (!(resultRecord.is_error === true || rawError)) return null;
  const errorRecord = asRecord(rawError);
  const code = asString(resultRecord.code) ?? asString(errorRecord?.code) ?? asString(errorRecord?.type);
  return op("tool.error", rawLabel, [
    statusFact("failed"),
    code ? { kind: "code", role: "error", value: code, source: "result" } : null
  ]);
};

// src/components/assistant-ui/tool-registry.ts
import {
  ArrowRightLeftIcon,
  BadgeCheckIcon,
  CableIcon,
  CoinsIcon,
  FlameIcon,
  FlaskConicalIcon,
  GlobeIcon,
  LayersIcon,
  PenLineIcon,
  PencilLineIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  TrendingUpIcon,
  WalletIcon,
  WrenchIcon
} from "lucide-react";
var DEFAULT_TOOL_ICON = WrenchIcon;
var EVM_SELECTOR_REGISTRY = {
  "0x70a08231": {
    selector: "0x70a08231",
    name: "balanceOf",
    title: "Check token balance",
    chip: "balanceOf",
    icon: WalletIcon,
    kind: "erc20_balance"
  },
  "0xa9059cbb": {
    selector: "0xa9059cbb",
    name: "transfer",
    title: "Transfer token",
    chip: "transfer",
    icon: SendIcon,
    kind: "erc20_transfer"
  },
  "0x23b872dd": {
    selector: "0x23b872dd",
    name: "transferFrom",
    title: "Transfer token",
    chip: "transferFrom",
    icon: SendIcon,
    kind: "erc20_transfer"
  },
  "0x095ea7b3": {
    selector: "0x095ea7b3",
    name: "approve",
    title: "Approve token spend",
    chip: "approve",
    icon: PencilLineIcon,
    kind: "erc20_approve"
  },
  "0xdd62ed3e": {
    selector: "0xdd62ed3e",
    name: "allowance",
    title: "Check allowance",
    chip: "allowance",
    icon: PenLineIcon,
    kind: "erc20_allowance"
  },
  "0x313ce567": {
    selector: "0x313ce567",
    name: "decimals",
    title: "Read token decimals",
    chip: "decimals",
    icon: CoinsIcon,
    kind: "erc20_metadata"
  },
  "0x95d89b41": {
    selector: "0x95d89b41",
    name: "symbol",
    title: "Read token metadata",
    chip: "symbol",
    icon: CoinsIcon,
    kind: "erc20_metadata"
  },
  "0x06fdde03": {
    selector: "0x06fdde03",
    name: "name",
    title: "Read token metadata",
    chip: "name",
    icon: CoinsIcon,
    kind: "erc20_metadata"
  },
  "0x18160ddd": {
    selector: "0x18160ddd",
    name: "totalSupply",
    title: "Read token metadata",
    chip: "totalSupply",
    icon: CoinsIcon,
    kind: "erc20_metadata"
  }
};
var TOPIC_ICON_REGISTRY = [
  [/simulat/, FlaskConicalIcon],
  [/^\s*stag|\bstage\b/, LayersIcon],
  [/^\s*burn/, FlameIcon],
  [/^\s*(send|commit|execute|submit|broadcast|transfer)/, SendIcon],
  [/\bswap/, ArrowRightLeftIcon],
  [/^\s*bridg/, CableIcon],
  [/\b(sign|approv|allowance)/, PenLineIcon],
  [/\b(chain context|context|network|gas|block)\b/, GlobeIcon],
  [/\b(balance|position|portfolio|holding|wallet)/, WalletIcon],
  [/\b(decimal|symbol|metadata|supply)/, CoinsIcon],
  [/\b(price|quote|market|value)/, TrendingUpIcon],
  [/\b(activat|skill)/, SparklesIcon],
  [/\b(search|find|look ?up|resolve|fetch|get|check|read)/, SearchIcon]
];
var STAGED_ACTION_ICON_REGISTRY = [
  [/\b(approv\w*|permit)\b/, PencilLineIcon],
  [/\b(allowance)\b/, PenLineIcon],
  [/\b(swap|trade|route)\b/, ArrowRightLeftIcon],
  [/\b(transfer|send|commit|execute|submit|broadcast)\b/, SendIcon],
  [/\b(bridge)\b/, CableIcon],
  [/\b(burn)\b/, FlameIcon],
  [/\b(mint|claim|collect|harvest)\b/, CoinsIcon],
  [
    /\b(deposit|withdraw|stake|unstake|supply|redeem|wrap|unwrap)\b/,
    WalletIcon
  ]
];
var SHAPE_ICONS = {
  chainContext: GlobeIcon,
  commit: SendIcon,
  customCall: WrenchIcon,
  nativeBalance: WalletIcon,
  search: SearchIcon,
  simulation: FlaskConicalIcon,
  skillActivation: SparklesIcon,
  staged: LayersIcon,
  swap: ArrowRightLeftIcon,
  tokenLookup: SearchIcon,
  verified: BadgeCheckIcon
};

// src/components/assistant-ui/tool-interpreter/families/evm-tx.ts
var op2 = (id, rawLabel, facts) => ({
  id,
  facts: uniqueFacts(facts.filter((fact) => fact != null)),
  confidence: "high",
  rawLabel
});
var stagedActionId = (action) => action.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "custom";
var matchStagedTx = ({ rawLabel, resultRecord }) => {
  if (!resultRecord || resultRecord.current_lifecycle !== "queued") {
    return null;
  }
  const data = asString(resultRecord.data);
  const selector = data ? selectorFact(data) : null;
  const selectorMeta = selector ? EVM_SELECTOR_REGISTRY[selector.value] : null;
  const kind = asString(resultRecord.kind);
  const action = selectorMeta?.chip ?? kind;
  const pendingTxId = asNumber(resultRecord.pending_tx_id);
  return op2(`evm.tx.stage.${stagedActionId(action ?? "custom")}`, rawLabel, [
    chainFact(resultRecord.chain_id),
    action ? {
      kind: "action",
      value: action,
      label: humanize(action),
      source: selectorMeta ? "decoded" : "result"
    } : null,
    pendingTxId != null ? {
      kind: "count",
      role: "tx",
      value: String(pendingTxId),
      source: "result"
    } : null,
    statusFact(resultRecord.current_lifecycle)
  ]);
};
var matchSimulation = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const sim = typeof resultRecord.simulation === "object" && resultRecord.simulation ? resultRecord.simulation : null;
  if (!(sim || "batch_success" in resultRecord)) return null;
  const batchSuccess = (sim?.batch_success ?? resultRecord.batch_success) === true;
  const gas = asNumber(sim?.total_gas) ?? asNumber(resultRecord.total_gas);
  const steps = Array.isArray(sim?.steps) ? sim.steps.length : void 0;
  return op2("evm.tx.simulate_batch", rawLabel, [
    chainFactFromRecord(resultRecord) ?? chainFact(void 0, sim?.network),
    steps != null ? {
      kind: "count",
      role: "tx",
      value: String(steps),
      source: "result"
    } : null,
    statusFact(batchSuccess),
    gas != null ? {
      kind: "gas",
      value: String(gas),
      source: "result"
    } : null
  ]);
};
var matchPendingApproval = ({
  rawLabel,
  resultRecord
}) => {
  if (!resultRecord || !(resultRecord.status === "pending_approval" || Array.isArray(resultRecord.tx_ids))) {
    return null;
  }
  const txCount = Array.isArray(resultRecord.tx_ids) ? resultRecord.tx_ids.length : void 0;
  return op2("wallet.tx.pending_approval", rawLabel, [
    chainFactFromRecord(resultRecord),
    txCount != null ? {
      kind: "count",
      role: "tx",
      value: String(txCount),
      source: "result"
    } : null,
    statusFact("pending_approval")
  ]);
};

// src/components/assistant-ui/tool-interpreter/families/lifi.ts
var op3 = (id, rawLabel, facts) => ({
  id,
  facts: uniqueFacts(facts.filter((fact) => fact != null)),
  confidence: "high",
  rawLabel
});
var displayAmount = (value) => asString(asRecord(value)?.display);
var amountDisplayFact = (value, role) => {
  const fact = amountFact(displayAmount(value));
  return fact ? { ...fact, role } : null;
};
var amountTextFact = (value, role) => {
  const fact = amountFact(asString(value));
  return fact ? { ...fact, role } : null;
};
var tokenSymbol = (value) => asString(asRecord(value)?.symbol);
var tokenPairFact = (fromToken, toToken) => {
  const fromSymbol = tokenSymbol(fromToken);
  const toSymbol = tokenSymbol(toToken);
  if (!fromSymbol || !toSymbol) return null;
  return {
    kind: "token",
    role: "primary",
    value: `${fromSymbol} -> ${toSymbol}`,
    source: "result"
  };
};
var lifiFact = () => ({
  kind: "sourceHost",
  value: "Lifi",
  source: "result"
});
var matchLifiQuote = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const fromToken = asRecord(resultRecord.from_token);
  const toToken = asRecord(resultRecord.to_token);
  const estimate = asRecord(resultRecord.estimate);
  if (!asString(resultRecord.quote_id) || !fromToken || !toToken || !estimate) {
    return null;
  }
  return op3("lifi.quote", rawLabel, [
    chainFactFromRecord(resultRecord),
    amountDisplayFact(resultRecord.from_amount, "primary"),
    amountTextFact(estimate.to_amount_display, "secondary"),
    tokenPairFact(fromToken, toToken)
  ]);
};
var matchLifiApproval = ({ rawLabel, resultRecord }) => {
  if (!resultRecord || !asString(resultRecord.quote_id)) return null;
  if (!("approval_required" in resultRecord)) return null;
  const approval = asRecord(resultRecord.approval);
  const token = asRecord(approval?.token) ?? asRecord(resultRecord.token);
  if (!token) return null;
  return op3("lifi.approval", rawLabel, [
    chainFactFromRecord(resultRecord) ?? chainFactFromRecord(token),
    tokenFact(token.symbol),
    amountDisplayFact(approval?.amount, "primary")
  ]);
};
var matchLifiSwapPrep = ({ rawLabel, resultRecord }) => {
  if (!resultRecord || !asString(resultRecord.quote_id)) return null;
  const stageTx = asRecord(resultRecord.stage_tx);
  if (stageTx?.kind !== "lifi_swap") return null;
  const estimate = asRecord(resultRecord.estimate);
  return op3("lifi.swap.prepare", rawLabel, [
    chainFactFromRecord(resultRecord),
    lifiFact(),
    amountDisplayFact(resultRecord.from_amount, "primary"),
    amountTextFact(estimate?.to_amount_display, "secondary"),
    tokenPairFact(resultRecord.from_token, resultRecord.to_token)
  ]);
};

// src/components/assistant-ui/tool-interpreter/families/evm-call.ts
var op4 = (id, rawLabel, facts, confidence = "high") => ({
  id,
  facts: uniqueFacts(facts.filter((fact) => fact != null)),
  confidence,
  rawLabel
});
var matchEvmCall = ({ rawLabel, resultRecord }) => {
  const tx = resultRecord && typeof resultRecord.tx === "object" ? resultRecord.tx : null;
  const input = asString(tx?.input);
  if (!resultRecord || !tx || !input) return null;
  const selector = selectorFact(input);
  if (!selector) return null;
  const selectorMeta = EVM_SELECTOR_REGISTRY[selector.value];
  const firstAddress = addressFromWord(calldataWord(input, 0));
  const secondAddress = addressFromWord(calldataWord(input, 1));
  const secondAmount = bigintFromWord(calldataWord(input, 1));
  const decoded = decodedValue(resultRecord);
  if (selectorMeta?.kind === "erc20_balance") {
    return op4("evm.call.erc20.balance_of", rawLabel, [
      chainFactFromRecord(tx),
      topicTokenFact(rawLabel),
      addressFact(firstAddress, "owner", "decoded")
    ]);
  }
  if (selectorMeta?.kind === "erc20_metadata") {
    const isDecimals = selectorMeta.name === "decimals";
    return op4(
      isDecimals ? "evm.call.erc20.decimals" : "evm.call.erc20.metadata",
      rawLabel,
      [
        chainFactFromRecord(tx),
        topicTokenFact(rawLabel),
        { ...selector, label: selectorMeta.name, role: "metadata" },
        decoded != null ? {
          kind: "decoded",
          role: isDecimals ? "decimals" : void 0,
          value: String(decoded),
          label: isDecimals ? `${String(decoded)} decimals` : void 0,
          source: "decoded"
        } : null
      ]
    );
  }
  if (selectorMeta?.kind === "erc20_allowance") {
    return op4("evm.call.erc20.allowance", rawLabel, [
      chainFactFromRecord(tx),
      topicTokenFact(rawLabel),
      addressFact(firstAddress, "owner", "decoded"),
      addressFact(secondAddress, "spender", "decoded")
    ]);
  }
  if (selectorMeta?.kind === "erc20_approve") {
    return op4("evm.call.erc20.approve", rawLabel, [
      chainFactFromRecord(tx),
      topicTokenFact(rawLabel),
      addressFact(firstAddress, "spender", "decoded"),
      amountFact(secondAmount, void 0, "decoded")
    ]);
  }
  if (selectorMeta?.kind === "erc20_transfer") {
    return op4("evm.call.erc20.transfer", rawLabel, [
      chainFactFromRecord(tx),
      topicTokenFact(rawLabel),
      addressFact(firstAddress, "recipient", "decoded"),
      amountFact(secondAmount, void 0, "decoded")
    ]);
  }
  return op4(
    "evm.call.generic",
    rawLabel,
    [
      chainFactFromRecord(tx),
      addressFact(tx.from, "from"),
      addressFact(tx.to, "to")
    ],
    "medium"
  );
};

// src/components/assistant-ui/tool-interpreter/present/chips.ts
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BanIcon,
  BlocksIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CoinsIcon as CoinsIcon2,
  FuelIcon,
  HashIcon,
  PuzzleIcon,
  ReceiptTextIcon,
  UserIcon
} from "lucide-react";

// src/components/icons/chains/index.tsx
import { jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
var ArbitrumIconMarkup = '<path d="M4.515 8.471v7.056c0 .45.245.867.64 1.092l6.205 3.529a1.3 1.3 0 0 0 1.28 0l6.203-3.53c.396-.224.64-.64.64-1.09V8.47c0-.45-.244-.867-.64-1.091L12.64 3.85a1.3 1.3 0 0 0-1.28 0L5.155 7.38a1.25 1.25 0 0 0-.639 1.091" fill="currentColor" opacity="0.18"/><path d="M11.998 4.115a.3.3 0 0 1 .126.033l6.715 3.818a.25.25 0 0 1 .126.214v7.635c0 .089-.048.17-.126.214l-6.715 3.819a.25.25 0 0 1-.126.032.3.3 0 0 1-.125-.032l-6.715-3.815a.25.25 0 0 1-.126-.215V8.182c0-.089.048-.17.126-.215l6.715-3.818a.26.26 0 0 1 .125-.034m0-1.115c-.238 0-.478.06-.692.183L4.593 7A1.36 1.36 0 0 0 3.9 8.182v7.635c0 .487.264.938.693 1.181l6.714 3.819a1.41 1.41 0 0 0 1.386 0l6.714-3.818a1.36 1.36 0 0 0 .693-1.182V8.182A1.36 1.36 0 0 0 19.407 7l-6.716-3.817A1.4 1.4 0 0 0 11.998 3" fill="currentColor"/><path d="M11.433 7.635H9.731a.3.3 0 0 0-.285.197l-3.649 9.852 1.761 1.001 4.018-10.849a.15.15 0 0 0-.143-.2m2.979-.001h-1.703a.3.3 0 0 0-.284.197l-4.167 11.25 1.761 1 4.535-12.246a.15.15 0 0 0-.142-.2" fill="currentColor"/><path d="m13.353 13.368-.885 2.39a.3.3 0 0 0 0 .205l1.523 4.112 1.76-1.001-2.113-5.706a.152.152 0 0 0-.285 0m1.774-4.019a.152.152 0 0 0-.285 0l-.885 2.39a.3.3 0 0 0 0 .205l2.494 6.732 1.761-1.001z" fill="currentColor" opacity="0.55"/>';
function ArbitrumIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: ArbitrumIconMarkup },
      ...props
    }
  );
}
var BaseIconMarkup = '<path d="M3 4.706c0-.585 0-.877.11-1.101.106-.215.28-.39.496-.495C3.83 3 4.122 3 4.706 3h14.588c.585 0 .876 0 1.101.11.215.105.389.28.494.495.111.225.111.517.111 1.101v14.588c0 .585 0 .876-.11 1.101-.106.215-.28.389-.495.494-.225.111-.517.111-1.101.111H4.706c-.585 0-.876 0-1.101-.11a1.08 1.08 0 0 1-.494-.495C3 20.17 3 19.878 3 19.294z" fill="currentColor"/>';
function BaseIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: BaseIconMarkup },
      ...props
    }
  );
}
var EthereumIconMarkup = '<path d="M12 3L6.375 12.1667L12 15.4301L17.625 12.1667L12 3Z" fill="currentColor"/><path d="M12 16.4778L6.375 13.2157L12 21L17.625 13.2157L12 16.4778Z" fill="currentColor" opacity="0.62"/><path d="M12 3V9.6516L17.625 12.1667L12 3Z" fill="currentColor" opacity="0.42"/><path d="M12 9.6516V15.4301L6.375 12.1667L12 9.6516Z" fill="currentColor" opacity="0.28"/>';
function EthereumIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: EthereumIconMarkup },
      ...props
    }
  );
}
var OptimismIconMarkup = '<path fill="currentColor" fill-rule="evenodd" d="M3.966 15.8q.979.7 2.512.7 1.854 0 2.962-.838 1.108-.85 1.559-2.562.27-1.05.464-2.163.063-.398.064-.663 0-.874-.451-1.499a2.7 2.7 0 0 0-1.237-.95Q9.053 7.5 8.062 7.5q-3.644 0-4.52 3.437a40 40 0 0 0-.477 2.163q-.058.335-.065.674 0 1.314.966 2.026m4.65-2.775c-.247.957-.926 1.58-1.958 1.58-1.02 0-1.368-.69-1.184-1.58a27 27 0 0 1 .464-2.05c.265-1.034.89-1.58 1.956-1.58 1.017 0 1.348.68 1.173 1.58a30 30 0 0 1-.451 2.05m3.902 3.385q.076.09.214.089h1.704a.38.38 0 0 0 .238-.089.36.36 0 0 0 .138-.232l.538-2.52h1.733c1.094 0 1.95-.53 2.576-1.002q.953-.707 1.266-2.186.075-.348.075-.67 0-1.117-.851-1.71-.84-.591-2.23-.591h-3.333a.38.38 0 0 0-.238.09.38.38 0 0 0-.138.232l-1.73 8.356a.3.3 0 0 0 .038.232m6.09-5.966c-.157.689-.757 1.319-1.462 1.319h-1.44l.496-2.369h1.503c.512 0 .94.102.94.665q0 .165-.037.385" clip-rule="evenodd"/>';
function OptimismIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: OptimismIconMarkup },
      ...props
    }
  );
}
var PolygonIconMarkup = '<path d="m16.364 15.217 4.27-2.435a.73.73 0 0 0 .366-.627V7.284a.72.72 0 0 0-.366-.627l-4.27-2.435a.74.74 0 0 0-.732 0l-4.27 2.435a.72.72 0 0 0-.366.627v8.704l-2.994 1.707-2.994-1.707v-3.415l2.994-1.707 1.974 1.127V9.702l-1.608-.918a.75.75 0 0 0-.732 0l-4.27 2.435a.72.72 0 0 0-.366.627v4.87c0 .258.14.498.366.627l4.27 2.436a.75.75 0 0 0 .732 0l4.27-2.436a.72.72 0 0 0 .366-.626V8.012l.053-.03 2.94-1.677 2.994 1.707v3.415l-2.994 1.707-1.972-1.124v2.291l1.606.916a.75.75 0 0 0 .732 0z" fill="currentColor"/>';
function PolygonIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: PolygonIconMarkup },
      ...props
    }
  );
}
var LineaIconMarkup = '<g transform="translate(14 14.56) scale(.72)"><path d="M82.669 103.977H0V16.872h18.915v70.224H82.669v16.872z" fill="currentColor"/><path d="M82.669 33.744c9.318 0 16.872-7.554 16.872-16.872S91.987 0 82.669 0 65.797 7.554 65.797 16.872s7.554 16.872 16.872 16.872" fill="currentColor"/></g>';
function LineaIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 100 104",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: LineaIconMarkup },
      ...props
    }
  );
}
var MonadIconMarkup = '<path transform="translate(2.35642 2.4) scale(.8)" fill="currentColor" fill-rule="evenodd" d="M11.782 0C8.37963 0 0 8.53443 0 11.9999C0 15.4654 8.37963 24 11.782 24C15.1844 24 23.5642 15.4653 23.5642 11.9999C23.5642 8.53458 15.1845 0 11.782 0ZM9.94598 18.8619C8.51124 18.4637 4.65378 11.5912 5.04481 10.1299C5.43584 8.66856 12.1834 4.73984 13.6181 5.1381C15.0529 5.5363 18.9104 12.4087 18.5194 13.87C18.1283 15.3314 11.3807 19.2602 9.94598 18.8619Z" clip-rule="evenodd"/>';
function MonadIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 23.5642 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: MonadIconMarkup },
      ...props
    }
  );
}
function SepoliaIcon(props) {
  return /* @__PURE__ */ jsxs5(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      ...props,
      children: [
        /* @__PURE__ */ jsx7(
          "path",
          {
            d: "M12 1.5L4.5 12L12 16.5L19.5 12L12 1.5Z",
            fill: "currentColor",
            opacity: "0.35"
          }
        ),
        /* @__PURE__ */ jsx7(
          "path",
          {
            d: "M12 16.5L4.5 12L12 22.5L19.5 12L12 16.5Z",
            fill: "currentColor",
            opacity: "0.55"
          }
        ),
        /* @__PURE__ */ jsx7("circle", { cx: "18", cy: "6", r: "3.5", fill: "currentColor", opacity: "0.18" }),
        /* @__PURE__ */ jsx7("circle", { cx: "18", cy: "6", r: "3.5", stroke: "currentColor", strokeWidth: "1" }),
        /* @__PURE__ */ jsx7(
          "text",
          {
            x: "18",
            y: "7.5",
            textAnchor: "middle",
            fontSize: "5",
            fontWeight: "bold",
            fill: "currentColor",
            children: "T"
          }
        )
      ]
    }
  );
}
var SolanaIconMarkup = '<path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="currentColor"/><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="currentColor" opacity="0.7"/><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="currentColor" opacity="0.85"/>';
function SolanaIcon(props) {
  return /* @__PURE__ */ jsx7(
    "svg",
    {
      viewBox: "0 0 397.7 311.7",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: SolanaIconMarkup },
      ...props
    }
  );
}

// src/components/icons/chain-map.tsx
var CHAIN_ICONS = {
  1: EthereumIcon,
  137: PolygonIcon,
  42161: ArbitrumIcon,
  8453: BaseIcon,
  10: OptimismIcon,
  11155111: SepoliaIcon,
  59144: LineaIcon,
  59141: LineaIcon,
  143: MonadIcon,
  10143: MonadIcon
};
function getChainIcon(chainId) {
  return CHAIN_ICONS[chainId];
}

// src/components/assistant-ui/tool-interpreter/present/chips.ts
var formatInteger = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString("en-US") : value;
};
var shortenAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address) ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
var formatNativeAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  if (numeric === 0) return "0";
  const formatted = numeric.toLocaleString("en-US", {
    maximumFractionDigits: 5,
    useGrouping: false
  });
  return formatted === "0" ? "<0.00001" : formatted;
};
var statusChip = (value) => {
  switch (value) {
    case "queued":
      return { label: "Queued", icon: ClockIcon };
    case "pending":
      return { label: "Pending approval", icon: ClockIcon };
    case "success":
      return { label: "Success", icon: CircleCheckIcon };
    case "failed":
    case "error":
      return { label: "Failed", icon: CircleXIcon };
    case "revoked":
      return { label: "Revoked", icon: BanIcon };
    default:
      return { label: humanize(value) };
  }
};
var stagedActionIcon = (value) => {
  const lower = value.toLowerCase().replace(/[_-]+/g, " ");
  for (const [pattern, icon] of STAGED_ACTION_ICON_REGISTRY) {
    if (pattern.test(lower)) return icon;
  }
  return SHAPE_ICONS.staged;
};
var chipForFact = (fact) => {
  switch (fact.kind) {
    case "action":
      return {
        label: fact.label ?? humanize(fact.value),
        icon: stagedActionIcon(fact.value)
      };
    case "address":
      if (fact.role === "owner") {
        return { label: shortenAddress(fact.value), icon: UserIcon };
      }
      if (fact.role === "from") {
        return { label: shortenAddress(fact.value), icon: ArrowUpRightIcon };
      }
      if (fact.role === "recipient" || fact.role === "spender" || fact.role === "to") {
        return { label: shortenAddress(fact.value), icon: ArrowDownLeftIcon };
      }
      return { label: shortenAddress(fact.value) };
    case "amount":
      if (fact.role === "native") {
        return {
          label: formatNativeAmount(fact.value),
          icon: getChainIcon(1)
        };
      }
      if (fact.role === "primary" || fact.role === "secondary") {
        return { label: fact.label ?? fact.value, icon: CoinsIcon2 };
      }
      return { label: fact.label ?? fact.value };
    case "block":
      return { label: formatInteger(fact.value), icon: BlocksIcon };
    case "chain": {
      const chainId = Number(fact.value);
      return {
        label: fact.label ?? fact.value,
        icon: Number.isFinite(chainId) ? getChainIcon(chainId) : void 0
      };
    }
    case "code":
      return { label: fact.label ?? fact.value };
    case "count":
      if (fact.role === "tx") {
        const count = Number(fact.value);
        return {
          label: `${fact.value} tx${count === 1 ? "" : "s"}`,
          icon: ReceiptTextIcon
        };
      }
      if (fact.role === "results") {
        return { label: `${fact.value} results` };
      }
      return { label: fact.value };
    case "decoded":
      if (fact.role === "decimals") {
        return {
          label: fact.label ?? `${fact.value} decimals`,
          icon: HashIcon
        };
      }
      return { label: fact.label ?? fact.value };
    case "gas":
      return { label: `${formatInteger(fact.value)} gas`, icon: FuelIcon };
    case "selector":
      return { label: fact.label ?? fact.value };
    case "skill":
      return { label: fact.label ?? humanize(fact.value), icon: PuzzleIcon };
    case "sourceHost":
      return { label: fact.label ?? fact.value };
    case "status":
      return statusChip(fact.value);
    case "token":
      return { label: fact.label ?? fact.value, icon: CoinsIcon2 };
    case "txId":
      return { label: fact.value, icon: ReceiptTextIcon };
    default:
      return null;
  }
};
var uniqueChips = (chips) => {
  const seen = /* @__PURE__ */ new Set();
  return chips.filter((chip) => {
    const key = chip.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// src/components/assistant-ui/tool-interpreter/present/fallback.ts
var iconFromTopic = (topic) => {
  const lower = topic.toLowerCase();
  for (const [pattern, icon] of TOPIC_ICON_REGISTRY) {
    if (pattern.test(lower)) return icon;
  }
  return null;
};
var fallbackIcon = (topic) => iconFromTopic(topic) ?? DEFAULT_TOOL_ICON;

// src/components/assistant-ui/tool-interpreter/present/descriptors.ts
var stagedActionIcon2 = (operation) => {
  const action = operation.facts.find((fact) => fact.kind === "action");
  const lower = (action?.value ?? action?.label ?? "").toLowerCase().replace(/[_-]+/g, " ");
  for (const [pattern, icon] of STAGED_ACTION_ICON_REGISTRY) {
    if (pattern.test(lower)) return icon;
  }
  return SHAPE_ICONS.staged;
};
var descriptorById = {
  "evm.account.native_balance": {
    title: "label",
    icon: SHAPE_ICONS.nativeBalance,
    chipPlan: [
      { kind: "chain" },
      { kind: "address", role: "owner" },
      { kind: "amount" }
    ]
  },
  "evm.call.erc20.allowance": {
    title: "fixed",
    fixedTitle: EVM_SELECTOR_REGISTRY["0xdd62ed3e"].title,
    icon: EVM_SELECTOR_REGISTRY["0xdd62ed3e"].icon,
    chipPlan: [
      { kind: "chain" },
      { kind: "token" },
      { kind: "address", role: "owner" },
      { kind: "address", role: "spender" }
    ]
  },
  "evm.call.erc20.approve": {
    title: "fixed",
    fixedTitle: EVM_SELECTOR_REGISTRY["0x095ea7b3"].title,
    icon: EVM_SELECTOR_REGISTRY["0x095ea7b3"].icon,
    chipPlan: [
      { kind: "chain" },
      { kind: "token" },
      { kind: "address", role: "spender" },
      { kind: "amount" }
    ]
  },
  "evm.call.erc20.balance_of": {
    title: "fixed",
    fixedTitle: EVM_SELECTOR_REGISTRY["0x70a08231"].title,
    icon: EVM_SELECTOR_REGISTRY["0x70a08231"].icon,
    chipPlan: [
      { kind: "chain" },
      { kind: "token" },
      { kind: "address", role: "owner" }
    ]
  },
  "evm.call.erc20.decimals": {
    title: "fixed",
    fixedTitle: EVM_SELECTOR_REGISTRY["0x313ce567"].title,
    icon: EVM_SELECTOR_REGISTRY["0x313ce567"].icon,
    chipPlan: [
      { kind: "chain" },
      { kind: "token" },
      { kind: "decoded", role: "decimals" }
    ]
  },
  "evm.call.erc20.metadata": {
    title: "fixed",
    fixedTitle: "Read token metadata",
    icon: SHAPE_ICONS.tokenLookup,
    chipPlan: [
      { kind: "chain" },
      { kind: "token" },
      { kind: "selector", role: "metadata" },
      { kind: "decoded" }
    ]
  },
  "evm.call.erc20.transfer": {
    title: "fixed",
    fixedTitle: EVM_SELECTOR_REGISTRY["0xa9059cbb"].title,
    icon: EVM_SELECTOR_REGISTRY["0xa9059cbb"].icon,
    chipPlan: [
      { kind: "chain" },
      { kind: "token" },
      { kind: "address", role: "recipient" },
      { kind: "amount" }
    ]
  },
  "evm.call.generic": {
    title: "label",
    icon: "fallback",
    chipPlan: [
      { kind: "chain" },
      { kind: "address", role: "from" },
      { kind: "address", role: "to" }
    ]
  },
  "evm.context": {
    title: "fixed",
    fixedTitle: "Check network",
    icon: SHAPE_ICONS.chainContext,
    chipPlan: [{ kind: "chain" }, { kind: "block" }]
  },
  "evm.contract.lookup.found": {
    title: "fixed",
    fixedTitle: "Resolve contract",
    icon: SHAPE_ICONS.tokenLookup,
    chipPlan: [{ kind: "chain" }, { kind: "token" }]
  },
  "evm.contract.lookup.missing": {
    title: "fixed",
    fixedTitle: "Resolve token",
    icon: SHAPE_ICONS.tokenLookup,
    chipPlan: [{ kind: "chain" }, { kind: "token" }]
  },
  "evm.tx.simulate_batch": {
    title: "fixed",
    fixedTitle: "Simulate batch",
    icon: SHAPE_ICONS.simulation,
    chipPlan: [
      { kind: "chain" },
      { kind: "count", role: "tx" },
      { kind: "gas" },
      { kind: "status" }
    ]
  },
  "lifi.approval": {
    title: "label",
    icon: EVM_SELECTOR_REGISTRY["0x095ea7b3"].icon,
    chipPlan: [
      { kind: "chain" },
      { kind: "token" },
      { kind: "amount", role: "primary" }
    ]
  },
  "lifi.quote": {
    title: "label",
    icon: SHAPE_ICONS.swap,
    chipPlan: [
      { kind: "chain" },
      { kind: "amount", role: "primary" },
      { kind: "amount", role: "secondary" },
      { kind: "token", role: "primary" }
    ]
  },
  "lifi.swap.prepare": {
    title: "label",
    icon: SHAPE_ICONS.swap,
    chipPlan: [
      { kind: "chain" },
      { kind: "sourceHost" },
      { kind: "amount", role: "primary" },
      { kind: "amount", role: "secondary" },
      { kind: "token", role: "primary" }
    ]
  },
  "skill.activate": {
    title: "fixed",
    fixedTitle: "Activate skill",
    icon: SHAPE_ICONS.skillActivation,
    chipPlan: [{ kind: "skill", repeat: true }]
  },
  "tool.error": {
    title: "label",
    icon: "fallback",
    chipPlan: [{ kind: "status" }]
  },
  "wallet.tx.pending_approval": {
    title: "fixed",
    fixedTitle: "Await wallet approval",
    icon: SHAPE_ICONS.commit,
    chipPlan: [
      { kind: "chain" },
      { kind: "count", role: "tx" },
      { kind: "status" }
    ]
  },
  "web.search": {
    title: "fixed",
    fixedTitle: "Search web",
    icon: SHAPE_ICONS.search,
    chipPlan: [
      { kind: "token" },
      { kind: "count", role: "results" },
      { kind: "sourceHost" }
    ]
  }
};
var stagedDescriptor = {
  title: "label",
  icon: "stagedAction",
  chipPlan: [
    { kind: "chain" },
    { kind: "action" },
    { kind: "count", role: "tx" },
    { kind: "status" }
  ]
};
var fallbackDescriptor = {
  title: "label",
  icon: "fallback",
  chipPlan: [{ kind: "token" }, { kind: "chain" }, { kind: "status" }]
};
var descriptorFor = (operation) => {
  if (operation.id.startsWith("evm.tx.stage.")) return stagedDescriptor;
  return descriptorById[operation.id] ?? fallbackDescriptor;
};
var iconForDescriptor = (descriptor, operation) => {
  if (descriptor.icon === "fallback") return fallbackIcon(operation.rawLabel);
  if (descriptor.icon === "stagedAction") return stagedActionIcon2(operation);
  return descriptor.icon;
};

// src/components/assistant-ui/tool-interpreter/present/index.ts
var pickFacts = (facts, slots) => {
  const picked = [];
  const used = /* @__PURE__ */ new Set();
  for (const slot of slots) {
    const matches = facts.filter(
      (fact) => fact.kind === slot.kind && (slot.role == null || fact.role === slot.role) && !used.has(fact)
    );
    const selected = slot.repeat ? matches : matches.slice(0, 1);
    selected.forEach((fact) => {
      picked.push(fact);
      used.add(fact);
    });
  }
  return picked;
};
var statusLast = (facts) => [
  ...facts.filter((fact) => fact.kind !== "status"),
  ...facts.filter((fact) => fact.kind === "status")
];
var presentOperation = (operation) => {
  const descriptor = descriptorFor(operation);
  const title = descriptor.title === "fixed" ? descriptor.fixedTitle ?? humanize(operation.rawLabel) : humanize(operation.rawLabel);
  const chips = uniqueChips(
    statusLast(pickFacts(operation.facts, descriptor.chipPlan)).map(chipForFact).filter((chip) => chip != null)
  );
  return {
    icon: iconForDescriptor(descriptor, operation),
    title,
    chips,
    confidence: operation.confidence,
    rawLabel: operation.rawLabel
  };
};

// src/components/assistant-ui/tool-interpreter/pipeline.ts
var matchers = [
  matchWebSearch,
  matchSkillActivation,
  matchChainContext,
  matchNativeBalance,
  matchTokenLookup,
  matchLifiSwapPrep,
  matchLifiQuote,
  matchLifiApproval,
  matchStagedTx,
  matchSimulation,
  matchPendingApproval,
  matchEvmCall,
  matchError
];
var fallbackOperation = (ctx) => {
  const args = asRecord(ctx.parsedArgs);
  const symbol = asString(args?.symbol);
  const facts = uniqueFacts(
    [
      topicTokenFact(ctx.rawLabel),
      chainFact(args?.chain_id, args?.chain_name, "args"),
      symbol ? tokenFact(symbol, "args") : null
    ].filter((fact) => fact != null)
  );
  const confidence = facts.length > 0 ? "medium" : "fallback";
  return {
    id: "fallback",
    facts,
    confidence,
    rawLabel: ctx.rawLabel
  };
};
var interpretToolContext = (ctx) => {
  const operation = matchers.reduce(
    (matched, matcher) => matched ?? matcher(ctx),
    null
  ) ?? fallbackOperation(ctx);
  return presentOperation(operation);
};

// src/components/assistant-ui/tool-interpreter/unwrap.ts
var parseArgsText = (argsText) => {
  if (!argsText || argsText === "undefined") return void 0;
  try {
    return JSON.parse(argsText);
  } catch {
    return void 0;
  }
};
var unwrapEnvelope = (value) => {
  const record = asRecord(value);
  if (!record) return value;
  if (record.is_error === true || "error" in record) return value;
  if ("__aomi_tool_value" in record) {
    return unwrapEnvelope(record.__aomi_tool_value);
  }
  if ("__aomi_tool_return" in record) {
    return unwrapEnvelope(record.__aomi_tool_return);
  }
  if ("__aomi_tool_routes" in record && "value" in record) {
    return unwrapEnvelope(record.value);
  }
  if ("RoutedToolReturn" in record && "value" in record) {
    return unwrapEnvelope(record.value);
  }
  return value;
};
var unwrapToolStep = ({
  toolName,
  argsText,
  result
}) => {
  const parsedArgs = parseArgsText(argsText);
  const unwrapped = typeof result === "string" ? { args: result } : unwrapEnvelope(result);
  return {
    rawLabel: toolName,
    parsedArgs,
    result: unwrapped,
    resultRecord: asRecord(unwrapped)
  };
};

// src/components/assistant-ui/tool-interpreter/index.ts
var interpretToolStep = (input) => interpretToolContext(unwrapToolStep(input));

// src/components/assistant-ui/working-trace.tsx
import { Fragment, jsx as jsx8, jsxs as jsxs6 } from "react/jsx-runtime";
var formatDuration = (seconds) => {
  if (seconds < 1) return "less than a second";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const m2 = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m2}m ${s}s`;
};
var toDetailString = (result) => typeof result === "string" ? result : JSON.stringify(result, null, 2);
var MAX_VISIBLE_CHIPS = 4;
var CHIP_BASE_DELAY_MS = 100;
var CHIP_STEP_DELAY_MS = 70;
var prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
var WINDOW_ANIM_MS = 300;
var REVEAL_BASE_MS = 1200;
var REVEAL_MIN_MS = 360;
var REVEAL_STEP_MS = 320;
var REVEAL_TAIL_MS = 220;
var WORKING_WINDOW_PX = 260;
var useStaggeredReveal = (target, running) => {
  const reduced = prefersReducedMotion();
  const startedLive = useRef(running && !reduced);
  const [revealed, setRevealed] = useState3(startedLive.current ? 0 : target);
  useEffect(() => {
    if (running && !reduced) startedLive.current = true;
  }, [running, reduced]);
  useEffect(() => {
    if (!startedLive.current) {
      if (revealed !== target) setRevealed(target);
      return;
    }
    if (revealed >= target) return;
    if (revealed === 0) {
      setRevealed(1);
      return;
    }
    const backlog = target - revealed;
    const delay = running ? Math.max(REVEAL_MIN_MS, REVEAL_BASE_MS - (backlog - 1) * REVEAL_STEP_MS) : REVEAL_TAIL_MS;
    const timer = setTimeout(() => setRevealed((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [revealed, target, running, reduced]);
  return Math.min(revealed, target);
};
var ToolChipView = ({
  chip,
  index,
  animate
}) => {
  const Glyph = chip.icon;
  return /* @__PURE__ */ jsxs6(
    "span",
    {
      className: cn6(
        "border-border/60 bg-muted/40 text-foreground/80 inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs tabular-nums leading-4",
        animate && "animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300 motion-reduce:animate-none"
      ),
      style: animate ? {
        animationDelay: `${CHIP_BASE_DELAY_MS + index * CHIP_STEP_DELAY_MS}ms`
      } : void 0,
      children: [
        chip.dot && /* @__PURE__ */ jsx8(
          "span",
          {
            className: "size-1.5 shrink-0 rounded-full",
            style: { backgroundColor: chip.dot },
            "aria-hidden": "true"
          }
        ),
        Glyph && /* @__PURE__ */ jsx8(Glyph, { className: "text-muted-foreground size-3 shrink-0" }),
        /* @__PURE__ */ jsx8("span", { className: "truncate", children: chip.label })
      ]
    }
  );
};
var WorkingStep = ({ tool, active, animate }) => {
  const [open, setOpen] = useState3(false);
  const done = tool.result !== void 0;
  const argsText = tool.argsText && tool.argsText !== "undefined" ? tool.argsText : void 0;
  const hasDetail = done || argsText !== void 0;
  const interpretation = interpretToolStep({
    toolName: tool.toolName,
    argsText,
    result: tool.result
  });
  const Icon = interpretation.icon;
  const shownChips = interpretation.chips.length > MAX_VISIBLE_CHIPS ? interpretation.chips.slice(0, MAX_VISIBLE_CHIPS) : interpretation.chips;
  const overflow = interpretation.chips.length - shownChips.length;
  return /* @__PURE__ */ jsxs6(
    "div",
    {
      className: cn6(
        "aui-working-step",
        animate && "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
      ),
      children: [
        /* @__PURE__ */ jsxs6(
          "button",
          {
            type: "button",
            disabled: !hasDetail,
            onClick: () => setOpen((o) => !o),
            className: "aui-working-step-header flex w-full items-center gap-2 py-1 text-left disabled:cursor-default",
            children: [
              /* @__PURE__ */ jsx8("span", { className: "bg-background relative flex size-4 shrink-0 items-center justify-center", children: /* @__PURE__ */ jsx8(Icon, { className: "text-muted-foreground size-3.5" }) }),
              /* @__PURE__ */ jsx8(
                "span",
                {
                  className: cn6(
                    "flex-1 truncate",
                    active ? "aui-working-shimmer font-medium" : "text-foreground"
                  ),
                  children: interpretation.title
                }
              ),
              hasDetail && /* @__PURE__ */ jsx8(
                ChevronRightIcon,
                {
                  className: cn6(
                    "text-muted-foreground/60 size-3 shrink-0 transition-transform",
                    open && "rotate-90"
                  )
                }
              )
            ]
          }
        ),
        interpretation.chips.length > 0 && /* @__PURE__ */ jsxs6("div", { className: "aui-working-step-chips mb-1 ml-6 flex max-w-full flex-wrap items-center gap-1.5", children: [
          shownChips.map((chip, i) => /* @__PURE__ */ jsx8(
            ToolChipView,
            {
              chip,
              index: i,
              animate
            },
            `${chip.label}-${i}`
          )),
          overflow > 0 && /* @__PURE__ */ jsxs6(
            "span",
            {
              className: cn6(
                "border-border/60 bg-muted/40 text-muted-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-xs leading-4",
                animate && "animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300 motion-reduce:animate-none"
              ),
              style: animate ? {
                animationDelay: `${CHIP_BASE_DELAY_MS + shownChips.length * CHIP_STEP_DELAY_MS}ms`
              } : void 0,
              children: [
                "+",
                overflow,
                " more"
              ]
            }
          )
        ] }),
        open && hasDetail && /* @__PURE__ */ jsxs6("div", { className: "aui-working-step-detail mb-1 ml-6 flex flex-col gap-1.5", children: [
          argsText && /* @__PURE__ */ jsx8("pre", { className: "border-border/60 bg-muted/40 text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md border p-2 font-mono text-xs leading-relaxed", children: argsText }),
          done && /* @__PURE__ */ jsx8("pre", { className: "border-border/60 bg-muted/40 text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md border p-2 font-mono text-xs leading-relaxed", children: toDetailString(tool.result) })
        ] })
      ]
    }
  );
};
var WorkingNote = ({
  text,
  animate
}) => /* @__PURE__ */ jsxs6(
  "div",
  {
    className: cn6(
      "aui-working-note flex items-start gap-2 py-1",
      animate && "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
    ),
    children: [
      /* @__PURE__ */ jsx8(
        "span",
        {
          className: "bg-background relative flex h-5 w-4 shrink-0 items-center justify-center",
          "aria-hidden": "true",
          children: /* @__PURE__ */ jsx8("span", { className: "bg-muted-foreground/70 size-1.5 rounded-full" })
        }
      ),
      /* @__PURE__ */ jsx8("div", { className: "text-foreground/75 min-w-0 flex-1 text-sm leading-relaxed [&_p+p]:mt-2 [&_p]:my-0", children: /* @__PURE__ */ jsx8(TextMessagePartProvider, { text, children: /* @__PURE__ */ jsx8(MarkdownText, {}) }) })
    ]
  }
);
var WorkingTrace = ({ running, items, revealed }) => {
  const [open, setOpen] = useState3(running);
  const [expanded, setExpanded] = useState3(false);
  const [overflowing, setOverflowing] = useState3(false);
  const [hasContentBelow, setHasContentBelow] = useState3(false);
  const [animating, setAnimating] = useState3(false);
  const viewportRef = useRef(null);
  const bodyRef = useRef(null);
  const followLatestRef = useRef(true);
  const prevOpen = useRef(open);
  const prevWindowed = useRef(!expanded);
  const prevExpanded = useRef(expanded);
  const animRef = useRef(null);
  const [elapsed, setElapsed] = useState3(null);
  const wasRunning = useRef(running);
  const startedAt = useRef(Date.now());
  const animatedCount = useRef(0);
  useEffect(() => {
    if (revealed > animatedCount.current) animatedCount.current = revealed;
  }, [revealed]);
  const fullyRevealed = !running && revealed >= items.length;
  const windowed = !expanded;
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !windowed) {
      setOverflowing(false);
      return;
    }
    setOverflowing(body.offsetHeight - WORKING_WINDOW_PX > 24);
  }, [windowed, revealed, open]);
  const handleViewportScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distanceFromBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
    followLatestRef.current = distanceFromBottom <= 8;
    setHasContentBelow(distanceFromBottom > 8);
  };
  useIsomorphicLayoutEffect(() => {
    if (prevExpanded.current === expanded) return;
    prevExpanded.current = expanded;
    const viewport = viewportRef.current;
    const body = bodyRef.current;
    if (!viewport || !body || prefersReducedMotion()) return;
    const cap = WORKING_WINDOW_PX;
    const full = body.offsetHeight;
    const from = expanded ? cap : full;
    const to = expanded ? full : cap;
    animRef.current?.cancel();
    setAnimating(true);
    const anim = viewport.animate(
      [{ maxHeight: `${from}px` }, { maxHeight: `${to}px` }],
      { duration: WINDOW_ANIM_MS, easing: "ease-out" }
    );
    animRef.current = anim;
    const settle = () => {
      if (animRef.current !== anim) return;
      animRef.current = null;
      setAnimating(false);
    };
    anim.onfinish = settle;
    anim.oncancel = settle;
  }, [expanded]);
  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    const reopened = open && !prevOpen.current;
    const collapsedToWindow = windowed && !prevWindowed.current;
    if (reopened || collapsedToWindow) followLatestRef.current = true;
    prevOpen.current = open;
    prevWindowed.current = windowed;
    if (!viewport || !open || !windowed || animating) return;
    if (followLatestRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
      setHasContentBelow(false);
    }
  }, [animating, open, revealed, windowed]);
  useEffect(() => () => animRef.current?.cancel(), []);
  useEffect(() => {
    if (wasRunning.current && !running) {
      setElapsed((Date.now() - startedAt.current) / 1e3);
    }
    wasRunning.current = running;
  }, [running]);
  useEffect(() => {
    if (!fullyRevealed) return;
    const timer = setTimeout(() => setOpen(false), 500);
    return () => clearTimeout(timer);
  }, [fullyRevealed]);
  const label = running ? "Working" : elapsed != null ? `Worked for ${formatDuration(elapsed)}` : "Worked it out";
  const activeIndex = running ? revealed - 1 : -1;
  const headerClass = !running ? "text-muted-foreground" : open ? "text-muted-foreground font-medium" : "aui-working-shimmer font-medium";
  const visibleItems = items.slice(0, revealed);
  return /* @__PURE__ */ jsxs6("div", { className: "aui-working-trace mb-3", children: [
    /* @__PURE__ */ jsxs6(
      "button",
      {
        type: "button",
        onClick: () => setOpen((o) => !o),
        "aria-expanded": open,
        className: "aui-working-trace-header text-muted-foreground flex items-center gap-1.5 text-sm",
        children: [
          /* @__PURE__ */ jsx8(
            ChevronRightIcon,
            {
              className: cn6(
                "size-3.5 shrink-0 transition-transform",
                open && "rotate-90"
              )
            }
          ),
          /* @__PURE__ */ jsx8("span", { className: headerClass, children: label })
        ]
      }
    ),
    /* @__PURE__ */ jsx8(
      "div",
      {
        className: cn6(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        ),
        children: /* @__PURE__ */ jsxs6("div", { className: "min-h-0 overflow-hidden", children: [
          /* @__PURE__ */ jsxs6("div", { className: "relative mt-1.5", children: [
            windowed && overflowing && !animating && /* @__PURE__ */ jsxs6(Fragment, { children: [
              /* @__PURE__ */ jsx8(
                "span",
                {
                  "aria-hidden": "true",
                  className: "aui-working-trace-edge-fade-top pointer-events-none absolute inset-x-0 top-0 z-20 h-16"
                }
              ),
              hasContentBelow && /* @__PURE__ */ jsx8(
                "span",
                {
                  "aria-hidden": "true",
                  className: "aui-working-trace-edge-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16"
                }
              )
            ] }),
            /* @__PURE__ */ jsx8(
              "div",
              {
                ref: viewportRef,
                onScroll: handleViewportScroll,
                tabIndex: windowed && overflowing ? 0 : void 0,
                "aria-label": windowed && overflowing ? "Working trace steps" : void 0,
                className: cn6(
                  "aui-working-trace-viewport",
                  windowed && !animating && "overflow-y-auto",
                  animating && "overflow-hidden",
                  windowed && overflowing && !animating && "aui-working-trace-scroll"
                ),
                style: { maxHeight: windowed ? WORKING_WINDOW_PX : void 0 },
                children: /* @__PURE__ */ jsxs6(
                  "div",
                  {
                    ref: bodyRef,
                    className: "aui-working-trace-body relative isolate ml-1 flex flex-col text-sm",
                    children: [
                      /* @__PURE__ */ jsx8(
                        "span",
                        {
                          "aria-hidden": "true",
                          className: "bg-border absolute bottom-[14px] left-[7.5px] top-[14px] w-px"
                        }
                      ),
                      visibleItems.map(
                        (item, i) => item.kind === "tool" ? /* @__PURE__ */ jsx8(
                          WorkingStep,
                          {
                            tool: item.tool,
                            active: i === activeIndex,
                            animate: i >= animatedCount.current
                          },
                          item.key
                        ) : /* @__PURE__ */ jsx8(
                          WorkingNote,
                          {
                            text: item.text,
                            animate: i >= animatedCount.current
                          },
                          item.key
                        )
                      )
                    ]
                  }
                )
              }
            )
          ] }),
          (windowed && overflowing || expanded) && /* @__PURE__ */ jsxs6(
            "button",
            {
              type: "button",
              onClick: () => setExpanded((e) => !e),
              className: "aui-working-trace-more text-muted-foreground/80 hover:text-foreground ml-1 mt-1 flex items-center gap-1.5 text-xs",
              children: [
                /* @__PURE__ */ jsx8(MoreHorizontalIcon, { className: "size-3.5 shrink-0" }),
                expanded ? "Collapse to recent steps" : `Show all ${revealed} steps`
              ]
            }
          )
        ] })
      }
    )
  ] });
};
var MinimalWorkingTrace = () => /* @__PURE__ */ jsx8("div", { className: "aui-working-trace mb-3", children: /* @__PURE__ */ jsxs6("div", { className: "aui-working-trace-header text-muted-foreground flex items-center gap-1.5 text-sm", children: [
  /* @__PURE__ */ jsx8(ChevronRightIcon, { className: "size-3.5 shrink-0" }),
  /* @__PURE__ */ jsx8("span", { className: "aui-working-shimmer font-medium", children: "Working" })
] }) });
var collectText = (parts) => parts.map((part) => part.text).join("\n\n").trim();
var FAKE_STREAM_MS = 500;
var FakeStreamedText = ({
  text,
  stream
}) => {
  const reduced = prefersReducedMotion();
  const animate = stream && !reduced;
  const [count, setCount] = useState3(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) {
      setCount(text.length);
      return;
    }
    const total = text.length;
    let raf = 0;
    let start = null;
    const tick = (now) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / FAKE_STREAM_MS);
      const eased = 1 - (1 - t) * (1 - t);
      setCount(Math.max(1, Math.round(eased * total)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, animate]);
  return /* @__PURE__ */ jsx8(TextMessagePartProvider, { text: text.slice(0, count), children: /* @__PURE__ */ jsx8(MarkdownText, {}) });
};
var AssistantTurnParts = () => {
  const content = useMessage((s) => s.content);
  const running = useMessage((s) => s.status?.type === "running");
  const isLast = useMessage((s) => s.isLast);
  const turnPhase = useCurrentThreadMetadata()?.control.turnPhase ?? (running ? "working" : "idle");
  const lastCompletedAt = useCurrentThreadMetadata()?.control.lastCompletedAt ?? 0;
  const lastToolIndex = content.reduce(
    (last, part, i) => part.type === "tool-call" ? i : last,
    -1
  );
  const items = [];
  if (lastToolIndex >= 0) {
    content.slice(0, lastToolIndex + 1).forEach((part, i) => {
      if (part.type === "tool-call") {
        items.push({
          kind: "tool",
          tool: part,
          key: part.toolCallId ?? `tool-${i}`
        });
        return;
      }
      if (part.type !== "text" || part.text.trim().length === 0) return;
      const prev = items[items.length - 1];
      if (prev?.kind === "note") prev.text += `

${part.text}`;
      else items.push({ kind: "note", text: part.text, key: `note-${i}` });
    });
  }
  const revealed = useStaggeredReveal(items.length, running);
  const liveTurnRef = useRef(running);
  useEffect(() => {
    if (running) liveTurnRef.current = true;
  }, [running]);
  const recentlyCompleted = isLast && lastCompletedAt > 0 && Date.now() - lastCompletedAt < 5e3;
  const liveTurn = liveTurnRef.current || recentlyCompleted;
  if (lastToolIndex < 0) {
    if (running) {
      return turnPhase === "working" ? /* @__PURE__ */ jsx8(MinimalWorkingTrace, {}) : null;
    }
    const answerText2 = collectText(
      content.filter((p) => p.type === "text")
    );
    return answerText2.length > 0 ? /* @__PURE__ */ jsx8(FakeStreamedText, { text: answerText2, stream: liveTurn }) : null;
  }
  const answerText = collectText(
    content.slice(lastToolIndex + 1).filter((p) => p.type === "text")
  );
  const answerReady = !running && revealed >= items.length;
  return /* @__PURE__ */ jsxs6(Fragment, { children: [
    /* @__PURE__ */ jsx8(WorkingTrace, { running, items, revealed }),
    answerReady && answerText.length > 0 && /* @__PURE__ */ jsx8("div", { className: "aui-working-answer", children: /* @__PURE__ */ jsx8(FakeStreamedText, { text: answerText, stream: liveTurn }) })
  ] });
};

// src/components/assistant-ui/thread.tsx
import {
  cn as cn20,
  useCurrentThreadMetadata as useCurrentThreadMetadata2,
  useNotification as useNotification2,
  useThreadContext
} from "@aomi-labs/react";

// src/components/control-bar/model-select.tsx
import { useEffect as useEffect2, useState as useState4 } from "react";
import { ChevronDownIcon as ChevronDownIcon2, CheckIcon as CheckIcon3 } from "lucide-react";
import { useControl, cn as cn10 } from "@aomi-labs/react";

// src/components/ui/popover.tsx
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn as cn7 } from "@aomi-labs/react";
import { jsx as jsx9 } from "react/jsx-runtime";
function Popover({
  ...props
}) {
  return /* @__PURE__ */ jsx9(PopoverPrimitive.Root, { "data-slot": "popover", ...props });
}
function PopoverTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx9(PopoverPrimitive.Trigger, { "data-slot": "popover-trigger", ...props });
}
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}) {
  return /* @__PURE__ */ jsx9(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx9(
    PopoverPrimitive.Content,
    {
      "data-slot": "popover-content",
      align,
      sideOffset,
      className: cn7(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
        className
      ),
      ...props
    }
  ) });
}

// src/components/ui/command.tsx
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn as cn9 } from "@aomi-labs/react";

// src/components/ui/dialog.tsx
import { XIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn as cn8 } from "@aomi-labs/react";
import { jsx as jsx10, jsxs as jsxs7 } from "react/jsx-runtime";
function Dialog({
  ...props
}) {
  return /* @__PURE__ */ jsx10(DialogPrimitive.Root, { "data-slot": "dialog", ...props });
}
function DialogTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx10(DialogPrimitive.Trigger, { "data-slot": "dialog-trigger", ...props });
}
function DialogPortal({
  ...props
}) {
  return /* @__PURE__ */ jsx10(DialogPrimitive.Portal, { "data-slot": "dialog-portal", ...props });
}
function DialogOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx10(
    DialogPrimitive.Overlay,
    {
      "data-slot": "dialog-overlay",
      className: cn8(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    }
  );
}
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}) {
  return /* @__PURE__ */ jsxs7(DialogPortal, { "data-slot": "dialog-portal", children: [
    /* @__PURE__ */ jsx10(DialogOverlay, {}),
    /* @__PURE__ */ jsxs7(
      DialogPrimitive.Content,
      {
        "data-slot": "dialog-content",
        className: cn8(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className
        ),
        ...props,
        children: [
          children,
          showCloseButton && /* @__PURE__ */ jsxs7(
            DialogPrimitive.Close,
            {
              "data-slot": "dialog-close",
              className: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              children: [
                /* @__PURE__ */ jsx10(XIcon, {}),
                /* @__PURE__ */ jsx10("span", { className: "sr-only", children: "Close" })
              ]
            }
          )
        ]
      }
    )
  ] });
}
function DialogHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx10(
    "div",
    {
      "data-slot": "dialog-header",
      className: cn8("flex flex-col gap-2 text-center sm:text-left", className),
      ...props
    }
  );
}
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs7(
    "div",
    {
      "data-slot": "dialog-footer",
      className: cn8(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      ),
      ...props,
      children: [
        children,
        showCloseButton && /* @__PURE__ */ jsx10(DialogPrimitive.Close, { asChild: true, children: /* @__PURE__ */ jsx10(Button, { variant: "outline", children: "Close" }) })
      ]
    }
  );
}
function DialogTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx10(
    DialogPrimitive.Title,
    {
      "data-slot": "dialog-title",
      className: cn8("text-lg leading-none font-semibold", className),
      ...props
    }
  );
}
function DialogDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx10(
    DialogPrimitive.Description,
    {
      "data-slot": "dialog-description",
      className: cn8("text-muted-foreground text-sm", className),
      ...props
    }
  );
}

// src/components/ui/command.tsx
import { jsx as jsx11, jsxs as jsxs8 } from "react/jsx-runtime";
var Command = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx11(
  CommandPrimitive,
  {
    ref,
    className: cn9(
      "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
      className
    ),
    ...props
  }
));
Command.displayName = CommandPrimitive.displayName;
var CommandInput = React.forwardRef(({ className, ...props }, ref) => (
  // eslint-disable-next-line react/no-unknown-property
  /* @__PURE__ */ jsxs8("div", { className: "flex items-center border-b px-3", "cmdk-input-wrapper": "", children: [
    /* @__PURE__ */ jsx11(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }),
    /* @__PURE__ */ jsx11(
      CommandPrimitive.Input,
      {
        ref,
        className: cn9(
          "placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
        ...props
      }
    )
  ] })
));
CommandInput.displayName = CommandPrimitive.Input.displayName;
var CommandList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx11(
  CommandPrimitive.List,
  {
    ref,
    className: cn9("aui-command-list max-h-[300px] overflow-y-auto overflow-x-hidden", className),
    ...props
  }
));
CommandList.displayName = CommandPrimitive.List.displayName;
var CommandEmpty = React.forwardRef((props, ref) => /* @__PURE__ */ jsx11(
  CommandPrimitive.Empty,
  {
    ref,
    className: "py-6 text-center text-sm",
    ...props
  }
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;
var CommandGroup = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx11(
  CommandPrimitive.Group,
  {
    ref,
    className: cn9(
      "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
      className
    ),
    ...props
  }
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;
var CommandSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx11(
  CommandPrimitive.Separator,
  {
    ref,
    className: cn9("bg-border -mx-1 h-px", className),
    ...props
  }
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;
var CommandItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx11(
  CommandPrimitive.Item,
  {
    ref,
    className: cn9(
      "aria-selected:bg-accent aria-selected:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled='true']:pointer-events-none data-[disabled='true']:opacity-50",
      className
    ),
    ...props
  }
));
CommandItem.displayName = CommandPrimitive.Item.displayName;
var CommandShortcut = ({
  className,
  ...props
}) => {
  return /* @__PURE__ */ jsx11(
    "span",
    {
      className: cn9(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      ),
      ...props
    }
  );
};
CommandShortcut.displayName = "CommandShortcut";

// src/components/control-bar/model-metadata.ts
import { resolveAutoModel } from "@aomi-labs/react";
var VENDORS = {
  anthropic: { id: "anthropic", label: "Anthropic", abbr: "A" },
  openai: { id: "openai", label: "OpenAI", abbr: "O" },
  google: { id: "google", label: "Google", abbr: "G" },
  meta: { id: "meta", label: "Meta", abbr: "M" },
  mistral: { id: "mistral", label: "Mistral", abbr: "Mi" },
  deepseek: { id: "deepseek", label: "DeepSeek", abbr: "D" },
  xai: { id: "xai", label: "xAI", abbr: "X" },
  cohere: { id: "cohere", label: "Cohere", abbr: "C" },
  glm: { id: "glm", label: "GLM", abbr: "G" },
  moonshot: { id: "moonshot", label: "Moonshot AI", abbr: "K" },
  unknown: { id: "unknown", label: "Other", abbr: "?" }
};
var VENDOR_PATTERNS = [
  [/^claude/i, "anthropic"],
  [/^gpt|^o[1-9]|^chatgpt|^dall-e/i, "openai"],
  [/^gemini|^palm/i, "google"],
  [/^llama|^meta-llama/i, "meta"],
  [/^mistral|^mixtral|^codestral|^pixtral/i, "mistral"],
  [/^deepseek/i, "deepseek"],
  [/^grok/i, "xai"],
  [/^command/i, "cohere"],
  [/^glm|^chatglm|^zai|^z\.ai|^zhipu/i, "glm"],
  [/^kimi|^moonshot/i, "moonshot"]
];
function getVendorForModel(model) {
  const lower = model.toLowerCase();
  for (const [pattern, vendorId] of VENDOR_PATTERNS) {
    if (pattern.test(lower)) {
      return VENDORS[vendorId];
    }
  }
  return VENDORS.unknown;
}
function groupModelsByVendor(models) {
  const grouped = /* @__PURE__ */ new Map();
  for (const model of models) {
    const vendor = getVendorForModel(model);
    const existing = grouped.get(vendor.id) ?? [];
    existing.push(model);
    grouped.set(vendor.id, existing);
  }
  return Array.from(grouped.entries()).map(([vendorId, vendorModels]) => ({
    vendor: VENDORS[vendorId] ?? VENDORS.unknown,
    models: [...vendorModels].sort(
      (a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" })
    )
  })).sort((a, b) => {
    if (a.vendor.id === "unknown") return 1;
    if (b.vendor.id === "unknown") return -1;
    return a.vendor.label.localeCompare(b.vendor.label);
  });
}
var AUTO_MODE_LABEL = "Auto";

// src/components/icons/auto-mode.tsx
import { jsx as jsx12 } from "react/jsx-runtime";
function AutoModeIcon(props) {
  return /* @__PURE__ */ jsx12(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      ...props,
      children: /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z",
          fill: "currentColor"
        }
      )
    }
  );
}

// src/components/icons/apps/index.tsx
import { jsx as jsx13, jsxs as jsxs9 } from "react/jsx-runtime";
function AllAppsIcon(props) {
  return /* @__PURE__ */ jsxs9(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ jsx13("rect", { x: "3", y: "3", width: "8", height: "8", rx: "2", fill: "currentColor" }),
        /* @__PURE__ */ jsx13(
          "rect",
          {
            x: "13",
            y: "3",
            width: "8",
            height: "8",
            rx: "2",
            fill: "currentColor",
            opacity: "0.55"
          }
        ),
        /* @__PURE__ */ jsx13(
          "rect",
          {
            x: "3",
            y: "13",
            width: "8",
            height: "8",
            rx: "2",
            fill: "currentColor",
            opacity: "0.55"
          }
        ),
        /* @__PURE__ */ jsx13("rect", { x: "13", y: "13", width: "8", height: "8", rx: "2", fill: "currentColor" })
      ]
    }
  );
}
var BinanceIconMarkup = '<path fill="currentColor" d="m16.624 13.92l2.718 2.716l-7.353 7.353l-7.353-7.352l2.717-2.717l4.636 4.66zm4.637-4.636L24 12l-2.715 2.716L18.568 12zm-9.272 0l2.716 2.692l-2.717 2.717L9.272 12zm-9.273 0L5.41 12l-2.692 2.692L0 12zM11.99.012l7.35 7.328l-2.717 2.715L11.99 5.42l-4.636 4.66l-2.717-2.716z"/>';
function AcrossIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 40 40",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: /* @__PURE__ */ jsx13(
        "path",
        {
          fillRule: "evenodd",
          clipRule: "evenodd",
          d: "M35.9714 0L40 4.02857L26.5371 17.4915C25.8275 15.6433 24.3567 14.1725 22.5085 13.4629L35.9714 0ZM17.4915 13.4629L4.02857 0L0 4.02857L13.4629 17.4915C14.1725 15.6433 15.6433 14.1725 17.4915 13.4629ZM13.4629 22.5085L0 35.9714L4.02857 40L17.4915 26.5371C15.6433 25.8275 14.1725 24.3567 13.4629 22.5085ZM22.5085 26.5371L35.9714 40L40 35.9714L26.5371 22.5085C25.8275 24.3567 24.3567 25.8275 22.5085 26.5371Z",
          fill: "currentColor"
        }
      )
    }
  );
}
function BinanceIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: BinanceIconMarkup },
      ...props
    }
  );
}
var BybitIconMarkup = '<path fill="currentColor" d="M15.829 13.626V9h.93v4.626zM4.993 15H3v-4.626h1.913c.93 0 1.471.507 1.471 1.3c0 .513-.348.845-.588.955c.287.13.655.423.655 1.04c0 .863-.609 1.33-1.458 1.33m-.154-3.82h-.91v1.065h.91c.395 0 .615-.214.615-.533c0-.317-.22-.532-.615-.532m.06 1.877h-.97v1.137h.97c.42 0 .622-.259.622-.571s-.201-.565-.622-.565zm4.388.046V15h-.923v-1.898l-1.431-2.728h1.01l.889 1.864l.877-1.864h1.01zM13.355 15h-1.993v-4.626h1.913c.93 0 1.47.507 1.47 1.3c0 .513-.347.845-.588.955c.287.13.655.423.655 1.04c0 .863-.608 1.33-1.457 1.33m-.155-3.82h-.91v1.065h.91c.395 0 .616-.214.616-.533c0-.317-.22-.532-.616-.532m.06 1.877h-.97v1.137h.97c.422 0 .622-.259.622-.571s-.2-.565-.622-.565zm6.495-1.876V15h-.929v-3.82h-1.245v-.806H21v.806z"/>';
function BybitIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "2 8 20 8",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: BybitIconMarkup },
      ...props
    }
  );
}
var CowIconMarkup = '<path fill="currentColor" fill-rule="evenodd" d="M13.653 26a4.011 4.011 0 0 1-3.824-2.79L7.11 14.666H5.44a4.011 4.011 0 0 1-3.825-2.791L0 6.8h6.058L2.863 2h30.274l-3.195 4.8H36l-1.615 5.076a4.011 4.011 0 0 1-3.825 2.79h-1.67l-2.72 8.544A4.011 4.011 0 0 1 22.346 26h-8.693ZM11.6 12.333c0 1.289.965 2.334 2.156 2.334 1.19 0 2.155-1.045 2.155-2.334 0-1.288-.965-2.333-2.155-2.333S11.6 11.045 11.6 12.333Zm12.8 0c0 1.289-.965 2.334-2.156 2.334-1.19 0-2.155-1.045-2.155-2.334 0-1.288.965-2.333 2.155-2.333s2.156 1.045 2.156 2.333Z" clip-rule="evenodd" ></path>';
function CowIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "-2 -4 40 36",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: CowIconMarkup },
      ...props
    }
  );
}
function DefillamaIcon(props) {
  return /* @__PURE__ */ jsxs9(
    "svg",
    {
      viewBox: "0 0 150 150",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ jsx13(
          "path",
          {
            fill: "currentColor",
            opacity: "0.2",
            d: "M53.72,13.12c0,17.05-13.83,30.88-30.88,30.89V24.44c0-6.25,5.07-11.31,11.32-11.32h19.57Z"
          }
        ),
        /* @__PURE__ */ jsx13(
          "path",
          {
            fill: "currentColor",
            d: "M71.27,13.12h-17.55c0,17.05-13.83,30.88-30.88,30.89V122.27c11.88,.02,23.64-2.51,34.46-7.41l1.37-40.45c-2.42-1.19-4.14-4.36-4.14-8.07,0-4.17,2.18-7.64,5.05-8.42,.39-2.51,1.28-4.92,2.62-7.09-1.27-.15-2.4-.89-3.07-1.99-2.6-3.82-6.1-7.73-8.79-14.07-.5-1.11-.36-2.41,.36-3.39,.56-.73,1.61-.87,2.34-.32,.07,.06,.14,.12,.21,.19,4.15,3.93,9.15,5.11,11.91,8.88,.2-.47,.47-.91,.79-1.3,1.61-2.08,4.41-2.82,6.84-1.8,.93-3.13,4.22-4.92,7.35-3.99,1.92,.57,3.42,2.07,3.99,3.99,1.25-.56,2.67-.63,3.97-.19,3.2-6.09,7.14-11.76,11.75-16.87-8.84-4.53-18.64-6.88-28.57-6.87"
          }
        ),
        /* @__PURE__ */ jsx13(
          "path",
          {
            fill: "currentColor",
            opacity: "0.65",
            d: "M105.22,23.11c-1.75-1.13-3.54-2.17-5.4-3.12-4.6,5.11-8.55,10.78-11.75,16.87,1.13,.36,2.13,1.05,2.86,1.99,.32,.4,.58,.84,.79,1.3,2.59-3.54,7.14-4.34,11.13-8.15,.8-.83,2.08-.96,3.03-.3,.21,.14,.39,.31,.53,.52,.53,.68,.64,1.6,.28,2.39l-.11,.27c-2.67,6.21-6.16,10.16-8.74,13.97-.67,1.11-1.82,1.84-3.11,1.99,1.32,2.16,2.2,4.57,2.57,7.09,2.59,.71,4.6,3.57,4.98,7.18,.05,.41,.07,.83,.07,1.24,0,3.49-1.53,6.5-3.73,7.83-.13,.09-.27,.17-.41,.24v.6l1.91,56.59c20.8-10.79,33.85-32.28,33.85-55.71h0c.02-21.34-10.81-41.22-28.74-52.78"
          }
        ),
        /* @__PURE__ */ jsx13(
          "path",
          {
            fill: "currentColor",
            d: "M57.3,114.86l-.8,23.79h-22.34c-6.25,0-11.31-5.07-11.32-11.32h0v-5.06c11.88,.02,23.64-2.51,34.46-7.41"
          }
        )
      ]
    }
  );
}
var DuneIconMarkup = '<path d="M1801.21 893.928C1803.88 1249.56 1594.22 1588.02 1245.43 1732.49C896.636 1876.97 509.055 1785.9 259.473 1532.54L1801.21 893.928Z" fill="currentColor"></path><path d="M556.599 69.5106C1015.82 -120.703 1542.29 97.3687 1732.51 556.587C1762.3 628.516 1782.07 702.097 1792.48 775.776L182.101 1442.81C137.359 1383.36 99.3163 1317.35 69.5225 1245.42C-120.692 786.197 97.3793 259.726 556.599 69.5106Z" fill="currentColor"></path>';
function DuneIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 1802 1802",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: DuneIconMarkup },
      ...props
    }
  );
}
var DydxIconMarkup = '<path fill="currentColor" d="M16.146 3L3.643 21h3.838L20.048 3zm-8.26 0l3.677 5.303l-1.922 2.893L3.965 3zm8.634 18l-4.082-5.87l1.922-2.808L20.357 21z"/>';
function DydxIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: DydxIconMarkup },
      ...props
    }
  );
}
var GmxIconMarkup = '<path fill="currentColor" d="M21 19L12.015 5L3 19h12.56l-3.55-5.345l-1.75 2.845H8.385l3.63-5.65L17.26 19z"/>';
function GmxIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: GmxIconMarkup },
      ...props
    }
  );
}
var HyperliquidIconMarkup = '<path fill="currentColor" d="M65.3 23.8c0 21.5-13.2 28.4-20.2 22.3-5.7-5-7.4-15.6-16-16.7C18.2 28.1 17.2 42.6 10 42.6c-8.4 0-10-12.1-10-18.4C0 17.8 1.8 9.1 8.9 9.1c8.3 0 8.8 12.5 19.2 11.8 10.3-.7 10.5-13.7 17.3-19.2 5.9-4.9 19.9.3 19.9 22.1M96.3 43.8V2.1h4v18.1h24.4V2.1h3.9v41.8h-3.9V23.6h-24.4v20.3h-4zM139 56.5l5.4-13.4L132.7 15h4.1l7.7 19c.4 1.2 1.1 2.7 1.9 4.6.1-.3.2-.6.4-.9.1-.3.2-.6.4-.9.2-.5.5-1 .6-1.5s.3-.9.5-1.4l7.2-19h3.9L143 56.4h-4zM163.2 56.5V15h3.7v5.3c1-1.8 2.3-3.3 4.2-4.4 1.8-1.1 3.8-1.7 6.1-1.7 2.7 0 5 .7 7 2s3.5 3.1 4.6 5.4 1.6 4.9 1.6 7.8c0 3-.5 5.6-1.6 7.9s-2.7 4.1-4.6 5.5c-2 1.3-4.3 2-6.8 2-2.2 0-4.1-.5-6-1.6-1.8-1-3.2-2.6-4.3-4.6v18h-3.9zm13.4-14.8c2 0 3.7-.5 5.2-1.6s2.6-2.5 3.5-4.4c.8-1.9 1.2-4 1.2-6.4q0-3.6-1.2-6.3c-.8-1.8-2-3.3-3.5-4.3s-3.2-1.5-5.2-1.5q-2.85 0-5.1 1.5c-1.5 1-2.7 2.4-3.5 4.3-.8 1.8-1.3 4-1.3 6.4s.4 4.6 1.3 6.4c.8 1.9 2 3.3 3.5 4.4s3.2 1.5 5.1 1.5M208.1 44.7q-4.05 0-7.2-1.8c-2.1-1.2-3.7-3-4.8-5.3s-1.7-5.1-1.7-8.3q0-4.35 1.8-7.8t4.8-5.4c2-1.3 4.3-2 6.8-2 2.7 0 5 .6 7 1.9 1.9 1.2 3.4 3 4.4 5.2 1 2.3 1.5 4.9 1.5 7.9v.8h-22.6c0 2.5.4 4.6 1.3 6.4s2 3.1 3.5 4 3.3 1.4 5.2 1.4c2.3 0 4.2-.5 5.8-1.6 1.5-1.1 2.5-2.8 2.8-5h3.7c-.3 1.8-.9 3.5-2 4.9-1 1.4-2.4 2.6-4.2 3.4-1.6.8-3.7 1.3-6.1 1.3m8.6-17.6q0-4.5-2.4-7.2c-1.6-1.8-3.7-2.7-6.5-2.7-2.7 0-4.9.9-6.6 2.8s-2.7 4.2-3 7.1zM226.4 43.8V15h3.7v5.8c.8-1.9 2-3.5 3.8-4.7 1.7-1.2 3.7-1.9 6-1.9.6 0 1.1 0 1.6.1v3.6c-.7-.1-1.3-.1-1.8-.1-1.9 0-3.6.4-5 1.3s-2.5 2.1-3.3 3.7-1.2 3.5-1.2 5.6v15.5h-3.8zM250.7 43l-.2.8h-11.7l.2-.8c3.2-.3 4.6-1.3 5.1-3.7l6.6-31.1c.7-3.2-.3-3.7-3.7-3l.2-.8 7.2-2.4h.8l-7.9 37.4c-.6 2.3.3 3.3 3.4 3.6M264 43l-.2.8H252l.2-.8c3.2-.3 4.6-1.3 5.1-3.7l4-19c.7-3.2-.2-3.7-3.7-3l.2-.8 7.2-2.4h.8l-5.3 25.2c-.5 2.4.4 3.4 3.5 3.7m2-39.4c1.6 0 2.6 1.2 2.4 2.8s-1.6 2.7-3.1 2.7c-1.6 0-2.7-1.2-2.5-2.7.1-1.6 1.5-2.8 3.2-2.8M284.2 52.2l3.2-14.9c-2 4.4-6.3 7.4-10.7 7.4-7.2 0-10.6-6.8-8.4-16.9 1.5-7.4 8.1-13.7 15.9-13.7 3.6 0 6.6 1.6 7.8 4l2.7-4h.8l-8.2 38.1c-.6 2.6 1.5 3.1 3.6 3.5l-.2.8h-13.5l.2-.8c4-.4 6.3-.9 6.8-3.5m-5.5-9.6c3.7 0 7.4-3.2 9.2-7l2.4-11.4c.6-4.1-1.3-8.4-7-8.4-5.4 0-10 4.9-11.5 12-1.8 8.7.8 14.8 6.9 14.8M335.8 43l-.2.8h-11.8l.2-.8c3.2-.3 4.6-1.3 5.1-3.7l4-19c.7-3.2-.2-3.7-3.7-3l.2-.8 7.2-2.4h.8l-5.3 25.2c-.5 2.4.4 3.4 3.5 3.7m2-39.4c1.6 0 2.6 1.2 2.4 2.8s-1.6 2.7-3.1 2.7c-1.6 0-2.7-1.2-2.5-2.7.2-1.6 1.6-2.8 3.2-2.8M319.1 39.2l2.7-12.7 2.6-12.4h-.8l-7.2 2.4-.2.8c3.4-.7 4.3-.2 3.7 3l-3.4 16.2c-3.8 3.5-6.4 5.6-9.7 5.6-4 0-6.1-2.7-5.1-7.4l4.4-20.6h-.8l-7.2 2.4-.2.8c3.4-.7 4.4-.2 3.7 3l-3.1 14.8c-1.2 5.5 1.6 9.5 6.7 9.5 3.4 0 6.4-1.9 11.1-6.9l-.2 1-1 4.9h7.5l.2-.9c-3.3-.1-4.2-1-3.7-3.5M367.2 13l2.3-11.1h-.8l-7.2 2.4-.2.8c3.4-.7 4.3-.2 3.7 3l-2 9.5c-1.3-2.1-4.1-3.5-7.3-3.5-7.9 0-14.4 6.3-16.1 14.2-2 9.6 1.3 16.4 8.5 16.4 4.5 0 8.8-3.1 10.8-7.5l-.5 2.5-.9 4.1 7.5-.1.2-.8c-3.1-.3-4-1.3-3.5-3.7zm-8 22.5c-1.7 3.9-5.5 7.1-9.2 7.1-6.1 0-8.7-6.1-7-14.3 1.6-7.7 6.3-12.5 11.7-12.5 5.8 0 7.7 4.6 6.9 8.7l-.3 1.3z"/>';
function HyperliquidIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "-1 -4 67 65",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: HyperliquidIconMarkup },
      ...props
    }
  );
}
function KaitoIcon(props) {
  const piece = "M6 0H18C21.31 0 24 2.69 24 6H37V18H24C24 21.31 21.31 24 18 24V37H6V24C2.69 24 0 21.31 0 18V6C0 2.69 2.69 0 6 0Z";
  return /* @__PURE__ */ jsxs9(
    "svg",
    {
      viewBox: "0 0 80 80",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ jsx13("path", { d: piece, fill: "currentColor" }),
        /* @__PURE__ */ jsx13("path", { d: piece, fill: "currentColor", transform: "rotate(90 40 40)" }),
        /* @__PURE__ */ jsx13("path", { d: piece, fill: "currentColor", transform: "rotate(180 40 40)" }),
        /* @__PURE__ */ jsx13("path", { d: piece, fill: "currentColor", transform: "rotate(270 40 40)" })
      ]
    }
  );
}
var KalshiIconMarkup = '<defs><style> .cls-1 { fill: currentColor; stroke-width: 0px; } </style></defs><g><path class="cls-1" d="M126.66,0h-12.99v63.83h12.99V0Z"/><path class="cls-1" d="M0,.07h13.79v28.63L39.58.07h16.72l-23.65,26.25,25.19,37.51h-16.52l-18.39-26.91-9.13,10.14v16.77H0V.07Z"/><path class="cls-1" d="M108.67,63.23h-6.6c-5.93,0-8.86-2.59-8.73-7.69-1.73,2.65-3.86,4.71-6.33,6.1-2.53,1.39-5.53,2.12-9.13,2.12-5.26,0-9.53-1.19-12.79-3.58-3.2-2.45-4.8-5.83-4.8-10.21,0-4.97,1.87-8.81,5.53-11.47,3.73-2.72,9.13-4.11,16.19-4.11h9.39v-2.25c0-2.12-.8-3.78-2.4-5.04-1.6-1.26-3.73-1.92-6.46-1.92-2.4,0-4.33.53-5.86,1.52-1.53,1.06-2.47,2.45-2.73,4.18h-12.59c.4-4.77,2.6-8.48,6.46-11.13,3.86-2.65,9-4.04,15.39-4.04s11.86,1.46,15.46,4.37c3.66,2.92,5.53,7.16,5.53,12.66v16.5c0,1.13.27,1.92.73,2.39.47.4,1.27.66,2.33.66h1.4v10.94ZM81.89,42.95c-2.67,0-4.8.53-6.33,1.66-1.47,1.06-2.2,2.52-2.2,4.44,0,1.66.6,2.92,1.87,3.91,1.27.99,3,1.46,5.13,1.46,3.4,0,6.06-.93,8-2.85,1.93-1.92,3-4.51,3.06-7.75v-.86h-9.53Z"/><path class="cls-1" d="M143.92,47.65c.2,2.05,1.2,3.71,3.06,5.04,1.87,1.26,4.2,1.92,7.06,1.92s4.93-.4,6.53-1.26c1.6-.93,2.4-2.19,2.4-3.84,0-1.19-.4-2.12-1.13-2.72-.73-.6-1.8-1.06-3.13-1.26-1.33-.33-3.53-.66-6.6-.99-4.2-.53-7.66-1.26-10.39-2.12-2.73-.86-5-2.19-6.6-4.04-1.67-1.86-2.47-4.24-2.47-7.29s.8-5.7,2.47-8.02c1.73-2.39,4.13-4.18,7.2-5.5,3.07-1.26,6.6-1.92,10.59-1.92,6.46.07,11.59,1.46,15.52,4.11,4,2.65,6.13,6.36,6.46,11.13h-12.33c-.2-1.79-1.13-3.18-2.87-4.31-1.67-1.13-3.8-1.72-6.46-1.72-2.47,0-4.46.46-6,1.39-1.47.93-2.2,2.12-2.2,3.65,0,1.13.4,1.92,1.2,2.45.8.53,1.87.93,3.13,1.19,1.27.27,3.46.53,6.46.8,6.4.73,11.26,2.12,14.59,4.11,3.46,1.92,5.13,5.3,5.13,10.14,0,3.05-.93,5.7-2.73,8.02-1.8,2.32-4.26,4.11-7.53,5.37-3.2,1.19-6.93,1.86-11.13,1.86-6.53,0-11.93-1.46-15.99-4.31-4.13-2.92-6.26-6.89-6.53-11.86h12.26Z"/><path class="cls-1" d="M221.28,21.47c-3.6-3.38-8.13-5.1-13.73-5.1s-10.46,2.12-13.99,6.36V0h-12.99v63.83h12.99v-24.06c0-4.04.87-7.16,2.73-9.41,1.87-2.25,4.46-3.38,7.8-3.38s5.6,1.06,7.2,3.12c1.6,1.99,2.4,4.9,2.4,8.81v24.92h12.99v-25.45c0-7.89-1.8-13.52-5.4-16.9Z"/><path class="cls-1" d="M231.67,16.9h12.99v46.86h-12.99V16.9Z"/><path class="cls-1" d="M242.73,1.86c-1.2-1.19-2.73-1.86-4.6-1.86s-3.4.66-4.66,1.86c-1.2,1.19-1.87,2.65-1.87,4.44s.67,3.31,1.87,4.51c1.27,1.19,2.87,1.86,4.66,1.86s3.4-.6,4.6-1.86c1.2-1.26,1.87-2.72,1.87-4.51s-.67-3.31-1.87-4.44Z"/></g>';
function KalshiIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 244.66 63.83",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: KalshiIconMarkup },
      ...props
    }
  );
}
var KhalaniIconMarkup = '<path d="M10.8123 17.6719C10.8973 17.6718 10.9824 17.6716 11.0674 17.6715C11.2445 17.6713 11.4215 17.6716 11.5986 17.6721C11.825 17.6729 12.0514 17.6724 12.2778 17.6717C12.453 17.6713 12.6281 17.6714 12.8033 17.6717C12.8868 17.6718 12.9703 17.6717 13.0538 17.6714C13.1703 17.6711 13.2869 17.6717 13.4035 17.6723C13.4696 17.6724 13.5357 17.6725 13.6039 17.6726C13.7898 17.6887 13.9208 17.7356 14.0903 17.8109C14.1548 17.8248 14.2194 17.8387 14.2859 17.8531C14.8546 18.0131 15.3063 18.5095 15.7089 18.9168C15.7897 18.9974 15.7897 18.9974 15.8722 19.0796C16.0182 19.2255 16.1638 19.3717 16.3092 19.5182C16.4624 19.6723 16.6161 19.8259 16.7697 19.9796C17.0275 20.2376 17.2849 20.4959 17.542 20.7545C17.8709 21.0851 18.2003 21.4152 18.5299 21.7451C18.815 22.0303 19.0998 22.3159 19.3845 22.6015C19.4753 22.6925 19.5661 22.7835 19.6569 22.8745C19.8268 23.0447 19.9964 23.2153 20.1661 23.3859C20.2158 23.4357 20.2655 23.4854 20.3167 23.5367C20.5729 23.7949 20.8198 24.0575 21.0564 24.3339C21.1875 24.4846 21.3284 24.6242 21.4711 24.7639C21.5279 24.8199 21.5846 24.8759 21.6431 24.9336C21.7316 25.0205 21.8202 25.1074 21.909 25.1941C21.9959 25.2793 22.0825 25.3648 22.1691 25.4504C22.246 25.5257 22.246 25.5257 22.3245 25.6026C22.4359 25.727 22.4359 25.727 22.4359 25.8497C21.7968 25.8569 21.1577 25.8623 20.5186 25.8656C20.2217 25.8672 19.9248 25.8694 19.6279 25.8729C19.3407 25.8762 19.0534 25.8781 18.7661 25.8788C18.6573 25.8794 18.5485 25.8805 18.4397 25.8822C17.2247 25.9001 16.3482 25.6479 15.4572 24.7829C15.3297 24.6562 15.2035 24.5283 15.0774 24.4002C15.0095 24.332 14.9416 24.2638 14.8736 24.1957C14.6967 24.018 14.5203 23.8398 14.344 23.6615C14.1314 23.4467 13.9182 23.2326 13.705 23.0184C13.3829 22.6945 13.0616 22.3697 12.7402 22.0451C12.72 23.3006 12.6997 24.5561 12.6789 25.8497C11.1398 25.8497 9.60078 25.8497 8.0151 25.8497C8.01018 24.3809 8.01018 24.3809 8.00911 23.751C8.00838 23.3225 8.00752 22.894 8.00584 22.4655C8.0045 22.1197 8.00377 21.774 8.00346 21.4282C8.00323 21.2968 8.00279 21.1654 8.00212 21.034C7.99195 18.9428 7.99195 18.9428 8.65177 18.2519C9.27422 17.6629 9.99189 17.6693 10.8123 17.6719Z" fill="currentColor" ></path> <path d="M8.98145 8.11694C10.4597 8.11694 11.938 8.11694 13.4611 8.11694C13.4649 8.77255 13.4687 9.42817 13.4726 10.1036C13.4751 10.4124 13.4751 10.4124 13.4777 10.7275C13.4782 10.892 13.4787 11.0566 13.4791 11.2212C13.4796 11.2631 13.48 11.3051 13.4805 11.3483C13.491 12.3134 13.292 13.0044 12.6157 13.7163C12.5019 13.8305 12.3877 13.9438 12.2726 14.0567C12.211 14.118 12.1494 14.1794 12.0879 14.2408C11.9596 14.3686 11.831 14.496 11.702 14.6231C11.5379 14.7847 11.3745 14.947 11.2114 15.1095C11.054 15.2663 10.8963 15.4228 10.7385 15.5793C10.7091 15.6085 10.6797 15.6377 10.6494 15.6677C10.3392 15.9754 10.0267 16.2768 9.6943 16.5606C9.52059 16.7114 9.36479 16.879 9.20629 17.0453C9.10418 17.1376 9.10418 17.1376 8.98145 17.1376C8.98145 14.1608 8.98145 11.184 8.98145 8.11694Z" fill="currentColor" ></path> <path d="M15.5476 9.7738C15.7513 9.87564 15.8492 9.93702 16.0037 10.0896C16.0442 10.1293 16.0848 10.169 16.1265 10.2099C16.1703 10.2535 16.214 10.297 16.2591 10.3419C16.3058 10.3878 16.3524 10.4337 16.4004 10.481C16.5548 10.6332 16.7086 10.786 16.8624 10.9388C16.9151 10.9911 16.9679 11.0434 17.0222 11.0973C17.3015 11.3744 17.5805 11.652 17.8592 11.9298C18.1459 12.2155 18.4338 12.4999 18.7221 12.7839C18.9445 13.0036 19.166 13.2242 19.3872 13.4451C19.4928 13.5503 19.5988 13.6551 19.7052 13.7595C20.8275 14.8625 20.8275 14.8625 21.0705 15.6035C21.0705 16.0693 21.0705 16.535 21.0705 17.0149C19.2479 17.0149 17.4254 17.0149 15.5476 17.0149C15.5476 14.6253 15.5476 12.2358 15.5476 9.7738Z" fill="currentColor" ></path>';
function KhalaniIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "6 6.5 19 19",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: KhalaniIconMarkup },
      ...props
    }
  );
}
function LifiIcon(props) {
  return /* @__PURE__ */ jsxs9(
    "svg",
    {
      viewBox: "0 0 32 32",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ jsx13(
          "path",
          {
            d: "M16.3302 0L22.916 6.58579C23.6971 7.36684 23.6971 8.63317 22.916 9.41421L18.9969 13.3333L16.3302 10.6667C13.3847 7.72115 13.3847 2.94552 16.3302 0Z",
            fill: "currentColor"
          }
        ),
        /* @__PURE__ */ jsx13(
          "path",
          {
            fillRule: "evenodd",
            clipRule: "evenodd",
            d: "M16.3328 31.9993L5.66617 21.3327C2.72065 18.3872 2.72065 13.6115 5.66617 10.666L14.9186 19.9185C15.6997 20.6995 16.966 20.6995 17.7471 19.9185L26.9995 10.666C29.945 13.6115 29.945 18.3872 26.9995 21.3327L16.3328 31.9993Z",
            fill: "currentColor"
          }
        )
      ]
    }
  );
}
function LimitlessIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 500 500",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: /* @__PURE__ */ jsx13(
        "path",
        {
          d: "M413.468 218.013H352.889L434.511 134.701L435 134.207L405.25 104.415H324.308V86.2778C324.308 74.5475 314.779 65 303.063 65H216.211C204.495 65 194.971 74.5425 194.971 86.2778V239.432H86.5317C74.821 239.432 65.2923 248.979 65.2923 260.709C65.2923 272.44 74.821 281.987 86.5317 281.987H147.111L65.4888 365.269L65 365.763L94.7453 395.555H175.692V413.722C175.692 425.452 185.221 435 196.932 435H283.784C295.495 435 305.029 425.458 305.029 413.722V260.568H413.468C425.184 260.568 434.713 251.026 434.713 239.291C434.713 227.555 425.184 218.013 413.468 218.013ZM296.19 413.722C296.19 420.568 290.627 426.143 283.789 426.143C276.951 426.143 271.388 420.573 271.388 413.722V291.873L181.84 383.265L164.304 365.702L255.042 273.125H173.384C166.546 273.125 160.983 267.555 160.983 260.704C160.983 253.854 166.546 248.284 173.384 248.284H277.873C287.977 248.284 296.19 256.515 296.19 266.633V413.722ZM413.468 251.711H308.974C298.876 251.711 290.657 243.48 290.657 233.367V86.2778C290.657 79.4322 296.22 73.8569 303.058 73.8569C309.896 73.8569 315.459 79.4272 315.459 86.2778V208.127L405.008 116.7L422.544 134.263L331.806 226.875H413.463C420.301 226.875 425.864 232.445 425.864 239.296C425.864 246.146 420.301 251.716 413.463 251.716L413.468 251.711Z",
          fill: "currentColor"
        }
      )
    }
  );
}
var ManifoldIconMarkup = '<path fill="currentColor" d="M195.402 96.0412L171.329 72H26L48.1382 94.1021H164.634L122.958 135.694L103.131 115.906H70.0139L105.185 151H138.301L123.003 135.738H156.03L195.402 96.0412Z" ></path>';
function ManifoldIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "20 65 182 93",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: ManifoldIconMarkup },
      ...props
    }
  );
}
var MorphoIconMarkup = '<path d="M2.53223 13.5905V19.4119C2.53223 19.7702 2.83552 19.919 2.92987 19.9528C3.02423 19.9934 3.34099 20.0813 3.62405 19.8176L8.02794 15.5854C8.40298 15.2251 8.76493 14.8463 9.03693 14.403C9.16496 14.1947 9.21802 14.0773 9.21802 14.0773C9.48764 13.5296 9.48764 13.0023 9.22469 12.4749C8.83394 11.6906 7.83638 10.8928 6.33337 10.1355L3.76559 11.5689C3.00402 12.0016 2.53223 12.7656 2.53223 13.5905Z" fill="currentColor"></path><path d="M0 0.642806V6.74819C0 7.5122 0.512226 8.18831 1.24012 8.40467C3.72033 9.12136 8.04046 10.6629 9.08514 12.9279C9.21983 13.2254 9.30074 13.5162 9.32787 13.8204C10.022 12.5561 10.3388 11.1024 10.1905 9.62844C9.98823 7.53924 8.88286 5.63933 7.15759 4.42908L1.00423 0.122192C0.89638 0.0410568 0.768328 0.000488281 0.640278 0.000488281C0.53243 0.000488281 0.438076 0.0207726 0.336987 0.0748625C0.134785 0.189803 0 0.399404 0 0.642806Z" fill="currentColor"></path><path d="M18.9118 13.5905V19.4119C18.9118 19.7702 18.6086 19.919 18.5141 19.9528C18.4199 19.9934 18.1029 20.0813 17.82 19.8176L13.3135 15.487C13.0068 15.1922 12.7139 14.8804 12.4828 14.5231C12.2998 14.2403 12.226 14.0773 12.226 14.0773C11.9564 13.5296 11.9564 13.0023 12.2191 12.4749C12.6101 11.6906 13.6077 10.8928 15.1105 10.1355L17.6784 11.5689C18.4468 12.0016 18.9118 12.7656 18.9118 13.5905Z" fill="currentColor"></path><path d="M21.448 0.642318V6.74769C21.448 7.5117 20.9357 8.18782 20.2077 8.40418C17.7276 9.12086 13.4075 10.6624 12.3629 12.9274C12.2279 13.2249 12.147 13.5157 12.1201 13.8199C11.426 12.5556 11.1092 11.1019 11.2575 9.62797C11.4595 7.53874 12.5649 5.63886 14.2904 4.4286L20.4438 0.121701C20.5516 0.0405662 20.6796 0 20.8076 0C20.9154 0 21.0099 0.0202842 21.1108 0.0743741C21.3131 0.189315 21.448 0.398914 21.448 0.642318Z" fill="currentColor"></path>';
function MorphoIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "-1 -1 23 22",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: MorphoIconMarkup },
      ...props
    }
  );
}
var NeynarIconMarkup = '<path fill="currentColor" fill-rule="evenodd" d="M25.473 15.788c0 1.53-.39 2.968-1.078 4.22-2.638-.302-5.66-.88-8.826-1.728a68.203 68.203 0 0 1-4.563-1.392l-.019-.007-.18-.062c-1.64-.605-2.702-2.007-2.588-3.396l.001-.003.02.006-.017-.017a8.788 8.788 0 0 1 17.25 2.38zM8.197 18.071c.71-.491 1.655-.716 2.638-.578a78.33 78.33 0 0 0 4.577 1.375c3.036.814 5.955 1.408 8.595 1.781a8.792 8.792 0 0 1-15.81-2.578z" clip-rule="evenodd"/><path fill="currentColor" fill-rule="evenodd" d="M28.493 15.606a35.537 35.537 0 0 0-3.18-1.5 8.731 8.731 0 0 0-.208-.845 37.476 37.476 0 0 1 3.722 1.726c1.335.722 2.404 1.446 3.109 2.136.68.665 1.125 1.401.933 2.117-.191.715-.944 1.13-1.867 1.367-.955.244-2.242.337-3.76.294a35.44 35.44 0 0 1-3.233-.254 9.19 9.19 0 0 0 .4-.66c1.026.116 1.983.187 2.853.212 1.489.042 2.702-.053 3.566-.274.896-.229 1.279-.557 1.362-.867.083-.31-.085-.786-.746-1.433-.637-.623-1.641-1.311-2.951-2.02zM6.586 9.028a37.37 37.37 0 0 1 4.074.364 8.732 8.732 0 0 0-.604.628 35.497 35.497 0 0 0-3.49-.29c-1.488-.042-2.702.053-3.566.274-.896.229-1.279.557-1.362.867-.083.31.085.786.746 1.433.637.623 1.641 1.312 2.951 2.02l.065.034a.5.5 0 0 0-.221.236c-.055.13-.04.286.036.462A26.455 26.455 0 0 1 5 14.942c-1.335-.722-2.404-1.446-3.109-2.136-.68-.665-1.125-1.401-.933-2.117.192-.715.944-1.13 1.867-1.366.955-.245 2.242-.338 3.76-.295z" clip-rule="evenodd"/><ellipse cx="4.72" cy="14.38" fill="currentColor" rx="2.406" ry=".369" transform="rotate(29.282 4.72 14.38)"/>';
function NeynarIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "-1 6 35 18",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: NeynarIconMarkup },
      ...props
    }
  );
}
var OkxIconMarkup = '<path fill="currentColor" d="M7.15 8.685c.03.02.05.06.05.1v6.44c0 .04-.02.08-.05.1a.17.17 0 0 1-.11.05H.16a.17.17 0 0 1-.11-.05a.14.14 0 0 1-.05-.1v-6.44c0-.04.02-.08.05-.1a.17.17 0 0 1 .11-.05h6.88c.04 0 .08.02.11.05m-2.35 2.35a.14.14 0 0 0-.05-.1a.16.16 0 0 0-.11-.05H2.56a.17.17 0 0 0-.11.04a.14.14 0 0 0-.05.1v1.95c0 .04.02.08.05.1c.03.04.07.05.11.05h2.08c.04 0 .08-.01.11-.04a.14.14 0 0 0 .05-.1zm16.8 0v1.94c0 .09-.07.15-.16.15h-2.08c-.09 0-.16-.06-.16-.15v-1.94c0-.08.07-.15.16-.15h2.08c.09 0 .16.06.16.15m-2.4-2.25v1.95c0 .08-.07.15-.16.15h-2.08c-.09 0-.16-.07-.16-.15v-1.95c0-.08.07-.15.16-.15h2.08c.09 0 .16.07.16.15m4.8 0v1.95c0 .08-.07.15-.16.15h-2.08c-.09 0-.16-.07-.16-.15v-1.95c0-.08.07-.15.16-.15h2.08c.09 0 .16.07.16.15m-4.8 4.5v1.94c0 .08-.07.15-.16.15h-2.08c-.09 0-.16-.07-.16-.15v-1.95c0-.08.07-.15.16-.15h2.08c.09 0 .16.07.16.15zm4.8 0v1.94c0 .08-.07.15-.16.15h-2.08c-.09 0-.16-.07-.16-.15v-1.95c0-.08.07-.15.16-.15h2.08c.09 0 .16.07.16.15zm-8.4-4.5v1.95c0 .08-.07.15-.16.15h-2.08c-.09 0-.16-.07-.16-.15v-1.95c0-.08.07-.15.16-.15h2.08c.09 0 .16.07.16.15m0 4.5v1.94c0 .08-.07.15-.16.15h-2.08c-.09 0-.16-.07-.16-.15v-1.95c0-.08.07-.15.16-.15h2.08c.09 0 .16.07.16.15zm-2.4-.3a.16.16 0 0 1-.16.15H10.8v2.08c0 .04-.02.08-.05.11a.17.17 0 0 1-.11.04H8.56a.17.17 0 0 1-.12-.04a.14.14 0 0 1-.04-.1v-6.45c0-.04.01-.08.04-.1a.17.17 0 0 1 .12-.05h2.08c.04 0 .08.02.11.05c.03.02.05.06.05.1v2.1h2.24c.04 0 .08.01.11.04s.05.07.05.1z"/>';
function OkxIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: OkxIconMarkup },
      ...props
    }
  );
}
var OneInchIconMarkup = '<path fill="currentColor" fill-rule="evenodd" d="M17.228 6.116c-.53-.344-.907-.493-.907-.493a21 21 0 0 0 1.443.113a9 9 0 0 0-.697-.499c-1.397-.902-2.708-1.184-3.8-1.184a6.4 6.4 0 0 0-2.29.422a4.7 4.7 0 0 0-.722.341l-.002.001l.552-.877l.041-.43a.43.43 0 0 1 .39.42a6.9 6.9 0 0 1 2.03-.308c1.367 0 3.031.413 4.765 1.776a.43.43 0 0 1-.059.716c.312.239.647.532.977.884c1.194 1.277 2.299 3.323 2.002 6.376a.43.43 0 0 1-.535.376c-.096 1.305-.665 3.462-3.114 5.302a.43.43 0 0 1-.643-.148l-.075.07c-.696.63-1.756 1.319-3.188 1.518a.4.4 0 0 1-.06.004h-.013a.43.43 0 0 1-.425-.359a6.4 6.4 0 0 1-1.244.118c-.8 0-1.768-.136-2.901-.533a.431.431 0 0 1 .243-.826c.32.077.64.115.974.115c2.17 0 3.87-1.619 3.87-3.557c0-.956-.406-1.832-1.088-2.479l-.006.007c-.156.202-.344.445-.476.62c-.216.302-.291.469-.274.62a1.75 1.75 0 0 1-.358 1.33l-.01.013a6 6 0 0 1-.534.497a12 12 0 0 0-.508.46l-.01.01c-.334.312-.77.357-1.03.357a2 2 0 0 1-.18-.01H9.36l-.07-.004h-.058l-.046.033a3 3 0 0 0-.127.108a.7.7 0 0 1-.318.164a1.3 1.3 0 0 1-.3.034c-.25 0-.54-.056-.777-.115a7 7 0 0 1-.61-.183a.8.8 0 0 1-.28-.198a1.5 1.5 0 0 1-.175-.232a3.5 3.5 0 0 1-.26-.527c-.14-.347-.257-.746-.278-.941a.9.9 0 0 1 .042-.33a2 2 0 0 1 .104-.268c.077-.172.178-.364.265-.529l.004-.007q.094-.177.158-.305q.031-.064.047-.103l.011-.03c.024-.111.098-.659.173-1.249c.074-.58.145-1.16.159-1.277a.6.6 0 0 0 0-.194a.9.9 0 0 0-.124-.268l-.003-.004v-.001c-.19-.32-.199-.635-.12-1.02a164 164 0 0 1-3.559-2.6l-.003-.002a.58.58 0 0 1-.208-.337a.48.48 0 0 1 .067-.343v-.002c.001 0 .002-.001.36.238c0 0-.028.042.057.113l.037.029l.009.007l.204.153l.47.349c.962.711 2.595 1.905 3.057 2.206c-.142.51-.142.75 0 .99c.198.326.212.495.184.736c-.029.24-.283 2.32-.34 2.574c-.023.103-.133.312-.255.542c-.18.34-.384.726-.367.887c.028.269.396 1.414.721 1.542c.24.084.835.268 1.23.268c.142 0 .27-.028.326-.085c.24-.212.311-.254.481-.254h.042q.049 0 .107.006q.067.007.148.008c.226 0 .524-.042.736-.24c.146-.147.343-.319.528-.48c.208-.181.4-.35.49-.454c.212-.269.325-.636.269-1.004c-.043-.34.141-.637.353-.934c.27-.353.764-.99.764-.99a5 5 0 0 1 .331.277c.78.725 1.253 1.723 1.253 2.82c0 1.91-1.441 3.503-3.37 3.896a4.6 4.6 0 0 1-2.005-.034q.57.198 1.075.312q.504.113.947.158q.392.04.737.04c.61 0 1.111-.085 1.497-.19c.625-.169.95-.39.95-.39s-.084.107-.235.274a8 8 0 0 1-.496.503l-.033.03l-.002.001l-.012.012h.014q.402-.058.764-.164c1.228-.36 2.093-1.097 2.606-1.657c.376-.41.562-.725.562-.725s-.033.234-.085.524c-.023.129-.05.268-.08.403a6 6 0 0 1-.061.261q.286-.216.537-.436c2.072-1.815 2.407-3.834 2.422-4.894v-.144a4 4 0 0 0-.043-.58l-.002-.007v-.007l.004.007l.006.006c.024.033.084.107.159.198l.14.169l.167.203l.09.11q.026-.283.038-.554v-.002l.003-.073c.127-3.777-2.053-5.755-3.336-6.587m-9.653-.782l.031.105c.063.205.138.43.214.623a4 4 0 0 1 .25-.585c.606-1.13 1.605-1.438 2.213-1.517c.313-.04.522-.02.522-.02l.041-.43h-.014a1 1 0 0 0-.115-.006q-.113-.003-.302.01a3.5 3.5 0 0 0-.96.207a3.2 3.2 0 0 0-1.55 1.2l-.041-.153l-.006-.022l-.001-.006a.43.43 0 0 0-.703-.218l.285.324l-.285-.324l-.001.001l-.002.002l-.005.005l-.063.06q-.059.058-.148.165a3 3 0 0 0-.391.616a2.95 2.95 0 0 0-.28 1.484a268 268 0 0 0-2.457-.87l-.079-.026h-.002a.4.4 0 0 0-.102-.026a.6.6 0 0 0-.34.043a.5.5 0 0 0-.204.168l-.001.002l-.001.002l.358.24s.028-.042.127-.028q.007 0 .036.01l.002.001l.258.088l.557.195a258 258 0 0 1 2.414.866a3 3 0 0 1-.116-.502a2.53 2.53 0 0 1 .389-1.763c.173-.267.336-.409.336-.409s.054.214.136.49" clip-rule="evenodd"/><path fill="currentColor" fill-rule="evenodd" d="M8.952 7.023S8.697 5.198 9.97 4.434l-.025.01c-.26.098-2.154.81-.993 2.579m2.744-1.67c.976-.367 2.334-.565 4.441-.17a6.64 6.64 0 0 0-2.885-.72q-.552 0-1.019.084c-1.103.198-2.008.99-2.32 2.051c0 0 .227-.353.765-.721l.022-.03c.199-.27.498-.676.784-1.017c.085.184.184.41.212.523m4.894 2.348c1.994 1.316 2.9 2.773 3.536 4.484c-.028-1.81-.636-3.366-1.81-4.61l-.029-.03c-1.032-1.088-2.546-1.597-4.045-1.385a9 9 0 0 0-1.57.325c-.07.014-.142.028-.212.057h.028c.113-.015 2.178-.114 4.102 1.16m1.839 8.997c-.212.282-.453.58-.736.862c1.825-3.507.085-6.718.014-6.846c.128.128.255.269.368.396c1.4 1.556 1.57 3.89.354 5.588M7.265 5.82c-.054.205-.53 2.025 1.079 2.08c-.962-.58-1.075-2.08-1.075-2.094l-.001.003l-.001.004zm2.805 3.79l-.735 1.259s.679-.311.947-.707c.213-.34-.212-.552-.212-.552m-.49 5.833a6 6 0 0 1 .264-.232c.145-.12.29-.2.417-.272c.232-.13.403-.226.403-.463c.01-.482-.314-.576-.554-.579l.011-.002c-.131.029-.235.072-.235.072s.41-.071.566.226s.028.467-.226.636c-.127.085-.402.353-.647.614m1.339-4.362c-.065.056-.284.615-.486 1.164c-.24.128-1.096.584-1.169.632c-.085.057-.382.651-.608 1.274a1.55 1.55 0 0 0-.419-.646L8.23 13.5l.013.056c.06.25.288 1.225.2 1.542c-.1.368-.722.693-.722.693l.936.208c-.185.165-.318.216-.427.216a5 5 0 0 1-.72-.183c-.142-.184-.355-.792-.411-1.047c.03-.102.127-.284.21-.442c.033-.06.063-.119.087-.166l.024-.045c.155-.298.246-.473.273-.634c.057-.24.24-1.726.311-2.348c.184.24.439.636.382.89c.41-.579.113-1.145-.028-1.371c-.128-.226-.297-.68-.156-1.16c.142-.48.65-1.81.65-1.81s.17.297.411.24s2.178-2.97 2.178-2.97s.524 1.145-.028 1.98c-.566.834-1.117.99-1.117.99s.055.01.15.015c.275.062.857.152 1.507-.022c.232.559.424 1.057.436 1.139l-.061.145c-.158.376-.557 1.326-.604 1.396c-.028.029-.226.085-.367.114c-.241.07-.382.113-.439.155m.382-5.064s.127.566-.198.948c-.41.467-.764.453-.75.453zm-3.268 8.035l-.113.565s.227-.028.227.227c0 .198-.227.466-.41.48c-.184.015-.255-.212-.213-.34c.043-.112.51-.932.51-.932m2.165-4.725c.495.1.636.679.367.99c-.268.297-.947.722-1.343.82c-.085.326-.807.184-.538-.848c0 0 .127.495.255.453c.127-.043 1.57-2.306 1.57-2.306s-.184.594-.311.891m-.502 5.266c-.008.137-.02.36-.12.505l.08-.084c.073-.078.18-.19.245-.255q.068-.058.14-.101c.105-.067.199-.126.199-.253c0-.198-.269-.24-.382-.212s-.141.212-.155.311q-.005.033-.007.089m6.57.548c-.312 1.117-1.019 2.107-1.938 2.814q.173-.082.34-.177a5.4 5.4 0 0 0 1.697-2.623c.01-.033.09-.083.163-.13l.076-.048l.009-.005l.015-.009l.012-.007c.123-.073.237-.14.262-.24c.057-.325.085-.665.085-1.004c0-.127-.127-.255-.255-.382c-.099-.085-.198-.184-.198-.255a5.4 5.4 0 0 0-1.262-2.93l.018.101a5.53 5.53 0 0 1 1.16 2.815c0 .053.063.122.124.189l.06.066c.127.127.254.255.254.382c0 .34-.028.679-.085 1.004c-.028.113-.17.198-.311.269l-.062.04c-.074.047-.153.097-.164.13m-2.42-7.13c.172.072 3.113 1.543 3.622 4.428a4.6 4.6 0 0 1-.053 1.836a5.797 5.797 0 0 0-3.986-7.107a2.94 2.94 0 0 1-1.03.804c.24.6.528 1.332.528 1.383c0 .085-.268.778-.296.807a3 3 0 0 1-.482.042c-.14.34-.282.665-.31.707c-.043.057-.17.1-.44.17l-.092.027c-.127.037-.266.078-.289.1c-.07.085-.453 1.09-.707 1.797q.057-.01.114-.015l.65-1.598s.664-.325 1.16-.325c.89-.014 2.206-1.103 1.612-3.055m-5.897.779c.099-.184.014-.312-.071-.382l-.028-.029c-.17-.084-1.231-.48-2.278-.848c.92.608 1.938 1.202 2.108 1.287c.127.056.212.07.269-.028" clip-rule="evenodd"/><path fill="currentColor" d="M10.904 14.93a5 5 0 0 1-.341.325l-.126.114l-.18.161c-.112.1-.222.2-.315.291q-.084.085-.34.085H9.18c.085-.113.236-.286.4-.46c.09-.085.181-.165.264-.233c.145-.12.29-.201.417-.272c.232-.13.404-.226.404-.464c.009-.481-.315-.575-.555-.578a1 1 0 0 1 .23-.03c-.27-.07-.609 0-.764.156c-.114.104-.139.383-.164.663a4 4 0 0 1-.049.398c-.063.33-.262.51-.567.79h-.002l-.136.125l-.935-.208s.622-.325.721-.693c.089-.317-.14-1.292-.2-1.543l-.012-.055l.005.005c.043.039.3.274.42.645c.226-.622.523-1.216.607-1.273c.073-.048.93-.504 1.169-.632c-.105.285-.205.566-.277.774c-.255.07-.51.212-.694.495c.1-.071.41-.113.637-.142c.198-.014.806.311.962.92v.028a.9.9 0 0 1-.156.608"/><path fill="currentColor" d="M10.424 12.993c.29-.027.53.032.593.057c.552-1.047.99-1.613 1.104-1.613q.019-.001.075.001c.314.01 1.437.05 1.905-1.076c.501-1.226-.205-2.273-.253-2.345l-.002-.003c.594 1.952-.721 3.041-1.612 3.056c-.495 0-1.16.325-1.16.325z"/><path fill="currentColor" d="m13.846 8.014l.002.001c.061.03 1.118.543 1.423 2.134a5.4 5.4 0 0 1 1.263 2.93c0 .07.099.169.198.254c.127.127.254.254.254.382a6 6 0 0 1-.085 1.004c-.025.1-.138.167-.262.24l-.012.007l-.015.009l-.022.013l-.062.04c-.075.047-.153.096-.164.13a5.4 5.4 0 0 1-1.697 2.623a5.8 5.8 0 0 0 2.747-3.503c.138-.59.161-1.207.053-1.836c-.51-2.886-3.451-4.357-3.62-4.428m-3.4.142c.262.014.82-.013 1.349-.396l.158.374a3.2 3.2 0 0 1-1.507.022m1.951-.183a2.94 2.94 0 0 0 1.031-.803a6 6 0 0 0-.969-.189a3.4 3.4 0 0 1-.297.41z"/><path fill="currentColor" d="M15.219 12.399a6.7 6.7 0 0 0 .113-1.853c.551.735.89 1.626.99 2.546c.014.113.127.226.24.34c.1.084.213.197.213.268q0 .487-.085.976c-.014.04-.129.106-.225.16l-.016.01c-.141.07-.269.141-.297.254a5.27 5.27 0 0 1-1.867 2.73c1.316-1.372 1.952-3.635.934-5.431"/>';
function OneInchIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: OneInchIconMarkup },
      ...props
    }
  );
}
var ParaIconMarkup = '<path d="M16.7506 0.114342H7.01716V13.267C7.01716 14.2305 6.24304 15.0128 5.28576 15.0128H0V23.8289H8.74337V18.4992C8.74337 17.5357 9.51749 16.7534 10.4748 16.7534H16.8854C21.4904 16.7534 25.2124 12.9517 25.1363 8.29101C25.0603 3.63032 21.2761 0.114342 16.7506 0.114342Z" fill="currentColor"/>';
function ParaIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "-1 -1 27 26",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: ParaIconMarkup },
      ...props
    }
  );
}
function PelagosIcon(props) {
  return /* @__PURE__ */ jsxs9(
    "svg",
    {
      viewBox: "0 0 162 170",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ jsx13(
          "path",
          {
            d: "M43.4 57.5C58.6 57.5 70.9 69.8 70.9 85V85.6C70.9 85.8 70.9 86 70.9 86.3C71.5 112.8 91.3 135 116.7 139.3C106.2 146.2 93.8 150 80.9 150C63.6 150 47.3 143.3 35.1 131.1C22.8 118.9 16 102.7 15.9 85.4V84.7C16.1 69.6 28.4 57.5 43.4 57.5ZM43.4 47.5C22.9 47.5 6.2 64 5.9 84.5V85.5C6.2 126.7 39.6 160 80.9 160C106.9 160 129.9 146.7 143.3 126.6C137.9 128.8 132.1 130.1 125.9 130.1C101.3 130.1 81.4 110.4 80.9 86V85C80.9 64.3 64.1 47.5 43.4 47.5Z",
            fill: "currentColor"
          }
        ),
        /* @__PURE__ */ jsx13(
          "path",
          {
            d: "M155.9 84.5C155.8 69.3 151.2 55.2 143.3 43.4C129.9 23.3 106.9 10 80.9 10C39.6 10 6.2 43.3 5.9 84.5C6.2 64 22.9 47.5 43.4 47.5C64.1 47.5 80.9 64.3 80.9 85V86C81.4 106.3 98 122.5 118.4 122.5C138.9 122.5 155.6 106 155.9 85.5V84.5Z",
            fill: "currentColor"
          }
        )
      ]
    }
  );
}
function PolymarketIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "-5 -1 53 55",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: /* @__PURE__ */ jsx13("g", { fill: "currentColor", fillRule: "evenodd", children: /* @__PURE__ */ jsx13("path", { d: "M42.76 24.28V0L0 12.04v28.93l42.76 12.04V24.27zm-4.13-1.16V5.42L7.21 14.27zm-3.08 3.39L4.14 17.66v17.69l31.42-8.85zM7.21 38.75l31.42 8.85V29.89L7.21 38.74v.02z" }) })
    }
  );
}
var XIconMarkup = '<path fill="currentColor" d="M14.234 10.162L22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299l-.929-1.329L3.076 1.56h3.182l5.965 8.532l.929 1.329l7.754 11.09h-3.182z"/>';
function XIcon2(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "-3 -3 30 30",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: XIconMarkup },
      ...props
    }
  );
}
var YearnIconMarkup = '<path fill="currentColor" d="M11.325 6.6h1.35v11.25h-1.35z"/><path fill="currentColor" d="M7.633 7.329c0 1.938.827 2.86 2.792 4.224v-1.42c-1.092-.865-1.591-1.549-1.591-2.819c0-1.733 1.417-3.138 3.166-3.138s3.166 1.405 3.166 3.138c0 .568-.155 1.125-.449 1.611l-.468-1.972l-1.208.281l.957 3.934l3.924-1.042l-.321-1.188l-1.75.465a4.3 4.3 0 0 0 .517-2.074C16.368 4.939 14.413 3 12 3S7.633 4.938 7.633 7.329m8.734 9.342c0-1.938-.832-2.875-2.797-4.238v1.42c1.092.865 1.597 1.563 1.597 2.833c0 1.733-1.418 3.138-3.166 3.138c-1.75 0-3.167-1.405-3.167-3.138c0-.59.164-1.14.449-1.611l.468 1.972l1.207-.282l-.955-3.933l-3.924 1.042l.32 1.188l1.751-.465a4.3 4.3 0 0 0-.518 2.074C7.632 19.061 9.588 21 12 21s4.367-1.938 4.367-4.329"/>';
function YearnIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: YearnIconMarkup },
      ...props
    }
  );
}
var ZeroxIconMarkup = '<path fill="currentColor" d="m10.934 20.927l.664.073h.835l.107-.025l.167-.014q.335-.022.667-.076c2.195-.343 3.996-1.366 5.47-3.027c.05-.066.058-.106 0-.18l-1.883-2.503l-.073-.082l-.083.13a5.85 5.85 0 0 1-2.235 1.956c-.082.049-.13.049-.213-.033l-.9-.883l-.55-.532l-5.412 4.042l.028.023q.016.018.03.017a8.9 8.9 0 0 0 3.381 1.114m1.917-17.878L12.39 3h-.777l-.04.01c-.024.007-.05.015-.083.015q-.177.02-.358.035c-.236.022-.473.044-.706.087a8.93 8.93 0 0 0-4.734 2.455c-.159.153-.309.316-.464.485l-.133.145l2.022 2.683l.082-.122a5.85 5.85 0 0 1 2.269-1.98c.073-.04.123-.033.188.024q.427.434.867.857l.288.28l.212.197l5.503-3.936c-.025-.024-.041-.04-.057-.04a8.9 8.9 0 0 0-3.62-1.146m-4.562 9.835l-4.094-5.36c-1.09 1.98-1.458 4.059-1.007 6.26a8.94 8.94 0 0 0 3.046 5.121l2.67-2.004l-.025-.04l-.082-.058a5.83 5.83 0 0 1-1.981-2.267c-.042-.073-.033-.114.024-.171l.614-.63zm8.263-2.561l-.754.777v.008l4.029 5.318A8.986 8.986 0 0 0 17.78 5.095l-2.686 2.012l.107.082a5.84 5.84 0 0 1 2.006 2.291c.04.073.04.131-.025.188z"/>';
function ZeroxIcon(props) {
  return /* @__PURE__ */ jsx13(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: ZeroxIconMarkup },
      ...props
    }
  );
}
function ZoraIcon(props) {
  return /* @__PURE__ */ jsxs9(
    "svg",
    {
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ jsx13(
          "path",
          {
            fill: "url(#zora-icon-mono-gradient)",
            d: "M12 21a9 9 0 1 1 0-18a9 9 0 0 1 0 18"
          }
        ),
        /* @__PURE__ */ jsx13("defs", { children: /* @__PURE__ */ jsxs9(
          "radialGradient",
          {
            id: "zora-icon-mono-gradient",
            cx: "0",
            cy: "0",
            r: "1",
            gradientTransform: "translate(16.086 7.84)scale(-15.2029)",
            gradientUnits: "userSpaceOnUse",
            children: [
              /* @__PURE__ */ jsx13("stop", { offset: ".007", stopColor: "currentColor", stopOpacity: ".12" }),
              /* @__PURE__ */ jsx13("stop", { offset: ".191", stopColor: "currentColor", stopOpacity: ".28" }),
              /* @__PURE__ */ jsx13("stop", { offset: ".498", stopColor: "currentColor", stopOpacity: ".6" }),
              /* @__PURE__ */ jsx13("stop", { offset: ".667", stopColor: "currentColor", stopOpacity: ".82" }),
              /* @__PURE__ */ jsx13("stop", { offset: ".823", stopColor: "currentColor" }),
              /* @__PURE__ */ jsx13("stop", { offset: "1", stopColor: "currentColor", stopOpacity: ".42" })
            ]
          }
        ) })
      ]
    }
  );
}

// src/components/icons/vendors/index.tsx
import { jsx as jsx14 } from "react/jsx-runtime";
var AnthropicIconMarkup = '<path d="M26.9568 9.88184H22.1265L30.7753 31.7848H35.4917L26.9568 9.88184ZM13.028 9.88184L4.4917 31.7848H9.32203L11.2305 27.1793H20.2166L22.0126 31.6724H26.8444L18.0832 9.88184H13.028ZM12.5783 23.1361L15.4987 15.3853L18.5315 23.1361H12.5783Z" fill="currentColor"/>';
function AnthropicIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 40 40",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: AnthropicIconMarkup },
      ...props
    }
  );
}
var CohereIconMarkup = '<path d="M9.14882 13.5552C9.58082 13.5552 10.4448 13.5336 11.6544 13.0368C13.0584 12.4536 15.8232 11.4168 17.832 10.3368C19.236 9.5808 19.8408 8.5872 19.8408 7.248C19.8408 5.412 18.3504 3.9 16.4928 3.9H8.71682C6.06002 3.9 3.90002 6.06 3.90002 8.7168C3.90002 11.3736 5.93042 13.5552 9.14882 13.5552Z" fill="currentColor"/>\n<path d="M10.4664 16.86C10.4664 15.564 11.244 14.376 12.4536 13.8792L14.8944 12.864C17.3784 11.8488 20.1 13.6632 20.1 16.3416C20.1 18.4152 18.4152 20.1 16.3416 20.1H13.6848C11.9136 20.1 10.4664 18.6528 10.4664 16.86Z" fill="currentColor"/>\n<path d="M6.68642 14.1816C5.15282 14.1816 3.90002 15.4344 3.90002 16.968V17.3352C3.90002 18.8472 5.15282 20.1 6.68642 20.1C8.22003 20.1 9.47283 18.8472 9.47283 17.3136V16.9464C9.45123 15.4344 8.22003 14.1816 6.68642 14.1816Z" fill="currentColor"/>';
function CohereIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: CohereIconMarkup },
      ...props
    }
  );
}
var DeepSeekIconMarkup = '<path d="M35.6638 9.91965C35.3251 9.75432 35.1785 10.0703 34.9811 10.2316C34.9131 10.2836 34.8558 10.3516 34.7985 10.413C34.3025 10.9423 33.7238 11.289 32.9678 11.2476C31.8625 11.1863 30.9186 11.533 30.0839 12.3783C29.9066 11.3356 29.3173 10.7143 28.4213 10.3143C27.9519 10.1063 27.4773 9.89965 27.148 9.44766C26.9186 9.12633 26.856 8.76767 26.7413 8.41568C26.668 8.20235 26.5946 7.98502 26.3506 7.94902C26.084 7.90769 25.98 8.13035 25.876 8.31702C25.4587 9.07967 25.2973 9.91965 25.3133 10.7703C25.3493 12.6849 26.1573 14.2102 27.764 15.2942C27.9466 15.4182 27.9933 15.5435 27.9359 15.7249C27.8266 16.0982 27.696 16.4609 27.5813 16.8355C27.508 17.0742 27.3986 17.1248 27.1426 17.0222C26.2777 16.6504 25.4919 16.1164 24.828 15.4489C23.6854 14.3449 22.6534 13.1263 21.3654 12.1716C21.067 11.9511 20.7606 11.7416 20.4468 11.5436C19.1335 10.2676 20.6201 9.21967 20.9641 9.09567C21.3241 8.965 21.0881 8.51968 19.9254 8.52501C18.7628 8.53035 17.6988 8.91834 16.3428 9.43699C16.1413 9.51421 15.934 9.57529 15.7229 9.61966C14.4557 9.38091 13.1598 9.33506 11.8789 9.48366C9.36565 9.76365 7.35902 10.953 5.88305 12.9809C4.10975 15.4182 3.69243 18.1888 4.20308 21.0768C4.74041 24.122 6.29504 26.6433 8.683 28.6139C11.1603 30.6579 14.0122 31.6592 17.2668 31.4672C19.2428 31.3539 21.4441 31.0886 23.9254 28.9873C24.552 29.2993 25.208 29.4233 26.2986 29.5166C27.1386 29.5953 27.9466 29.4766 28.5719 29.3459C29.5519 29.1379 29.4839 28.23 29.1306 28.0646C26.2573 26.726 26.888 27.2713 26.3133 26.83C27.7746 25.102 29.9746 23.3074 30.8359 17.4928C30.9026 17.0302 30.8452 16.7395 30.8359 16.3662C30.8306 16.1395 30.8826 16.0502 31.1426 16.0249C31.8639 15.95 32.5637 15.7349 33.2025 15.3915C35.0638 14.3742 35.8158 12.7049 35.9931 10.7023C36.0198 10.3956 35.9878 10.081 35.6638 9.91965ZM19.4414 27.9433C16.6562 25.754 15.3055 25.0327 14.7482 25.0634C14.2256 25.0954 14.3202 25.6913 14.4349 26.0807C14.5549 26.4647 14.7109 26.7286 14.9295 27.066C15.0815 27.2886 15.1855 27.6206 14.7789 27.87C13.8816 28.4246 12.3229 27.6833 12.2496 27.6473C10.435 26.578 8.91632 25.1673 7.84834 23.2381C6.81637 21.3808 6.21638 19.3888 6.11771 17.2622C6.09105 16.7475 6.24171 16.5662 6.7537 16.4729C7.42583 16.3442 8.11451 16.3267 8.79233 16.4209C11.6349 16.8368 14.0536 18.1075 16.0828 20.1194C17.2402 21.2661 18.1161 22.6354 19.0188 23.974C19.9788 25.3953 21.0108 26.75 22.3254 27.8593C22.7894 28.2486 23.1587 28.5446 23.5134 28.7619C22.4441 28.8819 20.6601 28.9086 19.4414 27.9433ZM20.7748 19.3568C20.7745 19.2906 20.7904 19.2253 20.8211 19.1666C20.8517 19.1078 20.8962 19.0575 20.9507 19.0198C21.0052 18.9821 21.068 18.9583 21.1337 18.9503C21.1995 18.9424 21.2662 18.9505 21.3281 18.9741C21.407 19.0024 21.475 19.0546 21.5228 19.1235C21.5706 19.1923 21.5958 19.2743 21.5947 19.3581C21.5949 19.4123 21.5843 19.4659 21.5636 19.5159C21.5428 19.5659 21.5123 19.6113 21.4738 19.6494C21.4354 19.6875 21.3897 19.7176 21.3395 19.7378C21.2893 19.7581 21.2356 19.7682 21.1814 19.7675C21.1277 19.7676 21.0745 19.7571 21.0248 19.7365C20.9752 19.7158 20.9302 19.6855 20.8925 19.6473C20.8548 19.609 20.825 19.5636 20.805 19.5138C20.785 19.4639 20.7739 19.4105 20.7748 19.3568ZM24.9213 21.4848C24.6547 21.5928 24.3893 21.6861 24.1347 21.6981C23.7516 21.7114 23.3756 21.5918 23.0707 21.3594C22.7054 21.0528 22.4441 20.8821 22.3347 20.3488C22.297 20.0881 22.3042 19.823 22.3561 19.5648C22.4494 19.1288 22.3454 18.8488 22.0374 18.5955C21.7881 18.3875 21.4694 18.3302 21.1201 18.3302C21.0005 18.3232 20.8843 18.2875 20.7814 18.2262C20.6348 18.1542 20.5148 17.9728 20.6294 17.7488C20.6668 17.6768 20.8428 17.5008 20.8854 17.4688C21.3601 17.1995 21.9081 17.2875 22.4134 17.4902C22.8827 17.6822 23.2374 18.0342 23.748 18.5328C24.2694 19.1341 24.364 19.3008 24.6613 19.7515C24.896 20.1048 25.1093 20.4674 25.2547 20.8821C25.344 21.1421 25.2293 21.3541 24.9213 21.4848Z" fill="currentColor"/>';
function DeepSeekIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 40 40",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: DeepSeekIconMarkup },
      ...props
    }
  );
}
var GLMIconMarkup = '<rect x="2" y="2" width="26" height="26" rx="5" fill="currentColor"/><path d="M6.2 7.1H17.4L14.95 10.45H6.2V7.1Z" fill="var(--popover)"/><path d="M18.6 7.1H24L11.2 22.9H5.8L18.6 7.1Z" fill="var(--popover)"/><path d="M15.05 19.55H23.8V22.9H12.6L15.05 19.55Z" fill="var(--popover)"/>';
function GLMIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 30 30",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: GLMIconMarkup },
      ...props
    }
  );
}
var GoogleIconMarkup = '<path d="M37 20.034C27.8809 20.5837 20.5808 27.8809 20.0326 37H19.966C19.4163 27.8809 12.1177 20.5837 3 20.034V19.9674C12.1191 19.4163 19.4163 12.1191 19.966 3H20.0326C20.5822 12.1191 27.8809 19.4163 37 19.9674V20.034Z" fill="currentColor"/>';
function GoogleIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 40 40",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: GoogleIconMarkup },
      ...props
    }
  );
}
var KimiIconMarkup = '<path d="M21.7202 0.939941C22.9502 0.939941 23.9502 1.93994 23.9502 3.16994C23.9502 4.39994 22.9502 5.39994 21.7202 5.39994H19.7502C19.6002 5.39994 19.4902 5.27994 19.4902 5.13994V3.16994C19.4902 1.93994 20.4902 0.939941 21.7202 0.939941Z" fill="currentColor" opacity="0.55"/><path d="M9.39 13.9501L17.82 5.59012C17.98 5.43012 17.89 5.12012 17.68 5.12012H13.14C13.14 5.12012 13.04 5.14012 13 5.18012L3.92 14.1901C3.78 14.3301 3.57 14.2101 3.57 13.9801V5.39012C3.57 5.24012 3.47 5.12012 3.35 5.12012H0.219999C0.0999993 5.12012 0 5.24012 0 5.39012V23.9201C0 24.0701 0.0999993 24.1901 0.219999 24.1901H3.35C3.47 24.1901 3.57 24.0701 3.57 23.9201V20.1401C3.57 20.0601 3.6 19.9801 3.65 19.9301L6.47 17.1401C6.54 17.0701 6.63 17.0601 6.71 17.1101L14.24 22.6501C15.47 23.4801 16.85 23.9901 18.25 24.1401C18.37 24.1501 18.48 24.0301 18.48 23.8701V20.3101C18.48 20.1701 18.4 20.0601 18.29 20.0501C17.47 19.9201 16.66 19.6001 15.94 19.1101L9.42 14.3901C9.28 14.3001 9.27 14.0701 9.39 13.9501Z" fill="currentColor"/>';
function KimiIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 24 25",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: KimiIconMarkup },
      ...props
    }
  );
}
var MetaIconMarkup = '<path\n    shape-rendering="geometricPrecision"\n    d="M9.8132 15.9038L9 18.75L8.1868 15.9038C7.75968 14.4089 6.59112 13.2403 5.09619 12.8132L2.25 12L5.09619 11.1868C6.59113 10.7597 7.75968 9.59112 8.1868 8.09619L9 5.25L9.8132 8.09619C10.2403 9.59113 11.4089 10.7597 12.9038 11.1868L15.75 12L12.9038 12.8132C11.4089 13.2403 10.2403 14.4089 9.8132 15.9038Z"\n    stroke="currentColor"\n    stroke-width="1.5"\n    stroke-linecap="round"\n    stroke-linejoin="round"\n  />\n  <path\n    d="M18.2589 8.71454L18 9.75L17.7411 8.71454C17.4388 7.50533 16.4947 6.56117 15.2855 6.25887L14.25 6L15.2855 5.74113C16.4947 5.43883 17.4388 4.49467 17.7411 3.28546L18 2.25L18.2589 3.28546C18.5612 4.49467 19.5053 5.43883 20.7145 5.74113L21.75 6L20.7145 6.25887C19.5053 6.56117 18.5612 7.50533 18.2589 8.71454Z"\n    stroke="currentColor"\n    stroke-width="1.5"\n    stroke-linecap="round"\n    stroke-linejoin="round"\n  />\n  <path\n    d="M16.8942 20.5673L16.5 21.75L16.1058 20.5673C15.8818 19.8954 15.3546 19.3682 14.6827 19.1442L13.5 18.75L14.6827 18.3558C15.3546 18.1318 15.8818 17.6046 16.1058 16.9327L16.5 15.75L16.8942 16.9327C17.1182 17.6046 17.6454 18.1318 18.3173 18.3558L19.5 18.75L18.3173 19.1442C17.6454 19.3682 17.1182 19.8954 16.8942 20.5673Z"\n    stroke="currentColor"\n    stroke-width="1.5"\n    stroke-linecap="round"\n    stroke-linejoin="round"\n  />';
function MetaIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: MetaIconMarkup },
      ...props
    }
  );
}
var MistralIconMarkup = '<path d="M8.92783 8.88101H13.357V13.3088H17.7861V17.738H17.7835H22.2152V13.3088H26.6418V8.88101H31.0722V26.5949H35.5V31.0241H22.2139V26.5962H17.7861V22.1671H13.3557V26.5949L17.7861 26.5962V31.0241H4.5V26.5949H8.92783V8.88101ZM22.2139 26.5962H26.6418V22.1671H22.2152V26.5962H22.2139Z" fill="currentColor"/>';
function MistralIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 40 40",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: MistralIconMarkup },
      ...props
    }
  );
}
var OpenAIIconMarkup = '<path d="M32.8377 17.282C33.2127 16.25 33.3072 15.218 33.2127 14.1875C33.1197 13.1571 32.7447 12.1251 32.2752 11.1876C31.4322 9.78209 30.2127 8.6571 28.8072 8.0001C27.3072 7.34461 25.7127 7.15711 24.1197 7.53211C23.3698 6.78212 22.5253 6.12512 21.5878 5.65713C20.6503 5.18913 19.5253 5.00013 18.4948 5.00013C16.8851 4.99074 15.3125 5.48246 13.9948 6.40712C12.6824 7.34311 11.7449 8.6571 11.2754 10.1571C10.1504 10.4376 9.21289 10.9071 8.27539 11.4696C7.4324 12.1251 6.77541 12.9696 6.21291 13.8126C5.36992 15.2195 5.08792 16.8125 5.27542 18.407C5.46399 19.9968 6.11605 21.496 7.1504 22.718C6.79608 23.7086 6.66795 24.7659 6.77541 25.8124C6.86991 26.8444 7.2449 27.8749 7.7129 28.8124C8.55739 30.2194 9.77538 31.3444 11.1824 31.9999C12.6824 32.6569 14.2753 32.8444 15.8698 32.4694C16.6198 33.2194 17.4628 33.8749 18.4003 34.3444C19.3378 34.8139 20.4628 34.9999 21.4948 34.9999C23.1043 35.0097 24.6769 34.5185 25.9947 33.5944C27.3072 32.6569 28.2447 31.3444 28.7127 29.8444C29.7719 29.6432 30.7682 29.1934 31.6197 28.5319C32.4627 27.8749 33.2127 27.1249 33.6822 26.1874C34.5251 24.7819 34.8071 23.1875 34.6196 21.5945C34.4322 20 33.8697 18.5015 32.8377 17.282ZM21.5878 33.0304C20.0878 33.0304 18.9628 32.5609 17.9323 31.7179C17.9323 31.7179 18.0253 31.6234 18.1198 31.6234L24.1197 28.1554C24.2862 28.0803 24.4196 27.9469 24.4947 27.7804C24.5698 27.636 24.6021 27.4731 24.5877 27.3109V18.875L27.1197 20.375V27.3124C27.1455 28.0547 27.0215 28.7945 26.755 29.4878C26.4885 30.181 26.085 30.8134 25.5687 31.3473C25.0523 31.8811 24.4337 32.3054 23.7497 32.5949C23.0658 32.8843 22.3305 33.0314 21.5878 33.0304ZM9.49488 27.8749C8.83789 26.7499 8.55739 25.4374 8.83789 24.125C8.83789 24.125 8.93239 24.2195 9.02539 24.2195L15.0253 27.6874C15.1693 27.7638 15.3325 27.7966 15.4948 27.7819C15.6823 27.7819 15.8698 27.7819 15.9628 27.6874L23.2753 23.4695V26.3749L17.1823 29.9374C16.5506 30.3042 15.8527 30.5427 15.1287 30.6393C14.4046 30.7358 13.6686 30.6884 12.9629 30.4999C11.4629 30.1249 10.2449 29.1874 9.49488 27.8749ZM7.9004 14.8445C8.56239 13.7234 9.58826 12.8627 10.8074 12.4056V19.532C10.8074 19.718 10.8074 19.907 10.9004 20C10.9755 20.1665 11.1089 20.2998 11.2754 20.375L18.5878 24.5944L16.0573 26.0944L10.0574 22.625C9.41842 22.2639 8.85742 21.7797 8.40684 21.2004C7.95627 20.6211 7.62506 19.9582 7.4324 19.25C7.05741 17.8445 7.1504 16.157 7.9004 14.8445ZM28.6197 19.625L21.3073 15.407L23.8377 13.9071L29.8377 17.375C30.7752 17.9375 31.5252 18.6875 31.9947 19.625C32.4642 20.5625 32.7447 21.5945 32.6502 22.7195C32.5603 23.7755 32.1699 24.7837 31.5252 25.6249C30.8697 26.4694 30.0252 27.1249 28.9947 27.4999V20.375C28.9947 20.1875 28.9947 20 28.9002 19.907C28.9002 19.907 28.8072 19.718 28.6197 19.625ZM31.1502 15.875C31.1502 15.875 31.0572 15.782 30.9627 15.782L24.9627 12.3126C24.7752 12.2196 24.6822 12.2196 24.4947 12.2196C24.3072 12.2196 24.1197 12.2196 24.0252 12.3126L16.7128 16.532V13.6251L22.8073 10.0626C23.7448 9.50009 24.7752 9.31259 25.9002 9.31259C26.9322 9.31259 27.9627 9.68759 28.9002 10.3446C29.7447 11.0001 30.4947 11.8446 30.8697 12.7821C31.2447 13.7196 31.3377 14.8445 31.1502 15.875ZM15.4003 21.125L12.8699 19.625V12.5946C12.8699 11.5626 13.1503 10.4376 13.7128 9.59459C14.2753 8.6571 15.1198 8.0001 16.0573 7.53211C17.0127 7.05249 18.0956 6.88812 19.1503 7.06261C20.1823 7.15711 21.2128 7.62511 22.0573 8.2821C22.0573 8.2821 21.9628 8.3751 21.8698 8.3751L15.8698 11.8446C15.7033 11.9197 15.57 12.0531 15.4948 12.2196C15.4003 12.4071 15.4003 12.5001 15.4003 12.6876V21.125ZM16.7128 18.125L19.9948 16.25L23.2753 18.125V21.875L19.9948 23.75L16.7128 21.875V18.125Z" fill="currentColor"/>';
function OpenAIIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 40 40",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: OpenAIIconMarkup },
      ...props
    }
  );
}
var XAIIconMarkup = '<path d="M12.4579 15.6036L26.1529 35H20.0656L6.37059 15.6036H12.4579ZM12.4524 26.3764L15.4974 30.6909L12.4551 35H6.36377L12.4524 26.3764ZM33.6365 7.15727V35H28.647V14.2236L33.6365 7.15727ZM33.6365 5L20.0656 24.2205L17.0206 19.9073L27.5451 5H33.6365Z" fill="currentColor"/>';
function XAIIcon(props) {
  return /* @__PURE__ */ jsx14(
    "svg",
    {
      viewBox: "0 0 40 40",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: XAIIconMarkup },
      ...props
    }
  );
}

// src/components/icons/wallets/index.tsx
import { jsx as jsx15, jsxs as jsxs10 } from "react/jsx-runtime";
function BaseWalletIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: /* @__PURE__ */ jsx15(
        "path",
        {
          d: "M0.8 2.7c0-.7 0-1.05.136-1.318.13-.255.337-.461.592-.591C1.795.654 2.145.654 2.846.654h18.308c.701 0 1.051 0 1.318.137.255.13.462.336.592.591.136.268.136.618.136 1.319v18.598c0 .701 0 1.051-.136 1.319-.13.255-.337.461-.592.591-.267.137-.617.137-1.318.137H2.846c-.701 0-1.051 0-1.318-.137a1.3 1.3 0 0 1-.592-.591C.8 22.35.8 22 .8 21.299z",
          fill: "currentColor"
        }
      )
    }
  );
}
var MetaMaskIconMarkup = '<path d="M132.682 132.192l-30.583-9.106-23.063 13.787-16.092-.007-23.077-13.78-30.569 9.106L0 100.801l9.299-34.839L0 36.507 9.299 0l47.766 28.538h27.85L132.682 0l9.299 36.507-9.299 29.455 9.299 34.839-9.299 31.391z" fill="currentColor" opacity=".2"/><path d="M9.305 0l47.767 28.558-1.899 19.599L9.305 0zm30.57 100.814 21.017 16.01-21.017 6.261v-22.271zm19.337-26.469-4.039-26.174L29.317 65.97l-.014-.007v.013l.08 18.321 10.485-9.951h19.344zm73.47-74.345L84.915 28.558l1.893 19.599L132.682 0zm-30.569 100.814-21.018 16.01 21.018 6.261v-22.271zm10.565-34.839h.007-.007v-.013l-.006.007-25.857-17.798-4.039 26.174h19.336l10.492 9.95.074-18.32z" fill="currentColor" opacity=".56"/><path d="M39.868 123.085 9.299 132.191 0 100.814h39.868v22.271zm19.337-48.747 5.839 37.84-8.093-21.04-27.581-6.843 10.491-9.956h19.344zm42.907 48.747 30.57 9.106 9.299-31.378h-39.869v22.272zm-19.336-48.747-5.839 37.84 8.092-21.04 27.583-6.843-10.498-9.956H82.776z" fill="currentColor" opacity=".42"/><path d="M0 100.801l9.299-34.839h19.997l.073 18.327 27.584 6.843 8.092 21.039-4.16 4.633-21.017-16.01H0zm141.981 0-9.299-34.839h-19.998l-.073 18.327-27.582 6.843-8.093 21.039 4.159 4.633 21.018-16.01h39.868zM84.915 28.538h-27.85l-1.891 19.599 9.872 64.013h11.891l9.878-64.013z" fill="currentColor" opacity=".3"/><path d="M9.299 0 0 36.507l9.299 29.455h19.997l25.87-17.804L9.299 0zm44.127 81.938h-9.059l-4.932 4.835 17.524 4.344-3.533-9.186v.007zM132.682 0l9.299 36.507-9.299 29.455h-19.998L86.815 48.158 132.682 0zM88.568 81.938h9.072l4.932 4.841-17.544 4.353 3.54-9.201v.007zm-9.539 42.447 2.067-7.567-4.16-4.633h-11.9l-4.159 4.633 2.066 7.567" fill="currentColor" opacity=".9"/><path d="M79.029 124.384v12.495H62.945v-12.495h16.084z" fill="currentColor" opacity=".5"/><path d="M39.875 123.072l23.083 13.8v-12.495l-2.067-7.566-21.016 6.261zm62.238 0-23.084 13.8v-12.495l2.067-7.566 21.017 6.261z" fill="currentColor" opacity=".72"/>';
function MetaMaskIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "0 0 142 136.878",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: MetaMaskIconMarkup },
      ...props
    }
  );
}
var RabbyIconMarkup = '<path d="M148.047 88.617c5.401-12.11-21.298-45.944-46.804-60.04-16.077-10.919-32.83-9.419-36.223-4.625-7.446 10.523 24.657 19.439 46.126 29.843-4.615 2.012-8.964 5.623-11.522 10.24-8.004-8.771-25.571-16.324-46.185-10.24-13.891 4.1-25.435 13.766-29.897 28.366a8.69 8.69 0 0 0-3.548-.753c-4.829 0-8.744 3.93-8.744 8.777s3.915 8.778 8.744 8.778c.895 0 3.694-.603 3.694-.603l44.725.325c-17.886 28.483-32.022 32.646-32.022 37.581s13.525 3.597 18.604 1.758c24.311-8.805 50.422-36.247 54.902-44.146 18.816 2.356 34.629 2.635 38.15-5.261z" fill="currentColor"/><path d="M64.484 29.359c1.511-3.021 11.72-3.358 25.584 3.197 10.176 4.811 21.013 15.552 21.641 18.215.273 1.158.433 2.634-.562 3.027l-.004-.002.003-.001c-17.702-8.579-42.632-16.146-46.662-24.436z" fill="currentColor" opacity=".45"/><path d="M58.669 71.877c14.846 0 21.235 4.823 26.325 13.882 3.626 6.455 2.821 16.666-1.019 23.563 3.6.895 6.767 1.883 9.57 2.959-4.547 4.25-9.751 8.663-15.286 12.71-7.536-1.93-14.384-3.763-24.767-6.434 4.438-4.861 9.509-11.252 14.922-19.872l-40.145-.292a48.64 48.64 0 0 1-.14-5.333c.391-18.421 22.375-21.183 30.54-21.183z" fill="currentColor" opacity=".3"/><path d="M23.006 96.5c1.64 13.994 9.563 19.478 25.753 21.101 16.19 1.623 25.477.535 37.841 1.664 10.327.943 19.547 6.225 22.967 4.399 3.079-1.642 1.356-7.577-2.763-11.385-5.339-4.936-12.729-8.368-25.731-9.585 2.591-7.122 1.865-17.108-2.16-22.541-5.819-7.855-16.56-11.406-30.154-9.855C34.557 71.919 20.948 78.938 23.006 96.5z" fill="currentColor" opacity=".62"/>';
function RabbyIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "0 0 161 160",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: RabbyIconMarkup },
      ...props
    }
  );
}
var RainbowIconMarkup = '<path d="M0 18h6c30.928 0 56 25.072 56 56v6h12a6 6 0 0 0 6-6C80 33.131 46.869 0 6 0a6 6 0 0 0-6 6v12z" fill="currentColor"/><path d="M64 74h16a6 6 0 0 1-6 6H64v-6z" fill="currentColor" opacity=".82"/><path d="M6 0v16H0V6a6 6 0 0 1 6-6z" fill="currentColor" opacity=".82"/><path d="M0 16h6c32.033 0 58 25.968 58 58v6H46v-6c0-22.091-17.909-40-40-40H0V16z" fill="currentColor" opacity=".64"/><path d="M48 74h16v6H48v-6z" fill="currentColor" opacity=".52"/><path d="M0 32V16h6v16H0z" fill="currentColor" opacity=".52"/><path d="M0 42a6 6 0 0 0 6 6c14.359 0 26 11.641 26 26a6 6 0 0 0 6 6h10v-6C48 50.804 29.196 32 6 32H0v10z" fill="currentColor" opacity=".38"/><path d="M32 74h16v6H38a6 6 0 0 1-6-6z" fill="currentColor" opacity=".34"/><path d="M6 48a6 6 0 0 1-6-6V32h6v16z" fill="currentColor" opacity=".34"/>';
function RainbowIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "0 0 80 80",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: RainbowIconMarkup },
      ...props
    }
  );
}
function CoinbaseWalletIcon(props) {
  return /* @__PURE__ */ jsxs10(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ jsx15("circle", { cx: "12", cy: "12", r: "11", fill: "currentColor", opacity: "0.16" }),
        /* @__PURE__ */ jsx15("path", { d: "M7 7h10v10H7z", fill: "currentColor", opacity: "0.92" })
      ]
    }
  );
}
function PhantomIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "0 0 128 128",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: /* @__PURE__ */ jsx15(
        "path",
        {
          fillRule: "evenodd",
          clipRule: "evenodd",
          d: "M55.6416 82.1477C50.8744 89.4525 42.8862 98.6966 32.2568 98.6966C27.232 98.6966 22.4004 96.628 22.4004 87.6424C22.4004 64.7584 53.6445 29.3335 82.6339 29.3335C99.1257 29.3335 105.697 40.7755 105.697 53.7689C105.697 70.4471 94.8739 89.5171 84.1156 89.5171C80.7013 89.5171 79.0264 87.6424 79.0264 84.6688C79.0264 83.8931 79.1552 83.0527 79.4129 82.1477C75.7409 88.4182 68.6546 94.2361 62.0192 94.2361C57.1877 94.2361 54.7397 91.1979 54.7397 86.9314C54.7397 85.3799 55.0618 83.7638 55.6416 82.1477ZM80.6133 53.3182C80.6133 57.1044 78.3795 58.9975 75.8806 58.9975C73.3438 58.9975 71.1479 57.1044 71.1479 53.3182C71.1479 49.532 73.3438 47.6389 75.8806 47.6389C78.3795 47.6389 80.6133 49.532 80.6133 53.3182ZM94.8102 53.3184C94.8102 57.1046 92.5763 58.9977 90.0775 58.9977C87.5407 58.9977 85.3447 57.1046 85.3447 53.3184C85.3447 49.5323 87.5407 47.6392 90.0775 47.6392C92.5763 47.6392 94.8102 49.5323 94.8102 53.3184Z",
          fill: "currentColor"
        }
      )
    }
  );
}
var ParaWalletIconMarkup = '<path d="M16.7506 0.114342H7.01716V13.267C7.01716 14.2305 6.24304 15.0128 5.28576 15.0128H0V23.8289H8.74337V18.4992C8.74337 17.5357 9.51749 16.7534 10.4748 16.7534H16.8854C21.4904 16.7534 25.2124 12.9517 25.1363 8.29101C25.0603 3.63032 21.2761 0.114342 16.7506 0.114342Z" fill="currentColor"/>';
function ParaWalletIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "-1 -1 27 26",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: ParaWalletIconMarkup },
      ...props
    }
  );
}
var PrivyWalletIconMarkup = '<path d="M18.658 37.189C28.96 37.189 37.316 28.862 37.316 18.594C37.316 8.326 28.96 0 18.658 0C8.355 -0.001 0 8.326 0 18.594C0 28.861 8.355 37.188 18.658 37.188Z M18.658 48C25.699 48 31.408 46.803 31.408 45.333C31.408 43.865 25.703 42.667 18.658 42.667C11.612 42.667 5.907 43.865 5.907 45.333C5.907 46.803 11.612 48 18.658 48Z" fill="currentColor"/>';
function PrivyWalletIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "0 0 37.32 48",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: PrivyWalletIconMarkup },
      ...props
    }
  );
}
function WalletConnectIcon(props) {
  return /* @__PURE__ */ jsx15(
    "svg",
    {
      viewBox: "0 0 480 332",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      ...props,
      children: /* @__PURE__ */ jsx15(
        "path",
        {
          d: "m126.613 93.9842c62.622-61.3123 164.152-61.3123 226.775 0l7.536 7.3788c3.131 3.066 3.131 8.036 0 11.102l-25.781 25.242c-1.566 1.533-4.104 1.533-5.67 0l-10.371-10.154c-43.687-42.7734-114.517-42.7734-158.204 0l-11.107 10.874c-1.565 1.533-4.103 1.533-5.669 0l-25.781-25.242c-3.132-3.066-3.132-8.036 0-11.102zm280.093 52.2038 22.946 22.465c3.131 3.066 3.131 8.036 0 11.102l-103.463 101.301c-3.131 3.065-8.208 3.065-11.339 0l-73.432-71.896c-.783-.767-2.052-.767-2.835 0l-73.43 71.896c-3.131 3.065-8.208 3.065-11.339 0l-103.4657-101.302c-3.1311-3.066-3.1311-8.036 0-11.102l22.9456-22.466c3.1311-3.065 8.2077-3.065 11.3388 0l73.4333 71.897c.782.767 2.051.767 2.834 0l73.429-71.897c3.131-3.065 8.208-3.065 11.339 0l73.433 71.897c.783.767 2.052.767 2.835 0l73.431-71.895c3.132-3.066 8.208-3.066 11.339 0z",
          fill: "currentColor"
        }
      )
    }
  );
}

// src/components/icons/vendor-map.tsx
var VENDOR_ICONS = {
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  google: GoogleIcon,
  meta: MetaIcon,
  mistral: MistralIcon,
  deepseek: DeepSeekIcon,
  xai: XAIIcon,
  cohere: CohereIcon,
  moonshot: KimiIcon,
  glm: GLMIcon
};
function getVendorIcon(vendorId) {
  return VENDOR_ICONS[vendorId];
}

// src/components/icons/app-map.tsx
var APP_ICONS = {
  default: AllAppsIcon,
  across: AcrossIcon,
  binance: BinanceIcon,
  bybit: BybitIcon,
  cow: CowIcon,
  defillama: DefillamaIcon,
  dune: DuneIcon,
  dydx: DydxIcon,
  gmx: GmxIcon,
  hyperliquid: HyperliquidIcon,
  kaito: KaitoIcon,
  kalshi: KalshiIcon,
  khalani: KhalaniIcon,
  lifi: LifiIcon,
  limitless: LimitlessIcon,
  manifold: ManifoldIcon,
  morpho: MorphoIcon,
  neynar: NeynarIcon,
  okx: OkxIcon,
  oneinch: OneInchIcon,
  para: ParaIcon,
  pelagos: PelagosIcon,
  polymarket: PolymarketIcon,
  "polymarket-rewards": PolymarketIcon,
  x: XIcon2,
  yearn: YearnIcon,
  zerox: ZeroxIcon,
  zora: ZoraIcon,
  "0x": ZeroxIcon,
  "1inch": OneInchIcon,
  "li-fi": LifiIcon,
  "li.fi": LifiIcon,
  getpara: ParaIcon,
  "para-customer": ParaIcon,
  "para-consumer": ParaIcon,
  para_consumer: ParaIcon,
  twitter: XIcon2
};
function getAppIcon(appId) {
  return APP_ICONS[appId];
}

// src/components/icons/wallet-map.tsx
var WALLET_ICONS = {
  base: BaseWalletIcon,
  basewallet: BaseWalletIcon,
  coinbase: CoinbaseWalletIcon,
  metamask: MetaMaskIcon,
  para: ParaWalletIcon,
  phantom: PhantomIcon,
  privy: PrivyWalletIcon,
  rabby: RabbyIcon,
  rainbow: RainbowIcon,
  walletconnect: WalletConnectIcon
};
function getWalletIcon(walletIdOrLabel) {
  const direct = WALLET_ICONS[normalizeWalletOptionId(walletIdOrLabel)];
  return direct ?? WALLET_ICONS[canonicalWalletKey(walletIdOrLabel)];
}
function getWalletIconBrand(walletIdOrLabel) {
  const direct = normalizeWalletOptionId(walletIdOrLabel);
  if (WALLET_ICONS[direct]) return direct;
  const brand = canonicalWalletKey(walletIdOrLabel);
  return WALLET_ICONS[brand] ? brand : void 0;
}

// src/components/control-bar/model-select.tsx
import { jsx as jsx16, jsxs as jsxs11 } from "react/jsx-runtime";
var ModelSelect = ({
  className,
  placeholder = "Select model"
}) => {
  const {
    state,
    getAvailableModels,
    getCurrentThreadControl,
    onModelSelect,
    isProcessing
  } = useControl();
  const [open, setOpen] = useState4(false);
  useEffect2(() => {
    void getAvailableModels();
  }, [getAvailableModels]);
  const threadControl = getCurrentThreadControl();
  const rawSelected = threadControl.model;
  const modelMode = threadControl.modelMode ?? (rawSelected === null ? "auto" : "manual");
  const models = state.availableModels;
  const autoBackendModel = resolveAutoModel(models);
  const isAuto = modelMode === "auto";
  const selectedModel = isAuto ? autoBackendModel : rawSelected ?? state.defaultModel ?? models[0];
  if (models.length === 0) {
    return /* @__PURE__ */ jsx16(
      Button,
      {
        variant: "ghost",
        disabled: true,
        className: cn10(
          "h-8 w-auto min-w-[100px] rounded-full px-2 text-xs",
          "text-muted-foreground",
          className
        ),
        children: /* @__PURE__ */ jsx16("span", { className: "truncate", children: "Loading..." })
      }
    );
  }
  const groups = groupModelsByVendor(models);
  const triggerLabel = isAuto ? AUTO_MODE_LABEL : selectedModel || placeholder;
  const handleSelect = (model) => {
    if (isProcessing) return;
    setOpen(false);
    void onModelSelect(model, { mode: "manual" }).catch((err) => {
      console.error("[ModelSelect] onModelSelect failed:", err);
    });
  };
  const handleAutoSelect = () => {
    if (!autoBackendModel || isProcessing) return;
    setOpen(false);
    void onModelSelect(autoBackendModel, { mode: "auto" }).catch((err) => {
      console.error("[ModelSelect] auto onModelSelect failed:", err);
    });
  };
  return /* @__PURE__ */ jsxs11(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx16(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs11(
      Button,
      {
        variant: "ghost",
        role: "combobox",
        "aria-expanded": open,
        disabled: isProcessing,
        className: cn10(
          "h-8 w-auto min-w-0 justify-between rounded-full px-0.5 text-xs md:min-w-[100px] md:px-3",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isProcessing && "cursor-not-allowed opacity-50",
          className
        ),
        children: [
          /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-px md:gap-1.5", children: [
            (() => {
              if (isAuto) {
                return /* @__PURE__ */ jsx16(AutoModeIcon, { className: "h-3 w-3 shrink-0 opacity-60" });
              }
              if (selectedModel) {
                const vendor = getVendorForModel(selectedModel);
                const VIcon = getVendorIcon(vendor.id);
                if (VIcon)
                  return /* @__PURE__ */ jsx16(VIcon, { className: "h-3 w-3 shrink-0 opacity-60" });
              }
              return null;
            })(),
            /* @__PURE__ */ jsx16("span", { className: "truncate", children: triggerLabel })
          ] }),
          /* @__PURE__ */ jsx16(ChevronDownIcon2, { className: "ml-0 h-3 w-3 shrink-0 opacity-50 md:ml-2" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx16(
      PopoverContent,
      {
        align: "start",
        sideOffset: 4,
        className: "w-[280px] overflow-hidden rounded-xl p-0",
        onOpenAutoFocus: (e) => {
          if (window.matchMedia("(max-width: 767px)").matches) {
            e.preventDefault();
          }
        },
        children: /* @__PURE__ */ jsxs11(Command, { className: "rounded-xl", children: [
          /* @__PURE__ */ jsx16(CommandInput, { placeholder: "Search models..." }),
          /* @__PURE__ */ jsxs11(CommandList, { children: [
            /* @__PURE__ */ jsx16(CommandEmpty, { children: "No models found." }),
            /* @__PURE__ */ jsx16(CommandGroup, { children: /* @__PURE__ */ jsxs11(
              CommandItem,
              {
                value: "auto",
                disabled: isProcessing,
                onSelect: handleAutoSelect,
                className: "flex items-center justify-between gap-2",
                children: [
                  /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx16(
                      "span",
                      {
                        className: cn10(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                          "bg-primary/10 text-primary"
                        ),
                        children: /* @__PURE__ */ jsx16(AutoModeIcon, { className: "h-3.5 w-3.5" })
                      }
                    ),
                    /* @__PURE__ */ jsxs11("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx16("span", { className: "font-medium", children: AUTO_MODE_LABEL }),
                      /* @__PURE__ */ jsx16("span", { className: "text-muted-foreground text-xs", children: "Best balance of speed & cost" })
                    ] })
                  ] }),
                  isAuto && /* @__PURE__ */ jsx16(CheckIcon3, { className: "h-4 w-4 shrink-0" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsx16(CommandSeparator, {}),
            groups.map((group) => {
              const VendorIcon = getVendorIcon(group.vendor.id);
              return /* @__PURE__ */ jsx16(
                CommandGroup,
                {
                  heading: group.vendor.label,
                  children: group.models.map((model) => /* @__PURE__ */ jsxs11(
                    CommandItem,
                    {
                      value: model,
                      disabled: isProcessing,
                      onSelect: () => handleSelect(model),
                      className: "flex items-center justify-between gap-2",
                      children: [
                        /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-2", children: [
                          /* @__PURE__ */ jsx16(
                            "span",
                            {
                              className: cn10(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                                "bg-muted text-muted-foreground"
                              ),
                              children: VendorIcon ? /* @__PURE__ */ jsx16(VendorIcon, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx16("span", { className: "text-[10px] font-medium", children: group.vendor.abbr })
                            }
                          ),
                          /* @__PURE__ */ jsx16("span", { className: "truncate", children: model })
                        ] }),
                        !isAuto && selectedModel === model && /* @__PURE__ */ jsx16(CheckIcon3, { className: "h-4 w-4 shrink-0" })
                      ]
                    },
                    model
                  ))
                },
                group.vendor.id
              );
            })
          ] })
        ] })
      }
    )
  ] });
};

// src/components/control-bar/app-select.tsx
import { useState as useState5, useEffect as useEffect3 } from "react";
import { ChevronDownIcon as ChevronDownIcon3, CheckIcon as CheckIcon4 } from "lucide-react";
import { useControl as useControl2, cn as cn11 } from "@aomi-labs/react";

// src/components/control-bar/app-metadata.ts
var APP_CATEGORIES = {
  all: { id: "all", label: "All", order: 0 },
  cex: { id: "cex", label: "Centralized Exchanges", order: 10 },
  dex: { id: "dex", label: "DEX & Swaps", order: 20 },
  analytics: { id: "analytics", label: "Analytics", order: 30 },
  perps: { id: "perps", label: "Perps", order: 40 },
  social: { id: "social", label: "Social", order: 50 },
  prediction: { id: "prediction", label: "Prediction Markets", order: 60 },
  yield: { id: "yield", label: "Lending & Yield", order: 70 },
  gaming: { id: "gaming", label: "Gaming", order: 80 },
  wallets: { id: "wallets", label: "Wallets", order: 90 },
  custom: { id: "custom", label: "Other", order: 100 }
};
var APP_DISPLAY_NAMES = {
  default: {
    displayName: "Basic Apps",
    abbr: "All",
    category: APP_CATEGORIES.all
  },
  across: {
    displayName: "Across",
    abbr: "A",
    category: APP_CATEGORIES.dex
  },
  binance: {
    displayName: "Binance",
    abbr: "B",
    category: APP_CATEGORIES.cex
  },
  bybit: {
    displayName: "Bybit",
    abbr: "B",
    category: APP_CATEGORIES.cex
  },
  cow: {
    displayName: "CoW Protocol",
    abbr: "CoW",
    category: APP_CATEGORIES.dex
  },
  defillama: {
    displayName: "DefiLlama",
    abbr: "DL",
    category: APP_CATEGORIES.analytics
  },
  dune: {
    displayName: "Dune",
    abbr: "D",
    category: APP_CATEGORIES.analytics
  },
  dydx: {
    displayName: "dYdX",
    abbr: "dY",
    category: APP_CATEGORIES.perps
  },
  gmx: {
    displayName: "GMX",
    abbr: "G",
    category: APP_CATEGORIES.perps
  },
  hyperliquid: {
    displayName: "Hyperliquid",
    abbr: "HL",
    category: APP_CATEGORIES.perps
  },
  kaito: {
    displayName: "Kaito",
    abbr: "K",
    category: APP_CATEGORIES.social
  },
  kalshi: {
    displayName: "Kalshi",
    abbr: "K",
    category: APP_CATEGORIES.prediction
  },
  khalani: {
    displayName: "Khalani",
    abbr: "K",
    category: APP_CATEGORIES.dex
  },
  lifi: {
    displayName: "LI.FI",
    abbr: "LI",
    category: APP_CATEGORIES.dex
  },
  limitless: {
    displayName: "Limitless",
    abbr: "L",
    category: APP_CATEGORIES.prediction
  },
  manifold: {
    displayName: "Manifold",
    abbr: "M",
    category: APP_CATEGORIES.prediction
  },
  molinar: {
    displayName: "Molinar",
    abbr: "Mo",
    category: APP_CATEGORIES.gaming
  },
  morpho: {
    displayName: "Morpho",
    abbr: "M",
    category: APP_CATEGORIES.yield
  },
  neynar: {
    displayName: "Neynar",
    abbr: "N",
    category: APP_CATEGORIES.social
  },
  okx: {
    displayName: "OKX",
    abbr: "OK",
    category: APP_CATEGORIES.cex
  },
  oneinch: {
    displayName: "1inch",
    abbr: "1i",
    category: APP_CATEGORIES.dex
  },
  para: {
    displayName: "Para",
    abbr: "P",
    category: APP_CATEGORIES.wallets
  },
  "para-consumer": {
    displayName: "Para Consumer",
    abbr: "P",
    category: APP_CATEGORIES.custom
  },
  pelagos: {
    displayName: "Pelagos",
    abbr: "P",
    category: APP_CATEGORIES.dex
  },
  polymarket: {
    displayName: "Polymarket",
    abbr: "P",
    category: APP_CATEGORIES.prediction
  },
  "polymarket-rewards": {
    displayName: "Polymarket Rewards",
    abbr: "PR",
    category: APP_CATEGORIES.prediction
  },
  x: {
    displayName: "X",
    abbr: "X",
    category: APP_CATEGORIES.social
  },
  yearn: {
    displayName: "Yearn",
    abbr: "Y",
    category: APP_CATEGORIES.yield
  },
  zerox: {
    displayName: "0x",
    abbr: "0x",
    category: APP_CATEGORIES.dex
  },
  zora: {
    displayName: "Zora",
    abbr: "Z",
    category: APP_CATEGORIES.social
  }
};
var APP_ALIASES = {
  "1inch": "oneinch",
  "0x": "zerox",
  "li-fi": "lifi",
  "li.fi": "lifi",
  "dune-analytics": "dune",
  getpara: "para",
  "para-customer": "para",
  para_consumer: "para-consumer",
  polymarket_rewards: "polymarket-rewards",
  twitter: "x"
};
function normalizeAppId(appId) {
  return (appId ?? "").trim().toLowerCase();
}
function titleizeAppId(appId) {
  return appId.split(/[-_\s]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function getAppInfo(appId) {
  const safeAppId = appId ?? "";
  const normalized = normalizeAppId(safeAppId);
  if (!normalized) {
    return {
      id: "unknown",
      displayName: "Unknown App",
      abbr: "?",
      category: APP_CATEGORIES.custom
    };
  }
  const canonicalId = APP_ALIASES[normalized] ?? normalized;
  const known = APP_DISPLAY_NAMES[canonicalId];
  if (known) {
    return { id: normalized, ...known };
  }
  const displayName = titleizeAppId(normalized);
  return {
    id: normalized,
    displayName,
    abbr: normalized.charAt(0).toUpperCase(),
    category: APP_CATEGORIES.custom
  };
}
function groupAppsByCategory(apps) {
  const grouped = /* @__PURE__ */ new Map();
  for (const app of apps) {
    if (typeof app !== "string" || app.trim().length === 0) {
      continue;
    }
    const info = getAppInfo(app);
    const existing = grouped.get(info.category.id) ?? [];
    existing.push(info);
    grouped.set(info.category.id, existing);
  }
  return Array.from(grouped.values()).map((groupApps) => ({
    category: groupApps[0]?.category ?? APP_CATEGORIES.custom,
    apps: groupApps.sort(
      (a, b) => a.displayName.localeCompare(b.displayName, void 0, {
        numeric: true,
        sensitivity: "base"
      })
    )
  })).sort(
    (a, b) => a.category.order - b.category.order || a.category.label.localeCompare(b.category.label)
  );
}

// src/components/control-bar/app-select.tsx
import { Fragment as Fragment2, jsx as jsx17, jsxs as jsxs12 } from "react/jsx-runtime";
var ALL_APPS_ID = "default";
var AppSelect = ({
  className,
  placeholder = "Select App"
}) => {
  const {
    state,
    getAuthorizedApps,
    getCurrentThreadApp,
    onAppSelect,
    isProcessing
  } = useControl2();
  const [open, setOpen] = useState5(false);
  useEffect3(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps]);
  const selectApp = (id) => {
    if (isProcessing) return;
    onAppSelect(id);
    setOpen(false);
  };
  const selectedApp = getCurrentThreadApp();
  const selectedInfo = getAppInfo(selectedApp);
  const SelectedAppIcon = getAppIcon(selectedApp);
  const apps = state.authorizedApps;
  const hasAllApps = apps.includes(ALL_APPS_ID);
  const otherApps = apps.filter((a) => a !== ALL_APPS_ID);
  const groups = groupAppsByCategory(otherApps);
  if (apps.length === 0) {
    return /* @__PURE__ */ jsx17(
      Button,
      {
        variant: "ghost",
        disabled: true,
        className: cn11(
          "h-8 w-auto min-w-[80px] rounded-full px-2 text-xs",
          "text-muted-foreground",
          className
        ),
        children: /* @__PURE__ */ jsx17("span", { className: "truncate", children: selectedInfo.displayName })
      }
    );
  }
  return /* @__PURE__ */ jsxs12(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx17(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs12(
      Button,
      {
        variant: "ghost",
        role: "combobox",
        "aria-expanded": open,
        disabled: isProcessing,
        className: cn11(
          "h-8 w-auto min-w-0 justify-between gap-px rounded-full px-0.5 text-xs md:min-w-[80px] md:gap-1.5 md:px-3",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isProcessing && "cursor-not-allowed opacity-50",
          className
        ),
        children: [
          SelectedAppIcon && /* @__PURE__ */ jsx17(SelectedAppIcon, { className: "h-3 w-3 shrink-0 opacity-60" }),
          /* @__PURE__ */ jsx17("span", { className: "truncate", children: selectedInfo.displayName }),
          /* @__PURE__ */ jsx17(ChevronDownIcon3, { className: "ml-1 h-3 w-3 shrink-0 opacity-50" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx17(
      PopoverContent,
      {
        align: "start",
        sideOffset: 4,
        className: "w-[260px] overflow-hidden rounded-xl p-0",
        onOpenAutoFocus: (e) => {
          if (window.matchMedia("(max-width: 767px)").matches) {
            e.preventDefault();
          }
        },
        children: /* @__PURE__ */ jsxs12(Command, { className: "rounded-xl", children: [
          /* @__PURE__ */ jsx17(CommandInput, { placeholder: "Search apps..." }),
          /* @__PURE__ */ jsxs12(CommandList, { children: [
            /* @__PURE__ */ jsx17(CommandEmpty, { children: "No apps found." }),
            hasAllApps && /* @__PURE__ */ jsxs12(Fragment2, { children: [
              /* @__PURE__ */ jsx17(CommandGroup, { children: /* @__PURE__ */ jsxs12(
                CommandItem,
                {
                  value: "basic apps all default",
                  disabled: isProcessing,
                  onSelect: () => selectApp(ALL_APPS_ID),
                  className: "flex items-center justify-between gap-2",
                  children: [
                    /* @__PURE__ */ jsxs12("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx17(
                        "span",
                        {
                          className: cn11(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                            "bg-primary/10 text-primary"
                          ),
                          children: /* @__PURE__ */ jsx17(AllAppsIcon, { className: "h-3.5 w-3.5" })
                        }
                      ),
                      /* @__PURE__ */ jsxs12("div", { className: "flex flex-col", children: [
                        /* @__PURE__ */ jsx17("span", { className: "font-medium", children: "Basic Apps" }),
                        /* @__PURE__ */ jsx17("span", { className: "text-muted-foreground text-xs", children: "Use curated apps by Aomi" })
                      ] })
                    ] }),
                    selectedApp === ALL_APPS_ID && /* @__PURE__ */ jsx17(CheckIcon4, { className: "h-4 w-4 shrink-0" })
                  ]
                }
              ) }),
              otherApps.length > 0 && /* @__PURE__ */ jsx17(CommandSeparator, {})
            ] }),
            groups.map((group) => /* @__PURE__ */ jsx17(
              CommandGroup,
              {
                heading: group.category.label,
                children: group.apps.map((app) => {
                  const AppIcon = getAppIcon(app.id);
                  return /* @__PURE__ */ jsxs12(
                    CommandItem,
                    {
                      value: `${app.displayName} ${app.category.label} ${app.id}`,
                      disabled: isProcessing,
                      onSelect: () => selectApp(app.id),
                      className: "flex items-center justify-between gap-2",
                      children: [
                        /* @__PURE__ */ jsxs12("div", { className: "flex min-w-0 items-center gap-2", children: [
                          /* @__PURE__ */ jsx17(
                            "span",
                            {
                              className: cn11(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium",
                                "bg-muted text-muted-foreground",
                                selectedApp === app.id && "bg-primary/10 text-primary"
                              ),
                              children: AppIcon ? /* @__PURE__ */ jsx17(AppIcon, { className: "h-4 w-4" }) : app.abbr
                            }
                          ),
                          /* @__PURE__ */ jsx17("span", { className: "truncate", children: app.displayName })
                        ] }),
                        selectedApp === app.id && /* @__PURE__ */ jsx17(CheckIcon4, { className: "text-primary h-4 w-4 shrink-0" })
                      ]
                    },
                    app.id
                  );
                })
              },
              group.category.id
            ))
          ] })
        ] })
      }
    )
  ] });
};

// src/components/control-bar/api-key-input.tsx
import { useState as useState6 } from "react";
import { KeyIcon, CheckIcon as CheckIcon5, EyeIcon, EyeOffIcon } from "lucide-react";
import { useApiKey, cn as cn14 } from "@aomi-labs/react";

// src/components/ui/input.tsx
import { cn as cn12 } from "@aomi-labs/react";
import { jsx as jsx18 } from "react/jsx-runtime";
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsx18(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn12(
        "border-sm border-input shadow-xs selection:bg-primary selection:text-primary-foreground file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 flex h-9 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      ),
      ...props
    }
  );
}

// src/components/ui/label.tsx
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn as cn13 } from "@aomi-labs/react";
import { jsx as jsx19 } from "react/jsx-runtime";
function Label({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx19(
    LabelPrimitive.Root,
    {
      "data-slot": "label",
      className: cn13(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      ),
      ...props
    }
  );
}

// src/components/control-bar/api-key-input.tsx
import { jsx as jsx20, jsxs as jsxs13 } from "react/jsx-runtime";
var ApiKeyInput = ({
  className,
  title = "Aomi API Key",
  description = "Enter your API key to authenticate with Aomi services."
}) => {
  const { state, actions } = useApiKey();
  const [open, setOpen] = useState6(false);
  const [inputValue, setInputValue] = useState6("");
  const [showKey, setShowKey] = useState6(false);
  const hasApiKey = Boolean(state.apiKey);
  return /* @__PURE__ */ jsxs13(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx20(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx20(
      Button,
      {
        variant: "ghost",
        size: "icon",
        className: cn14("relative rounded-full", className),
        "aria-label": hasApiKey ? "API key configured" : "Set API key",
        children: /* @__PURE__ */ jsx20(KeyIcon, { className: cn14("h-4 w-4", hasApiKey && "text-green-500") })
      }
    ) }),
    /* @__PURE__ */ jsxs13(DialogContent, { className: "max-w-[280px] rounded-3xl pl-4", children: [
      /* @__PURE__ */ jsxs13(DialogHeader, { className: "border-0", children: [
        /* @__PURE__ */ jsx20(DialogTitle, { children: title }),
        /* @__PURE__ */ jsx20(DialogDescription, { children: description })
      ] }),
      /* @__PURE__ */ jsx20("div", { className: "grid gap-4 py-4", children: /* @__PURE__ */ jsxs13("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx20(Label, { htmlFor: "api-key", className: "mb-2", children: "API Key" }),
        /* @__PURE__ */ jsxs13("div", { className: "relative", children: [
          /* @__PURE__ */ jsx20(
            Input,
            {
              id: "api-key",
              type: showKey ? "text" : "password",
              placeholder: hasApiKey ? "********" : "Enter your API key",
              value: inputValue,
              onChange: (e) => setInputValue(e.target.value),
              className: "rounded-full pr-10"
            }
          ),
          /* @__PURE__ */ jsx20(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon",
              className: "absolute right-0 top-0 h-full px-3 hover:bg-transparent",
              onClick: () => setShowKey(!showKey),
              "aria-label": showKey ? "Hide API key" : "Show API key",
              children: showKey ? /* @__PURE__ */ jsx20(EyeIcon, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx20(EyeOffIcon, { className: "h-4 w-4" })
            }
          )
        ] }),
        hasApiKey && /* @__PURE__ */ jsxs13("p", { className: "text-muted-foreground text-xs", children: [
          /* @__PURE__ */ jsx20(CheckIcon5, { className: "mr-1 inline h-3 w-3 text-green-500" }),
          "API key is configured"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs13(DialogFooter, { children: [
        hasApiKey && /* @__PURE__ */ jsx20(
          Button,
          {
            variant: "outline",
            className: "rounded-full",
            onClick: () => {
              actions.setApiKey(null);
              setInputValue("");
            },
            children: "Clear"
          }
        ),
        /* @__PURE__ */ jsx20(
          Button,
          {
            className: "rounded-full",
            onClick: () => {
              if (inputValue.trim()) {
                actions.setApiKey(inputValue.trim());
                setOpen(false);
                setInputValue("");
              }
            },
            disabled: !inputValue.trim(),
            children: "Save"
          }
        )
      ] })
    ] })
  ] });
};

// src/components/control-bar/network-select.tsx
import { useMemo, useState as useState7 } from "react";
import { CheckIcon as CheckIcon6, ChevronDownIcon as ChevronDownIcon4 } from "lucide-react";
import { cn as cn15, getChainInfo as getChainInfo2 } from "@aomi-labs/react";

// src/lib/wallet-kit/use-wallet-activation-guard.ts
import { useCallback } from "react";
import { useOptionalAomiRuntime } from "@aomi-labs/react";
function useWalletActivationGuard() {
  const runtime = useOptionalAomiRuntime();
  return useCallback(() => {
    if (!runtime?.hasBlockingWalletRequests) {
      return true;
    }
    runtime.showNotification({
      type: "wallet",
      title: "Finish the pending wallet request",
      message: "Approve or reject the current wallet request before switching wallets or networks."
    });
    return false;
  }, [runtime]);
}

// src/components/control-bar/network-select.tsx
import { Fragment as Fragment3, jsx as jsx21, jsxs as jsxs14 } from "react/jsx-runtime";
var SEARCH_VISIBLE_THRESHOLD = 10;
var TESTNET_PREF_KEY = "aomi.network-select.show-testnets";
function readShowTestnetsPref() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TESTNET_PREF_KEY) === "true";
  } catch {
    return false;
  }
}
function writeShowTestnetsPref(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TESTNET_PREF_KEY, value ? "true" : "false");
  } catch {
  }
}
function familyLabel(family) {
  return family === "svm" ? "SVM" : "EVM";
}
function isTestnetChain(chain) {
  return chain.testnet === true;
}
function isSolanaMainnet(network) {
  return network.cluster === "solana:mainnet";
}
function formatSolanaBadge(network) {
  if (network.cluster === "solana:mainnet") return "Mainnet";
  if (network.cluster === "solana:testnet") return "Testnet";
  return "Devnet";
}
var NetworkSelect = ({
  className,
  chains
}) => {
  const adapter = useAomiWalletKit();
  const networkPreferences = useOptionalAomiWalletNetworkPreferences();
  const selectedEvmChainId = networkPreferences?.selectedEvmChainId;
  const selectedSolanaNetwork = networkPreferences?.selectedSolanaNetwork;
  const [open, setOpen] = useState7(false);
  const [query, setQuery] = useState7("");
  const [showTestnets, setShowTestnets] = useState7(readShowTestnetsPref);
  const [pendingTarget, setPendingTarget] = useState7(
    null
  );
  const [confirmOpen, setConfirmOpen] = useState7(false);
  const canActivateWallet = useWalletActivationGuard();
  const identity = adapter.identity;
  const evmChains = chains ?? adapter.supportedNetworks?.evm ?? adapter.supportedChains ?? [];
  const solanaNetworks = adapter.supportedNetworks?.solana ?? [];
  const evmConnected = Boolean(identity.address);
  const solanaConnected = Boolean(identity.svmAddress);
  const anyConnected = evmConnected || solanaConnected;
  const showEvm = evmChains.length > 0 && (anyConnected ? evmConnected : true);
  const showSolana = solanaNetworks.length > 0;
  const liveEvmChainSupported = identity.chainId !== void 0 && evmChains.some((chain) => chain.id === identity.chainId);
  const activeEvmChainId = liveEvmChainSupported ? identity.chainId : selectedEvmChainId;
  const activeEvmChain = evmChains.find(
    (chain) => chain.id === activeEvmChainId
  );
  const activeSolanaNetwork = selectedSolanaNetwork;
  const sections = useMemo(() => {
    const result = [];
    if (showEvm) {
      result.push({
        family: "evm",
        rows: evmChains.map((chain) => {
          const ticker = getChainInfo2(chain.id)?.ticker ?? ("nativeCurrency" in chain ? chain.nativeCurrency.symbol : "");
          return {
            family: "evm",
            key: `evm:${chain.id}`,
            title: chain.name,
            Icon: getChainIcon(chain.id),
            fallback: ticker.slice(0, 2),
            isTestnet: isTestnetChain(chain),
            isActive: activeEvmChainId === chain.id,
            searchValue: `${chain.name} evm ${ticker} ${chain.id}`,
            target: { family: "evm", chainId: chain.id }
          };
        })
      });
    }
    if (showSolana) {
      result.push({
        family: "svm",
        rows: solanaNetworks.map((network) => ({
          family: "svm",
          key: `solana:${network.id}`,
          title: network.label,
          Icon: SolanaIcon,
          fallback: formatSolanaBadge(network).slice(0, 2),
          isTestnet: !isSolanaMainnet(network),
          isActive: activeSolanaNetwork?.id === network.id,
          searchValue: `${network.label} svm solana ${formatSolanaBadge(network)} ${network.id}`,
          target: { family: "svm", networkId: network.id }
        }))
      });
    }
    return result;
  }, [
    showEvm,
    showSolana,
    evmChains,
    solanaNetworks,
    activeEvmChainId,
    activeSolanaNetwork?.id
  ]);
  const triggerChips = useMemo(() => {
    const chips = [];
    if (showEvm) {
      chips.push({
        family: "evm",
        Icon: activeEvmChainId ? getChainIcon(activeEvmChainId) : void 0,
        label: activeEvmChain?.name ?? "EVM"
      });
    }
    if (showSolana) {
      chips.push({
        family: "svm",
        Icon: SolanaIcon,
        label: activeSolanaNetwork ? formatSolanaBadge(activeSolanaNetwork) : "SVM"
      });
    }
    return chips;
  }, [
    showEvm,
    showSolana,
    activeEvmChain,
    activeEvmChainId,
    activeSolanaNetwork
  ]);
  const showGroupHeaders = sections.length > 1;
  const allRows = sections.flatMap((section) => section.rows);
  const visibleTargetCount = allRows.length;
  const mainnetCount = allRows.filter((row) => !row.isTestnet).length;
  const testnetCount = visibleTargetCount - mainnetCount;
  const activeIsTestnet = allRows.some((row) => row.isActive && row.isTestnet);
  const searching = query.trim().length > 0;
  const testnetsExpanded = showTestnets || activeIsTestnet || searching;
  const showSearch = mainnetCount > SEARCH_VISIBLE_THRESHOLD;
  const showTestnetToggle = testnetCount > 0 && !searching && !activeIsTestnet;
  if (visibleTargetCount <= 1) {
    return null;
  }
  const applyTarget = async (target) => {
    if (!canActivateWallet()) return;
    if (adapter.selectNetwork) {
      await adapter.selectNetwork(target);
    }
    setOpen(false);
  };
  const handleTargetSelect = async (target) => {
    if ((target.family === "svm" || target.family === "solana") && adapter.solanaNetworkSwitchRequiresReconnect && activeSolanaNetwork && activeSolanaNetwork.id !== target.networkId) {
      setPendingTarget(target);
      setConfirmOpen(true);
      return;
    }
    await applyTarget(target);
  };
  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) setQuery("");
  };
  const toggleTestnets = () => {
    setShowTestnets((current) => {
      const next = !current;
      writeShowTestnetsPref(next);
      return next;
    });
  };
  const renderRow = (row) => {
    if (row.isTestnet && !testnetsExpanded) return null;
    return /* @__PURE__ */ jsxs14(
      CommandItem,
      {
        value: row.searchValue,
        onSelect: () => void handleTargetSelect(row.target),
        className: cn15(
          "flex items-center gap-2 rounded-lg px-2 py-1.5",
          row.isActive && "bg-accent"
        ),
        children: [
          /* @__PURE__ */ jsx21(
            "span",
            {
              className: cn15(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium uppercase",
                // Lighter rows: only the live network carries a filled chip; the
                // rest show a bare brand mark so the list reads as one clean column
                // instead of a stack of grey boxes.
                row.isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
              ),
              children: row.Icon ? /* @__PURE__ */ jsx21(row.Icon, { className: "h-4 w-4" }) : row.fallback
            }
          ),
          /* @__PURE__ */ jsx21("span", { className: "min-w-0 flex-1 truncate", children: row.title }),
          row.isActive && /* @__PURE__ */ jsx21(CheckIcon6, { className: "text-primary h-4 w-4 shrink-0" })
        ]
      },
      row.key
    );
  };
  return /* @__PURE__ */ jsxs14(Fragment3, { children: [
    /* @__PURE__ */ jsxs14(Popover, { open, onOpenChange: handleOpenChange, children: [
      /* @__PURE__ */ jsx21(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs14(
        Button,
        {
          variant: "ghost",
          role: "combobox",
          "aria-expanded": open,
          disabled: !adapter.selectNetwork,
          className: cn15(
            "h-8 w-auto min-w-0 justify-between gap-px rounded-full px-0.5 text-xs md:min-w-[80px] md:gap-1.5 md:px-3",
            // Keep text + brand marks muted on hover (the marks inherit
            // currentColor, so hover:text-accent-foreground turned solid
            // logos like Base near-black); only the background highlights.
            "text-muted-foreground hover:bg-accent",
            !adapter.selectNetwork && "cursor-not-allowed opacity-50",
            className
          ),
          children: [
            /* @__PURE__ */ jsx21("span", { className: "flex min-w-0 items-center gap-1.5", children: triggerChips.length === 0 ? /* @__PURE__ */ jsx21("span", { className: "truncate", children: "Network" }) : triggerChips.map((chip, index) => /* @__PURE__ */ jsxs14("span", { className: "flex items-center gap-1.5", children: [
              index > 0 && /* @__PURE__ */ jsx21(
                "span",
                {
                  className: "text-muted-foreground/40",
                  "aria-hidden": "true",
                  children: "/"
                }
              ),
              chip.Icon && /* @__PURE__ */ jsx21(chip.Icon, { className: "h-3.5 w-3.5 shrink-0" }),
              /* @__PURE__ */ jsx21("span", { className: "truncate", children: chip.label })
            ] }, chip.family)) }),
            /* @__PURE__ */ jsx21(ChevronDownIcon4, { className: "ml-1 h-3 w-3 shrink-0 opacity-50" })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx21(
        PopoverContent,
        {
          align: "start",
          sideOffset: 4,
          className: "w-[260px] overflow-hidden rounded-xl p-0",
          onOpenAutoFocus: (event) => {
            if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches) {
              event.preventDefault();
            }
          },
          children: /* @__PURE__ */ jsxs14(Command, { className: "rounded-xl", children: [
            showSearch && /* @__PURE__ */ jsx21(
              CommandInput,
              {
                placeholder: "Search networks...",
                value: query,
                onValueChange: setQuery
              }
            ),
            /* @__PURE__ */ jsxs14(CommandList, { className: "max-h-[300px] p-1", children: [
              /* @__PURE__ */ jsx21(CommandEmpty, { children: "No networks found." }),
              sections.map((section) => /* @__PURE__ */ jsx21(
                CommandGroup,
                {
                  heading: showGroupHeaders ? familyLabel(section.family) : void 0,
                  className: "p-0",
                  children: section.rows.map(renderRow)
                },
                section.family
              ))
            ] }),
            showTestnetToggle && /* @__PURE__ */ jsxs14(
              "button",
              {
                type: "button",
                onClick: toggleTestnets,
                className: "text-muted-foreground hover:bg-accent flex w-full items-center justify-between gap-2 border-t px-3 py-2 text-xs transition-colors",
                children: [
                  /* @__PURE__ */ jsx21("span", { children: testnetsExpanded ? "Hide testnets" : "Show testnets" }),
                  /* @__PURE__ */ jsxs14("span", { className: "flex items-center gap-1", children: [
                    !testnetsExpanded && /* @__PURE__ */ jsxs14("span", { children: [
                      testnetCount,
                      " hidden"
                    ] }),
                    /* @__PURE__ */ jsx21(
                      ChevronDownIcon4,
                      {
                        className: cn15(
                          "h-3.5 w-3.5 transition-transform",
                          testnetsExpanded && "rotate-180"
                        )
                      }
                    )
                  ] })
                ]
              }
            )
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsx21(Dialog, { open: confirmOpen, onOpenChange: setConfirmOpen, children: /* @__PURE__ */ jsxs14(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxs14(DialogHeader, { children: [
        /* @__PURE__ */ jsx21(DialogTitle, { children: "Switch SVM network?" }),
        /* @__PURE__ */ jsx21(DialogDescription, { children: "This SVM wallet needs to reconnect to change clusters. Your current chat and EVM wallet stay connected." })
      ] }),
      /* @__PURE__ */ jsxs14(DialogFooter, { children: [
        /* @__PURE__ */ jsx21(
          Button,
          {
            variant: "outline",
            onClick: () => {
              setConfirmOpen(false);
              setPendingTarget(null);
            },
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ jsx21(
          Button,
          {
            onClick: () => {
              const target = pendingTarget;
              setConfirmOpen(false);
              setPendingTarget(null);
              if (target) {
                void applyTarget(target);
              }
            },
            children: "Switch Network"
          }
        )
      ] })
    ] }) })
  ] });
};

// src/components/control-bar/connect-button.tsx
import { useEffect as useEffect6 } from "react";
import { cn as cn19, formatAddress, getChainInfo as getChainInfo5 } from "@aomi-labs/react";

// src/components/control-bar/dual-wallet-bar.tsx
import { Fragment as Fragment5, useEffect as useEffect5 } from "react";
import { ChevronDownIcon as ChevronDownIcon6 } from "lucide-react";
import { cn as cn18, getChainInfo as getChainInfo4 } from "@aomi-labs/react";

// src/components/control-bar/wallet-icon-slot.tsx
import { WalletIcon as WalletIcon2 } from "lucide-react";
import { cn as cn16 } from "@aomi-labs/react";
import { jsx as jsx22 } from "react/jsx-runtime";
var DEFAULT_SLOT = 36;
var BRAND_RATIO = 24 / 36;
var PHANTOM_RATIO = 27.6 / 36;
var PARA_RATIO = 24 * 0.85 / 36;
var FALLBACK_RATIO = 16 / 36;
function WalletIconSlot({
  iconUrl,
  id,
  label,
  provider,
  size = DEFAULT_SLOT,
  className
}) {
  const key = `${provider ?? ""} ${id ?? ""} ${label}`;
  const brandKey = provider ?? key;
  const BrandIcon = getWalletIcon(brandKey) ?? getWalletIcon(key);
  const brand = getWalletIconBrand(brandKey) ?? getWalletIconBrand(key);
  const lowerKey = key.toLowerCase();
  const isPhantom = lowerKey.includes("phantom");
  const isPara = lowerKey.includes("para");
  const slotStyle = { width: size, height: size };
  if (BrandIcon) {
    const mark2 = size * (isPhantom ? PHANTOM_RATIO : isPara ? PARA_RATIO : BRAND_RATIO);
    return /* @__PURE__ */ jsx22(
      "span",
      {
        className: cn16(
          "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-xl",
          className
        ),
        style: slotStyle,
        "aria-hidden": "true",
        title: label,
        "data-wallet-brand": brand,
        children: /* @__PURE__ */ jsx22(BrandIcon, { style: { width: mark2, height: mark2 } })
      }
    );
  }
  if (iconUrl) {
    const mark2 = size * BRAND_RATIO;
    return /* @__PURE__ */ jsx22(
      "span",
      {
        className: cn16(
          "bg-muted/50 flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
          className
        ),
        style: slotStyle,
        children: /* @__PURE__ */ jsx22(
          "img",
          {
            src: iconUrl,
            alt: "",
            className: "object-contain",
            style: { width: mark2, height: mark2 }
          }
        )
      }
    );
  }
  const mark = size * FALLBACK_RATIO;
  return /* @__PURE__ */ jsx22(
    "span",
    {
      className: cn16(
        "bg-muted/50 text-muted-foreground flex shrink-0 items-center justify-center rounded-xl",
        className
      ),
      style: slotStyle,
      "aria-hidden": "true",
      title: label,
      children: /* @__PURE__ */ jsx22(WalletIcon2, { style: { width: mark, height: mark } })
    }
  );
}

// src/components/control-bar/wallet-picker.tsx
import {
  useCallback as useCallback3,
  useEffect as useEffect4,
  useMemo as useMemo3,
  useRef as useRef2,
  useState as useState9
} from "react";
import {
  CheckIcon as CheckIcon7,
  CheckCircle2Icon,
  ChevronDownIcon as ChevronDownIcon5,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRightIcon2,
  LinkIcon,
  Loader2Icon,
  LogOutIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundIcon,
  WalletIcon as WalletIcon3,
  XIcon as XIcon3
} from "lucide-react";
import { cn as cn17, getChainInfo as getChainInfo3 } from "@aomi-labs/react";

// src/components/control-bar/wallet-picker-context.tsx
import {
  createContext,
  useCallback as useCallback2,
  useContext,
  useMemo as useMemo2,
  useState as useState8
} from "react";
import { jsx as jsx23 } from "react/jsx-runtime";
var WalletPickerContext = createContext(
  null
);
function WalletPickerProvider({ children }) {
  const [open, setOpen] = useState8(false);
  const openPicker = useCallback2(() => setOpen(true), []);
  const closePicker = useCallback2(() => setOpen(false), []);
  const value = useMemo2(
    () => ({
      open,
      openPicker,
      closePicker
    }),
    [open, openPicker, closePicker]
  );
  return /* @__PURE__ */ jsx23(WalletPickerContext.Provider, { value, children });
}
function useWalletPicker() {
  const context = useContext(WalletPickerContext);
  if (!context) {
    throw new Error("useWalletPicker must be used within WalletPickerProvider");
  }
  return context;
}

// src/components/control-bar/wallet-account-model.ts
function familyLabel2(family) {
  return family === "svm" ? "Solana" : "Ethereum";
}
function sameWalletAddress(family, left, right) {
  if (!left || !right) return false;
  return family === "evm" ? left.toLowerCase() === right.toLowerCase() : left === right;
}
function providerBackedAccountProvider(input) {
  if (!input.provider) return null;
  if (input.linkedVia === "siwe" || input.linkedVia === "siws") return null;
  const walletKind = input.walletKind ?? input.kind;
  if (walletKind === "embedded" || walletKind === "smart_account") {
    return input.provider;
  }
  if (input.source === "live" && walletKind == null) return input.provider;
  return input.source === "embedded" ? input.provider : null;
}
function providerBackedWalletTitle(input) {
  const provider = providerBackedAccountProvider(input);
  return provider !== null ? formatWalletProvider(provider) ?? provider : input.walletName ?? familyLabel2(input.family);
}
function buildConnectedEntries(accounts, wallets) {
  return accounts.map((account) => {
    const linkedWallet = account.linked ? wallets.find(
      (wallet) => sameWalletAddress(wallet.family, wallet.address, account.address)
    ) : void 0;
    const provider = providerBackedAccountProvider(account);
    const title = providerBackedWalletTitle(account);
    return {
      key: `row:${account.family}:${account.id}:${account.address ?? ""}`,
      title,
      iconId: provider ?? account.id,
      iconLabel: title,
      iconProvider: provider ?? account.provider,
      family: account.family,
      address: account.address,
      chainId: account.chainId ?? linkedWallet?.chainId,
      capability: account.capability ?? linkedWallet?.capability,
      linked: account.linked ?? Boolean(linkedWallet)
    };
  });
}
function connectedLinkState(entry) {
  if (entry.linked) return "Linked";
  return entry.family === "evm" ? "Verify to link" : "Connected only";
}
function buildAccountAccessEntries(linkedAccounts, wallets) {
  return {
    standaloneAccounts: [...linkedAccounts],
    standaloneWallets: wallets.filter(
      (wallet) => providerBackedAccountProvider(wallet) === null
    )
  };
}

// src/components/control-bar/wallet-picker.tsx
import { Fragment as Fragment4, jsx as jsx24, jsxs as jsxs15 } from "react/jsx-runtime";
var GENERIC_BROWSER_WALLET_ID = "generic-browser-wallet";
function walletStatusLabel(option) {
  if (option.status === "unavailable") return "Not installed";
  return "Ready";
}
function statusRank(option) {
  if (option.status === "available") return 1;
  return 3;
}
function walletDisplayRank(option) {
  const id = option.id.toLowerCase();
  const label = option.label.toLowerCase();
  if (id === GENERIC_BROWSER_WALLET_ID) return 30;
  if (id.includes("metamask") || label.includes("metamask")) return 0;
  if (id.includes("rabby") || label.includes("rabby")) return 1;
  if (id.includes("phantom") || label.includes("phantom")) return 2;
  if (id.includes("solflare") || label.includes("solflare")) return 3;
  if (id.includes("backpack") || label.includes("backpack")) return 4;
  if (id.includes("coinbase") || label.includes("coinbase")) return 5;
  if (id.includes("walletconnect") || label.includes("walletconnect")) return 6;
  return 20;
}
function walletAliasKey(wallet) {
  const combined = `${wallet.id} ${wallet.label}`;
  const brandKey = canonicalWalletKey(combined);
  return brandKey === normalizeWalletOptionId(combined) ? canonicalWalletKey(wallet.label) : brandKey;
}
function walletFamilyAliasKey(wallet) {
  return `${wallet.family}:${walletAliasKey(wallet)}`;
}
function isGenericBrowserWallet(wallet) {
  const label = normalizeWalletOptionId(wallet.label);
  const id = normalizeWalletOptionId(wallet.id);
  const connectorId = normalizeWalletOptionId(wallet.provider ?? "");
  return label === "browserwallet" || id === "injected" || connectorId === "injected";
}
function buildConnectedWalletRows(walletRows, identity) {
  if (!identity.isConnected) return [];
  return walletRows.filter(
    (row) => row.source === "live" && (row.status === "active" || row.status === "connected")
  );
}
function dedupeWalletActions(actions) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const action of actions) {
    const key = walletFamilyAliasKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }
  return result;
}
function walletActionIsVisible(wallet) {
  if (wallet.id === GENERIC_BROWSER_WALLET_ID) return true;
  if (wallet.status === "unavailable") return false;
  if (wallet.family === "evm" && wallet.status !== "available") {
    const key = canonicalWalletKey(`${wallet.id} ${wallet.label}`);
    return key === "coinbase" || key === "basewallet" || key === "base";
  }
  return true;
}
function isExternalHandoff(wallet) {
  return wallet.kind === "walletconnect";
}
function toPublicFamily(family) {
  return family === "svm" ? "solana" : family;
}
function WalletPicker() {
  const { open, closePicker } = useWalletPicker();
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const [pending, setPending] = useState9(null);
  const [actionError, setActionError] = useState9(null);
  const [addOpen, setAddOpen] = useState9(false);
  const autoLinkAttempted = useRef2(/* @__PURE__ */ new Set());
  const [view, setView] = useState9("wallets");
  const canActivateWallet = useWalletActivationGuard();
  useEffect4(() => {
    if (!open) {
      setPending(null);
      setActionError(null);
      setAddOpen(false);
      setView("wallets");
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    const handleKey = (e) => {
      if (e.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open, closePicker]);
  const runAction = useCallback3(
    async (key, fn, guard = false) => {
      if (guard && !canActivateWallet()) return;
      setPending(key);
      setActionError(null);
      try {
        await fn();
      } catch (err) {
        console.warn("[WalletPicker] action failed", key, err);
        setActionError(
          err instanceof Error && err.message ? err.message : "Wallet action failed"
        );
      } finally {
        setPending(null);
      }
    },
    [canActivateWallet]
  );
  const walletRows = adapter.walletModalRows ?? [];
  const connectedAccounts = useMemo3(
    () => buildConnectedWalletRows(walletRows, identity),
    [identity, walletRows]
  );
  const canManageAccounts = Boolean(
    adapter.openAccountUI && adapter.canOpenAccountUI
  );
  useEffect4(() => {
    if (!open || pending !== null || !adapter.accountUser || !adapter.linkWallet || (adapter.accountWallets?.length ?? 0) > 0) {
      return;
    }
    const target = connectedAccounts.find(
      (account) => account.family === "evm" && !account.linked && Boolean(account.address)
    );
    if (!target?.address) return;
    const key = `${target.family}:${target.id}:${target.address.toLowerCase()}`;
    if (autoLinkAttempted.current.has(key)) return;
    autoLinkAttempted.current.add(key);
    void runAction(
      `link:${target.id}`,
      () => adapter.linkWallet({
        accountId: target.id,
        family: target.family,
        address: target.address,
        chainId: target.chainId
      })
    );
  }, [
    adapter,
    adapter.accountUser,
    adapter.accountWallets,
    adapter.linkWallet,
    connectedAccounts,
    open,
    pending,
    runAction
  ]);
  const walletActions = useMemo3(() => {
    const optionRows = walletRows.filter(
      (row) => (row.source === "option" || row.source === "stored" && row.actions.some((action) => action.kind === "authenticate")) && row.actions.some(
        (action) => action.kind === "connect" || action.kind === "authenticate"
      )
    ).map((row) => {
      const action = row.actions.find(
        (candidate) => candidate.kind === "connect" || candidate.kind === "authenticate"
      );
      return {
        ...row,
        ready: row.status !== "unavailable",
        description: row.kind === "social" ? "Fast account sign-in" : row.family === "svm" ? "Connect a Solana wallet" : "Connect an Ethereum wallet",
        actionKey: `${action?.kind ?? "connect"}:${row.family}:${row.id}`,
        connect: async () => {
          if (action?.kind === "authenticate") {
            if (adapter.connectSocial && row.kind === "social") {
              await adapter.connectSocial(row.id);
              return;
            }
            await adapter.connect({ family: toPublicFamily(row.family) });
            return;
          }
          if (row.source === "stored") {
            await adapter.connect({ family: toPublicFamily(row.family) });
            return;
          }
          if (row.family === "svm") {
            if (adapter.connectSolanaWallet) {
              await adapter.connectSolanaWallet(row.id);
              return;
            }
            await adapter.connect({ family: "solana" });
            return;
          }
          if (adapter.connectEvmWallet) {
            await adapter.connectEvmWallet(row.id);
            return;
          }
          await adapter.connect({ family: "evm" });
        }
      };
    });
    const browserWallet = optionRows.find(isGenericBrowserWallet);
    const walletRowsWithoutBrowser = optionRows.filter(
      (wallet) => !isGenericBrowserWallet(wallet)
    );
    const genericBrowserWallet = adapter.canConnect ? [
      {
        id: GENERIC_BROWSER_WALLET_ID,
        provider: browserWallet?.provider ?? "injected",
        label: "Browser wallet",
        family: "evm",
        kind: "evm",
        source: "option",
        status: browserWallet?.status ?? "available",
        actions: [{ kind: "connect", label: "Connect" }],
        ready: browserWallet?.ready ?? true,
        iconUrl: browserWallet?.iconUrl,
        description: "Connect an Ethereum wallet",
        actionKey: "connect-browser-wallet",
        connect: async () => {
          if (browserWallet) {
            await browserWallet.connect();
            return;
          }
          if (adapter.connectEvmWallet) {
            await adapter.connectEvmWallet("injected");
            return;
          }
          await adapter.connect({ family: "evm" });
        }
      }
    ] : [];
    return dedupeWalletActions([
      ...walletRowsWithoutBrowser,
      ...genericBrowserWallet
    ]).filter(walletActionIsVisible).sort((a, b) => {
      const priority = walletDisplayRank(a) - walletDisplayRank(b);
      if (priority !== 0) return priority;
      return statusRank(a) - statusRank(b) || a.label.localeCompare(b.label);
    });
  }, [
    adapter,
    adapter.canConnect,
    adapter.connectEvmWallet,
    adapter.connectSolanaWallet,
    adapter.connectSocial,
    walletRows
  ]);
  const connectedFamilyBrandKeys = useMemo3(() => {
    const set = /* @__PURE__ */ new Set();
    for (const account of connectedAccounts) {
      const name = account.walletName ?? account.label ?? "";
      set.add(
        walletFamilyAliasKey({ id: name, label: name, family: account.family })
      );
    }
    return set;
  }, [connectedAccounts]);
  const addableWalletActions = useMemo3(
    () => walletActions.filter(
      (wallet) => wallet.kind !== "social" && !wallet.actions.some((action) => action.kind === "authenticate") && (wallet.id === GENERIC_BROWSER_WALLET_ID || !connectedFamilyBrandKeys.has(walletFamilyAliasKey(wallet)))
    ),
    [walletActions, connectedFamilyBrandKeys]
  );
  const socialLoginOptions = useMemo3(
    () => walletActions.filter(
      (action) => action.kind === "social" || action.actions.some((rowAction) => rowAction.kind === "authenticate")
    ),
    [walletActions]
  );
  const providerSignInOptions = useMemo3(
    () => filterQuickSignInOptions(socialLoginOptions, identity.walletProvider),
    [identity.walletProvider, socialLoginOptions]
  );
  const providerSubtitle = identity.secondaryLabel ?? formatAuthMethod(identity.authProvider);
  const providerBrandLabel = formatWalletProvider(identity.walletProvider);
  const hasConnectedWallets = connectedAccounts.length > 0;
  const providerAccountConnected = Boolean(
    identity.walletProviderSubject || connectedAccounts.some((account) => account.manageable)
  );
  const supportedEvmChains = adapter.supportedNetworks?.evm ?? adapter.supportedChains ?? [];
  const socialOptionsToShow = providerAccountConnected ? [] : providerSignInOptions;
  const hasAccountManagement = Boolean(adapter.accountUser);
  const accountView = hasAccountManagement && view === "account";
  const accountDisplayName = adapter.accountUser?.displayName ?? accountProfileEmail(adapter.accountUser) ?? identity.primaryLabel ?? identity.authValue ?? providerBrandLabel ?? "Your account";
  const pickerTitle = hasConnectedWallets ? "Manage wallets" : "Select a wallet";
  const pickerDescription = hasConnectedWallets ? "Switch wallets or link another one." : "Sign in quickly, or connect a wallet.";
  useEffect4(() => {
    if (!hasAccountManagement && view !== "wallets") setView("wallets");
  }, [hasAccountManagement, view]);
  const signOutAccount = useCallback3(async () => {
    await adapter.disconnect?.({ family: "all" });
    await adapter.signOutAccount?.();
  }, [adapter]);
  const deleteAccount = useCallback3(async () => {
    const confirmed = window.confirm(
      "Delete this Aomi account? Linked wallets and sign-ins will be freed for a new account."
    );
    if (!confirmed) return;
    await adapter.disconnect?.({ family: "all" });
    await adapter.deleteAccount?.();
  }, [adapter]);
  const quickSignInSection = socialOptionsToShow.length ? /* @__PURE__ */ jsxs15("section", { className: "flex flex-col gap-1.5", children: [
    /* @__PURE__ */ jsx24(SectionLabel, { children: "Quick sign-in" }),
    socialOptionsToShow.map((option) => /* @__PURE__ */ jsx24(
      SocialLoginRow,
      {
        option,
        pending,
        brandLabel: providerBrandLabel,
        onClick: () => void runAction(`social:${option.id}`, async () => {
          await option.connect();
          closePicker();
        })
      },
      option.id
    ))
  ] }) : null;
  const filterRowActions = (account) => account.actions.filter((action) => {
    if (action.kind === "manage") return canManageAccounts;
    if (action.kind === "link") {
      return Boolean(adapter.linkWallet && account.family === "evm");
    }
    if (action.kind === "disconnect" || action.kind === "signout") {
      return Boolean(adapter.disconnect || adapter.signOutAccount);
    }
    return false;
  });
  const runConnectedAction = ({ action, account }) => {
    const actionKey = `${action.kind}:${account.id}`;
    if (action.kind === "manage") {
      void runAction(actionKey, async () => {
        await adapter.openAccountUI?.({
          family: toPublicFamily(account.family)
        });
        closePicker();
      });
      return;
    }
    if (action.kind === "link") {
      if (!account.address) return;
      void runAction(
        actionKey,
        () => adapter.linkWallet({
          accountId: account.id,
          family: account.family,
          address: account.address,
          chainId: account.chainId
        })
      );
      return;
    }
    if (action.kind === "signout") {
      void runAction(actionKey, signOutAccount, true);
      return;
    }
    if (action.kind === "disconnect") {
      void runAction(
        actionKey,
        () => adapter.disconnect({
          ...account.family === "evm" ? { accountId: account.id } : { family: "solana" }
        }),
        true
      );
    }
  };
  const renderConnectedAccount = (account) => {
    const provider = providerBackedAccountProvider(account);
    const title = providerBackedWalletTitle(account);
    const svmCluster = identity.svmCluster?.replace("solana:", "");
    const detail = account.family === "evm" ? networkNameForChain(account.chainId, supportedEvmChains) ?? networkNameForChain(identity.chainId, supportedEvmChains) ?? void 0 : svmCluster ? svmCluster.charAt(0).toUpperCase() + svmCluster.slice(1) : void 0;
    const linkedWallet = (adapter.accountWallets ?? []).find(
      (wallet) => wallet.family === account.family && sameWalletAddress(wallet.family, wallet.address, account.address)
    );
    const capability = account.capability ?? linkedWallet?.capability;
    const addressText = account.label ?? formatWalletAddress(account.address ?? "") ?? "";
    const active = account.status === "active";
    const selectable = account.family === "evm" && account.status !== "active" && account.source === "live" && account.capability !== "read";
    const actions = [];
    for (const action of filterRowActions(account)) {
      actions.push({ action, account });
    }
    const providerHint = account.linkedVia && account.linkedVia !== "challenge" && account.linkedVia !== "import" && account.linkedVia !== "observed" ? account.linkedVia : provider !== null ? provider : account.manageable ? identity.embeddedProvider ?? identity.sessionProvider ?? identity.walletProvider : void 0;
    return /* @__PURE__ */ jsx24(
      ConnectedWalletRow,
      {
        title,
        iconId: provider !== null ? provider : account.id,
        iconLabel: title,
        iconProvider: provider ?? providerHint,
        family: account.family,
        capability,
        addressText,
        detail,
        active,
        selectKey: selectable ? `select:${account.id}` : void 0,
        pending,
        onSelect: selectable ? () => void runAction(
          `select:${account.id}`,
          () => adapter.selectAccount(account.id),
          true
        ) : void 0,
        actions,
        onAction: runConnectedAction
      },
      `row:${account.family}:${account.id}:${account.address ?? ""}`
    );
  };
  const connectedSection = hasConnectedWallets ? /* @__PURE__ */ jsxs15("section", { className: "flex flex-col gap-1.5", children: [
    /* @__PURE__ */ jsx24(SectionLabel, { children: "Connected" }),
    connectedAccounts.map(renderConnectedAccount)
  ] }) : null;
  const renderWalletActionRow = (wallet) => /* @__PURE__ */ jsx24(
    WalletActionRow,
    {
      wallet,
      pending,
      linkedMode: hasConnectedWallets,
      onClick: () => void runAction(
        wallet.actionKey,
        async () => {
          await wallet.connect();
          if (isExternalHandoff(wallet)) {
            closePicker();
          } else {
            setAddOpen(false);
          }
        },
        true
      )
    },
    `${wallet.family}:${wallet.id}`
  );
  const renderGroupedActions = (actions) => {
    const ordered = [
      ...actions.filter(
        (a) => a.family === "evm" && a.id !== GENERIC_BROWSER_WALLET_ID
      ),
      ...actions.filter((a) => a.family === "svm"),
      ...actions.filter((a) => a.family !== "evm" && a.family !== "svm"),
      ...actions.filter((a) => a.id === GENERIC_BROWSER_WALLET_ID)
    ];
    return ordered.map(renderWalletActionRow);
  };
  const addWalletSection = addableWalletActions.length ? hasConnectedWallets ? /* @__PURE__ */ jsxs15("section", { className: "flex flex-col gap-1.5", children: [
    /* @__PURE__ */ jsxs15(
      "button",
      {
        type: "button",
        onClick: () => setAddOpen((value) => !value),
        "aria-expanded": addOpen,
        "aria-label": "Add another wallet",
        className: cn17(
          "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors"
        ),
        children: [
          /* @__PURE__ */ jsx24("span", { className: "bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl", children: /* @__PURE__ */ jsx24(PlusIcon, { className: "size-4" }) }),
          /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsx24("span", { className: "block truncate text-sm font-medium", children: "Add another wallet" }),
            /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: "Link an Ethereum or Solana wallet" })
          ] }),
          /* @__PURE__ */ jsx24(
            ChevronDownIcon5,
            {
              className: cn17(
                "text-muted-foreground size-4 shrink-0 transition-transform duration-300 ease-out",
                addOpen && "rotate-180"
              )
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx24(
      "div",
      {
        "aria-hidden": !addOpen,
        className: cn17(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          addOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        ),
        children: /* @__PURE__ */ jsx24("div", { className: "overflow-hidden", children: /* @__PURE__ */ jsx24("div", { className: "flex flex-col gap-1.5 pt-1.5", children: renderGroupedActions(addableWalletActions) }) })
      }
    )
  ] }) : /* @__PURE__ */ jsxs15("section", { className: "flex flex-col gap-1.5", children: [
    /* @__PURE__ */ jsx24(SectionLabel, { children: "Wallets" }),
    renderGroupedActions(addableWalletActions)
  ] }) : null;
  if (!open) return null;
  return /* @__PURE__ */ jsxs15(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "aomi-wallet-picker-title",
      className: "animate-in fade-in-0 fixed inset-0 z-50 flex items-center justify-center px-4 py-4 duration-150",
      children: [
        /* @__PURE__ */ jsx24(
          "button",
          {
            type: "button",
            "aria-label": "Close",
            onClick: closePicker,
            className: "absolute inset-0 cursor-default bg-slate-950/25 backdrop-blur-sm dark:bg-black/45"
          }
        ),
        /* @__PURE__ */ jsx24(
          "div",
          {
            className: cn17(
              "relative z-10 flex max-h-[min(720px,92vh)] w-full max-w-[430px] flex-col overflow-hidden",
              "border-border/80 bg-popover text-popover-foreground rounded-[24px] border text-left shadow-2xl ring-1 ring-black/[0.03]",
              "animate-in zoom-in-95 fade-in-0 duration-200"
            ),
            children: /* @__PURE__ */ jsxs15(
              "div",
              {
                className: cn17(
                  "flex min-h-0 w-[200%] flex-1 transition-transform duration-300 ease-out",
                  accountView ? "-translate-x-1/2" : "translate-x-0"
                ),
                children: [
                  /* @__PURE__ */ jsxs15(
                    "section",
                    {
                      inert: accountView ? true : void 0,
                      className: cn17(
                        "flex w-1/2 min-w-0 shrink-0 flex-col",
                        accountView && "h-0 overflow-hidden"
                      ),
                      children: [
                        /* @__PURE__ */ jsxs15("div", { className: "border-border/70 bg-background/80 flex items-start gap-3 border-b px-4 pb-3 pt-4", children: [
                          /* @__PURE__ */ jsx24("span", { className: "bg-muted/70 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl", children: /* @__PURE__ */ jsx24(WalletIcon3, { className: "size-5" }) }),
                          /* @__PURE__ */ jsxs15("div", { className: "min-w-0 flex-1", children: [
                            /* @__PURE__ */ jsx24(
                              "h2",
                              {
                                id: "aomi-wallet-picker-title",
                                className: "text-foreground text-base font-semibold tracking-tight",
                                children: pickerTitle
                              }
                            ),
                            /* @__PURE__ */ jsx24("p", { className: "text-muted-foreground mt-0.5 text-xs leading-snug", children: pickerDescription })
                          ] }),
                          /* @__PURE__ */ jsxs15("div", { className: "flex h-8 shrink-0 items-center gap-1.5", children: [
                            hasAccountManagement ? /* @__PURE__ */ jsx24(
                              ManageAccountButton,
                              {
                                pending,
                                providerSubtitle,
                                onClick: () => setView("account")
                              }
                            ) : null,
                            /* @__PURE__ */ jsx24(
                              "button",
                              {
                                type: "button",
                                onClick: closePicker,
                                "aria-label": "Close",
                                className: "text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors",
                                children: /* @__PURE__ */ jsx24(XIcon3, { className: "size-4" })
                              }
                            )
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs15("div", { className: "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5", children: [
                          actionError ? /* @__PURE__ */ jsx24(
                            "div",
                            {
                              role: "alert",
                              className: "border-destructive/25 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-xs leading-snug",
                              children: actionError
                            }
                          ) : null,
                          hasConnectedWallets ? /* @__PURE__ */ jsxs15(Fragment4, { children: [
                            connectedSection,
                            (quickSignInSection || addWalletSection) && /* @__PURE__ */ jsx24("div", { className: "bg-border/70 h-px", "aria-hidden": "true" }),
                            quickSignInSection,
                            addWalletSection
                          ] }) : /* @__PURE__ */ jsxs15(Fragment4, { children: [
                            quickSignInSection,
                            addWalletSection
                          ] })
                        ] })
                      ]
                    }
                  ),
                  hasAccountManagement ? /* @__PURE__ */ jsx24(
                    AccountManagerPanel,
                    {
                      inertPanel: !accountView,
                      pending,
                      displayName: accountDisplayName,
                      subtitle: providerSubtitle,
                      brandLabel: providerBrandLabel,
                      user: adapter.accountUser,
                      linkedAccounts: adapter.accountLinkedAccounts ?? [],
                      wallets: adapter.accountWallets ?? [],
                      connectedAccounts,
                      connectedCount: connectedAccounts.length,
                      supportedEvmChains,
                      canManageProvider: canManageAccounts,
                      canSignOut: Boolean(adapter.signOutAccount || adapter.disconnect),
                      canDeleteAccount: Boolean(adapter.deleteAccount),
                      onBack: () => setView("wallets"),
                      onClose: closePicker,
                      onRenameWallet: adapter.updateLinkedWallet ? (input) => runAction(
                        `wallet:rename:${input.walletId}`,
                        () => adapter.updateLinkedWallet(input)
                      ) : void 0,
                      onRenameAccount: adapter.updateAccount ? (input) => runAction(
                        "account:rename",
                        () => adapter.updateAccount(input)
                      ) : void 0,
                      onRenameLinkedAccount: adapter.updateLinkedAccount ? (input) => runAction(
                        `identity:rename:${input.identityId}`,
                        () => adapter.updateLinkedAccount(input)
                      ) : void 0,
                      onUnlinkWallet: adapter.unlinkLinkedWallet ? (walletId) => runAction(
                        `wallet:unlink:${walletId}`,
                        () => adapter.unlinkLinkedWallet(walletId)
                      ) : void 0,
                      onUnlinkAccount: adapter.unlinkLinkedAccount ? (identityId) => runAction(
                        `identity:unlink:${identityId}`,
                        () => adapter.unlinkLinkedAccount(identityId)
                      ) : void 0,
                      onSignOut: () => void runAction("account:signout", signOutAccount, true),
                      onDeleteAccount: () => void runAction("account:delete", deleteAccount, true),
                      onOpenProviderUI: () => void runAction("manage:account", async () => {
                        await adapter.openAccountUI?.();
                        closePicker();
                      })
                    }
                  ) : null
                ]
              }
            )
          }
        )
      ]
    }
  );
}
function SectionLabel({ children }) {
  return /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground/90 px-1 text-[11px] font-semibold uppercase tracking-wide", children });
}
function filterQuickSignInOptions(options, authProvider) {
  const providerAuthOptions = new Set(
    options.filter((option) => option.kind === "social").map((option) => quickSignInProvider(option, authProvider)).filter((provider) => provider !== null)
  );
  const seenSocialProviders = /* @__PURE__ */ new Set();
  const seenStoredProviders = /* @__PURE__ */ new Set();
  return options.filter((option) => {
    const provider = quickSignInProvider(option, authProvider);
    if (option.kind === "social" && provider !== null) {
      if (seenSocialProviders.has(provider)) return false;
      seenSocialProviders.add(provider);
      return true;
    }
    const storedProviderAuth = option.source === "stored" && provider !== null && option.actions.some((action) => action.kind === "authenticate");
    if (!storedProviderAuth) return true;
    if (providerAuthOptions.has(provider)) return false;
    if (seenStoredProviders.has(provider)) return false;
    seenStoredProviders.add(provider);
    return true;
  });
}
function quickSignInProvider(option, authProvider) {
  if (option.kind === "social") {
    return option.provider ?? authProvider ?? option.id;
  }
  return option.provider ?? null;
}
function ChainTag({
  family,
  capability
}) {
  const isSolana = family === "svm";
  const dotColor = capability === "read" ? "bg-amber-500" : "bg-emerald-500";
  return /* @__PURE__ */ jsxs15(
    "span",
    {
      className: "text-muted-foreground/70 inline-flex min-w-0 shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide",
      title: isSolana ? "Solana (SVM)" : "Ethereum-compatible wallet",
      children: [
        /* @__PURE__ */ jsx24("span", { className: cn17("size-1.5 rounded-full", dotColor) }),
        /* @__PURE__ */ jsx24("span", { className: "max-w-20 truncate", children: isSolana ? "SVM" : "EVM" })
      ]
    }
  );
}
function networkNameForChain(chainId, supportedEvmChains) {
  if (!chainId) return null;
  const configured = supportedEvmChains?.find((chain) => chain.id === chainId);
  if (configured) return configured.name;
  return supportedEvmChains && supportedEvmChains.length > 0 ? null : getChainInfo3(chainId)?.name ?? null;
}
function ManageAccountButton({
  pending,
  providerSubtitle,
  onClick
}) {
  return /* @__PURE__ */ jsxs15(
    "button",
    {
      type: "button",
      disabled: pending !== null,
      onClick,
      "aria-label": "Manage your account",
      title: providerSubtitle ? `Signed in with ${providerSubtitle}` : "Aomi account settings",
      className: cn17(
        "border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-70"
      ),
      children: [
        /* @__PURE__ */ jsx24(UserRoundIcon, { className: "size-3.5 shrink-0" }),
        /* @__PURE__ */ jsx24("span", { children: "Account" })
      ]
    }
  );
}
function AccountManagerPanel({
  inertPanel,
  pending,
  displayName,
  subtitle,
  brandLabel,
  user,
  linkedAccounts,
  wallets,
  connectedAccounts,
  connectedCount,
  supportedEvmChains,
  canManageProvider,
  canSignOut,
  canDeleteAccount,
  onBack,
  onClose,
  onRenameAccount,
  onRenameLinkedAccount,
  onRenameWallet,
  onUnlinkWallet,
  onUnlinkAccount,
  onSignOut,
  onDeleteAccount,
  onOpenProviderUI
}) {
  const [editingWalletId, setEditingWalletId] = useState9(null);
  const [editingLinkedAccountId, setEditingLinkedAccountId] = useState9(null);
  const [draftLabel, setDraftLabel] = useState9("");
  const [draftLinkedAccountLabel, setDraftLinkedAccountLabel] = useState9("");
  const [editingAccountName, setEditingAccountName] = useState9(false);
  const [draftAccountName, setDraftAccountName] = useState9("");
  const walletSummary = `${connectedCount} wallet${connectedCount === 1 ? "" : "s"} connected`;
  const userEmail = user?.email && !isSyntheticAomiEmail(user.email) ? user.email : void 0;
  const headerTitle = formatAccountDisplayName(displayName);
  const headerTitleIsEmail = userEmail !== void 0 && headerTitle.toLowerCase() === userEmail.toLowerCase();
  const primarySubtitle = userEmail && !headerTitleIsEmail ? userEmail : user ? walletSummary : subtitle ?? walletSummary;
  const visibleLinkedAccounts = linkedAccounts.filter(isVisibleLinkedAccount);
  const connectedEntries = buildConnectedEntries(connectedAccounts, wallets);
  const { standaloneAccounts, standaloneWallets } = buildAccountAccessEntries(
    visibleLinkedAccounts,
    wallets
  );
  const hasAccountAccess = standaloneAccounts.length > 0 || standaloneWallets.length > 0;
  const headerBrandLabel = user ? void 0 : brandLabel;
  const startRenaming = (wallet) => {
    setEditingWalletId(wallet.id);
    setDraftLabel(wallet.label ?? "");
  };
  const startRenamingLinkedAccount = (account) => {
    setEditingLinkedAccountId(account.id);
    setDraftLinkedAccountLabel(linkedAccountTitle(account));
  };
  const startRenamingAccount = () => {
    setEditingAccountName(true);
    setDraftAccountName(displayName);
  };
  const submitAccountRename = async () => {
    if (!onRenameAccount) return;
    await onRenameAccount({ displayName: draftAccountName.trim() || null });
    setEditingAccountName(false);
  };
  const submitRename = async (wallet) => {
    if (!onRenameWallet) return;
    await onRenameWallet({
      walletId: wallet.id,
      label: draftLabel.trim() || null
    });
    setEditingWalletId(null);
  };
  const submitLinkedAccountRename = async (account) => {
    if (!onRenameLinkedAccount) return;
    await onRenameLinkedAccount({
      identityId: account.id,
      displayLabel: draftLinkedAccountLabel.trim() || null
    });
    setEditingLinkedAccountId(null);
  };
  return /* @__PURE__ */ jsxs15(
    "section",
    {
      inert: inertPanel ? true : void 0,
      className: cn17(
        "flex w-1/2 min-w-0 shrink-0 flex-col",
        inertPanel && "h-0 overflow-hidden"
      ),
      children: [
        /* @__PURE__ */ jsxs15("div", { className: "border-border/70 bg-background/80 flex items-center gap-2 border-b px-3 pb-3 pt-4", children: [
          /* @__PURE__ */ jsx24(
            "button",
            {
              type: "button",
              onClick: onBack,
              "aria-label": "Back to wallets",
              className: "text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              children: /* @__PURE__ */ jsx24(ChevronLeftIcon, { className: "size-4" })
            }
          ),
          /* @__PURE__ */ jsxs15("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsx24("h2", { className: "text-foreground text-base font-semibold tracking-tight", children: "Manage account" }),
            /* @__PURE__ */ jsx24("p", { className: "text-muted-foreground mt-0.5 text-xs leading-snug", children: "Manage your linked wallets and sign-in methods." })
          ] }),
          /* @__PURE__ */ jsx24(
            "button",
            {
              type: "button",
              onClick: onClose,
              "aria-label": "Close",
              className: "text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              children: /* @__PURE__ */ jsx24(XIcon3, { className: "size-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs15("div", { className: "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5", children: [
          /* @__PURE__ */ jsxs15("div", { className: "border-border/70 bg-card flex items-center gap-3 rounded-xl border px-3 py-2.5", children: [
            /* @__PURE__ */ jsx24("span", { className: "bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl", children: headerBrandLabel ? /* @__PURE__ */ jsx24(WalletIconSlot, { id: headerBrandLabel, label: headerBrandLabel }) : /* @__PURE__ */ jsx24(UserRoundIcon, { className: "size-4" }) }),
            /* @__PURE__ */ jsx24("div", { className: "min-w-0 flex-1", children: editingAccountName ? /* @__PURE__ */ jsx24(
              "input",
              {
                value: draftAccountName,
                onChange: (event) => setDraftAccountName(event.target.value),
                disabled: pending === "account:rename",
                "aria-label": "Account display name",
                className: "border-input bg-background text-foreground focus:border-primary h-8 w-full rounded-lg border px-2 text-sm outline-none"
              }
            ) : /* @__PURE__ */ jsxs15(Fragment4, { children: [
              /* @__PURE__ */ jsx24("p", { className: "text-foreground truncate text-sm font-semibold", children: headerTitle }),
              /* @__PURE__ */ jsx24("p", { className: "text-muted-foreground truncate text-[11px]", children: primarySubtitle })
            ] }) }),
            onRenameAccount ? /* @__PURE__ */ jsx24("div", { className: "flex shrink-0 items-center gap-1", children: editingAccountName ? /* @__PURE__ */ jsxs15(Fragment4, { children: [
              /* @__PURE__ */ jsx24(
                RowIconButton,
                {
                  icon: CheckIcon7,
                  ariaLabel: "Save account display name",
                  disabled: pending === "account:rename",
                  loading: pending === "account:rename",
                  onClick: submitAccountRename
                }
              ),
              /* @__PURE__ */ jsx24(
                RowIconButton,
                {
                  icon: XIcon3,
                  ariaLabel: "Cancel account display name edit",
                  disabled: pending === "account:rename",
                  onClick: () => setEditingAccountName(false)
                }
              )
            ] }) : /* @__PURE__ */ jsx24(
              RowIconButton,
              {
                icon: PencilIcon,
                ariaLabel: "Rename account",
                disabled: pending !== null,
                onClick: startRenamingAccount
              }
            ) }) : null
          ] }),
          /* @__PURE__ */ jsxs15("section", { className: "flex flex-col gap-1.5", children: [
            /* @__PURE__ */ jsx24(SectionLabel, { children: "Connected now" }),
            connectedEntries.map((entry) => /* @__PURE__ */ jsx24(
              ConnectedWalletSummaryRow,
              {
                entry,
                supportedEvmChains
              },
              entry.key
            ))
          ] }),
          hasAccountAccess ? /* @__PURE__ */ jsxs15("section", { className: "flex flex-col gap-1.5", children: [
            /* @__PURE__ */ jsx24(SectionLabel, { children: "Account access" }),
            standaloneAccounts.map((account) => /* @__PURE__ */ jsx24(
              LinkedAuthAccountRow,
              {
                account,
                editing: editingLinkedAccountId === account.id,
                draftLabel: draftLinkedAccountLabel,
                pending,
                onDraftLabelChange: setDraftLinkedAccountLabel,
                onStartRename: onRenameLinkedAccount ? () => startRenamingLinkedAccount(account) : void 0,
                onCancelRename: () => setEditingLinkedAccountId(null),
                onSubmitRename: () => void submitLinkedAccountRename(account),
                onUnlink: onUnlinkAccount ? () => void onUnlinkAccount(account.id) : void 0
              },
              account.id
            )),
            standaloneWallets.map((wallet) => /* @__PURE__ */ jsx24(
              LinkedWalletManagementRow,
              {
                wallet,
                supportedEvmChains,
                live: connectedAccounts.some(
                  (account) => account.family === wallet.family && sameWalletAddress(
                    wallet.family,
                    wallet.address,
                    account.address
                  )
                ),
                editing: editingWalletId === wallet.id,
                draftLabel,
                pending,
                onDraftLabelChange: setDraftLabel,
                onStartRename: () => startRenaming(wallet),
                onCancelRename: () => setEditingWalletId(null),
                onSubmitRename: () => void submitRename(wallet),
                onUnlink: onUnlinkWallet ? () => void onUnlinkWallet(wallet.id) : void 0
              },
              wallet.id
            ))
          ] }) : /* @__PURE__ */ jsxs15("section", { className: "flex flex-col gap-1.5", children: [
            /* @__PURE__ */ jsx24(SectionLabel, { children: "Account access" }),
            /* @__PURE__ */ jsxs15("div", { className: "border-border/60 bg-card/60 flex items-center gap-3 rounded-2xl border border-dashed px-3 py-2.5", children: [
              /* @__PURE__ */ jsx24("span", { className: "bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl", children: /* @__PURE__ */ jsx24(ShieldCheckIcon, { className: "size-4" }) }),
              /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsx24("span", { className: "text-foreground block truncate text-sm font-medium", children: "No linked access yet" }),
                /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: "Verify a wallet or sign in with an account provider" })
              ] })
            ] })
          ] }),
          canManageProvider ? /* @__PURE__ */ jsxs15(
            "button",
            {
              type: "button",
              onClick: onOpenProviderUI,
              disabled: pending !== null,
              className: "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsx24("span", { className: "bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl", children: /* @__PURE__ */ jsx24(Settings2Icon, { className: "size-4" }) }),
                /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsx24("span", { className: "text-foreground block truncate text-sm font-medium", children: "Open provider settings" }),
                  /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: "Manage this account with its provider" })
                ] }),
                pending === "manage:account" ? /* @__PURE__ */ jsx24(Loader2Icon, { className: "size-4 shrink-0 animate-spin" }) : /* @__PURE__ */ jsx24(ChevronRightIcon2, { className: "text-muted-foreground size-4 shrink-0" })
              ]
            }
          ) : null,
          canSignOut ? /* @__PURE__ */ jsxs15(
            "button",
            {
              type: "button",
              onClick: onSignOut,
              disabled: pending !== null,
              className: "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsx24("span", { className: "bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-xl", children: /* @__PURE__ */ jsx24(LogOutIcon, { className: "size-4" }) }),
                /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsx24("span", { className: "block truncate text-sm font-medium", children: "Sign out" }),
                  /* @__PURE__ */ jsx24("span", { className: "block truncate text-[11px] opacity-80", children: "End this account session" })
                ] }),
                pending === "account:signout" ? /* @__PURE__ */ jsx24(Loader2Icon, { className: "size-4 shrink-0 animate-spin" }) : null
              ]
            }
          ) : null,
          canDeleteAccount ? /* @__PURE__ */ jsxs15(
            "button",
            {
              type: "button",
              onClick: onDeleteAccount,
              disabled: pending !== null,
              className: "border-destructive/40 bg-background text-destructive hover:bg-destructive/10 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsx24("span", { className: "bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-xl", children: /* @__PURE__ */ jsx24(Trash2Icon, { className: "size-4" }) }),
                /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsx24("span", { className: "block truncate text-sm font-medium", children: "Delete account" }),
                  /* @__PURE__ */ jsx24("span", { className: "block truncate text-[11px] opacity-80", children: "Free linked wallets and sign-ins" })
                ] }),
                pending === "account:delete" ? /* @__PURE__ */ jsx24(Loader2Icon, { className: "size-4 shrink-0 animate-spin" }) : null
              ]
            }
          ) : null
        ] })
      ]
    }
  );
}
function isVisibleLinkedAccount(account) {
  return account.provider !== "better_auth" && account.provider !== "siwe" && account.provider !== "email";
}
function accountProfileEmail(user) {
  return user?.email && !isSyntheticAomiEmail(user.email) ? user.email : void 0;
}
function formatAccountDisplayName(value) {
  return /^0x[a-f0-9]{40}$/i.test(value) ? formatWalletAddress(value) ?? value : value;
}
function isSyntheticAomiEmail(email) {
  return /^0x[a-f0-9]{40}@aomi\.dev$/i.test(email) || /@auth\.aomi\.local$/i.test(email);
}
function chainIdFromScope(chainScope) {
  if (!chainScope) return void 0;
  const chainId = Number(chainScope);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : void 0;
}
function LinkedAuthAccountRow({
  account,
  editing,
  draftLabel,
  pending,
  onDraftLabelChange,
  onStartRename,
  onCancelRename,
  onSubmitRename,
  onUnlink
}) {
  const providerLabel = formatWalletProvider(account.provider) ?? account.provider;
  const title = linkedAccountTitle(account);
  const subtitle = linkedAccountSubtitle(account, title);
  const busy = pending === `identity:rename:${account.id}` || pending === `identity:unlink:${account.id}`;
  return /* @__PURE__ */ jsxs15("div", { className: "border-border/70 bg-card flex items-center gap-3 rounded-2xl border px-3 py-2.5", children: [
    /* @__PURE__ */ jsx24(
      WalletIconSlot,
      {
        id: account.provider,
        label: providerLabel,
        provider: account.provider
      }
    ),
    /* @__PURE__ */ jsx24("span", { className: "min-w-0 flex-1", children: editing ? /* @__PURE__ */ jsx24(
      "input",
      {
        value: draftLabel,
        onChange: (event) => onDraftLabelChange(event.target.value),
        disabled: busy,
        "aria-label": `Sign-in label for ${title}`,
        className: "border-input bg-background text-foreground focus:border-primary h-8 w-full rounded-lg border px-2 text-sm outline-none"
      }
    ) : /* @__PURE__ */ jsxs15(Fragment4, { children: [
      /* @__PURE__ */ jsx24("span", { className: "flex min-w-0 items-center gap-1.5", children: /* @__PURE__ */ jsx24("span", { className: "text-foreground truncate text-sm font-medium", children: title }) }),
      /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: subtitle })
    ] }) }),
    /* @__PURE__ */ jsx24("div", { className: "flex shrink-0 items-center gap-1", children: editing ? /* @__PURE__ */ jsxs15(Fragment4, { children: [
      /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: CheckIcon7,
          ariaLabel: `Save label for ${title}`,
          disabled: busy,
          loading: pending === `identity:rename:${account.id}`,
          onClick: onSubmitRename
        }
      ),
      /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: XIcon3,
          ariaLabel: `Cancel renaming ${title}`,
          disabled: busy,
          onClick: onCancelRename
        }
      )
    ] }) : /* @__PURE__ */ jsxs15(Fragment4, { children: [
      onStartRename ? /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: PencilIcon,
          ariaLabel: `Rename ${title}`,
          disabled: busy,
          onClick: onStartRename
        }
      ) : null,
      onUnlink ? /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: Trash2Icon,
          ariaLabel: `Unlink ${title}`,
          disabled: busy,
          loading: pending === `identity:unlink:${account.id}`,
          onClick: onUnlink
        }
      ) : /* @__PURE__ */ jsx24(CheckCircle2Icon, { className: "text-primary size-4 shrink-0" })
    ] }) })
  ] });
}
function linkedAccountSubtitle(account, title) {
  if (isProviderAuthAccount(account.provider)) {
    return "Provider sign-in";
  }
  if (account.email && !isSyntheticAomiEmail(account.email) && account.email.toLowerCase() !== title?.toLowerCase()) {
    return account.email;
  }
  return account.subject;
}
function linkedAccountTitle(account) {
  const providerLabel = formatWalletProvider(account.provider) ?? account.provider;
  const displayLabel = account.displayLabel?.trim();
  if (!displayLabel) return providerLabel;
  if (isProviderAuthAccount(account.provider) && account.email && displayLabel.toLowerCase() === account.email.toLowerCase()) {
    return providerLabel;
  }
  return displayLabel;
}
function isProviderAuthAccount(provider) {
  return provider === "para" || provider === "privy";
}
function ConnectedWalletSummaryRow({
  entry,
  supportedEvmChains
}) {
  const address = formatWalletAddress(entry.address);
  const networkName = entry.family === "evm" ? networkNameForChain(entry.chainId, supportedEvmChains) : null;
  const linkState = connectedLinkState(entry);
  return /* @__PURE__ */ jsxs15("div", { className: "border-border/70 bg-card flex items-center gap-3 rounded-2xl border px-3 py-2.5", children: [
    /* @__PURE__ */ jsx24(
      WalletIconSlot,
      {
        id: entry.iconId,
        label: entry.iconLabel,
        provider: entry.iconProvider
      }
    ),
    /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxs15("span", { className: "flex min-w-0 items-center gap-1.5", children: [
        /* @__PURE__ */ jsx24("span", { className: "text-foreground truncate text-sm font-medium", children: entry.title }),
        /* @__PURE__ */ jsx24(ChainTag, { family: entry.family, capability: entry.capability })
      ] }),
      /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: [address, networkName, linkState].filter(Boolean).join(" \xB7 ") })
    ] })
  ] });
}
function LinkedWalletManagementRow({
  wallet,
  supportedEvmChains,
  live,
  editing,
  draftLabel,
  pending,
  onDraftLabelChange,
  onStartRename,
  onCancelRename,
  onSubmitRename,
  onUnlink
}) {
  const providerTitle = providerBackedAccountProvider(wallet) ? providerBackedWalletTitle({
    provider: wallet.provider,
    walletName: wallet.label,
    family: wallet.family,
    kind: wallet.kind
  }) : null;
  const title = wallet.label ?? providerTitle ?? "Wallet";
  const busy = pending === `wallet:rename:${wallet.id}` || pending === `wallet:unlink:${wallet.id}`;
  const networkName = wallet.family === "evm" ? networkNameForChain(
    wallet.chainId ?? chainIdFromScope(wallet.chainScope),
    supportedEvmChains
  ) : void 0;
  return /* @__PURE__ */ jsxs15("div", { className: "border-border/70 bg-card flex items-center gap-3 rounded-2xl border px-3 py-2.5", children: [
    /* @__PURE__ */ jsx24(
      WalletIconSlot,
      {
        id: wallet.providerWalletId ?? wallet.provider ?? wallet.id,
        label: wallet.provider ?? title
      }
    ),
    /* @__PURE__ */ jsx24("span", { className: "min-w-0 flex-1", children: editing ? /* @__PURE__ */ jsx24(
      "input",
      {
        value: draftLabel,
        onChange: (event) => onDraftLabelChange(event.target.value),
        disabled: busy,
        "aria-label": `Wallet label for ${title}`,
        className: "border-input bg-background text-foreground focus:border-primary h-8 w-full rounded-lg border px-2 text-sm outline-none"
      }
    ) : /* @__PURE__ */ jsxs15(Fragment4, { children: [
      /* @__PURE__ */ jsxs15("span", { className: "flex min-w-0 items-center gap-1.5", children: [
        /* @__PURE__ */ jsx24("span", { className: "text-foreground truncate text-sm font-medium", children: title }),
        /* @__PURE__ */ jsx24(
          ChainTag,
          {
            family: wallet.family,
            capability: live ? "write" : wallet.capability
          }
        )
      ] }),
      /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: [formatWalletAddress(wallet.address), networkName].filter(Boolean).join(" \xB7 ") })
    ] }) }),
    /* @__PURE__ */ jsx24("div", { className: "flex shrink-0 items-center gap-1", children: editing ? /* @__PURE__ */ jsxs15(Fragment4, { children: [
      /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: CheckIcon7,
          ariaLabel: `Save label for ${title}`,
          disabled: busy,
          loading: pending === `wallet:rename:${wallet.id}`,
          onClick: onSubmitRename
        }
      ),
      /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: XIcon3,
          ariaLabel: `Cancel renaming ${title}`,
          disabled: busy,
          onClick: onCancelRename
        }
      )
    ] }) : /* @__PURE__ */ jsxs15(Fragment4, { children: [
      /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: PencilIcon,
          ariaLabel: `Rename ${title}`,
          disabled: busy,
          onClick: onStartRename
        }
      ),
      onUnlink ? /* @__PURE__ */ jsx24(
        RowIconButton,
        {
          icon: Trash2Icon,
          ariaLabel: `Unlink ${title}`,
          disabled: busy,
          loading: pending === `wallet:unlink:${wallet.id}`,
          onClick: onUnlink
        }
      ) : null
    ] }) })
  ] });
}
function ConnectedWalletRow({
  title,
  iconId,
  iconLabel,
  iconProvider,
  family,
  capability,
  addressText,
  detail,
  active,
  selectKey,
  pending,
  onSelect,
  actions,
  onAction
}) {
  const selectable = Boolean(onSelect);
  const isSelecting = selectKey != null && pending === selectKey;
  const inner = /* @__PURE__ */ jsxs15(Fragment4, { children: [
    /* @__PURE__ */ jsx24(WalletIconSlot, { id: iconId, label: iconLabel, provider: iconProvider }),
    /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxs15("span", { className: "flex min-w-0 items-center gap-1.5", children: [
        /* @__PURE__ */ jsx24("span", { className: "truncate text-sm font-medium", children: title }),
        /* @__PURE__ */ jsx24(ChainTag, { family, capability }),
        active ? /* @__PURE__ */ jsx24(CheckIcon7, { className: "text-primary size-3.5 shrink-0" }) : null
      ] }),
      /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: [addressText, detail].filter(Boolean).join(" \xB7 ") })
    ] })
  ] });
  return /* @__PURE__ */ jsxs15(
    "div",
    {
      className: cn17(
        "group flex items-center rounded-2xl border transition-colors duration-200",
        active ? "border-primary/35 bg-primary/[0.05]" : "border-border/70 bg-card",
        selectable && "hover:border-primary/40 hover:bg-accent/40 has-[:focus-visible]:border-primary/50"
      ),
      children: [
        selectable ? /* @__PURE__ */ jsxs15(
          "button",
          {
            type: "button",
            onClick: onSelect,
            disabled: pending !== null,
            "aria-label": `Make ${title} active`,
            className: cn17(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left outline-none",
              "disabled:cursor-default"
            ),
            children: [
              inner,
              isSelecting ? /* @__PURE__ */ jsx24("span", { className: "ml-1 flex shrink-0 items-center", children: /* @__PURE__ */ jsx24(Loader2Icon, { className: "text-muted-foreground size-4 animate-spin" }) }) : null
            ]
          }
        ) : /* @__PURE__ */ jsx24("div", { className: "flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5", children: inner }),
        /* @__PURE__ */ jsx24("div", { className: "flex shrink-0 items-center gap-1 py-2.5 pl-1 pr-2.5", children: actions.map(({ action, account }) => /* @__PURE__ */ jsx24(
          RowIconButton,
          {
            icon: action.kind === "manage" ? Settings2Icon : action.kind === "link" ? LinkIcon : LogOutIcon,
            ariaLabel: action.kind === "manage" ? `Manage ${title}` : action.kind === "link" ? `Verify ${title}` : action.kind === "signout" ? "Sign out" : `Disconnect ${familyLabel2(account.family)} wallet`,
            disabled: pending !== null,
            loading: pending === `${action.kind}:${account.id}`,
            onClick: () => onAction({ action, account })
          },
          `${action.kind}:${account.id}`
        )) })
      ]
    }
  );
}
function WalletActionRow({
  wallet,
  pending,
  linkedMode,
  onClick
}) {
  const disabled = wallet.ready === false || pending !== null;
  const showStatus = wallet.status === "unavailable";
  const actionVerb = linkedMode ? "Link" : "Connect";
  const description = wallet.description ?? (wallet.family === "svm" ? `${actionVerb} a Solana wallet` : `${actionVerb} an Ethereum wallet`);
  const visibleDescription = linkedMode ? description.replace(/^Connect /, "Link ") : description;
  return /* @__PURE__ */ jsxs15(
    "button",
    {
      type: "button",
      disabled,
      onClick,
      "aria-label": `${actionVerb} ${wallet.label}`,
      className: cn17(
        "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        "disabled:pointer-events-none disabled:opacity-50"
      ),
      children: [
        /* @__PURE__ */ jsx24(
          WalletIconSlot,
          {
            iconUrl: wallet.iconUrl,
            id: wallet.id,
            label: wallet.label
          }
        ),
        /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx24("span", { className: "block truncate text-sm font-medium", children: wallet.label }),
          /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: visibleDescription })
        ] }),
        showStatus ? /* @__PURE__ */ jsx24("span", { className: "bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", children: walletStatusLabel(wallet) }) : null,
        pending === wallet.actionKey ? /* @__PURE__ */ jsx24(Loader2Icon, { className: "size-4 shrink-0 animate-spin" }) : /* @__PURE__ */ jsx24(ChevronRightIcon2, { className: "text-muted-foreground size-4 shrink-0" })
      ]
    }
  );
}
function SocialLoginRow({
  option,
  pending,
  brandLabel,
  onClick
}) {
  const title = brandLabel ?? option.label;
  const subtitle = brandLabel ? option.label : option.description ?? "Use an Aomi account";
  return /* @__PURE__ */ jsxs15(
    "button",
    {
      type: "button",
      disabled: pending !== null || option.ready === false,
      onClick,
      "aria-label": option.label,
      className: cn17(
        "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        "disabled:pointer-events-none disabled:opacity-50"
      ),
      children: [
        brandLabel ? /* @__PURE__ */ jsx24(WalletIconSlot, { id: brandLabel, label: brandLabel }) : /* @__PURE__ */ jsx24("span", { className: "bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl", children: /* @__PURE__ */ jsx24(MailIcon, { className: "size-4" }) }),
        /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx24("span", { className: "block truncate text-sm font-medium", children: title }),
          /* @__PURE__ */ jsx24("span", { className: "text-muted-foreground block truncate text-[11px]", children: subtitle })
        ] }),
        pending === `social:${option.id}` ? /* @__PURE__ */ jsx24(Loader2Icon, { className: "size-4 shrink-0 animate-spin" }) : /* @__PURE__ */ jsx24(ChevronRightIcon2, { className: "text-muted-foreground size-4 shrink-0" })
      ]
    }
  );
}
function RowIconButton({
  icon: Icon,
  onClick,
  disabled,
  loading,
  ariaLabel
}) {
  return /* @__PURE__ */ jsx24(
    "button",
    {
      type: "button",
      onClick,
      disabled: disabled || loading,
      "aria-label": ariaLabel,
      className: cn17(
        "rounded-full p-1.5 transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50"
      ),
      children: loading ? /* @__PURE__ */ jsx24(Loader2Icon, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsx24(Icon, { className: "size-3.5" })
    }
  );
}

// src/components/control-bar/dual-wallet-bar.tsx
import { Fragment as Fragment6, jsx as jsx25, jsxs as jsxs16 } from "react/jsx-runtime";
var AVATAR_SIZE = 28;
function longAddress(address) {
  if (address.length <= 20) return address;
  return `${address.slice(0, 12)}..${address.slice(-8)}`;
}
function solanaClusterLabel(cluster) {
  if (!cluster) return void 0;
  const name = cluster.replace("solana:", "");
  if (!name) return void 0;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
var DualWalletBarInner = ({
  families,
  className,
  onConnectionChange
}) => {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const { openPicker } = useWalletPicker();
  const connected = Boolean(identity.address || identity.svmAddress);
  const activeEvmAccount = adapter.accounts.find(
    (account) => account.family === "evm" && account.active
  );
  const activeSolanaAccount = adapter.accounts.find(
    (account) => account.family === "svm" && account.active
  );
  const connectedWallets = families.map(
    (family) => family === "evm" ? identity.address ? {
      family,
      walletName: activeEvmAccount?.walletName,
      address: identity.address,
      detail: getChainInfo4(activeEvmAccount?.chainId ?? identity.chainId)?.name
    } : null : identity.svmAddress ? {
      family,
      walletName: activeSolanaAccount?.walletName ?? identity.svmWalletName,
      address: identity.svmAddress,
      detail: solanaClusterLabel(identity.svmCluster)
    } : null
  ).filter((wallet) => wallet !== null);
  const singleWallet = connectedWallets.length === 1;
  useEffect5(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);
  return /* @__PURE__ */ jsxs16(Fragment6, { children: [
    /* @__PURE__ */ jsxs16(
      "button",
      {
        type: "button",
        onClick: openPicker,
        className: cn18(
          "@container inline-flex items-center justify-between gap-2 whitespace-nowrap text-sm font-medium",
          "w-full rounded-3xl px-3.5 py-2 transition-all duration-200",
          "border-border bg-muted text-foreground hover:bg-muted/70 border",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          className
        ),
        "aria-label": "Manage wallets",
        children: [
          connected && connectedWallets.length ? /* @__PURE__ */ jsxs16("span", { className: "flex min-w-0 items-center gap-2", children: [
            /* @__PURE__ */ jsx25("span", { className: "flex shrink-0 items-center", children: connectedWallets.map((wallet, index) => /* @__PURE__ */ jsx25(
              WalletIconSlot,
              {
                label: wallet.walletName ?? (wallet.family === "solana" ? "Solana" : "Ethereum"),
                size: AVATAR_SIZE,
                className: cn18(
                  "ring-border bg-muted rounded-full ring-1",
                  index > 0 && "-ml-2"
                )
              },
              wallet.family
            )) }),
            /* @__PURE__ */ jsx25("span", { className: "min-w-0 truncate", children: connectedWallets.map((wallet, index) => /* @__PURE__ */ jsxs16(Fragment5, { children: [
              index > 0 ? /* @__PURE__ */ jsx25("span", { className: "text-muted-foreground/40", children: " / " }) : null,
              singleWallet ? /* @__PURE__ */ jsxs16(Fragment6, { children: [
                /* @__PURE__ */ jsx25("span", { className: "@[15rem]:hidden", children: formatWalletAddress(wallet.address) }),
                /* @__PURE__ */ jsx25("span", { className: "hidden @[15rem]:inline", children: longAddress(wallet.address) })
              ] }) : /* @__PURE__ */ jsx25("span", { children: formatWalletAddress(wallet.address) }),
              wallet.detail ? /* @__PURE__ */ jsx25(
                "span",
                {
                  className: cn18(
                    "text-muted-foreground hidden",
                    singleWallet ? "@[12rem]:inline" : "@[20rem]:inline"
                  ),
                  children: ` \xB7 ${wallet.detail}`
                }
              ) : null
            ] }, wallet.family)) })
          ] }) : (
            // h-7 matches AVATAR_SIZE so the button keeps the same height (and
            // text colour) whether or not the avatar stack is rendered.
            /* @__PURE__ */ jsx25("span", { className: "flex h-7 min-w-0 items-center", children: /* @__PURE__ */ jsx25("span", { className: "truncate", children: "Connect wallet" }) })
          ),
          /* @__PURE__ */ jsx25(ChevronDownIcon6, { className: "h-3 w-3 shrink-0 opacity-60" })
        ]
      }
    ),
    /* @__PURE__ */ jsx25(WalletPicker, {})
  ] });
};
var DualWalletBar = (props) => {
  return /* @__PURE__ */ jsx25(WalletPickerProvider, { children: /* @__PURE__ */ jsx25(DualWalletBarInner, { ...props }) });
};

// src/components/control-bar/connect-button.tsx
import { jsx as jsx26, jsxs as jsxs17 } from "react/jsx-runtime";
function inferWalletFamilies(adapter) {
  const families = [];
  if ((adapter.supportedNetworks?.evm.length ?? 0) > 0 || (adapter.evmWallets?.length ?? 0) > 0 || adapter.identity.address) {
    families.push("evm");
  }
  if ((adapter.supportedNetworks?.solana.length ?? 0) > 0 || (adapter.solanaWallets?.length ?? 0) > 0 || adapter.identity.svmAddress) {
    families.push("solana");
  }
  return families;
}
var SingleConnectButton = ({
  className,
  connectLabel = "Connect Account",
  onConnectionChange
}) => {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  useEffect6(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);
  const handleClick = () => {
    if (identity.isConnected && adapter.canOpenAccountUI && adapter.openAccountUI) {
      void adapter.openAccountUI();
      return;
    }
    if (identity.isConnected && adapter.canDisconnect && adapter.disconnect) {
      void adapter.disconnect();
      return;
    }
    if (adapter.canConnect) {
      void adapter.connect();
    }
  };
  const ticker = identity.chainId ? getChainInfo5(identity.chainId)?.ticker : void 0;
  const walletProviderLabel = formatWalletProvider(identity.walletProvider);
  const visibleAddress = identity.address ?? identity.svmAddress;
  const connectedPrimary = formatAddress(visibleAddress) ?? walletProviderLabel ?? (identity.isConnected ? "Connected" : connectLabel);
  const primaryLabel = identity.status === "disconnected" ? connectLabel : connectedPrimary;
  const secondaryLabel = identity.isConnected ? walletProviderLabel ?? ticker : void 0;
  const ariaLabel = identity.isConnected ? adapter.canOpenAccountUI ? "Manage account" : adapter.canDisconnect ? "Disconnect account" : "Connected account" : "Connect account";
  return /* @__PURE__ */ jsxs17(
    "button",
    {
      type: "button",
      onClick: handleClick,
      className: cn19(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium",
        "rounded-3xl px-5 py-2.5",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90",
        "transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      ),
      "aria-label": ariaLabel,
      disabled: !adapter.canOpenAccountUI && !adapter.canDisconnect && !adapter.canConnect,
      children: [
        /* @__PURE__ */ jsx26("span", { className: "max-w-[180px] truncate", children: primaryLabel }),
        identity.isConnected && secondaryLabel && /* @__PURE__ */ jsx26("span", { className: "opacity-50", children: secondaryLabel })
      ]
    }
  );
};
var ConnectButton = ({
  families,
  className,
  connectLabel,
  onConnectionChange
}) => {
  const adapter = useAomiWalletKit();
  const pickerFamilies = families && families.length > 0 ? families : inferWalletFamilies(adapter);
  const shouldUsePicker = Boolean(
    pickerFamilies.length > 0 && (adapter.walletModalRows?.length ?? 0) > 0
  );
  if (shouldUsePicker) {
    return /* @__PURE__ */ jsx26(
      DualWalletBar,
      {
        families: pickerFamilies,
        className,
        onConnectionChange
      }
    );
  }
  return /* @__PURE__ */ jsx26(
    SingleConnectButton,
    {
      className,
      connectLabel,
      onConnectionChange
    }
  );
};

// src/components/control-bar/secret-gate.tsx
import { useCallback as useCallback4, useEffect as useEffect7, useMemo as useMemo4, useState as useState10 } from "react";
import { useControl as useControl3 } from "@aomi-labs/react";
import { jsx as jsx27, jsxs as jsxs18 } from "react/jsx-runtime";
function SecretGate() {
  const {
    state,
    getCurrentThreadApp,
    ingestSecrets,
    listSecrets,
    onAppSelect
  } = useControl3();
  const currentApp = getCurrentThreadApp();
  const descriptor = useMemo4(
    () => state.appDescriptors.find((d) => d.name === currentApp),
    [state.appDescriptors, currentApp]
  );
  const requiredSlots = useMemo4(
    () => (descriptor?.secrets ?? []).filter((s) => s.required),
    [descriptor]
  );
  const [filled, setFilled] = useState10(/* @__PURE__ */ new Set());
  const [values, setValues] = useState10({});
  const [saving, setSaving] = useState10(false);
  const [error, setError] = useState10(null);
  const [knownEmpty, setKnownEmpty] = useState10(false);
  useEffect7(() => {
    if (!state.clientId || requiredSlots.length === 0) {
      setFilled(/* @__PURE__ */ new Set());
      setKnownEmpty(requiredSlots.length === 0);
      return;
    }
    let cancelled = false;
    setKnownEmpty(false);
    void (async () => {
      try {
        const byApp = await listSecrets();
        if (cancelled) return;
        const names = byApp[currentApp] ?? [];
        setFilled(new Set(names));
        setKnownEmpty(true);
      } catch {
        if (!cancelled) setKnownEmpty(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.clientId, currentApp, requiredSlots.length, listSecrets]);
  const missing = useMemo4(
    () => requiredSlots.filter((s) => !filled.has(s.name)),
    [requiredSlots, filled]
  );
  const canSave = !saving && missing.every((s) => (values[s.name] ?? "").trim().length > 0);
  const handleSave = useCallback4(async () => {
    if (!canSave || missing.length === 0) return;
    const payload = {};
    for (const s of missing) {
      const v = (values[s.name] ?? "").trim();
      if (v.length > 0) payload[s.name] = v;
    }
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await ingestSecrets(payload, currentApp);
      setFilled((prev) => {
        const next = new Set(prev);
        for (const name of Object.keys(payload)) next.add(name);
        return next;
      });
      setValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save secrets");
    } finally {
      setSaving(false);
    }
  }, [canSave, currentApp, ingestSecrets, missing, values]);
  const handleSwitchAway = useCallback4(() => {
    const candidate = state.appDescriptors.find(
      (d) => d.name !== currentApp && (d.secrets ?? []).every((s) => !s.required)
    );
    onAppSelect(candidate?.name ?? "default");
  }, [currentApp, onAppSelect, state.appDescriptors]);
  if (!knownEmpty || missing.length === 0) return null;
  return /* @__PURE__ */ jsx27(
    "div",
    {
      className: "bg-background/85 absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "secret-gate-title",
      children: /* @__PURE__ */ jsxs18("div", { className: "bg-card border-input mx-4 w-full max-w-md rounded-3xl border p-6 shadow-2xl", children: [
        /* @__PURE__ */ jsxs18(
          "h2",
          {
            id: "secret-gate-title",
            className: "text-foreground mb-2 text-lg font-semibold",
            children: [
              /* @__PURE__ */ jsx27("span", { className: "capitalize", children: currentApp }),
              " needs API access"
            ]
          }
        ),
        /* @__PURE__ */ jsxs18("p", { className: "text-muted-foreground mb-5 text-sm", children: [
          missing.length === 1 ? "Provide this credential to use " : `Provide these ${missing.length} credentials to use `,
          /* @__PURE__ */ jsx27("span", { className: "capitalize", children: currentApp }),
          ". Values are stored only in the runtime vault for this browser and are never logged."
        ] }),
        /* @__PURE__ */ jsx27("div", { className: "space-y-3", children: missing.map((slot) => /* @__PURE__ */ jsxs18("div", { children: [
          /* @__PURE__ */ jsx27(
            "label",
            {
              htmlFor: `secret-gate-${slot.name}`,
              className: "text-foreground mb-1 block font-mono text-xs",
              children: slot.name
            }
          ),
          /* @__PURE__ */ jsx27("p", { className: "text-muted-foreground mb-1.5 text-xs", children: slot.description }),
          /* @__PURE__ */ jsx27(
            Input,
            {
              id: `secret-gate-${slot.name}`,
              type: "password",
              autoComplete: "off",
              value: values[slot.name] ?? "",
              onChange: (event) => setValues((prev) => ({
                ...prev,
                [slot.name]: event.target.value
              })),
              placeholder: "Paste your key",
              className: "h-10 rounded-full px-4"
            }
          )
        ] }, slot.name)) }),
        error && /* @__PURE__ */ jsx27("p", { className: "text-destructive mt-3 text-sm", children: error }),
        /* @__PURE__ */ jsxs18("div", { className: "mt-5 flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsx27(
            "button",
            {
              type: "button",
              onClick: handleSwitchAway,
              className: "text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline",
              children: "Switch to another app"
            }
          ),
          /* @__PURE__ */ jsx27(
            Button,
            {
              type: "button",
              onClick: () => {
                void handleSave();
              },
              disabled: !canSave,
              className: "rounded-full px-5",
              children: saving ? "Saving..." : "Save & continue"
            }
          )
        ] })
      ] })
    }
  );
}

// src/components/control-bar/payment-required-gate.tsx
import { useCallback as useCallback5, useMemo as useMemo5, useState as useState11 } from "react";
import { useControl as useControl4, useNotification } from "@aomi-labs/react";
import { jsx as jsx28, jsxs as jsxs19 } from "react/jsx-runtime";
var PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" }
];
function PaymentRequiredGate() {
  const { notifications, dismissNotification, showNotification } = useNotification();
  const { setByok } = useControl4();
  const paymentNotification = notifications.find(
    (notification) => notification.kind === "payment_required"
  );
  const [selectedProvider, setSelectedProvider] = useState11("openai");
  const [label, setLabel] = useState11("");
  const [apiKey, setApiKey] = useState11("");
  const [saving, setSaving] = useState11(false);
  const [error, setError] = useState11(null);
  const canSave = useMemo5(
    () => !saving && apiKey.trim().length > 0,
    [apiKey, saving]
  );
  const handleDismiss = useCallback5(() => {
    if (paymentNotification) {
      dismissNotification(paymentNotification.id);
    }
    setError(null);
  }, [dismissNotification, paymentNotification]);
  const handleSave = useCallback5(async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await setByok(
        selectedProvider,
        apiKey.trim(),
        label.trim() || void 0
      );
      setApiKey("");
      setLabel("");
      handleDismiss();
      showNotification({
        type: "success",
        title: "Provider key saved \u2014 resend your message to continue.",
        duration: 6e3
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save BYOK key");
    } finally {
      setSaving(false);
    }
  }, [
    apiKey,
    canSave,
    handleDismiss,
    label,
    selectedProvider,
    setByok,
    showNotification
  ]);
  if (!paymentNotification) return null;
  return /* @__PURE__ */ jsx28(
    "div",
    {
      className: "bg-background/85 absolute inset-0 z-40 flex items-center justify-center px-4 backdrop-blur-sm",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "payment-required-title",
      children: /* @__PURE__ */ jsxs19("div", { className: "bg-card border-input w-full max-w-lg rounded-3xl border p-7 shadow-2xl md:p-8", children: [
        /* @__PURE__ */ jsxs19("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx28(
            "h2",
            {
              id: "payment-required-title",
              className: "text-foreground text-2xl font-semibold tracking-normal",
              children: "Set up BYOK"
            }
          ),
          /* @__PURE__ */ jsx28("p", { className: "text-muted-foreground text-base leading-7", children: "You're out of Aomi credits. Add an LLM provider key to keep chatting with BYOK. x402 and MPP payments are coming to the platform." })
        ] }),
        /* @__PURE__ */ jsx28("div", { className: "mt-6 flex flex-wrap gap-2", children: PROVIDERS.map((provider) => {
          const active = selectedProvider === provider.id;
          return /* @__PURE__ */ jsx28(
            "button",
            {
              type: "button",
              onClick: () => setSelectedProvider(provider.id),
              className: [
                "rounded-full border px-5 py-2 text-sm font-medium transition-colors",
                active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground/40"
              ].join(" "),
              children: provider.label
            },
            provider.id
          );
        }) }),
        /* @__PURE__ */ jsxs19("div", { className: "mt-6 grid gap-4", children: [
          /* @__PURE__ */ jsx28(
            Input,
            {
              value: label,
              onChange: (event) => setLabel(event.target.value),
              placeholder: "Label (optional)",
              className: "h-12 rounded-full px-5 text-base shadow-inner"
            }
          ),
          /* @__PURE__ */ jsx28(
            Input,
            {
              value: apiKey,
              onChange: (event) => setApiKey(event.target.value),
              placeholder: "Paste LLM provider key",
              type: "password",
              autoComplete: "off",
              className: "h-12 rounded-full px-5 text-base shadow-inner"
            }
          )
        ] }),
        /* @__PURE__ */ jsx28("p", { className: "text-muted-foreground mt-4 text-sm leading-6", children: "Keys are stored in your browser and synchronized with the backend vault. BYOK usage is recorded, but it does not consume Aomi credits." }),
        error && /* @__PURE__ */ jsx28("p", { className: "text-destructive mt-3 text-sm", children: error }),
        /* @__PURE__ */ jsxs19("div", { className: "mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end", children: [
          /* @__PURE__ */ jsx28(
            "button",
            {
              type: "button",
              onClick: handleDismiss,
              className: "text-foreground hover:text-muted-foreground h-11 px-4 text-sm font-medium transition-colors",
              children: "Not now"
            }
          ),
          /* @__PURE__ */ jsx28(
            Button,
            {
              type: "button",
              onClick: () => {
                void handleSave();
              },
              disabled: !canSave,
              className: "h-11 rounded-full px-7",
              children: saving ? "Saving..." : "Save and continue"
            }
          )
        ] })
      ] })
    }
  );
}

// src/components/assistant-ui/thread-loading.ts
function shouldShowThreadLoadingSkeleton({
  isLoading,
  messageCount
}) {
  return isLoading && messageCount === 0;
}

// src/components/assistant-ui/thread.tsx
import { useThread, useComposerRuntime, useMessage as useMessage2 } from "@assistant-ui/react";
import { jsx as jsx29, jsxs as jsxs20 } from "react/jsx-runtime";
var seenSystemMessages = /* @__PURE__ */ new Set();
var Thread = () => {
  const composerRuntime = useComposerRuntime();
  const { threadViewKey } = useThreadContext();
  useEffect8(() => {
    try {
      composerRuntime.setText("");
    } catch (error) {
      console.error("Failed to reset composer input:", error);
    }
  }, [composerRuntime, threadViewKey]);
  return /* @__PURE__ */ jsx29(LazyMotion, { features: domAnimation, children: /* @__PURE__ */ jsx29(MotionConfig, { reducedMotion: "user", children: /* @__PURE__ */ jsxs20(
    ThreadPrimitive.Root,
    {
      className: "aui-root aui-thread-root @container bg-background relative flex h-full flex-col",
      style: {
        ["--thread-max-width"]: "50rem"
      },
      children: [
        /* @__PURE__ */ jsx29(SecretGate, {}),
        /* @__PURE__ */ jsx29(PaymentRequiredGate, {}),
        /* @__PURE__ */ jsxs20(ThreadPrimitive.Viewport, { className: "aui-thread-viewport relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2", children: [
          /* @__PURE__ */ jsx29(ThreadPrimitive.If, { empty: true, children: /* @__PURE__ */ jsx29(ThreadWelcome, {}) }),
          /* @__PURE__ */ jsx29(ThreadLoadingSkeleton, {}),
          /* @__PURE__ */ jsx29(
            ThreadPrimitive.Messages,
            {
              components: {
                UserMessage,
                EditComposer,
                AssistantMessage,
                SystemMessage
              }
            }
          ),
          /* @__PURE__ */ jsx29(ThreadPrimitive.If, { empty: false, children: /* @__PURE__ */ jsx29("div", { className: "aui-thread-viewport-spacer min-h-36 grow" }) })
        ] }),
        /* @__PURE__ */ jsx29(Composer, {})
      ]
    }
  ) }) });
};
var ThreadScrollToBottom = () => {
  return /* @__PURE__ */ jsx29(ThreadPrimitive.ScrollToBottom, { asChild: true, children: /* @__PURE__ */ jsx29(
    TooltipIconButton,
    {
      tooltip: "Scroll to bottom",
      variant: "outline",
      className: "aui-thread-scroll-to-bottom dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible",
      children: /* @__PURE__ */ jsx29(ArrowDownIcon, {})
    }
  ) });
};
var ThreadWelcome = () => {
  const isLoading = useThread((t) => t.isLoading);
  if (isLoading) return null;
  return /* @__PURE__ */ jsxs20("div", { className: "aui-thread-welcome-root mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col px-2", children: [
    /* @__PURE__ */ jsx29("div", { className: "aui-thread-welcome-center flex w-full flex-grow flex-col items-center justify-center", children: /* @__PURE__ */ jsxs20("div", { className: "aui-thread-welcome-message flex size-full flex-col justify-center px-8", children: [
      /* @__PURE__ */ jsx29(
        m.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 10 },
          className: "aui-thread-welcome-message-motion-1 text-2xl font-medium antialiased [color:var(--aomi-welcome-title,oklch(0.42_0.006_285.823))]",
          children: "Hello there!"
        }
      ),
      /* @__PURE__ */ jsx29(
        m.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 10 },
          transition: { delay: 0.1 },
          className: "aui-thread-welcome-message-motion-2 text-2xl antialiased [color:var(--aomi-welcome-subtitle,oklch(0.68_0.012_286))]",
          children: "How can I help you today?"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx29(ThreadSuggestions, {})
  ] });
};
var ThreadSuggestions = () => {
  return /* @__PURE__ */ jsx29("div", { className: "aui-thread-welcome-suggestions @md:grid-cols-2 grid w-full gap-2 px-1 pb-4", children: [
    {
      title: "Show my wallet balances",
      label: "and positions",
      action: "Show my wallet balances and positions",
      icon: WalletIcon4
    },
    {
      title: "Swap 1 ETH to USDC",
      label: "with the best price",
      action: "Swap 1 ETH to USDC with the best price",
      icon: ArrowLeftRightIcon
    },
    {
      title: "Stake half of my ETH",
      label: "in the highest yield pool",
      action: "Stake half of my ETH in the highest yield pool",
      icon: LayersIcon2
    },
    {
      title: "Bridge 100 USDC",
      label: "from Ethereum to Arbitrum",
      action: "Bridge 100 USDC from Ethereum to Arbitrum",
      icon: CableIcon2
    }
  ].map((suggestedAction, index) => /* @__PURE__ */ jsx29(
    m.div,
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
      transition: { delay: 0.05 * index },
      className: "aui-thread-welcome-suggestion-display @md:[&:nth-child(n+3)]:block [&:nth-child(n+3)]:hidden",
      children: /* @__PURE__ */ jsx29(
        ThreadPrimitive.Suggestion,
        {
          prompt: suggestedAction.action,
          send: true,
          asChild: true,
          children: /* @__PURE__ */ jsxs20(
            Button,
            {
              variant: "ghost",
              className: "aui-thread-welcome-suggestion group/suggestion @md:flex-col dark:hover:bg-accent/60 h-auto w-full min-w-0 flex-col items-start justify-start gap-0.5 overflow-hidden whitespace-normal rounded-2xl border px-4 py-3 text-left text-sm font-normal transition-colors",
              "aria-label": suggestedAction.action,
              children: [
                /* @__PURE__ */ jsxs20("span", { className: "aui-thread-welcome-suggestion-text-1 text-foreground flex min-w-0 items-start gap-2 break-words leading-tight", children: [
                  /* @__PURE__ */ jsx29(suggestedAction.icon, { className: "text-muted-foreground/40 group-hover/suggestion:text-primary size-3.5 shrink-0 transition-colors" }),
                  /* @__PURE__ */ jsx29("span", { className: "min-w-0 break-words", children: suggestedAction.title })
                ] }),
                /* @__PURE__ */ jsx29("span", { className: "aui-thread-welcome-suggestion-text-2 text-muted-foreground/60 ml-[22px] min-w-0 break-words text-xs leading-tight", children: suggestedAction.label })
              ]
            }
          )
        }
      )
    },
    `suggested-action-${suggestedAction.title}-${index}`
  )) });
};
var Composer = () => {
  return /* @__PURE__ */ jsxs20("div", { className: "aui-composer-wrapper bg-background mx-auto flex w-full max-w-[var(--thread-max-width)] shrink-0 flex-col gap-4 overflow-visible px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-6", children: [
    /* @__PURE__ */ jsx29(ThreadScrollToBottom, {}),
    /* @__PURE__ */ jsxs20(ComposerPrimitive.Root, { className: "aui-composer-root rounded-4xl bg-muted/20 text-card-foreground border-border/40 relative flex w-full flex-col border px-1 pt-2", children: [
      /* @__PURE__ */ jsx29(
        ComposerPrimitive.Input,
        {
          placeholder: "Send a message...",
          className: "aui-composer-input text-foreground placeholder:text-muted-foreground/70 dark:text-foreground dark:placeholder:text-muted-foreground/80 ml-3 mt-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-3.5 pb-2 pt-1.5 text-sm outline-none",
          rows: 1,
          autoFocus: true,
          "aria-label": "Message input"
        }
      ),
      /* @__PURE__ */ jsx29(ComposerAction, {})
    ] })
  ] });
};
var ComposerAction = () => {
  const composerControl = useComposerControl();
  const controlBarProps = composerControl.controlBarProps ?? {};
  const hideModel = controlBarProps.hideModel ?? false;
  const hideApp = controlBarProps.hideApp ?? false;
  const hideApiKey = controlBarProps.hideApiKey ?? false;
  const hideWallet = controlBarProps.hideWallet ?? true;
  const hideNetwork = controlBarProps.hideNetwork ?? false;
  return /* @__PURE__ */ jsxs20("div", { className: "aui-composer-action-wrapper relative mx-1 mb-3 mt-2 flex min-h-[38px] items-center gap-1", children: [
    composerControl.enabled && /* @__PURE__ */ jsxs20("div", { className: "aui-composer-action-scroll ml-1 flex min-w-0 flex-1 items-center gap-0 overflow-x-auto md:ml-2 md:gap-2", children: [
      !hideNetwork && /* @__PURE__ */ jsx29(NetworkSelect, {}),
      !hideModel && /* @__PURE__ */ jsx29(ModelSelect, {}),
      !hideApp && /* @__PURE__ */ jsx29(AppSelect, {}),
      !hideWallet && /* @__PURE__ */ jsx29(ConnectButton, {}),
      !hideApiKey && /* @__PURE__ */ jsx29(ApiKeyInput, {})
    ] }),
    !composerControl.enabled && /* @__PURE__ */ jsx29("div", { className: "flex-1" }),
    /* @__PURE__ */ jsxs20("div", { className: "shrink-0", children: [
      /* @__PURE__ */ jsx29(ThreadPrimitive.If, { running: false, children: /* @__PURE__ */ jsx29(ComposerPrimitive.Send, { asChild: true, children: /* @__PURE__ */ jsx29(
        Button,
        {
          type: "submit",
          variant: "default",
          size: "icon",
          className: "aui-composer-send bg-foreground text-background hover:bg-foreground/90 mr-2 size-[38px] shrink-0 rounded-full p-1 md:mr-3",
          "aria-label": "Send message",
          children: /* @__PURE__ */ jsx29(ArrowUpIcon, { className: "aui-composer-send-icon size-5" })
        }
      ) }) }),
      /* @__PURE__ */ jsx29(ThreadPrimitive.If, { running: true, children: /* @__PURE__ */ jsx29(ComposerPrimitive.Cancel, { asChild: true, children: /* @__PURE__ */ jsx29(
        Button,
        {
          type: "button",
          variant: "default",
          size: "icon",
          className: "aui-composer-cancel border-muted-foreground/60 hover:bg-primary/75 dark:border-muted-foreground/90 mr-2 size-[38px] shrink-0 rounded-full border md:mr-3",
          "aria-label": "Stop generating",
          children: /* @__PURE__ */ jsx29(Square, { className: "aui-composer-cancel-icon size-3.5 fill-white dark:fill-black" })
        }
      ) }) })
    ] })
  ] });
};
var MessageError = () => {
  return /* @__PURE__ */ jsx29(MessagePrimitive.Error, { children: /* @__PURE__ */ jsx29(ErrorPrimitive.Root, { className: "aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200", children: /* @__PURE__ */ jsx29(ErrorPrimitive.Message, { className: "aui-message-error-message line-clamp-2" }) }) });
};
var ThreadLoadingSkeleton = () => {
  const showSkeleton = useThread(
    (t) => shouldShowThreadLoadingSkeleton({
      isLoading: t.isLoading,
      messageCount: t.messages.length
    })
  );
  if (!showSkeleton) return null;
  return /* @__PURE__ */ jsxs20(
    "div",
    {
      role: "status",
      "aria-label": "Loading conversation",
      "aria-live": "polite",
      className: "aui-thread-loading-skeleton mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-3 px-4 py-6",
      children: [
        /* @__PURE__ */ jsx29(AssistantMessageSkeleton, { widths: ["42%", "68%", "56%"] }),
        /* @__PURE__ */ jsxs20("div", { className: "aui-thread-loading-skeleton-status flex items-center gap-2 px-2 pt-1", children: [
          /* @__PURE__ */ jsx29("span", { className: "bg-muted-foreground/30 size-2 animate-pulse rounded-full" }),
          /* @__PURE__ */ jsx29(Skeleton, { className: "h-2.5 w-24 rounded-full opacity-60" })
        ] })
      ]
    }
  );
};
var AssistantMessageSkeleton = ({
  widths = ["72%", "56%", "64%"]
}) => {
  return /* @__PURE__ */ jsx29("div", { className: "aui-assistant-message-skeleton flex flex-col gap-2 px-2", children: widths.map((width, index) => /* @__PURE__ */ jsx29(
    Skeleton,
    {
      className: "aui-assistant-message-skeleton-line h-3 rounded-full",
      style: { width }
    },
    `${width}-${index}`
  )) });
};
var AssistantLoadingDot = () => {
  return /* @__PURE__ */ jsx29("div", { className: "aui-assistant-loading-dot-wrapper flex min-h-6 items-center px-1", children: /* @__PURE__ */ jsx29("span", { className: "aui-assistant-loading-dot bg-foreground block size-2.5 animate-pulse rounded-full" }) });
};
var AssistantMessage = () => {
  const isEmpty = useMessage2((state) => state.content.length === 0);
  const isRunning = useMessage2((state) => state.status?.type === "running");
  const isLast = useMessage2((state) => state.isLast);
  const turnPhase = useCurrentThreadMetadata2()?.control.turnPhase ?? "idle";
  const notice = useMessage2((state) => state.metadata?.custom);
  const isPaymentRequiredNotice = notice?.aomiNoticeKind === "payment_required";
  const showLoadingDot = isEmpty && isRunning && isLast && turnPhase !== "working";
  const showFinishedEmptyMessage = isEmpty && !isRunning;
  return /* @__PURE__ */ jsx29(MessagePrimitive.Root, { asChild: true, children: /* @__PURE__ */ jsxs20(
    "div",
    {
      className: cn20(
        "aui-assistant-message-root animate-in fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-[var(--thread-max-width)] duration-150 ease-out",
        showFinishedEmptyMessage ? "-mt-3 py-0" : "py-4"
      ),
      "data-role": "assistant",
      children: [
        !showFinishedEmptyMessage && isPaymentRequiredNotice && /* @__PURE__ */ jsxs20("div", { className: "aui-assistant-payment-required bg-sidebar text-sidebar-foreground border-border/70 dark:border-border mx-3 rounded-2xl border px-4 py-3 text-sm shadow-sm", children: [
          /* @__PURE__ */ jsx29("div", { className: "aui-assistant-payment-required-title mb-1 font-medium", children: notice?.aomiNoticeTitle ?? "Credits needed" }),
          /* @__PURE__ */ jsx29("div", { className: "aui-assistant-payment-required-message text-muted-foreground leading-5", children: /* @__PURE__ */ jsx29(
            MessagePrimitive.Parts,
            {
              components: {
                Text: MarkdownText,
                tools: { Fallback: ToolFallback }
              }
            }
          ) })
        ] }),
        !showFinishedEmptyMessage && !isPaymentRequiredNotice && /* @__PURE__ */ jsxs20("div", { className: "aui-assistant-message-content text-foreground break-words px-3 text-sm leading-5", children: [
          showLoadingDot ? /* @__PURE__ */ jsx29(AssistantLoadingDot, {}) : /* @__PURE__ */ jsx29(AssistantTurnParts, {}),
          /* @__PURE__ */ jsx29(MessageError, {})
        ] }),
        !showLoadingDot && /* @__PURE__ */ jsxs20(
          "div",
          {
            className: cn20(
              "aui-assistant-message-footer flex px-3",
              showFinishedEmptyMessage ? "mt-0" : "mt-2"
            ),
            children: [
              /* @__PURE__ */ jsx29(BranchPicker, {}),
              /* @__PURE__ */ jsx29(AssistantActionBar, {})
            ]
          }
        )
      ]
    }
  ) });
};
var AssistantActionBar = () => {
  return /* @__PURE__ */ jsxs20(
    ActionBarPrimitive.Root,
    {
      hideWhenRunning: true,
      autohide: "not-last",
      autohideFloat: "single-branch",
      className: "aui-assistant-action-bar-root text-muted-foreground data-floating:absolute data-floating:rounded-xl data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm col-start-3 row-start-2 -ml-1 flex gap-1",
      children: [
        /* @__PURE__ */ jsx29(ActionBarPrimitive.Copy, { asChild: true, children: /* @__PURE__ */ jsxs20(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "aui-button-icon size-6 rounded-xl p-1",
            "aria-label": "Copy",
            children: [
              /* @__PURE__ */ jsx29(MessagePrimitive.If, { copied: true, children: /* @__PURE__ */ jsx29(CheckIcon8, {}) }),
              /* @__PURE__ */ jsx29(MessagePrimitive.If, { copied: false, children: /* @__PURE__ */ jsx29(CopyIcon2, { className: "size-3.5" }) })
            ]
          }
        ) }),
        /* @__PURE__ */ jsx29(ActionBarPrimitive.Reload, { asChild: true, children: /* @__PURE__ */ jsx29(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "aui-button-icon size-6 rounded-xl p-1",
            "aria-label": "Refresh",
            children: /* @__PURE__ */ jsx29(RefreshCwIcon, { className: "size-3.5" })
          }
        ) })
      ]
    }
  );
};
var UserMessage = () => {
  const isEmpty = useMessage2((state) => state.content.length === 0);
  return /* @__PURE__ */ jsx29(MessagePrimitive.Root, { asChild: true, children: /* @__PURE__ */ jsxs20(
    "div",
    {
      className: "aui-user-message-root animate-in fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-4 duration-150 ease-out first:mt-3 last:mb-5 [&:where(>*)]:col-start-2",
      "data-role": "user",
      children: [
        /* @__PURE__ */ jsxs20("div", { className: "aui-user-message-content-wrapper relative col-start-2 min-w-0", children: [
          /* @__PURE__ */ jsx29("div", { className: "aui-user-message-content bg-muted text-foreground break-words rounded-3xl px-5 py-2.5 text-sm", children: isEmpty ? /* @__PURE__ */ jsx29(Skeleton, { className: "aui-user-message-content-skeleton h-4 w-28 rounded-full" }) : /* @__PURE__ */ jsx29(MessagePrimitive.Parts, {}) }),
          !isEmpty && /* @__PURE__ */ jsx29("div", { className: "aui-user-action-bar-wrapper absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-2", children: /* @__PURE__ */ jsx29(UserActionBar, {}) })
        ] }),
        /* @__PURE__ */ jsx29(BranchPicker, { className: "aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" })
      ]
    }
  ) });
};
var UserActionBar = () => {
  return /* @__PURE__ */ jsx29(
    ActionBarPrimitive.Root,
    {
      hideWhenRunning: true,
      autohide: "not-last",
      className: "aui-user-action-bar-root flex flex-col items-end",
      children: /* @__PURE__ */ jsx29(ActionBarPrimitive.Edit, { asChild: true, children: /* @__PURE__ */ jsx29(
        Button,
        {
          variant: "ghost",
          size: "icon",
          className: "aui-button-icon aui-user-action-edit size-6 rounded-xl p-4",
          "aria-label": "Edit",
          children: /* @__PURE__ */ jsx29(PencilIcon2, {})
        }
      ) })
    }
  );
};
var EditComposer = () => {
  return /* @__PURE__ */ jsx29("div", { className: "aui-edit-composer-wrapper mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 px-2 first:mt-4", children: /* @__PURE__ */ jsxs20(ComposerPrimitive.Root, { className: "aui-edit-composer-root max-w-7/8 bg-muted ml-auto flex w-full flex-col rounded-xl", children: [
    /* @__PURE__ */ jsx29(
      ComposerPrimitive.Input,
      {
        className: "aui-edit-composer-input text-foreground flex min-h-[60px] w-full resize-none bg-transparent p-4 outline-none dark:text-white",
        autoFocus: true
      }
    ),
    /* @__PURE__ */ jsxs20("div", { className: "aui-edit-composer-footer mx-3 mb-3 flex items-center justify-center gap-2 self-end", children: [
      /* @__PURE__ */ jsx29(ComposerPrimitive.Cancel, { asChild: true, children: /* @__PURE__ */ jsx29(Button, { variant: "ghost", size: "sm", "aria-label": "Cancel edit", children: "Cancel" }) }),
      /* @__PURE__ */ jsx29(ComposerPrimitive.Send, { asChild: true, children: /* @__PURE__ */ jsx29(Button, { size: "sm", "aria-label": "Update message", children: "Update" }) })
    ] })
  ] }) });
};
var BranchPicker = ({
  className,
  ...rest
}) => {
  return /* @__PURE__ */ jsxs20(
    BranchPickerPrimitive.Root,
    {
      hideWhenSingleBranch: true,
      className: cn20(
        "aui-branch-picker-root text-muted-foreground -ml-2 mr-2 inline-flex items-center text-xs",
        className
      ),
      ...rest,
      children: [
        /* @__PURE__ */ jsx29(BranchPickerPrimitive.Previous, { asChild: true, children: /* @__PURE__ */ jsx29(TooltipIconButton, { tooltip: "Previous", children: /* @__PURE__ */ jsx29(ChevronLeftIcon2, {}) }) }),
        /* @__PURE__ */ jsxs20("span", { className: "aui-branch-picker-state font-medium", children: [
          /* @__PURE__ */ jsx29(BranchPickerPrimitive.Number, {}),
          " / ",
          /* @__PURE__ */ jsx29(BranchPickerPrimitive.Count, {})
        ] }),
        /* @__PURE__ */ jsx29(BranchPickerPrimitive.Next, { asChild: true, children: /* @__PURE__ */ jsx29(TooltipIconButton, { tooltip: "Next", children: /* @__PURE__ */ jsx29(ChevronRightIcon3, {}) }) })
      ]
    }
  );
};
var SystemMessage = () => {
  const { showNotification } = useNotification2();
  const messageId = useMessage2((state) => state.id);
  const content = useMessage2((state) => state.content);
  const custom = useMessage2((state) => state.metadata?.custom);
  useEffect8(() => {
    const text = content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("").trim();
    if (!text) return;
    const key = messageId ?? text;
    if (seenSystemMessages.has(key)) return;
    seenSystemMessages.add(key);
    const inferredKind = custom?.kind ?? (text.startsWith("Wallet transaction request:") ? "wallet_tx_request" : "system_notice");
    const type = inferredKind === "system_error" ? "error" : inferredKind === "system_success" ? "success" : "notice";
    const title = custom?.title ?? (inferredKind === "wallet_tx_request" ? "Wallet transaction request" : inferredKind === "system_error" ? "Error" : "System notice");
    showNotification({ type, title, message: text });
  }, [content, custom, showNotification, messageId]);
  return null;
};

// src/components/ui/sidebar.tsx
import * as React3 from "react";
import { Slot as Slot2 } from "@radix-ui/react-slot";
import { cva as cva2 } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";

// src/hooks/use-mobile.ts
import * as React2 from "react";
var MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = React2.useState(
    void 0
  );
  React2.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}

// src/components/ui/sidebar.tsx
import { cn as cn23 } from "@aomi-labs/react";

// src/components/ui/separator.tsx
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn as cn21 } from "@aomi-labs/react";
import { jsx as jsx30 } from "react/jsx-runtime";

// src/components/ui/sheet.tsx
import { XIcon as XIcon4 } from "lucide-react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn as cn22 } from "@aomi-labs/react";
import { jsx as jsx31, jsxs as jsxs21 } from "react/jsx-runtime";
function Sheet({ ...props }) {
  return /* @__PURE__ */ jsx31(SheetPrimitive.Root, { "data-slot": "sheet", ...props });
}
function SheetPortal({
  ...props
}) {
  return /* @__PURE__ */ jsx31(SheetPrimitive.Portal, { "data-slot": "sheet-portal", ...props });
}
function SheetOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx31(
    SheetPrimitive.Overlay,
    {
      "data-slot": "sheet-overlay",
      className: cn22(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    }
  );
}
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}) {
  return /* @__PURE__ */ jsxs21(SheetPortal, { children: [
    /* @__PURE__ */ jsx31(SheetOverlay, {}),
    /* @__PURE__ */ jsxs21(
      SheetPrimitive.Content,
      {
        "data-slot": "sheet-content",
        className: cn22(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" && "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" && "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        ),
        ...props,
        children: [
          children,
          showCloseButton && /* @__PURE__ */ jsxs21(SheetPrimitive.Close, { className: "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none", children: [
            /* @__PURE__ */ jsx31(XIcon4, { className: "size-4" }),
            /* @__PURE__ */ jsx31("span", { className: "sr-only", children: "Close" })
          ] })
        ]
      }
    )
  ] });
}
function SheetHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx31(
    "div",
    {
      "data-slot": "sheet-header",
      className: cn22("flex flex-col gap-1.5 p-4", className),
      ...props
    }
  );
}
function SheetTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx31(
    SheetPrimitive.Title,
    {
      "data-slot": "sheet-title",
      className: cn22("text-foreground font-semibold", className),
      ...props
    }
  );
}
function SheetDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx31(
    SheetPrimitive.Description,
    {
      "data-slot": "sheet-description",
      className: cn22("text-muted-foreground text-sm", className),
      ...props
    }
  );
}

// src/components/ui/sidebar.tsx
import { jsx as jsx32, jsxs as jsxs22 } from "react/jsx-runtime";
var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
var SIDEBAR_WIDTH_MOBILE = "18rem";
var SIDEBAR_WIDTH_ICON = "3rem";
var SIDEBAR_KEYBOARD_SHORTCUT = "b";
var SIDEBAR_MIN_WIDTH = 180;
var SIDEBAR_MAX_WIDTH = 420;
var SidebarContext = React3.createContext(null);
function useSidebar() {
  const context = React3.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React3.useState(false);
  const [isDragging, setIsDragging] = React3.useState(false);
  const wrapperRef = React3.useRef(null);
  const [_open, _setOpen] = React3.useState(defaultOpen);
  const open = openProp ?? _open;
  const [sidebarWidth, setSidebarWidth] = React3.useState(252);
  const setOpen = React3.useCallback(
    (value) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );
  const toggleSidebar = React3.useCallback(() => {
    return isMobile ? setOpenMobile((open2) => !open2) : setOpen((open2) => !open2);
  }, [isMobile, setOpen, setOpenMobile]);
  React3.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);
  const state = open ? "expanded" : "collapsed";
  const contextValue = React3.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      sidebarWidth,
      setSidebarWidth,
      isDragging,
      setIsDragging,
      wrapperRef
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      sidebarWidth,
      isDragging
    ]
  );
  return /* @__PURE__ */ jsx32(SidebarContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx32(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsx32(
    "div",
    {
      "data-slot": "sidebar-wrapper",
      "data-dragging": isDragging,
      ref: wrapperRef,
      style: {
        "--sidebar-width": `${sidebarWidth}px`,
        "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        ...style
      },
      className: cn23(
        "group/sidebar-wrapper has-data-[variant=offcanvas]:bg-sidebar flex h-full w-full",
        className
      ),
      ...props,
      children
    }
  ) }) });
}
function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}) {
  const { isMobile, state, openMobile, setOpenMobile, isDragging } = useSidebar();
  if (collapsible === "none") {
    return /* @__PURE__ */ jsx32(
      "div",
      {
        "data-slot": "sidebar",
        className: cn23(
          "w-(--sidebar-width) bg-sidebar text-sidebar-foreground flex h-full flex-col",
          className
        ),
        ...props,
        children
      }
    );
  }
  if (isMobile) {
    return /* @__PURE__ */ jsx32(Sheet, { open: openMobile, onOpenChange: setOpenMobile, ...props, children: /* @__PURE__ */ jsxs22(
      SheetContent,
      {
        "data-sidebar": "sidebar",
        "data-slot": "sidebar",
        "data-mobile": "true",
        className: "w-(--sidebar-width) bg-sidebar text-sidebar-foreground p-0 [&>button]:hidden",
        style: {
          "--sidebar-width": SIDEBAR_WIDTH_MOBILE
        },
        side,
        children: [
          /* @__PURE__ */ jsxs22(SheetHeader, { className: "sr-only", children: [
            /* @__PURE__ */ jsx32(SheetTitle, { children: "Sidebar" }),
            /* @__PURE__ */ jsx32(SheetDescription, { children: "Displays the mobile sidebar." })
          ] }),
          /* @__PURE__ */ jsx32("div", { className: "flex h-full w-full flex-col", children })
        ]
      }
    ) });
  }
  return /* @__PURE__ */ jsxs22(
    "div",
    {
      className: cn23(
        "text-sidebar-foreground group peer relative hidden md:block",
        "w-[var(--sidebar-width)]",
        "data-[collapsible=offcanvas]:w-0",
        isDragging ? "transition-none" : "transition-[width] duration-200 ease-linear"
      ),
      "data-state": state,
      "data-collapsible": state === "collapsed" ? collapsible : "",
      "data-variant": variant,
      "data-side": side,
      "data-slot": "sidebar",
      children: [
        /* @__PURE__ */ jsx32(
          "div",
          {
            "data-slot": "sidebar-gap",
            className: cn23(
              "w-(--sidebar-width) relative bg-transparent",
              isDragging ? "transition-none" : "transition-[width] duration-200 ease-linear",
              "group-data-[collapsible=offcanvas]:w-0",
              "group-data-[side=right]:rotate-180",
              variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
            )
          }
        ),
        /* @__PURE__ */ jsx32(
          "div",
          {
            "data-slot": "sidebar-container",
            className: cn23(
              "w-(--sidebar-width) fixed inset-y-0 z-10 hidden h-full md:flex",
              isDragging ? "transition-none" : "transition-[left,right,width] duration-200 ease-linear",
              side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              // Adjust the padding for floating and inset variants.
              variant === "floating" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
              className
            ),
            ...props,
            children: /* @__PURE__ */ jsx32(
              "div",
              {
                "data-sidebar": "sidebar",
                "data-slot": "sidebar-inner",
                className: "bg-sidebar dark:bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm",
                children
              }
            )
          }
        )
      ]
    }
  );
}
function SidebarTrigger({
  className,
  onClick,
  ...props
}) {
  const { toggleSidebar } = useSidebar();
  return /* @__PURE__ */ jsxs22(
    Button,
    {
      "data-sidebar": "trigger",
      "data-slot": "sidebar-trigger",
      variant: "ghost",
      size: "icon",
      className: cn23(
        "text-muted-foreground/60 hover:text-foreground size-7",
        className
      ),
      onClick: (event) => {
        onClick?.(event);
        toggleSidebar();
      },
      ...props,
      children: [
        /* @__PURE__ */ jsx32(PanelLeftIcon, {}),
        /* @__PURE__ */ jsx32("span", { className: "sr-only", children: "Toggle Sidebar" })
      ]
    }
  );
}
function SidebarRail({ className, ...props }) {
  const {
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    setOpen,
    setIsDragging,
    wrapperRef
  } = useSidebar();
  const isDraggingRef = React3.useRef(false);
  const startXRef = React3.useRef(0);
  const startWidthRef = React3.useRef(0);
  const rawWidthRef = React3.useRef(0);
  const liveWidthRef = React3.useRef(0);
  const hasDraggedRef = React3.useRef(false);
  const commitVisualWidth = React3.useCallback(
    (width) => {
      wrapperRef.current?.style.setProperty("--sidebar-width", `${width}px`);
    },
    [wrapperRef]
  );
  const handlePointerDown = React3.useCallback(
    (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      startXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;
      rawWidthRef.current = sidebarWidth;
      liveWidthRef.current = sidebarWidth;
      setIsDragging(true);
      commitVisualWidth(sidebarWidth);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth, setIsDragging, commitVisualWidth]
  );
  const handlePointerMove = React3.useCallback(
    (e) => {
      if (!isDraggingRef.current) return;
      const resizeDirection = e.currentTarget.closest('[data-side="right"]') ? -1 : 1;
      const deltaX = (e.clientX - startXRef.current) * resizeDirection;
      const rawWidth = startWidthRef.current + deltaX;
      rawWidthRef.current = rawWidth;
      if (Math.abs(deltaX) > 5) {
        hasDraggedRef.current = true;
      }
      const clampedWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, rawWidth)
      );
      liveWidthRef.current = clampedWidth;
      commitVisualWidth(clampedWidth);
    },
    [commitVisualWidth]
  );
  const finishDrag = React3.useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (rawWidthRef.current < SIDEBAR_MIN_WIDTH) {
      setSidebarWidth(liveWidthRef.current);
      setOpen(false);
      return;
    }
    setSidebarWidth(liveWidthRef.current);
    setOpen(true);
  }, [setIsDragging, setOpen, setSidebarWidth]);
  const handlePointerUp = React3.useCallback(
    (e) => {
      if (!isDraggingRef.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      finishDrag();
    },
    [finishDrag]
  );
  React3.useEffect(() => {
    return () => {
      if (!isDraggingRef.current) return;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      isDraggingRef.current = false;
      setIsDragging(false);
    };
  }, [setIsDragging]);
  const handleClick = React3.useCallback(() => {
    if (!hasDraggedRef.current) {
      toggleSidebar();
    }
  }, [toggleSidebar]);
  return /* @__PURE__ */ jsx32(
    "button",
    {
      "data-sidebar": "rail",
      "data-slot": "sidebar-rail",
      "aria-label": "Toggle Sidebar",
      tabIndex: -1,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: finishDrag,
      onClick: handleClick,
      title: "Drag to resize, click to toggle",
      className: cn23(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "cursor-ew-resize",
        "touch-none",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      ),
      ...props
    }
  );
}
function SidebarInset({ className, ...props }) {
  return /* @__PURE__ */ jsx32(
    "main",
    {
      "data-slot": "sidebar-inset",
      className: cn23(
        "bg-background relative flex w-full flex-1 flex-col",
        className
      ),
      ...props
    }
  );
}
function SidebarHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx32(
    "div",
    {
      "data-slot": "sidebar-header",
      "data-sidebar": "header",
      className: cn23("flex flex-col gap-2 p-2", className),
      ...props
    }
  );
}
function SidebarFooter({ className, ...props }) {
  return /* @__PURE__ */ jsx32(
    "div",
    {
      "data-slot": "sidebar-footer",
      "data-sidebar": "footer",
      className: cn23("mr-2 flex flex-col gap-2 p-2", className),
      ...props
    }
  );
}
function SidebarContent({ className, ...props }) {
  return /* @__PURE__ */ jsx32(
    "div",
    {
      "data-slot": "sidebar-content",
      "data-sidebar": "content",
      className: cn23(
        "mr-2 flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      ),
      ...props
    }
  );
}
function SidebarMenu({ className, ...props }) {
  return /* @__PURE__ */ jsx32(
    "ul",
    {
      "data-slot": "sidebar-menu",
      "data-sidebar": "menu",
      className: cn23("flex w-full min-w-0 list-none flex-col gap-1", className),
      ...props
    }
  );
}
function SidebarMenuItem({ className, ...props }) {
  return /* @__PURE__ */ jsx32(
    "li",
    {
      "data-slot": "sidebar-menu-item",
      "data-sidebar": "menu-item",
      className: cn23("group/menu-item relative", className),
      ...props
    }
  );
}
var sidebarMenuButtonVariants = cva2(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}) {
  const Comp = asChild ? Slot2 : "button";
  const { isMobile, state } = useSidebar();
  const button = /* @__PURE__ */ jsx32(
    Comp,
    {
      "data-slot": "sidebar-menu-button",
      "data-sidebar": "menu-button",
      "data-size": size,
      "data-active": isActive,
      className: cn23(sidebarMenuButtonVariants({ variant, size }), className),
      ...props
    }
  );
  if (!tooltip) {
    return button;
  }
  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip
    };
  }
  return /* @__PURE__ */ jsxs22(Tooltip, { children: [
    /* @__PURE__ */ jsx32(TooltipTrigger, { asChild: true, children: button }),
    /* @__PURE__ */ jsx32(
      TooltipContent,
      {
        side: "right",
        align: "center",
        hidden: state !== "collapsed" || isMobile,
        ...tooltip
      }
    )
  ] });
}

// src/components/assistant-ui/thread-list.tsx
import { useEffect as useEffect11, useRef as useRef4, useState as useState14 } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useThreadList
} from "@assistant-ui/react";
import { ArchiveIcon, MoreHorizontalIcon as MoreHorizontalIcon2, PlusIcon as PlusIcon2 } from "lucide-react";
import { cn as cn24 } from "@aomi-labs/react";
import { jsx as jsx33, jsxs as jsxs23 } from "react/jsx-runtime";
var ThreadList = () => {
  return /* @__PURE__ */ jsxs23(ThreadListPrimitive.Root, { className: "aui-root aui-thread-list-root flex flex-1 list-none flex-col items-stretch gap-1 pl-2", children: [
    /* @__PURE__ */ jsx33(ThreadListNew, {}),
    /* @__PURE__ */ jsx33("div", { className: "aui-thread-list-separator border-border/30 mx-4 my-2 border-t" }),
    /* @__PURE__ */ jsx33(ThreadListItems, {})
  ] });
};
var ThreadListNew = () => {
  return /* @__PURE__ */ jsx33(ThreadListPrimitive.New, { asChild: true, children: /* @__PURE__ */ jsxs23(
    Button,
    {
      className: "aui-thread-list-new hover:bg-accent data-active:bg-accent flex items-center justify-start gap-2 rounded-2xl px-4 py-2 text-start text-sm",
      variant: "ghost",
      children: [
        /* @__PURE__ */ jsx33(PlusIcon2, { className: "size-4" }),
        "New Chat"
      ]
    }
  ) });
};
var ThreadListItems = () => {
  const isLoading = useThreadList((t) => t.isLoading);
  if (isLoading) {
    return /* @__PURE__ */ jsx33(ThreadListSkeleton, {});
  }
  return /* @__PURE__ */ jsx33(ThreadListPrimitive.Items, { components: { ThreadListItem } });
};
var SKELETON_WIDTHS = [
  "85%",
  "72%",
  "90%",
  "68%",
  "78%",
  "95%",
  "74%",
  "82%",
  "70%",
  "88%",
  "76%",
  "92%",
  "80%",
  "69%",
  "86%",
  "73%",
  "91%",
  "77%",
  "84%",
  "71%"
];
var ThreadListSkeleton = () => {
  return /* @__PURE__ */ jsx33(
    "div",
    {
      role: "status",
      "aria-label": "Loading threads",
      "aria-live": "polite",
      className: "aui-thread-list-skeleton-root flex flex-1 flex-col gap-1 overflow-hidden",
      children: SKELETON_WIDTHS.map((width, i) => /* @__PURE__ */ jsx33(
        "div",
        {
          className: "aui-thread-list-skeleton-wrapper flex h-9 shrink-0 items-center rounded-2xl px-4",
          children: /* @__PURE__ */ jsx33(
            Skeleton,
            {
              className: "aui-thread-list-skeleton h-3",
              style: { width }
            }
          )
        },
        i
      ))
    }
  );
};
var ThreadListItem = () => {
  const [menuOpen, setMenuOpen] = useState14(false);
  const closeTimer = useRef4(null);
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setMenuOpen(false), 120);
  };
  useEffect11(() => cancelClose, []);
  return /* @__PURE__ */ jsxs23(
    ThreadListItemPrimitive.Root,
    {
      className: "aui-thread-list-item group/thread hover:bg-accent focus-visible:bg-accent data-active:bg-accent flex w-full min-w-0 items-center rounded-2xl pr-2 transition-all focus-visible:outline-none",
      onMouseEnter: cancelClose,
      onMouseLeave: scheduleClose,
      children: [
        /* @__PURE__ */ jsx33(ThreadListItemPrimitive.Trigger, { className: "aui-thread-list-item-trigger min-w-0 flex-1 py-2 pl-4 pr-1 text-start", children: /* @__PURE__ */ jsx33(ThreadListItemTitle, {}) }),
        /* @__PURE__ */ jsx33(
          ThreadListItemMenu,
          {
            open: menuOpen,
            onOpenChange: setMenuOpen,
            onContentMouseEnter: cancelClose,
            onContentMouseLeave: scheduleClose
          }
        )
      ]
    }
  );
};
var ThreadListItemTitle = () => {
  return /* @__PURE__ */ jsx33("span", { className: "aui-thread-list-item-title block truncate text-sm", children: /* @__PURE__ */ jsx33(ThreadListItemPrimitive.Title, { fallback: "New Chat" }) });
};
var ThreadListItemMenu = ({ open, onOpenChange, onContentMouseEnter, onContentMouseLeave }) => {
  const revealClass = open ? "w-7 opacity-100" : "w-0 opacity-0 group-hover/thread:w-7 group-hover/thread:opacity-100 group-focus-within/thread:w-7 group-focus-within/thread:opacity-100";
  return /* @__PURE__ */ jsxs23(Popover, { open, onOpenChange, children: [
    /* @__PURE__ */ jsx33(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx33(
      Button,
      {
        className: cn24(
          "aui-thread-list-item-menu-trigger text-muted-foreground hover:text-foreground h-7 shrink-0 overflow-hidden rounded-md transition-all",
          revealClass
        ),
        variant: "ghost",
        size: "icon",
        "aria-label": "Chat options",
        onClick: (event) => {
          event.stopPropagation();
        },
        children: /* @__PURE__ */ jsx33(MoreHorizontalIcon2, { className: "size-4" })
      }
    ) }),
    /* @__PURE__ */ jsx33(
      PopoverContent,
      {
        align: "start",
        side: "bottom",
        sideOffset: 6,
        alignOffset: 0,
        className: "aui-thread-list-item-menu-content border-border/70 bg-popover/95 w-44 rounded-xl border p-1.5 shadow-xl backdrop-blur-sm",
        onClick: (event) => event.stopPropagation(),
        onMouseEnter: onContentMouseEnter,
        onMouseLeave: onContentMouseLeave,
        children: /* @__PURE__ */ jsx33(ThreadListItemPrimitive.Archive, { asChild: true, children: /* @__PURE__ */ jsxs23(
          "button",
          {
            type: "button",
            className: "aui-thread-list-item-menu-item text-foreground/90 hover:bg-accent hover:text-foreground focus-visible:bg-accent flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm font-medium outline-none transition-colors",
            onClick: (event) => {
              event.stopPropagation();
              onOpenChange(false);
            },
            children: [
              /* @__PURE__ */ jsx33(ArchiveIcon, { className: "text-muted-foreground size-4" }),
              "Archive"
            ]
          }
        ) })
      }
    )
  ] });
};

// src/components/assistant-ui/threadlist-sidebar.tsx
import { jsx as jsx34, jsxs as jsxs24 } from "react/jsx-runtime";
var AomiLogo = ({ className }) => /* @__PURE__ */ jsxs24(
  "svg",
  {
    width: "362",
    height: "362",
    viewBox: "0 0 362 362",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    children: [
      /* @__PURE__ */ jsx34(
        "path",
        {
          d: "M321.778 94.2349C321.778 64.4045 297.595 40.2222 267.765 40.2222C237.935 40.2222 213.752 64.4045 213.752 94.2349C213.752 124.065 237.935 148.248 267.765 148.248C297.595 148.248 321.778 124.065 321.778 94.2349ZM362 94.2349C362 146.279 319.81 188.47 267.765 188.47C215.721 188.47 173.53 146.279 173.53 94.2349C173.53 42.1904 215.721 1.33271e-06 267.765 0C319.81 0 362 42.1904 362 94.2349Z",
          fill: "currentColor"
        }
      ),
      /* @__PURE__ */ jsx34(
        "path",
        {
          d: "M181 0C184.792 0 188.556 0.116399 192.289 0.346221C189.506 2.74481 186.833 5.26892 184.28 7.90977C170.997 20.759 160.669 36.6452 154.42 54.4509C95.7682 66.7078 51.7143 118.709 51.7143 181C51.7143 252.403 109.597 310.286 181 310.286C243.292 310.286 295.291 266.231 307.547 207.58C325.364 201.327 341.259 190.99 354.113 177.695C356.745 175.149 359.261 172.486 361.653 169.71C361.883 173.444 362 177.208 362 181C362 280.964 280.964 362 181 362C81.0365 362 0 280.964 0 181C0 81.0365 81.0365 0 181 0Z",
          fill: "currentColor"
        }
      )
    ]
  }
);
function ThreadListSidebar({
  walletPosition = "footer",
  walletFamilies,
  ...props
}) {
  return /* @__PURE__ */ jsxs24(
    Sidebar,
    {
      collapsible: "offcanvas",
      variant: "inset",
      className: "bg-sidebar border-border/30 relative border-r",
      ...props,
      children: [
        /* @__PURE__ */ jsx34(SidebarHeader, { className: "aomi-sidebar-header", children: /* @__PURE__ */ jsxs24("div", { className: "aomi-sidebar-header-content mb-5 ml-5 mt-5 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx34(
            "a",
            {
              href: "https://aomi.dev",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "flex items-center justify-center",
              children: /* @__PURE__ */ jsx34(AomiLogo, { className: "aomi-sidebar-header-icon size-6" })
            }
          ),
          walletPosition === "header" && /* @__PURE__ */ jsx34(ConnectButton, { families: walletFamilies })
        ] }) }),
        /* @__PURE__ */ jsx34(SidebarContent, { className: "aomi-sidebar-content", children: /* @__PURE__ */ jsx34(ThreadList, {}) }),
        /* @__PURE__ */ jsx34(SidebarRail, {}),
        walletPosition === "footer" && /* @__PURE__ */ jsxs24(SidebarFooter, { className: "aomi-sidebar-footer mx-3 mb-4 border-0 pt-1", children: [
          /* @__PURE__ */ jsx34("div", { className: "border-border/30 mx-2 mb-1 border-t" }),
          /* @__PURE__ */ jsx34(ConnectButton, { className: "w-full", families: walletFamilies })
        ] })
      ]
    }
  );
}

// src/components/ui/notification.tsx
import { useEffect as useEffect12, useRef as useRef5 } from "react";
import { toast } from "sonner";
import { useNotification as useNotification3 } from "@aomi-labs/react";

// src/components/ui/sonner.tsx
import { Toaster as Sonner } from "sonner";
import { cn as cn25 } from "@aomi-labs/react";
import { jsx as jsx35 } from "react/jsx-runtime";
function Toaster({ className, toastOptions, ...props }) {
  return /* @__PURE__ */ jsx35(
    Sonner,
    {
      className: cn25("toaster group", className),
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        },
        ...toastOptions
      },
      ...props
    }
  );
}

// src/components/ui/notification.tsx
import { jsx as jsx36, jsxs as jsxs25 } from "react/jsx-runtime";
function NotificationToaster() {
  const { notifications, dismissNotification } = useNotification3();
  const shownRef = useRef5(/* @__PURE__ */ new Set());
  useEffect12(() => {
    const activeIds = new Set(
      notifications.map((notification) => notification.id)
    );
    for (const id of shownRef.current) {
      if (!activeIds.has(id)) {
        shownRef.current.delete(id);
      }
    }
    for (const notification of notifications) {
      if (notification.kind === "payment_required") continue;
      if (shownRef.current.has(notification.id)) continue;
      shownRef.current.add(notification.id);
      showToast(notification, dismissNotification);
    }
  }, [notifications, dismissNotification]);
  return /* @__PURE__ */ jsx36(Toaster, { position: "top-center" });
}
function showToast(notification, dismissNotification) {
  const options = {
    id: notification.id,
    duration: notification.duration ?? Infinity,
    unstyled: true,
    onDismiss: () => dismissNotification(notification.id)
  };
  toast.custom(
    () => /* @__PURE__ */ jsxs25("div", { className: "bg-background text-foreground relative mx-auto inline-flex w-fit max-w-[calc(100vw-2rem)] items-center justify-center rounded-xl border px-5 py-3 shadow-lg", children: [
      /* @__PURE__ */ jsx36(
        "button",
        {
          type: "button",
          "aria-label": "Close notification",
          className: "text-muted-foreground hover:text-foreground absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-sm transition-colors",
          onClick: () => {
            dismissNotification(notification.id);
            toast.dismiss(notification.id);
          },
          children: "x"
        }
      ),
      /* @__PURE__ */ jsx36("div", { className: "min-w-0 pr-6 text-center text-sm font-medium leading-5", children: notification.message ?? notification.title })
    ] }),
    options
  );
}

// src/components/runtime-tx-handler.tsx
import { useEffect as useEffect13, useRef as useRef6 } from "react";
import { Connection as SolanaConnection } from "@solana/web3.js";
import {
  UserState,
  appendFeeCallToPayload,
  hydrateTxPayloadFromUserState,
  parseChainId,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  useAomiRuntime
} from "@aomi-labs/react";
function hasHydratedCalls(payload) {
  return Array.isArray(payload.calls) && payload.calls.length > 0;
}
function decodeBase64(value) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function toSimulationTransactions(payload) {
  if (Array.isArray(payload.calls) && payload.calls.length > 0) {
    return payload.calls.map((call) => ({
      to: call.to,
      value: call.value,
      data: call.data,
      label: call.description,
      chain_id: call.chainId
    }));
  }
  if (!payload.to) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return [
    {
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chain_id: payload.chainId
    }
  ];
}
function RuntimeTxHandler() {
  const {
    user,
    pendingWalletRequests,
    resolveWalletRequest,
    rejectWalletRequest,
    simulateBatchTransactions,
    showNotification
  } = useAomiRuntime();
  const adapter = useAomiWalletKit();
  const { chainId: currentChainId } = adapter.identity;
  const processingRef = useRef6(false);
  useEffect13(() => {
    if (!pendingWalletRequests.length) return;
    const next = pendingWalletRequests[0];
    if (!next || processingRef.current) return;
    processingRef.current = true;
    processRequest(next).finally(() => {
      processingRef.current = false;
    });
    async function maybeSwitchSolanaCluster(requestedCluster) {
      if (!requestedCluster) return;
      if (!adapter.selectNetwork || !adapter.supportedNetworks?.solana) return;
      const target = adapter.supportedNetworks.solana.find(
        (n) => n.cluster === requestedCluster
      );
      if (!target) return;
      if (adapter.solanaNetworkSwitchRequiresReconnect) {
        return;
      }
      try {
        await adapter.selectNetwork({
          family: "solana",
          networkId: target.id
        });
      } catch (error) {
        console.warn(
          "[RuntimeTxHandler] Solana cluster auto-switch failed",
          error
        );
      }
    }
    async function processRequest(req) {
      try {
        if (req.kind === "transaction") {
          const payload = hasHydratedCalls(req.payload) ? req.payload : hydrateTxPayloadFromUserState(req.payload, user, {
            strict: true
          });
          if (!adapter.sendTransaction) {
            await rejectWalletRequest(req.id, "Wallet provider is not ready");
            return;
          }
          const defaultChainId = payload.chainId ?? payload.calls?.[0]?.chainId ?? currentChainId ?? 1;
          const simulationResult = await simulateBatchTransactions(
            toSimulationTransactions(payload),
            {
              from: UserState.address(user),
              chainId: defaultChainId
            }
          );
          const payloadWithFee = simulationResult.fee ? appendFeeCallToPayload(
            payload,
            simulationResult.fee,
            defaultChainId,
            { strictAa: false }
          ) : payload;
          if (payloadWithFee === payload) {
            showNotification({
              type: "notice",
              title: "Proceeding without fee on failed simulation",
              duration: 6e3
            });
          }
          const result2 = await adapter.sendTransaction(payloadWithFee);
          await resolveWalletRequest(req.id, {
            kind: "transaction",
            ...result2
          });
          return;
        }
        if (req.kind === "solana_sign") {
          if (!adapter.signSolanaTransaction) {
            await rejectWalletRequest(
              req.id,
              "Solana wallet provider is not ready"
            );
            return;
          }
          if (!req.payload.unsignedTx) {
            await rejectWalletRequest(req.id, "Missing unsigned_tx payload");
            return;
          }
          await maybeSwitchSolanaCluster(req.payload.cluster);
          const result2 = await adapter.signSolanaTransaction(req.payload);
          await resolveWalletRequest(req.id, {
            kind: "solana_sign",
            ...result2
          });
          return;
        }
        if (req.kind === "solana_sign_message") {
          if (!adapter.signSolanaMessage) {
            await rejectWalletRequest(
              req.id,
              "Solana wallet provider is not ready"
            );
            return;
          }
          if (!req.payload.message) {
            await rejectWalletRequest(req.id, "Missing message payload");
            return;
          }
          walletDebug("runtime-tx:solana-sign-message:invoke", {
            requestId: req.id,
            pendingSolanaId: req.payload.pendingSolanaId,
            cluster: req.payload.cluster,
            description: req.payload.description,
            adapterReady: adapter.isReady,
            svmAddress: adapter.identity.svmAddress,
            svmWalletName: adapter.identity.svmWalletName,
            hasSignSolanaMessage: Boolean(adapter.signSolanaMessage)
          });
          const result2 = await adapter.signSolanaMessage(req.payload);
          walletDebug("runtime-tx:solana-sign-message:resolved", {
            requestId: req.id,
            pendingSolanaId: req.payload.pendingSolanaId,
            signatureLength: result2.signature?.length
          });
          await resolveWalletRequest(req.id, {
            kind: "solana_sign_message",
            ...result2
          });
          return;
        }
        if (req.kind === "solana_send" || req.kind === "solana_sign_and_send") {
          if (!req.payload.unsignedTx) {
            await rejectWalletRequest(req.id, "Missing unsigned_tx payload");
            return;
          }
          await maybeSwitchSolanaCluster(req.payload.cluster);
          if (req.kind === "solana_sign_and_send" && adapter.signAndSendSolanaTransaction) {
            const result2 = await adapter.signAndSendSolanaTransaction(
              req.payload
            );
            await resolveWalletRequest(req.id, {
              kind: "solana_sign_and_send",
              ...result2
            });
            return;
          }
          if (adapter.sendSolanaTransaction) {
            const result2 = await adapter.sendSolanaTransaction(req.payload);
            await resolveWalletRequest(req.id, {
              kind: req.kind,
              ...result2
            });
            return;
          }
          if (!adapter.signSolanaTransaction) {
            await rejectWalletRequest(
              req.id,
              "Solana wallet provider is not ready"
            );
            return;
          }
          if (!adapter.solanaRpcHttpUrl) {
            await rejectWalletRequest(
              req.id,
              "Solana RPC is not configured for broadcast"
            );
            return;
          }
          const signResult = await adapter.signSolanaTransaction(req.payload);
          const connection = new SolanaConnection(
            adapter.solanaRpcHttpUrl,
            "confirmed"
          );
          const signature = await connection.sendRawTransaction(
            decodeBase64(signResult.signedTx)
          );
          await connection.confirmTransaction(signature, "confirmed");
          await resolveWalletRequest(req.id, {
            kind: req.kind,
            signature,
            signedTx: signResult.signedTx
          });
          return;
        }
        if (!adapter.signTypedData) {
          await rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }
        const signArgs = toViemSignTypedDataArgs(req.payload);
        const messageArgs = toViemSignMessageArgs(req.payload);
        if (signArgs && messageArgs) {
          await rejectWalletRequest(
            req.id,
            "Signature request cannot include both typed_data and non_typed_data"
          );
          return;
        }
        if (!signArgs && !messageArgs) {
          await rejectWalletRequest(
            req.id,
            "Missing typed_data or non_typed_data payload"
          );
          return;
        }
        if (signArgs && !adapter.signTypedData) {
          await rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }
        if (messageArgs && !adapter.signMessage) {
          await rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }
        const domainChainId = signArgs?.domain?.chainId;
        const requestChainId = typeof domainChainId === "number" || typeof domainChainId === "string" ? parseChainId(domainChainId) : void 0;
        if (requestChainId && currentChainId && requestChainId !== currentChainId && adapter.switchChain) {
          await adapter.switchChain(requestChainId);
        }
        const result = signArgs ? await adapter.signTypedData({
          ...req.payload,
          typed_data: signArgs
        }) : await adapter.signMessage(req.payload);
        await resolveWalletRequest(req.id, { kind: "eip712_sign", ...result });
      } catch (error) {
        console.error("[RuntimeTxHandler] Request failed:", error);
        await rejectWalletRequest(
          req.id,
          error instanceof Error ? error.message : "Request failed"
        );
      }
    }
  }, [
    adapter,
    user,
    pendingWalletRequests,
    currentChainId,
    resolveWalletRequest,
    rejectWalletRequest,
    simulateBatchTransactions,
    showNotification
  ]);
  return null;
}

// src/components/ui/breadcrumb.tsx
import { Slot as Slot3 } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn as cn26 } from "@aomi-labs/react";
import { jsx as jsx37, jsxs as jsxs26 } from "react/jsx-runtime";
function Breadcrumb({ ...props }) {
  return /* @__PURE__ */ jsx37("nav", { "aria-label": "breadcrumb", "data-slot": "breadcrumb", ...props });
}
function BreadcrumbList({ className, ...props }) {
  return /* @__PURE__ */ jsx37(
    "ol",
    {
      "data-slot": "breadcrumb-list",
      className: cn26(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5",
        className
      ),
      ...props
    }
  );
}
function BreadcrumbItem({ className, ...props }) {
  return /* @__PURE__ */ jsx37(
    "li",
    {
      "data-slot": "breadcrumb-item",
      className: cn26("inline-flex items-center gap-1.5", className),
      ...props
    }
  );
}

// src/components/control-bar/index.tsx
import { cn as cn28 } from "@aomi-labs/react";

// src/components/control-bar/secret-input.tsx
import { useState as useState15 } from "react";
import {
  ShieldIcon,
  CheckIcon as CheckIcon9,
  EyeIcon as EyeIcon2,
  EyeOffIcon as EyeOffIcon2,
  PlusIcon as PlusIcon3,
  XIcon as XIcon5
} from "lucide-react";
import { useControl as useControl5, cn as cn27 } from "@aomi-labs/react";
import { jsx as jsx38, jsxs as jsxs27 } from "react/jsx-runtime";
var SecretInput = ({
  className,
  title = "Secrets",
  description = "Add API keys for third-party services. Secrets are stored in memory only and never saved to disk."
}) => {
  const { ingestSecrets, clearSecrets } = useControl5();
  const [open, setOpen] = useState15(false);
  const [entries, setEntries] = useState15([
    { name: "", value: "" }
  ]);
  const [savedNames, setSavedNames] = useState15([]);
  const [showValues, setShowValues] = useState15(false);
  const [saving, setSaving] = useState15(false);
  const hasSecrets = savedNames.length > 0;
  const updateEntry = (index, field, val) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };
  const addEntry = () => {
    setEntries((prev) => [...prev, { name: "", value: "" }]);
  };
  const removeEntry = (index) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };
  const validEntries = entries.filter(
    (e) => e.name.trim() && e.value.trim()
  );
  const handleSave = async () => {
    if (validEntries.length === 0) return;
    setSaving(true);
    try {
      const secrets = {};
      for (const entry of validEntries) {
        secrets[entry.name.trim()] = entry.value.trim();
      }
      await ingestSecrets(secrets);
      setSavedNames((prev) => [
        .../* @__PURE__ */ new Set([...prev, ...Object.keys(secrets)])
      ]);
      setEntries([{ name: "", value: "" }]);
      setOpen(false);
    } catch (error) {
      console.error("[SecretInput] Failed to ingest secrets:", error);
    } finally {
      setSaving(false);
    }
  };
  const handleClear = async () => {
    setSaving(true);
    try {
      await clearSecrets();
      setSavedNames([]);
      setEntries([{ name: "", value: "" }]);
    } catch (error) {
      console.error("[SecretInput] Failed to clear secrets:", error);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs27(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx38(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx38(
      Button,
      {
        variant: "ghost",
        size: "icon",
        className: cn27("relative rounded-full", className),
        "aria-label": hasSecrets ? "Secrets configured" : "Add secrets",
        children: /* @__PURE__ */ jsx38(
          ShieldIcon,
          {
            className: cn27("h-4 w-4", hasSecrets && "text-green-500")
          }
        )
      }
    ) }),
    /* @__PURE__ */ jsxs27(DialogContent, { className: "max-w-[340px] rounded-3xl pl-4", children: [
      /* @__PURE__ */ jsxs27(DialogHeader, { className: "border-0", children: [
        /* @__PURE__ */ jsx38(DialogTitle, { children: title }),
        /* @__PURE__ */ jsx38(DialogDescription, { children: description })
      ] }),
      /* @__PURE__ */ jsxs27("div", { className: "grid gap-3 py-4", children: [
        hasSecrets && /* @__PURE__ */ jsxs27("div", { className: "text-muted-foreground text-xs", children: [
          /* @__PURE__ */ jsx38(CheckIcon9, { className: "mr-1 inline h-3 w-3 text-green-500" }),
          savedNames.length,
          " secret",
          savedNames.length > 1 ? "s" : "",
          " ",
          "configured: ",
          savedNames.join(", ")
        ] }),
        entries.map((entry, index) => /* @__PURE__ */ jsxs27("div", { className: "flex items-end gap-2", children: [
          /* @__PURE__ */ jsxs27("div", { className: "grid flex-1 gap-1", children: [
            index === 0 && /* @__PURE__ */ jsx38(Label, { className: "text-xs", children: "Name" }),
            /* @__PURE__ */ jsx38(
              Input,
              {
                type: "text",
                placeholder: "MY_API_KEY",
                value: entry.name,
                onChange: (e) => updateEntry(index, "name", e.target.value),
                className: "h-8 rounded-full text-xs"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs27("div", { className: "grid flex-1 gap-1", children: [
            index === 0 && /* @__PURE__ */ jsxs27(Label, { className: "flex items-center gap-1 text-xs", children: [
              "Value",
              /* @__PURE__ */ jsx38(
                Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "icon",
                  className: "h-4 w-4 p-0 hover:bg-transparent",
                  onClick: () => setShowValues(!showValues),
                  "aria-label": showValues ? "Hide values" : "Show values",
                  children: showValues ? /* @__PURE__ */ jsx38(EyeIcon2, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx38(EyeOffIcon2, { className: "h-3 w-3" })
                }
              )
            ] }),
            /* @__PURE__ */ jsx38(
              Input,
              {
                type: showValues ? "text" : "password",
                placeholder: "sk-...",
                value: entry.value,
                onChange: (e) => updateEntry(index, "value", e.target.value),
                className: "h-8 rounded-full text-xs"
              }
            )
          ] }),
          entries.length > 1 && /* @__PURE__ */ jsx38(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon",
              className: "h-8 w-8 shrink-0 rounded-full",
              onClick: () => removeEntry(index),
              "aria-label": "Remove entry",
              children: /* @__PURE__ */ jsx38(XIcon5, { className: "h-3 w-3" })
            }
          )
        ] }, index)),
        /* @__PURE__ */ jsxs27(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "sm",
            className: "w-fit rounded-full text-xs",
            onClick: addEntry,
            children: [
              /* @__PURE__ */ jsx38(PlusIcon3, { className: "mr-1 h-3 w-3" }),
              "Add another"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs27(DialogFooter, { children: [
        hasSecrets && /* @__PURE__ */ jsx38(
          Button,
          {
            variant: "outline",
            className: "rounded-full",
            onClick: () => void handleClear(),
            disabled: saving,
            children: "Clear all"
          }
        ),
        /* @__PURE__ */ jsx38(
          Button,
          {
            className: "rounded-full",
            onClick: () => void handleSave(),
            disabled: validEntries.length === 0 || saving,
            children: "Save"
          }
        )
      ] })
    ] })
  ] });
};

// src/components/control-bar/index.tsx
import { jsx as jsx39, jsxs as jsxs28 } from "react/jsx-runtime";
var ControlBar = ({
  className,
  children,
  hideModel = false,
  hideApp = false,
  hideApiKey = false,
  hideWallet = true,
  hideNetwork = false,
  hideSecrets = false
}) => {
  return /* @__PURE__ */ jsxs28("div", { className: cn28("flex items-center gap-1", className), children: [
    !hideNetwork && /* @__PURE__ */ jsx39(NetworkSelect, {}),
    !hideModel && /* @__PURE__ */ jsx39(ModelSelect, {}),
    !hideApp && /* @__PURE__ */ jsx39(AppSelect, {}),
    !hideWallet && /* @__PURE__ */ jsx39(ConnectButton, {}),
    !hideSecrets && /* @__PURE__ */ jsx39(SecretInput, {}),
    children,
    !hideApiKey && /* @__PURE__ */ jsx39(ApiKeyInput, {})
  ] });
};

// src/components/aomi-frame.tsx
import { Fragment as Fragment7, jsx as jsx40, jsxs as jsxs29 } from "react/jsx-runtime";
var ComposerControlContext = createContext3({
  enabled: false
});
var useComposerControl = () => useContext3(ComposerControlContext);
var Root7 = ({
  children,
  width = "100%",
  height = "80vh",
  className,
  style,
  walletPosition = "footer",
  walletFamilies,
  showSidebar = true,
  backendUrl,
  clientOptions,
  persistThread,
  threadPersistenceKey,
  threadPersistenceScope
}) => {
  const resolvedBackendUrl = backendUrl ?? publicEnv?.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8080";
  const frameStyle = { width, height, ...style };
  return /* @__PURE__ */ jsx40(
    AomiRuntimeProvider,
    {
      backendUrl: resolvedBackendUrl,
      clientOptions,
      persistThread,
      threadPersistenceKey,
      threadPersistenceScope,
      children: /* @__PURE__ */ jsx40(SidebarProvider, { className: "min-h-0! h-full", children: /* @__PURE__ */ jsxs29(
        "div",
        {
          className: cn29(
            "rounded-4xl flex h-full w-full overflow-hidden bg-white shadow-2xl dark:bg-neutral-950",
            className
          ),
          style: frameStyle,
          children: [
            showSidebar && /* @__PURE__ */ jsx40(
              ThreadListSidebar,
              {
                walletPosition,
                walletFamilies
              }
            ),
            /* @__PURE__ */ jsx40(SidebarInset, { className: "relative flex min-h-0 flex-col", children }),
            /* @__PURE__ */ jsx40(NotificationToaster, {}),
            /* @__PURE__ */ jsx40(RuntimeTxHandler, {})
          ]
        }
      ) })
    }
  );
};
var Header = ({
  children,
  withControl,
  controlBarProps,
  showSidebarTrigger = true,
  className
}) => {
  const { currentThreadId, getThreadMetadata } = useAomiRuntime2();
  const meta = getThreadMetadata(currentThreadId);
  const currentTitle = meta?.title && meta.title !== "New Chat" ? meta.title : null;
  return /* @__PURE__ */ jsxs29(Fragment7, { children: [
    /* @__PURE__ */ jsxs29(
      "header",
      {
        className: cn29(
          "mt-1 flex h-14 shrink-0 items-center gap-2 px-3",
          className
        ),
        children: [
          showSidebarTrigger && /* @__PURE__ */ jsxs29(Fragment7, { children: [
            /* @__PURE__ */ jsx40(SidebarTrigger, {}),
            currentTitle && /* @__PURE__ */ jsx40("div", { className: "bg-border/50 mr-2 h-3.5 w-px" })
          ] }),
          /* @__PURE__ */ jsx40(Breadcrumb, { children: /* @__PURE__ */ jsx40(BreadcrumbList, { children: currentTitle && /* @__PURE__ */ jsx40(BreadcrumbItem, { className: "hidden md:block", children: currentTitle }) }) }),
          /* @__PURE__ */ jsxs29("div", { className: "ml-auto flex items-center gap-2", children: [
            withControl && /* @__PURE__ */ jsx40(ControlBar, { ...controlBarProps }),
            children
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx40("div", { className: "pointer-events-none -mb-4 h-4 shrink-0" })
  ] });
};
var Composer2 = ({
  children,
  withControl = false,
  controlBarProps,
  className
}) => {
  const { currentThreadId, threadViewKey } = useAomiRuntime2();
  return /* @__PURE__ */ jsx40(
    ComposerControlContext.Provider,
    {
      value: { enabled: withControl, controlBarProps },
      children: /* @__PURE__ */ jsxs29("div", { className: cn29("flex flex-1 flex-col overflow-hidden", className), children: [
        /* @__PURE__ */ jsx40(Thread, {}, `${currentThreadId}-${threadViewKey}`),
        children
      ] })
    }
  );
};
var FrameControlBar = (props) => {
  return /* @__PURE__ */ jsx40(ControlBar, { ...props });
};
var DefaultLayout = ({
  walletPosition = "footer",
  walletFamilies,
  showSidebar = true,
  ...props
}) => {
  const hideWalletInControlBar = walletPosition !== null;
  return /* @__PURE__ */ jsxs29(
    Root7,
    {
      walletPosition,
      walletFamilies,
      showSidebar,
      ...props,
      children: [
        /* @__PURE__ */ jsx40(
          Header,
          {
            withControl: true,
            showSidebarTrigger: showSidebar,
            controlBarProps: {
              hideWallet: hideWalletInControlBar,
              hideNetwork: false
            }
          }
        ),
        /* @__PURE__ */ jsx40(Composer2, {})
      ]
    }
  );
};
var AomiFrame = Object.assign(DefaultLayout, {
  Root: Root7,
  Header,
  Composer: Composer2,
  ControlBar: FrameControlBar
});

// src/components/aomi-widget.tsx
import { jsx as jsx41, jsxs as jsxs30 } from "react/jsx-runtime";
function AomiWidget({
  apiUrl,
  width = "100%",
  height = "80vh",
  className,
  style,
  walletPosition = "footer",
  walletFamilies = ["evm", "solana"],
  showSidebar = true,
  showHeader = true,
  controlBarProps,
  clientOptions,
  persistThread,
  threadPersistenceKey,
  threadPersistenceScope,
  auth,
  providers,
  wallets,
  execution,
  account
}) {
  const resolvedApiUrl = apiUrl.replace(/\/+$/, "");
  const resolved = resolveWidgetAuth(auth, providers);
  return /* @__PURE__ */ jsx41(
    AomiWalletKitProvider,
    {
      auth: resolved.auth,
      providers: resolved.providers,
      wallets,
      execution: execution ?? {
        aa: "optional",
        provider: "auto",
        modes: ["4337"],
        owner: "external-wallet"
      },
      account: account === void 0 ? { mode: "aomi-backend", baseUrl: resolvedApiUrl } : account,
      children: /* @__PURE__ */ jsxs30(
        AomiFrame.Root,
        {
          backendUrl: resolvedApiUrl,
          clientOptions: { credentials: "include", ...clientOptions },
          width,
          height,
          className,
          style,
          walletPosition,
          walletFamilies,
          showSidebar,
          persistThread,
          threadPersistenceKey,
          threadPersistenceScope,
          children: [
            showHeader ? /* @__PURE__ */ jsx41(AomiFrame.Header, { showSidebarTrigger: showSidebar }) : null,
            /* @__PURE__ */ jsx41(
              AomiFrame.Composer,
              {
                withControl: true,
                controlBarProps: {
                  hideApiKey: true,
                  hideNetwork: false,
                  ...controlBarProps
                }
              }
            )
          ]
        }
      )
    }
  );
}
function resolveWidgetAuth(auth, providers) {
  if (!auth) {
    return {
      auth: false,
      providers
    };
  }
  return {
    auth: { provider: auth.provider, methods: auth.methods },
    providers: { ...providers, ...auth.providers }
  };
}

// src/components/ui/card.tsx
import * as React4 from "react";
import { cn as cn30 } from "@aomi-labs/react";
import { jsx as jsx42 } from "react/jsx-runtime";
var Card = React4.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx42(
  "div",
  {
    ref,
    className: cn30(
      "bg-card text-card-foreground rounded-lg border shadow-sm",
      className
    ),
    ...props
  }
));
Card.displayName = "Card";
var CardHeader = React4.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx42(
  "div",
  {
    ref,
    className: cn30("flex flex-col space-y-1.5 p-6", className),
    ...props
  }
));
CardHeader.displayName = "CardHeader";
var CardTitle = React4.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx42(
  "h3",
  {
    ref,
    className: cn30(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    ),
    ...props
  }
));
CardTitle.displayName = "CardTitle";
var CardDescription = React4.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx42(
  "p",
  {
    ref,
    className: cn30("text-muted-foreground text-sm", className),
    ...props
  }
));
CardDescription.displayName = "CardDescription";
var CardContent = React4.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx42("div", { ref, className: cn30("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
var CardFooter = React4.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx42(
  "div",
  {
    ref,
    className: cn30("flex items-center p-6 pt-0", className),
    ...props
  }
));
CardFooter.displayName = "CardFooter";

// src/index.ts
import {
  formatAddress as formatAddress2,
  getChainInfo as getChainInfo6,
  getNetworkName,
  SUPPORTED_CHAINS as SUPPORTED_CHAINS2
} from "@aomi-labs/react";
import { ExtUserProvider, useUser, UserState as UserState2 } from "@aomi-labs/react";
import { monad, monadTestnet } from "@aomi-labs/client";

// src/lib/wallet-kit/providers/index.tsx
import { jsx as jsx43 } from "react/jsx-runtime";
function AomiWalletProvider(props) {
  const { provider, ...rest } = props;
  if (!provider) return /* @__PURE__ */ jsx43(AomiWalletKitProvider, { ...rest });
  return /* @__PURE__ */ jsx43(AomiWalletKitProvider, { ...rest, preset: provider });
}

// src/lib/wallet-kit/providers/base-account.tsx
import { base, baseSepolia } from "wagmi/chains";
import { jsx as jsx44 } from "react/jsx-runtime";
function AomiBaseAccountProvider({
  appLogoUrl,
  appName,
  chains,
  children,
  includeBaseSepolia,
  sponsorship
}) {
  const resolvedChains = chains ?? (includeBaseSepolia ? [base, baseSepolia] : [base]);
  return /* @__PURE__ */ jsx44(
    AomiWalletKitProvider,
    {
      wallets: {
        evm: {
          appLogoUrl,
          appName,
          chains: resolvedChains,
          coinbase: false,
          wallets: ["baseAccount"]
        },
        solana: false
      },
      execution: {
        aa: sponsorship?.mode === "required" ? "required" : "optional",
        modes: ["4337"],
        owner: "external-wallet",
        provider: "auto",
        sponsorship
      },
      children
    }
  );
}
export {
  AOMI_SESSION_BOOTING_IDENTITY as AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY as AOMI_AUTH_DISCONNECTED_IDENTITY,
  AOMI_SESSION_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY,
  AomiWalletKitContextProvider as AomiAuthAdapterProvider,
  AomiBaseAccountProvider,
  AomiFrame,
  AomiWalletKitContextProvider,
  AomiWalletKitProvider,
  AomiWalletProvider,
  AomiWidget,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DualWalletBar,
  ExtUserProvider,
  FullTestnetWalletRouter,
  Input,
  NotificationToaster,
  SUPPORTED_CHAINS2 as SUPPORTED_CHAINS,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  UserState2 as UserState,
  formatAddress2 as formatAddress,
  formatAuthMethod,
  formatWalletProvider,
  getChainInfo6 as getChainInfo,
  getNetworkName,
  inferAuthMethod,
  isFullTestnet,
  monad,
  monadTestnet,
  useAomiWalletKit as useAomiAuthAdapter,
  useAomiWalletKit,
  useFullTestnet,
  useUser
};
//# sourceMappingURL=index.js.map