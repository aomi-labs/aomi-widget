"use client";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};

// src/components/aomi-frame.tsx
import { useState as useState9, useCallback as useCallback5 } from "react";

// src/components/assistant-ui/thread.tsx
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon as CheckIcon3,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon as CopyIcon2,
  PencilIcon,
  RefreshCwIcon,
  Square,
  WalletIcon
} from "lucide-react";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive as ComposerPrimitive2,
  ErrorPrimitive,
  MessagePrimitive as MessagePrimitive2,
  ThreadPrimitive,
  useMessage
} from "@assistant-ui/react";
import { useEffect as useEffect2 } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import * as m from "motion/react-m";

// src/components/ui/button.tsx
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/components/ui/button.tsx
import { jsx } from "react/jsx-runtime";
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button(_a) {
  var _b = _a, {
    className,
    variant,
    size,
    asChild = false
  } = _b, props = __objRest(_b, [
    "className",
    "variant",
    "size",
    "asChild"
  ]);
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    __spreadValues({
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className }))
    }, props)
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
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function TooltipProvider(_a) {
  var _b = _a, {
    delayDuration = 0
  } = _b, props = __objRest(_b, [
    "delayDuration"
  ]);
  return /* @__PURE__ */ jsx2(
    TooltipPrimitive.Provider,
    __spreadValues({
      "data-slot": "tooltip-provider",
      delayDuration
    }, props)
  );
}
function Tooltip(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx2(TooltipProvider, { children: /* @__PURE__ */ jsx2(TooltipPrimitive.Root, __spreadValues({ "data-slot": "tooltip" }, props)) });
}
function TooltipTrigger(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx2(TooltipPrimitive.Trigger, __spreadValues({ "data-slot": "tooltip-trigger" }, props));
}
function TooltipContent(_a) {
  var _b = _a, {
    className,
    sideOffset = 0,
    children
  } = _b, props = __objRest(_b, [
    "className",
    "sideOffset",
    "children"
  ]);
  return /* @__PURE__ */ jsx2(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
    TooltipPrimitive.Content,
    __spreadProps(__spreadValues({
      "data-slot": "tooltip-content",
      sideOffset,
      className: cn(
        "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-primary px-3 py-1.5 text-xs text-balance text-primary-foreground fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )
    }, props), {
      children: [
        children,
        /* @__PURE__ */ jsx2(TooltipPrimitive.Arrow, { className: "z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-primary fill-primary" })
      ]
    })
  ) });
}

// src/components/assistant-ui/tooltip-icon-button.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var TooltipIconButton = forwardRef((_a, ref) => {
  var _b = _a, { children, tooltip, side = "bottom", className } = _b, rest = __objRest(_b, ["children", "tooltip", "side", "className"]);
  return /* @__PURE__ */ jsxs2(Tooltip, { children: [
    /* @__PURE__ */ jsx3(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs2(
      Button,
      __spreadProps(__spreadValues({
        variant: "ghost",
        size: "icon"
      }, rest), {
        className: cn("aui-button-icon size-6 p-1", className),
        ref,
        children: [
          /* @__PURE__ */ jsx3(Slottable, { children }),
          /* @__PURE__ */ jsx3("span", { className: "aui-sr-only sr-only", children: tooltip })
        ]
      })
    ) }),
    /* @__PURE__ */ jsx3(TooltipContent, { side, children: tooltip })
  ] });
});
TooltipIconButton.displayName = "TooltipIconButton";

// src/components/assistant-ui/markdown-text.tsx
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var MarkdownTextImpl = () => {
  return /* @__PURE__ */ jsx4(
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
  return /* @__PURE__ */ jsxs3("div", { className: "aui-code-header-root mt-4 flex items-center justify-between gap-4 rounded-t-lg bg-muted-foreground/15 px-4 py-2 text-sm font-semibold text-foreground dark:bg-muted-foreground/20", children: [
    /* @__PURE__ */ jsx4("span", { className: "aui-code-header-language lowercase [&>span]:text-xs", children: language }),
    /* @__PURE__ */ jsxs3(TooltipIconButton, { tooltip: "Copy", onClick: onCopy, children: [
      !isCopied && /* @__PURE__ */ jsx4(CopyIcon, {}),
      isCopied && /* @__PURE__ */ jsx4(CheckIcon, {})
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
  h1: (_a) => {
    var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
    return /* @__PURE__ */ jsx4(
      "h1",
      __spreadValues({
        className: cn(
          "aui-md-h1 mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0",
          className
        )
      }, props)
    );
  },
  h2: (_c) => {
    var _d = _c, { className } = _d, props = __objRest(_d, ["className"]);
    return /* @__PURE__ */ jsx4(
      "h2",
      __spreadValues({
        className: cn(
          "aui-md-h2 mt-8 mb-4 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0",
          className
        )
      }, props)
    );
  },
  h3: (_e) => {
    var _f = _e, { className } = _f, props = __objRest(_f, ["className"]);
    return /* @__PURE__ */ jsx4(
      "h3",
      __spreadValues({
        className: cn(
          "aui-md-h3 mt-6 mb-4 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
          className
        )
      }, props)
    );
  },
  h4: (_g) => {
    var _h = _g, { className } = _h, props = __objRest(_h, ["className"]);
    return /* @__PURE__ */ jsx4(
      "h4",
      __spreadValues({
        className: cn(
          "aui-md-h4 mt-6 mb-4 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0",
          className
        )
      }, props)
    );
  },
  h5: (_i) => {
    var _j = _i, { className } = _j, props = __objRest(_j, ["className"]);
    return /* @__PURE__ */ jsx4(
      "h5",
      __spreadValues({
        className: cn(
          "aui-md-h5 my-4 text-lg font-semibold first:mt-0 last:mb-0",
          className
        )
      }, props)
    );
  },
  h6: (_k) => {
    var _l = _k, { className } = _l, props = __objRest(_l, ["className"]);
    return /* @__PURE__ */ jsx4(
      "h6",
      __spreadValues({
        className: cn(
          "aui-md-h6 my-4 font-semibold first:mt-0 last:mb-0",
          className
        )
      }, props)
    );
  },
  p: (_m) => {
    var _n = _m, { className } = _n, props = __objRest(_n, ["className"]);
    return /* @__PURE__ */ jsx4(
      "p",
      __spreadValues({
        className: cn(
          "aui-md-p mt-5 mb-5 leading-7 first:mt-0 last:mb-0",
          className
        )
      }, props)
    );
  },
  a: (_o) => {
    var _p = _o, { className } = _p, props = __objRest(_p, ["className"]);
    return /* @__PURE__ */ jsx4(
      "a",
      __spreadValues({
        className: cn(
          "aui-md-a font-medium text-primary underline underline-offset-4",
          className
        )
      }, props)
    );
  },
  blockquote: (_q) => {
    var _r = _q, { className } = _r, props = __objRest(_r, ["className"]);
    return /* @__PURE__ */ jsx4(
      "blockquote",
      __spreadValues({
        className: cn("aui-md-blockquote border-l-2 pl-6 italic", className)
      }, props)
    );
  },
  ul: (_s) => {
    var _t = _s, { className } = _t, props = __objRest(_t, ["className"]);
    return /* @__PURE__ */ jsx4(
      "ul",
      __spreadValues({
        className: cn("aui-md-ul my-5 ml-6 list-disc [&>li]:mt-2", className)
      }, props)
    );
  },
  ol: (_u) => {
    var _v = _u, { className } = _v, props = __objRest(_v, ["className"]);
    return /* @__PURE__ */ jsx4(
      "ol",
      __spreadValues({
        className: cn("aui-md-ol my-5 ml-6 list-decimal [&>li]:mt-2", className)
      }, props)
    );
  },
  hr: (_w) => {
    var _x = _w, { className } = _x, props = __objRest(_x, ["className"]);
    return /* @__PURE__ */ jsx4("hr", __spreadValues({ className: cn("aui-md-hr my-5 border-b", className) }, props));
  },
  table: (_y) => {
    var _z = _y, { className } = _z, props = __objRest(_z, ["className"]);
    return /* @__PURE__ */ jsx4(
      "table",
      __spreadValues({
        className: cn(
          "aui-md-table my-5 w-full border-separate border-spacing-0 overflow-y-auto",
          className
        )
      }, props)
    );
  },
  th: (_A) => {
    var _B = _A, { className } = _B, props = __objRest(_B, ["className"]);
    return /* @__PURE__ */ jsx4(
      "th",
      __spreadValues({
        className: cn(
          "aui-md-th bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right",
          className
        )
      }, props)
    );
  },
  td: (_C) => {
    var _D = _C, { className } = _D, props = __objRest(_D, ["className"]);
    return /* @__PURE__ */ jsx4(
      "td",
      __spreadValues({
        className: cn(
          "aui-md-td border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right",
          className
        )
      }, props)
    );
  },
  tr: (_E) => {
    var _F = _E, { className } = _F, props = __objRest(_F, ["className"]);
    return /* @__PURE__ */ jsx4(
      "tr",
      __spreadValues({
        className: cn(
          "aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
          className
        )
      }, props)
    );
  },
  sup: (_G) => {
    var _H = _G, { className } = _H, props = __objRest(_H, ["className"]);
    return /* @__PURE__ */ jsx4(
      "sup",
      __spreadValues({
        className: cn("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className)
      }, props)
    );
  },
  pre: (_I) => {
    var _J = _I, { className } = _J, props = __objRest(_J, ["className"]);
    return /* @__PURE__ */ jsx4(
      "pre",
      __spreadValues({
        className: cn(
          "aui-md-pre overflow-x-auto !rounded-t-none rounded-b-lg bg-accent p-6 text-black text-[12px]",
          className
        )
      }, props)
    );
  },
  code: function Code(_K) {
    var _L = _K, { className } = _L, props = __objRest(_L, ["className"]);
    const isCodeBlock = useIsMarkdownCodeBlock();
    return /* @__PURE__ */ jsx4(
      "code",
      __spreadValues({
        className: cn(
          !isCodeBlock && "aui-md-inline-code rounded border bg-muted text-[12px]",
          className
        )
      }, props)
    );
  },
  CodeHeader
});

// src/components/assistant-ui/tool-fallback.tsx
import { CheckIcon as CheckIcon2, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState as useState2 } from "react";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
var ToolFallback = ({
  toolName,
  argsText,
  result
}) => {
  const [isCollapsed, setIsCollapsed] = useState2(true);
  return /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-root mb-4 flex w-full flex-col gap-3 rounded-lg border py-3", children: [
    /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-header flex items-center gap-2 px-4", children: [
      /* @__PURE__ */ jsx5(CheckIcon2, { className: "aui-tool-fallback-icon size-4" }),
      /* @__PURE__ */ jsxs4("p", { className: "aui-tool-fallback-title flex-grow", children: [
        "Used tool: ",
        /* @__PURE__ */ jsx5("b", { children: toolName })
      ] }),
      /* @__PURE__ */ jsx5(Button, { onClick: () => setIsCollapsed(!isCollapsed), children: isCollapsed ? /* @__PURE__ */ jsx5(ChevronUpIcon, {}) : /* @__PURE__ */ jsx5(ChevronDownIcon, {}) })
    ] }),
    !isCollapsed && /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-content flex flex-col gap-2 border-t pt-2 bg-muted", children: [
      /* @__PURE__ */ jsx5("div", { className: "aui-tool-fallback-args-root px-4", children: /* @__PURE__ */ jsx5("pre", { className: "aui-tool-fallback-args-value whitespace-pre-wrap", children: argsText }) }),
      result !== void 0 && /* @__PURE__ */ jsxs4("div", { className: "aui-tool-fallback-result-root border-t border-dashed px-4 pt-2", children: [
        /* @__PURE__ */ jsx5("p", { className: "aui-tool-fallback-result-header font-semibold", children: "Result:" }),
        /* @__PURE__ */ jsx5("pre", { className: "aui-tool-fallback-result-content whitespace-pre-wrap text-[012px]", children: typeof result === "string" ? result : JSON.stringify(result, null, 2) })
      ] })
    ] })
  ] });
};

// src/components/assistant-ui/attachment.tsx
import { useEffect, useState as useState3 } from "react";
import Image2 from "next/image";
import { XIcon as XIcon2, PlusIcon, FileText } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAssistantState,
  useAssistantApi
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";

// src/components/ui/dialog.tsx
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function Dialog(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx6(DialogPrimitive.Root, __spreadValues({ "data-slot": "dialog" }, props));
}
function DialogTrigger(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx6(DialogPrimitive.Trigger, __spreadValues({ "data-slot": "dialog-trigger" }, props));
}
function DialogPortal(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx6(DialogPrimitive.Portal, __spreadValues({ "data-slot": "dialog-portal" }, props));
}
function DialogClose(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx6(DialogPrimitive.Close, __spreadValues({ "data-slot": "dialog-close" }, props));
}
function DialogOverlay(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx6(
    DialogPrimitive.Overlay,
    __spreadValues({
      "data-slot": "dialog-overlay",
      className: cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )
    }, props)
  );
}
function DialogContent(_a) {
  var _b = _a, {
    className,
    children,
    showCloseButton = true
  } = _b, props = __objRest(_b, [
    "className",
    "children",
    "showCloseButton"
  ]);
  return /* @__PURE__ */ jsxs5(DialogPortal, { "data-slot": "dialog-portal", children: [
    /* @__PURE__ */ jsx6(DialogOverlay, {}),
    /* @__PURE__ */ jsxs5(
      DialogPrimitive.Content,
      __spreadProps(__spreadValues({
        "data-slot": "dialog-content",
        className: cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )
      }, props), {
        children: [
          children,
          showCloseButton && /* @__PURE__ */ jsxs5(
            DialogPrimitive.Close,
            {
              "data-slot": "dialog-close",
              className: "absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              children: [
                /* @__PURE__ */ jsx6(XIcon, {}),
                /* @__PURE__ */ jsx6("span", { className: "sr-only", children: "Close" })
              ]
            }
          )
        ]
      })
    )
  ] });
}
function DialogHeader(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx6(
    "div",
    __spreadValues({
      "data-slot": "dialog-header",
      className: cn("flex flex-col gap-2 text-center sm:text-left", className)
    }, props)
  );
}
function DialogFooter(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx6(
    "div",
    __spreadValues({
      "data-slot": "dialog-footer",
      className: cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )
    }, props)
  );
}
function DialogTitle(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx6(
    DialogPrimitive.Title,
    __spreadValues({
      "data-slot": "dialog-title",
      className: cn("text-lg leading-none font-semibold", className)
    }, props)
  );
}
function DialogDescription(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx6(
    DialogPrimitive.Description,
    __spreadValues({
      "data-slot": "dialog-description",
      className: cn("text-sm text-muted-foreground", className)
    }, props)
  );
}

// src/components/ui/avatar.tsx
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { jsx as jsx7 } from "react/jsx-runtime";
function Avatar(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx7(
    AvatarPrimitive.Root,
    __spreadValues({
      "data-slot": "avatar",
      className: cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )
    }, props)
  );
}
function AvatarImage(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx7(
    AvatarPrimitive.Image,
    __spreadValues({
      "data-slot": "avatar-image",
      className: cn("aspect-square size-full", className)
    }, props)
  );
}
function AvatarFallback(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx7(
    AvatarPrimitive.Fallback,
    __spreadValues({
      "data-slot": "avatar-fallback",
      className: cn(
        "flex size-full items-center justify-center rounded-full bg-muted",
        className
      )
    }, props)
  );
}

// src/components/assistant-ui/attachment.tsx
import { jsx as jsx8, jsxs as jsxs6 } from "react/jsx-runtime";
var useFileSrc = (file) => {
  const [src, setSrc] = useState3(void 0);
  useEffect(() => {
    if (!file) {
      setSrc(void 0);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  return src;
};
var useAttachmentSrc = () => {
  var _a;
  const { file, src } = useAssistantState(
    useShallow(({ attachment }) => {
      var _a2, _b;
      if (attachment.type !== "image") return {};
      if (attachment.file) return { file: attachment.file };
      const src2 = (_b = (_a2 = attachment.content) == null ? void 0 : _a2.filter((c) => c.type === "image")[0]) == null ? void 0 : _b.image;
      if (!src2) return {};
      return { src: src2 };
    })
  );
  return (_a = useFileSrc(file)) != null ? _a : src;
};
var AttachmentPreview = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState3(false);
  return /* @__PURE__ */ jsx8(
    Image2,
    {
      src,
      alt: "Image Preview",
      width: 1,
      height: 1,
      className: isLoaded ? "aui-attachment-preview-image-loaded block h-auto max-h-[80vh] w-auto max-w-full object-contain" : "aui-attachment-preview-image-loading hidden",
      onLoadingComplete: () => setIsLoaded(true),
      priority: false
    }
  );
};
var AttachmentPreviewDialog = ({ children }) => {
  const src = useAttachmentSrc();
  if (!src) return children;
  return /* @__PURE__ */ jsxs6(Dialog, { children: [
    /* @__PURE__ */ jsx8(
      DialogTrigger,
      {
        className: "aui-attachment-preview-trigger cursor-pointer transition-colors hover:bg-accent/50",
        asChild: true,
        children
      }
    ),
    /* @__PURE__ */ jsxs6(DialogContent, { className: "aui-attachment-preview-dialog-content p-2 sm:max-w-3xl [&_svg]:text-background [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:!ring-0 [&>button]:hover:[&_svg]:text-destructive", children: [
      /* @__PURE__ */ jsx8(DialogTitle, { className: "aui-sr-only sr-only", children: "Image Attachment Preview" }),
      /* @__PURE__ */ jsx8("div", { className: "aui-attachment-preview relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden bg-background", children: /* @__PURE__ */ jsx8(AttachmentPreview, { src }) })
    ] })
  ] });
};
var AttachmentThumb = () => {
  const isImage = useAssistantState(
    ({ attachment }) => attachment.type === "image"
  );
  const src = useAttachmentSrc();
  return /* @__PURE__ */ jsxs6(Avatar, { className: "aui-attachment-tile-avatar h-full w-full rounded-none", children: [
    /* @__PURE__ */ jsx8(
      AvatarImage,
      {
        src,
        alt: "Attachment preview",
        className: "aui-attachment-tile-image object-cover"
      }
    ),
    /* @__PURE__ */ jsx8(AvatarFallback, { delayMs: isImage ? 200 : 0, children: /* @__PURE__ */ jsx8(FileText, { className: "aui-attachment-tile-fallback-icon size-8 text-muted-foreground" }) })
  ] });
};
var AttachmentUI = () => {
  const api = useAssistantApi();
  const isComposer = api.attachment.source === "composer";
  const isImage = useAssistantState(
    ({ attachment }) => attachment.type === "image"
  );
  const typeLabel = useAssistantState(({ attachment }) => {
    const type = attachment.type;
    switch (type) {
      case "image":
        return "Image";
      case "document":
        return "Document";
      case "file":
        return "File";
      default:
        const _exhaustiveCheck = type;
        throw new Error(`Unknown attachment type: ${_exhaustiveCheck}`);
    }
  });
  return /* @__PURE__ */ jsxs6(Tooltip, { children: [
    /* @__PURE__ */ jsxs6(
      AttachmentPrimitive.Root,
      {
        className: cn(
          "aui-attachment-root relative",
          isImage && "aui-attachment-root-composer only:[&>#attachment-tile]:size-24"
        ),
        children: [
          /* @__PURE__ */ jsx8(AttachmentPreviewDialog, { children: /* @__PURE__ */ jsx8(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx8(
            "div",
            {
              className: cn(
                "aui-attachment-tile size-14 cursor-pointer overflow-hidden rounded-[14px] border bg-muted transition-opacity hover:opacity-75",
                isComposer && "aui-attachment-tile-composer border-foreground/20"
              ),
              role: "button",
              id: "attachment-tile",
              "aria-label": `${typeLabel} attachment`,
              children: /* @__PURE__ */ jsx8(AttachmentThumb, {})
            }
          ) }) }),
          isComposer && /* @__PURE__ */ jsx8(AttachmentRemove, {})
        ]
      }
    ),
    /* @__PURE__ */ jsx8(TooltipContent, { side: "top", children: /* @__PURE__ */ jsx8(AttachmentPrimitive.Name, {}) })
  ] });
};
var AttachmentRemove = () => {
  return /* @__PURE__ */ jsx8(AttachmentPrimitive.Remove, { asChild: true, children: /* @__PURE__ */ jsx8(
    TooltipIconButton,
    {
      tooltip: "Remove file",
      className: "aui-attachment-tile-remove absolute top-1.5 right-1.5 size-3.5 rounded-full bg-white text-muted-foreground opacity-100 shadow-sm hover:!bg-white [&_svg]:text-black hover:[&_svg]:text-destructive",
      side: "top",
      children: /* @__PURE__ */ jsx8(XIcon2, { className: "aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" })
    }
  ) });
};
var UserMessageAttachments = () => {
  return /* @__PURE__ */ jsx8("div", { className: "aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2", children: /* @__PURE__ */ jsx8(MessagePrimitive.Attachments, { components: { Attachment: AttachmentUI } }) });
};
var ComposerAttachments = () => {
  return /* @__PURE__ */ jsx8("div", { className: "aui-composer-attachments mb-2 flex w-full flex-row items-center gap-2 overflow-x-auto px-1.5 pt-0.5 pb-1 empty:hidden", children: /* @__PURE__ */ jsx8(
    ComposerPrimitive.Attachments,
    {
      components: { Attachment: AttachmentUI }
    }
  ) });
};
var ComposerAddAttachment = () => {
  return /* @__PURE__ */ jsx8(ComposerPrimitive.AddAttachment, { asChild: true, children: /* @__PURE__ */ jsx8(
    TooltipIconButton,
    {
      tooltip: "Add Attachment",
      side: "bottom",
      variant: "ghost",
      size: "icon",
      className: "aui-composer-add-attachment size-[34px] rounded-full p-1 text-xs font-semibold hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30",
      "aria-label": "Add Attachment",
      children: /* @__PURE__ */ jsx8(PlusIcon, { className: "aui-attachment-add-icon size-5 stroke-[1.5px]" })
    }
  ) });
};

// src/lib/thread-context.tsx
import { createContext, useContext, useState as useState4, useCallback } from "react";
import { jsx as jsx9 } from "react/jsx-runtime";
function generateTempThreadId() {
  return `temp-${crypto.randomUUID()}`;
}
var ThreadContext = createContext(null);
function useThreadContext() {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error(
      "useThreadContext must be used within ThreadContextProvider. Wrap your app with <ThreadContextProvider>...</ThreadContextProvider>"
    );
  }
  return context;
}
function ThreadContextProvider({
  children,
  initialThreadId
}) {
  const [generateThreadId] = useState4(() => {
    const id = initialThreadId || generateTempThreadId();
    console.log("\u{1F535} [ThreadContext] Initialized with thread ID:", id);
    return id;
  });
  const [threadCnt, setThreadCnt] = useState4(1);
  const [threads, setThreads] = useState4(
    () => /* @__PURE__ */ new Map([[generateThreadId, []]])
  );
  const [threadMetadata, setThreadMetadata] = useState4(
    () => /* @__PURE__ */ new Map([
      [
        generateThreadId,
        { title: "New Chat", status: "pending", lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() }
      ]
    ])
  );
  const ensureThreadExists = useCallback(
    (threadId) => {
      setThreadMetadata((prev) => {
        if (prev.has(threadId)) return prev;
        const next = new Map(prev);
        next.set(threadId, { title: "New Chat", status: "regular", lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() });
        return next;
      });
      setThreads((prev) => {
        if (prev.has(threadId)) return prev;
        const next = new Map(prev);
        next.set(threadId, []);
        return next;
      });
    },
    []
  );
  const [currentThreadId, _setCurrentThreadId] = useState4(generateThreadId);
  const [threadViewKey, setThreadViewKey] = useState4(0);
  const bumpThreadViewKey = useCallback(() => {
    setThreadViewKey((prev) => prev + 1);
  }, []);
  const setCurrentThreadId = useCallback(
    (threadId) => {
      ensureThreadExists(threadId);
      _setCurrentThreadId(threadId);
    },
    [ensureThreadExists]
  );
  const getThreadMessages = useCallback(
    (threadId) => {
      return threads.get(threadId) || [];
    },
    [threads]
  );
  const setThreadMessages = useCallback(
    (threadId, messages) => {
      setThreads((prev) => {
        const next = new Map(prev);
        next.set(threadId, messages);
        return next;
      });
    },
    []
  );
  const getThreadMetadata = useCallback(
    (threadId) => {
      return threadMetadata.get(threadId);
    },
    [threadMetadata]
  );
  const updateThreadMetadata = useCallback(
    (threadId, updates) => {
      setThreadMetadata((prev) => {
        const existing = prev.get(threadId);
        if (!existing) {
          console.warn(`Thread metadata not found for threadId: ${threadId}`);
          return prev;
        }
        const next = new Map(prev);
        next.set(threadId, __spreadValues(__spreadValues({}, existing), updates));
        return next;
      });
    },
    []
  );
  const value = {
    currentThreadId,
    setCurrentThreadId,
    threadViewKey,
    bumpThreadViewKey,
    threads,
    setThreads,
    threadMetadata,
    setThreadMetadata,
    threadCnt,
    setThreadCnt,
    getThreadMessages,
    setThreadMessages,
    getThreadMetadata,
    updateThreadMetadata
  };
  return /* @__PURE__ */ jsx9(ThreadContext.Provider, { value, children });
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return getThreadMetadata(currentThreadId);
}

// src/components/assistant-ui/thread.tsx
import { useAssistantApi as useAssistantApi2 } from "@assistant-ui/react";
import { jsx as jsx10, jsxs as jsxs7 } from "react/jsx-runtime";
var Thread = () => {
  const api = useAssistantApi2();
  const { threadViewKey } = useThreadContext();
  useEffect2(() => {
    var _a;
    try {
      const composer = api.composer();
      composer.setText("");
      void ((_a = composer.clearAttachments) == null ? void 0 : _a.call(composer));
    } catch (error) {
      console.error("Failed to reset composer input:", error);
    }
  }, [api, threadViewKey]);
  return /* @__PURE__ */ jsx10(LazyMotion, { features: domAnimation, children: /* @__PURE__ */ jsx10(MotionConfig, { reducedMotion: "user", children: /* @__PURE__ */ jsx10(
    ThreadPrimitive.Root,
    {
      className: "aui-root aui-thread-root @container flex h-full flex-col bg-background",
      style: {
        ["--thread-max-width"]: "44rem"
      },
      children: /* @__PURE__ */ jsxs7(ThreadPrimitive.Viewport, { className: "aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll px-4", children: [
        /* @__PURE__ */ jsx10(ThreadPrimitive.If, { empty: true, children: /* @__PURE__ */ jsx10(ThreadWelcome, {}) }),
        /* @__PURE__ */ jsx10(
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
        /* @__PURE__ */ jsx10(ThreadPrimitive.If, { empty: false, children: /* @__PURE__ */ jsx10("div", { className: "aui-thread-viewport-spacer min-h-8 grow" }) }),
        /* @__PURE__ */ jsx10(Composer, {})
      ] })
    }
  ) }) });
};
var ThreadScrollToBottom = () => {
  return /* @__PURE__ */ jsx10(ThreadPrimitive.ScrollToBottom, { asChild: true, children: /* @__PURE__ */ jsx10(
    TooltipIconButton,
    {
      tooltip: "Scroll to bottom",
      variant: "outline",
      className: "aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:bg-background dark:hover:bg-accent",
      children: /* @__PURE__ */ jsx10(ArrowDownIcon, {})
    }
  ) });
};
var ThreadWelcome = () => {
  return /* @__PURE__ */ jsxs7("div", { className: "aui-thread-welcome-root mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col", children: [
    /* @__PURE__ */ jsx10("div", { className: "aui-thread-welcome-center flex w-full flex-grow flex-col items-center justify-center", children: /* @__PURE__ */ jsxs7("div", { className: "aui-thread-welcome-message flex size-full flex-col justify-center px-8", children: [
      /* @__PURE__ */ jsx10(
        m.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 10 },
          className: "aui-thread-welcome-message-motion-1 text-2xl font-semibold",
          children: "Hello there!"
        }
      ),
      /* @__PURE__ */ jsx10(
        m.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 10 },
          transition: { delay: 0.1 },
          className: "aui-thread-welcome-message-motion-2 text-2xl text-muted-foreground/65",
          children: "How can I help you today?"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx10(ThreadSuggestions, {})
  ] });
};
var ThreadSuggestions = () => {
  return /* @__PURE__ */ jsx10("div", { className: "aui-thread-welcome-suggestions grid w-full gap-2 pb-4 @md:grid-cols-2", children: [
    {
      title: "Show my wallet balances",
      label: "and positions",
      action: "Show my wallet balances and positions"
    },
    {
      title: "Swap 1 ETH to USDC",
      label: "with the best price",
      action: "Swap 1 ETH to USDC with the best price"
    },
    {
      title: "Stake half of my ETH",
      label: "in the highest yield pool",
      action: "Stake half of my ETH in the highest yield pool"
    },
    {
      title: "Bridge 100 USDC",
      label: "from Ethereum to Arbitrum",
      action: "Bridge 100 USDC from Ethereum to Arbitrum"
    }
  ].map((suggestedAction, index) => /* @__PURE__ */ jsx10(
    m.div,
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
      transition: { delay: 0.05 * index },
      className: "aui-thread-welcome-suggestion-display [&:nth-child(n+3)]:hidden @md:[&:nth-child(n+3)]:block",
      children: /* @__PURE__ */ jsx10(
        ThreadPrimitive.Suggestion,
        {
          prompt: suggestedAction.action,
          send: true,
          asChild: true,
          children: /* @__PURE__ */ jsxs7(
            Button,
            {
              variant: "ghost",
              className: "aui-thread-welcome-suggestion h-auto w-full flex-1 flex-wrap items-start justify-start gap-1 rounded-3xl border px-5 py-4 text-left text-sm @md:flex-col dark:hover:bg-accent/60",
              "aria-label": suggestedAction.action,
              children: [
                /* @__PURE__ */ jsx10("span", { className: "aui-thread-welcome-suggestion-text-1 font-medium", children: suggestedAction.title }),
                /* @__PURE__ */ jsx10("span", { className: "aui-thread-welcome-suggestion-text-2 text-muted-foreground", children: suggestedAction.label })
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
  return /* @__PURE__ */ jsxs7("div", { className: "aui-composer-wrapper sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4 md:pb-6", children: [
    /* @__PURE__ */ jsx10(ThreadScrollToBottom, {}),
    /* @__PURE__ */ jsxs7(ComposerPrimitive2.Root, { className: "aui-composer-root relative flex w-full flex-col rounded-4xl border bg-white px-1 pt-2 shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)] dark:border-muted-foreground/15", children: [
      /* @__PURE__ */ jsx10(ComposerAttachments, {}),
      /* @__PURE__ */ jsx10(
        ComposerPrimitive2.Input,
        {
          placeholder: "Send a message...",
          className: "aui-composer-input ml-3 mt-2 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-sm outline-none placeholder:text-muted-foreground focus:outline-primary",
          rows: 1,
          autoFocus: true,
          "aria-label": "Message input"
        }
      ),
      /* @__PURE__ */ jsx10(ComposerAction, {})
    ] })
  ] });
};
var ComposerAction = () => {
  return /* @__PURE__ */ jsxs7("div", { className: "aui-composer-action-wrapper relative mx-1 mt-2 mb-2 flex items-center justify-between", children: [
    /* @__PURE__ */ jsx10(ComposerAddAttachment, {}),
    /* @__PURE__ */ jsx10(ThreadPrimitive.If, { running: false, children: /* @__PURE__ */ jsx10(ComposerPrimitive2.Send, { asChild: true, children: /* @__PURE__ */ jsx10(
      TooltipIconButton,
      {
        tooltip: "Send message",
        side: "bottom",
        type: "submit",
        variant: "default",
        size: "icon",
        className: "aui-composer-send mr-3 mb-3 size-[34px] rounded-full p-1",
        "aria-label": "Send message",
        children: /* @__PURE__ */ jsx10(ArrowUpIcon, { className: "aui-composer-send-icon size-5" })
      }
    ) }) }),
    /* @__PURE__ */ jsx10(ThreadPrimitive.If, { running: true, children: /* @__PURE__ */ jsx10(ComposerPrimitive2.Cancel, { asChild: true, children: /* @__PURE__ */ jsx10(
      Button,
      {
        type: "button",
        variant: "default",
        size: "icon",
        className: "aui-composer-cancel size-[34px] rounded-full border border-muted-foreground/60 hover:bg-primary/75 dark:border-muted-foreground/90",
        "aria-label": "Stop generating",
        children: /* @__PURE__ */ jsx10(Square, { className: "aui-composer-cancel-icon size-3.5 fill-white dark:fill-black" })
      }
    ) }) })
  ] });
};
var MessageError = () => {
  return /* @__PURE__ */ jsx10(MessagePrimitive2.Error, { children: /* @__PURE__ */ jsx10(ErrorPrimitive.Root, { className: "aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/5 dark:text-red-200", children: /* @__PURE__ */ jsx10(ErrorPrimitive.Message, { className: "aui-message-error-message line-clamp-2" }) }) });
};
var AssistantMessage = () => {
  return /* @__PURE__ */ jsx10(MessagePrimitive2.Root, { asChild: true, children: /* @__PURE__ */ jsxs7(
    "div",
    {
      className: "aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1 last:mb-24",
      "data-role": "assistant",
      children: [
        /* @__PURE__ */ jsxs7("div", { className: "aui-assistant-message-content text-sm mx-2 leading-5 break-words text-foreground", children: [
          /* @__PURE__ */ jsx10(
            MessagePrimitive2.Parts,
            {
              components: {
                Text: MarkdownText,
                tools: { Fallback: ToolFallback }
              }
            }
          ),
          /* @__PURE__ */ jsx10(MessageError, {})
        ] }),
        /* @__PURE__ */ jsxs7("div", { className: "aui-assistant-message-footer mt-2 ml-2 flex", children: [
          /* @__PURE__ */ jsx10(BranchPicker, {}),
          /* @__PURE__ */ jsx10(AssistantActionBar, {})
        ] })
      ]
    }
  ) });
};
var AssistantActionBar = () => {
  return /* @__PURE__ */ jsxs7(
    ActionBarPrimitive.Root,
    {
      hideWhenRunning: true,
      autohide: "not-last",
      autohideFloat: "single-branch",
      className: "aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm",
      children: [
        /* @__PURE__ */ jsx10(ActionBarPrimitive.Copy, { asChild: true, children: /* @__PURE__ */ jsxs7(TooltipIconButton, { tooltip: "Copy", children: [
          /* @__PURE__ */ jsx10(MessagePrimitive2.If, { copied: true, children: /* @__PURE__ */ jsx10(CheckIcon3, {}) }),
          /* @__PURE__ */ jsx10(MessagePrimitive2.If, { copied: false, children: /* @__PURE__ */ jsx10(CopyIcon2, {}) })
        ] }) }),
        /* @__PURE__ */ jsx10(ActionBarPrimitive.Reload, { asChild: true, children: /* @__PURE__ */ jsx10(TooltipIconButton, { tooltip: "Refresh", children: /* @__PURE__ */ jsx10(RefreshCwIcon, {}) }) })
      ]
    }
  );
};
var UserMessage = () => {
  return /* @__PURE__ */ jsx10(MessagePrimitive2.Root, { asChild: true, children: /* @__PURE__ */ jsxs7(
    "div",
    {
      className: "aui-user-message-root mx-auto grid w-full max-w-[var(--thread-max-width)] animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-4 duration-150 ease-out fade-in slide-in-from-bottom-1 first:mt-3 last:mb-5 [&:where(>*)]:col-start-2",
      "data-role": "user",
      children: [
        /* @__PURE__ */ jsx10(UserMessageAttachments, {}),
        /* @__PURE__ */ jsxs7("div", { className: "aui-user-message-content-wrapper relative col-start-2 min-w-0", children: [
          /* @__PURE__ */ jsx10("div", { className: "aui-user-message-content text-sm rounded-3xl bg-muted px-5 py-2.5 break-words text-foreground", children: /* @__PURE__ */ jsx10(MessagePrimitive2.Parts, {}) }),
          /* @__PURE__ */ jsx10("div", { className: "aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2", children: /* @__PURE__ */ jsx10(UserActionBar, {}) })
        ] }),
        /* @__PURE__ */ jsx10(BranchPicker, { className: "aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" })
      ]
    }
  ) });
};
var UserActionBar = () => {
  return /* @__PURE__ */ jsx10(
    ActionBarPrimitive.Root,
    {
      hideWhenRunning: true,
      autohide: "not-last",
      className: "aui-user-action-bar-root flex flex-col items-end",
      children: /* @__PURE__ */ jsx10(ActionBarPrimitive.Edit, { asChild: true, children: /* @__PURE__ */ jsx10(TooltipIconButton, { tooltip: "Edit", className: "aui-user-action-edit p-4", children: /* @__PURE__ */ jsx10(PencilIcon, {}) }) })
    }
  );
};
var EditComposer = () => {
  return /* @__PURE__ */ jsx10("div", { className: "aui-edit-composer-wrapper mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 px-2 first:mt-4", children: /* @__PURE__ */ jsxs7(ComposerPrimitive2.Root, { className: "aui-edit-composer-root ml-auto flex w-full max-w-7/8 flex-col rounded-xl bg-muted", children: [
    /* @__PURE__ */ jsx10(
      ComposerPrimitive2.Input,
      {
        className: "aui-edit-composer-input flex min-h-[60px] w-full resize-none bg-transparent p-4 text-foreground outline-none",
        autoFocus: true
      }
    ),
    /* @__PURE__ */ jsxs7("div", { className: "aui-edit-composer-footer mx-3 mb-3 flex items-center justify-center gap-2 self-end", children: [
      /* @__PURE__ */ jsx10(ComposerPrimitive2.Cancel, { asChild: true, children: /* @__PURE__ */ jsx10(Button, { variant: "ghost", size: "sm", "aria-label": "Cancel edit", children: "Cancel" }) }),
      /* @__PURE__ */ jsx10(ComposerPrimitive2.Send, { asChild: true, children: /* @__PURE__ */ jsx10(Button, { size: "sm", "aria-label": "Update message", children: "Update" }) })
    ] })
  ] }) });
};
var BranchPicker = (_a) => {
  var _b = _a, {
    className
  } = _b, rest = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsxs7(
    BranchPickerPrimitive.Root,
    __spreadProps(__spreadValues({
      hideWhenSingleBranch: true,
      className: cn(
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground",
        className
      )
    }, rest), {
      children: [
        /* @__PURE__ */ jsx10(BranchPickerPrimitive.Previous, { asChild: true, children: /* @__PURE__ */ jsx10(TooltipIconButton, { tooltip: "Previous", children: /* @__PURE__ */ jsx10(ChevronLeftIcon, {}) }) }),
        /* @__PURE__ */ jsxs7("span", { className: "aui-branch-picker-state font-medium", children: [
          /* @__PURE__ */ jsx10(BranchPickerPrimitive.Number, {}),
          " / ",
          /* @__PURE__ */ jsx10(BranchPickerPrimitive.Count, {})
        ] }),
        /* @__PURE__ */ jsx10(BranchPickerPrimitive.Next, { asChild: true, children: /* @__PURE__ */ jsx10(TooltipIconButton, { tooltip: "Next", children: /* @__PURE__ */ jsx10(ChevronRightIcon, {}) }) })
      ]
    })
  );
};
var SystemMessage = () => {
  var _a, _b, _c, _d;
  const custom = useMessage((state) => {
    var _a2;
    return (_a2 = state.metadata) == null ? void 0 : _a2.custom;
  });
  const content = useMessage((state) => state.content);
  const text = ((_a = content == null ? void 0 : content[0]) == null ? void 0 : _a.type) === "text" ? (_b = content[0].text) != null ? _b : "" : "";
  const inferredKind = (_c = custom == null ? void 0 : custom.kind) != null ? _c : text.startsWith("Wallet transaction request:") ? "wallet_tx_request" : "system_notice";
  return null;
  const title = (_d = custom == null ? void 0 : custom.title) != null ? _d : inferredKind === "wallet_tx_request" ? "Wallet transaction request" : "System notice";
  const Icon = inferredKind === "wallet_tx_request" ? WalletIcon : inferredKind === "system_error" ? AlertTriangleIcon : AlertCircleIcon;
  const iconClassName = inferredKind === "wallet_tx_request" ? "text-emerald-600 dark:text-emerald-300" : inferredKind === "system_error" ? "text-red-500 dark:text-red-300" : "text-blue-500 dark:text-blue-300";
  return /* @__PURE__ */ jsx10(MessagePrimitive2.Root, { asChild: true, children: /* @__PURE__ */ jsx10(
    "div",
    {
      className: "aui-system-message-root mx-auto w-full max-w-[var(--thread-max-width)] px-2 py-4 animate-in fade-in slide-in-from-bottom-1",
      "data-role": "system",
      children: /* @__PURE__ */ jsxs7("div", { className: "aui-system-message-card flex w-full flex-wrap items-start gap-3 rounded-3xl border px-5 py-4 text-left text-sm bg-background/70 dark:bg-muted/30", children: [
        /* @__PURE__ */ jsx10(Icon, { className: `aui-system-message-icon mt-0.5 size-4 shrink-0 ${iconClassName}` }),
        /* @__PURE__ */ jsxs7("div", { className: "aui-system-message-body flex flex-col gap-1", children: [
          /* @__PURE__ */ jsx10("span", { className: "aui-system-message-title font-medium text-foreground", children: title }),
          /* @__PURE__ */ jsx10("div", { className: "aui-system-message-content leading-relaxed text-muted-foreground", children: /* @__PURE__ */ jsx10(MessagePrimitive2.Parts, { components: { Text: MarkdownText } }) })
        ] })
      ] })
    }
  ) });
};

// src/components/assistant-ui/threadlist-sidebar.tsx
import Link from "next/link";
import Image3 from "next/image";

// src/components/ui/sidebar.tsx
import * as React2 from "react";
import { Slot as Slot2 } from "@radix-ui/react-slot";
import { cva as cva2 } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";

// src/hooks/use-mobile.ts
import * as React from "react";
var MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    void 0
  );
  React.useEffect(() => {
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

// src/components/ui/input.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
function Input(_a) {
  var _b = _a, { className, type } = _b, props = __objRest(_b, ["className", "type"]);
  return /* @__PURE__ */ jsx11(
    "input",
    __spreadValues({
      type,
      "data-slot": "input",
      className: cn(
        "flex h-9 w-full min-w-0 rounded-md border-sm border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )
    }, props)
  );
}

// src/components/ui/separator.tsx
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { jsx as jsx12 } from "react/jsx-runtime";
function Separator(_a) {
  var _b = _a, {
    className,
    orientation = "horizontal",
    decorative = true
  } = _b, props = __objRest(_b, [
    "className",
    "orientation",
    "decorative"
  ]);
  return /* @__PURE__ */ jsx12(
    SeparatorPrimitive.Root,
    __spreadValues({
      "data-slot": "separator",
      decorative,
      orientation,
      className: cn(
        "shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )
    }, props)
  );
}

// src/components/ui/sheet.tsx
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon as XIcon3 } from "lucide-react";
import { jsx as jsx13, jsxs as jsxs8 } from "react/jsx-runtime";
function Sheet(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx13(SheetPrimitive.Root, __spreadValues({ "data-slot": "sheet" }, props));
}
function SheetTrigger(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx13(SheetPrimitive.Trigger, __spreadValues({ "data-slot": "sheet-trigger" }, props));
}
function SheetClose(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx13(SheetPrimitive.Close, __spreadValues({ "data-slot": "sheet-close" }, props));
}
function SheetPortal(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx13(SheetPrimitive.Portal, __spreadValues({ "data-slot": "sheet-portal" }, props));
}
function SheetOverlay(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx13(
    SheetPrimitive.Overlay,
    __spreadValues({
      "data-slot": "sheet-overlay",
      className: cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )
    }, props)
  );
}
function SheetContent(_a) {
  var _b = _a, {
    className,
    children,
    side = "right"
  } = _b, props = __objRest(_b, [
    "className",
    "children",
    "side"
  ]);
  return /* @__PURE__ */ jsxs8(SheetPortal, { children: [
    /* @__PURE__ */ jsx13(SheetOverlay, {}),
    /* @__PURE__ */ jsxs8(
      SheetPrimitive.Content,
      __spreadProps(__spreadValues({
        "data-slot": "sheet-content",
        className: cn(
          "fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500",
          side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
          side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
          side === "top" && "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )
      }, props), {
        children: [
          children,
          /* @__PURE__ */ jsxs8(SheetPrimitive.Close, { className: "absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
            /* @__PURE__ */ jsx13(XIcon3, { className: "size-4" }),
            /* @__PURE__ */ jsx13("span", { className: "sr-only", children: "Close" })
          ] })
        ]
      })
    )
  ] });
}
function SheetHeader(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx13(
    "div",
    __spreadValues({
      "data-slot": "sheet-header",
      className: cn("flex flex-col gap-1.5 p-4", className)
    }, props)
  );
}
function SheetFooter(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx13(
    "div",
    __spreadValues({
      "data-slot": "sheet-footer",
      className: cn("mt-auto flex flex-col gap-2 p-4", className)
    }, props)
  );
}
function SheetTitle(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx13(
    SheetPrimitive.Title,
    __spreadValues({
      "data-slot": "sheet-title",
      className: cn("font-semibold text-foreground", className)
    }, props)
  );
}
function SheetDescription(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx13(
    SheetPrimitive.Description,
    __spreadValues({
      "data-slot": "sheet-description",
      className: cn("text-sm text-muted-foreground", className)
    }, props)
  );
}

// src/components/ui/skeleton.tsx
import { jsx as jsx14 } from "react/jsx-runtime";
function Skeleton(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx14(
    "div",
    __spreadValues({
      "data-slot": "skeleton",
      className: cn("animate-pulse rounded-md bg-accent", className)
    }, props)
  );
}

// src/components/ui/sidebar.tsx
import { jsx as jsx15, jsxs as jsxs9 } from "react/jsx-runtime";
var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
var SIDEBAR_WIDTH_MOBILE = "18rem";
var SIDEBAR_WIDTH_ICON = "3rem";
var SIDEBAR_KEYBOARD_SHORTCUT = "b";
var SIDEBAR_MIN_WIDTH = 100;
var SIDEBAR_MAX_WIDTH = 200;
var SidebarContext = React2.createContext(null);
function useSidebar() {
  const context = React2.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
function SidebarProvider(_a) {
  var _b = _a, {
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children
  } = _b, props = __objRest(_b, [
    "defaultOpen",
    "open",
    "onOpenChange",
    "className",
    "style",
    "children"
  ]);
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React2.useState(false);
  const [_open, _setOpen] = React2.useState(defaultOpen);
  const open = openProp != null ? openProp : _open;
  const [sidebarWidth, setSidebarWidth] = React2.useState(256);
  const setOpen = React2.useCallback(
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
  const toggleSidebar = React2.useCallback(() => {
    return isMobile ? setOpenMobile((open2) => !open2) : setOpen((open2) => !open2);
  }, [isMobile, setOpen, setOpenMobile]);
  React2.useEffect(() => {
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
  const contextValue = React2.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      sidebarWidth,
      setSidebarWidth
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, sidebarWidth]
  );
  return /* @__PURE__ */ jsx15(SidebarContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx15(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsx15(
    "div",
    __spreadProps(__spreadValues({
      "data-slot": "sidebar-wrapper",
      style: __spreadValues({
        "--sidebar-width": `${sidebarWidth}px`,
        "--sidebar-width-icon": SIDEBAR_WIDTH_ICON
      }, style),
      className: cn(
        "group/sidebar-wrapper flex h-full w-full has-data-[variant=offcanvas]:bg-sidebar",
        className
      )
    }, props), {
      children
    })
  ) }) });
}
function Sidebar(_a) {
  var _b = _a, {
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    className,
    children
  } = _b, props = __objRest(_b, [
    "side",
    "variant",
    "collapsible",
    "className",
    "children"
  ]);
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  if (collapsible === "none") {
    return /* @__PURE__ */ jsx15(
      "div",
      __spreadProps(__spreadValues({
        "data-slot": "sidebar",
        className: cn(
          "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
          className
        )
      }, props), {
        children
      })
    );
  }
  if (isMobile) {
    return /* @__PURE__ */ jsx15(Sheet, __spreadProps(__spreadValues({ open: openMobile, onOpenChange: setOpenMobile }, props), { children: /* @__PURE__ */ jsxs9(
      SheetContent,
      {
        "data-sidebar": "sidebar",
        "data-slot": "sidebar",
        "data-mobile": "true",
        className: "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
        style: {
          "--sidebar-width": SIDEBAR_WIDTH_MOBILE
        },
        side,
        children: [
          /* @__PURE__ */ jsxs9(SheetHeader, { className: "sr-only", children: [
            /* @__PURE__ */ jsx15(SheetTitle, { children: "Sidebar" }),
            /* @__PURE__ */ jsx15(SheetDescription, { children: "Displays the mobile sidebar." })
          ] }),
          /* @__PURE__ */ jsx15("div", { className: "flex h-full w-full flex-col", children })
        ]
      }
    ) }));
  }
  return /* @__PURE__ */ jsxs9(
    "div",
    {
      className: cn(
        "relative group peer hidden text-sidebar-foreground md:block",
        "w-[var(--sidebar-width)]",
        "data-[collapsible=offcanvas]:w-0",
        "transition-[width] duration-200 ease-linear"
      ),
      "data-state": state,
      "data-collapsible": state === "collapsed" ? collapsible : "",
      "data-variant": variant,
      "data-side": side,
      "data-slot": "sidebar",
      children: [
        /* @__PURE__ */ jsx15(
          "div",
          {
            "data-slot": "sidebar-gap",
            className: cn(
              "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
              "group-data-[collapsible=offcanvas]:w-0",
              "group-data-[side=right]:rotate-180",
              variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
            )
          }
        ),
        /* @__PURE__ */ jsx15(
          "div",
          __spreadProps(__spreadValues({
            "data-slot": "sidebar-container",
            className: cn(
              "fixed inset-y-0 z-10 hidden h-full w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
              side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              // Adjust the padding for floating and inset variants.
              variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
              className
            )
          }, props), {
            children: /* @__PURE__ */ jsx15(
              "div",
              {
                "data-sidebar": "sidebar",
                "data-slot": "sidebar-inner",
                className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm",
                children
              }
            )
          })
        )
      ]
    }
  );
}
function SidebarTrigger(_a) {
  var _b = _a, {
    className,
    onClick
  } = _b, props = __objRest(_b, [
    "className",
    "onClick"
  ]);
  const { toggleSidebar } = useSidebar();
  return /* @__PURE__ */ jsxs9(
    Button,
    __spreadProps(__spreadValues({
      "data-sidebar": "trigger",
      "data-slot": "sidebar-trigger",
      variant: "ghost",
      size: "icon",
      className: cn("size-7", className),
      onClick: (event) => {
        onClick == null ? void 0 : onClick(event);
        toggleSidebar();
      }
    }, props), {
      children: [
        /* @__PURE__ */ jsx15(PanelLeftIcon, {}),
        /* @__PURE__ */ jsx15("span", { className: "sr-only", children: "Toggle Sidebar" })
      ]
    })
  );
}
function SidebarRail(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  const { toggleSidebar, sidebarWidth, setSidebarWidth, setOpen } = useSidebar();
  const isDraggingRef = React2.useRef(false);
  const startXRef = React2.useRef(0);
  const startWidthRef = React2.useRef(0);
  const hasDraggedRef = React2.useRef(false);
  const rafRef = React2.useRef(null);
  const handleMouseDown = React2.useCallback(
    (e) => {
      e.preventDefault();
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      startXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth]
  );
  React2.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - startXRef.current;
        if (Math.abs(deltaX) > 5) {
          hasDraggedRef.current = true;
        }
        const rawWidth = startWidthRef.current + deltaX;
        if (rawWidth < SIDEBAR_MIN_WIDTH) {
          setOpen(false);
        } else {
          setOpen(true);
          setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, rawWidth));
        }
      });
    };
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setSidebarWidth, setOpen]);
  const handleClick = React2.useCallback(() => {
    if (!hasDraggedRef.current) {
      toggleSidebar();
    }
  }, [toggleSidebar]);
  return /* @__PURE__ */ jsx15(
    "button",
    __spreadValues({
      "data-sidebar": "rail",
      "data-slot": "sidebar-rail",
      "aria-label": "Toggle Sidebar",
      tabIndex: -1,
      onMouseDown: handleMouseDown,
      onClick: handleClick,
      title: "Drag to resize, click to toggle",
      className: cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex",
        "cursor-ew-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )
    }, props)
  );
}
function SidebarInset(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "main",
    __spreadValues({
      "data-slot": "sidebar-inset",
      className: cn("relative flex w-full flex-1 flex-col bg-background", className)
    }, props)
  );
}
function SidebarHeader(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "div",
    __spreadValues({
      "data-slot": "sidebar-header",
      "data-sidebar": "header",
      className: cn("flex flex-col gap-2 p-2", className)
    }, props)
  );
}
function SidebarFooter(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "div",
    __spreadValues({
      "data-slot": "sidebar-footer",
      "data-sidebar": "footer",
      className: cn("flex mr-2 flex-col gap-2 p-2", className)
    }, props)
  );
}
function SidebarSeparator(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx15(
    Separator,
    __spreadValues({
      "data-slot": "sidebar-separator",
      "data-sidebar": "separator",
      className: cn("mx-2 w-auto bg-sidebar-border", className)
    }, props)
  );
}
function SidebarContent(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "div",
    __spreadValues({
      "data-slot": "sidebar-content",
      "data-sidebar": "content",
      className: cn(
        "flex mr-2 min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )
    }, props)
  );
}
function SidebarGroup(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "div",
    __spreadValues({
      "data-slot": "sidebar-group",
      "data-sidebar": "group",
      className: cn("relative flex w-full min-w-0 flex-col p-2", className)
    }, props)
  );
}
function SidebarGroupLabel(_a) {
  var _b = _a, {
    className,
    asChild = false
  } = _b, props = __objRest(_b, [
    "className",
    "asChild"
  ]);
  const Comp = asChild ? Slot2 : "div";
  return /* @__PURE__ */ jsx15(
    Comp,
    __spreadValues({
      "data-slot": "sidebar-group-label",
      "data-sidebar": "group-label",
      className: cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )
    }, props)
  );
}
function SidebarGroupAction(_a) {
  var _b = _a, {
    className,
    asChild = false
  } = _b, props = __objRest(_b, [
    "className",
    "asChild"
  ]);
  const Comp = asChild ? Slot2 : "button";
  return /* @__PURE__ */ jsx15(
    Comp,
    __spreadValues({
      "data-slot": "sidebar-group-action",
      "data-sidebar": "group-action",
      className: cn(
        "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )
    }, props)
  );
}
function SidebarGroupContent(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx15(
    "div",
    __spreadValues({
      "data-slot": "sidebar-group-content",
      "data-sidebar": "group-content",
      className: cn("w-full text-sm", className)
    }, props)
  );
}
function SidebarMenu(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "ul",
    __spreadValues({
      "data-slot": "sidebar-menu",
      "data-sidebar": "menu",
      className: cn("flex w-full min-w-0 flex-col gap-1", className)
    }, props)
  );
}
function SidebarMenuItem(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "li",
    __spreadValues({
      "data-slot": "sidebar-menu-item",
      "data-sidebar": "menu-item",
      className: cn("group/menu-item relative", className)
    }, props)
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
function SidebarMenuButton(_a) {
  var _b = _a, {
    asChild = false,
    isActive = false,
    variant = "default",
    size = "default",
    tooltip,
    className
  } = _b, props = __objRest(_b, [
    "asChild",
    "isActive",
    "variant",
    "size",
    "tooltip",
    "className"
  ]);
  const Comp = asChild ? Slot2 : "button";
  const { isMobile, state } = useSidebar();
  const button = /* @__PURE__ */ jsx15(
    Comp,
    __spreadValues({
      "data-slot": "sidebar-menu-button",
      "data-sidebar": "menu-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(sidebarMenuButtonVariants({ variant, size }), className)
    }, props)
  );
  if (!tooltip) {
    return button;
  }
  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip
    };
  }
  return /* @__PURE__ */ jsxs9(Tooltip, { children: [
    /* @__PURE__ */ jsx15(TooltipTrigger, { asChild: true, children: button }),
    /* @__PURE__ */ jsx15(
      TooltipContent,
      __spreadValues({
        side: "right",
        align: "center",
        hidden: state !== "collapsed" || isMobile
      }, tooltip)
    )
  ] });
}
function SidebarMenuAction(_a) {
  var _b = _a, {
    className,
    asChild = false,
    showOnHover = false
  } = _b, props = __objRest(_b, [
    "className",
    "asChild",
    "showOnHover"
  ]);
  const Comp = asChild ? Slot2 : "button";
  return /* @__PURE__ */ jsx15(
    Comp,
    __spreadValues({
      "data-slot": "sidebar-menu-action",
      "data-sidebar": "menu-action",
      className: cn(
        "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground data-[state=open]:opacity-100 md:opacity-0",
        className
      )
    }, props)
  );
}
function SidebarMenuBadge(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx15(
    "div",
    __spreadValues({
      "data-slot": "sidebar-menu-badge",
      "data-sidebar": "menu-badge",
      className: cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )
    }, props)
  );
}
function SidebarMenuSub(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx15(
    "ul",
    __spreadValues({
      "data-slot": "sidebar-menu-sub",
      "data-sidebar": "menu-sub",
      className: cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )
    }, props)
  );
}
function SidebarMenuSubItem(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsx15(
    "li",
    __spreadValues({
      "data-slot": "sidebar-menu-sub-item",
      "data-sidebar": "menu-sub-item",
      className: cn("group/menu-sub-item relative", className)
    }, props)
  );
}
function SidebarMenuSubButton(_a) {
  var _b = _a, {
    asChild = false,
    size = "md",
    isActive = false,
    className
  } = _b, props = __objRest(_b, [
    "asChild",
    "size",
    "isActive",
    "className"
  ]);
  const Comp = asChild ? Slot2 : "a";
  return /* @__PURE__ */ jsx15(
    Comp,
    __spreadValues({
      "data-slot": "sidebar-menu-sub-button",
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )
    }, props)
  );
}

// src/components/assistant-ui/thread-list.tsx
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAssistantState as useAssistantState2
} from "@assistant-ui/react";
import { PlusIcon as PlusIcon2, TrashIcon } from "lucide-react";
import { Fragment, jsx as jsx16, jsxs as jsxs10 } from "react/jsx-runtime";
var ThreadList = () => {
  return /* @__PURE__ */ jsxs10(ThreadListPrimitive.Root, { className: "aui-root aui-thread-list-root flex flex-col items-stretch gap-1.5", children: [
    /* @__PURE__ */ jsx16(ThreadListNew, {}),
    /* @__PURE__ */ jsx16(ThreadListItems, {})
  ] });
};
var ThreadListNew = () => {
  return /* @__PURE__ */ jsx16(ThreadListPrimitive.New, { asChild: true, children: /* @__PURE__ */ jsxs10(
    Button,
    {
      className: "aui-thread-list-new flex items-center justify-start gap-1 rounded-lg px-2.5 py-2 text-start hover:bg-muted data-active:bg-muted",
      variant: "ghost",
      children: [
        /* @__PURE__ */ jsx16(PlusIcon2, {}),
        "New Chat"
      ]
    }
  ) });
};
var ThreadListItems = () => {
  const isLoading = useAssistantState2(({ threads }) => threads.isLoading);
  if (isLoading) {
    return /* @__PURE__ */ jsx16(ThreadListSkeleton, {});
  }
  return /* @__PURE__ */ jsx16(ThreadListPrimitive.Items, { components: { ThreadListItem } });
};
var ThreadListSkeleton = () => {
  return /* @__PURE__ */ jsx16(Fragment, { children: Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ jsx16(
    "div",
    {
      role: "status",
      "aria-label": "Loading threads",
      "aria-live": "polite",
      className: "aui-thread-list-skeleton-wrapper flex items-center gap-2 rounded-md px-3 py-2",
      children: /* @__PURE__ */ jsx16(Skeleton, { className: "aui-thread-list-skeleton h-[22px] flex-grow" })
    },
    i
  )) });
};
var ThreadListItem = () => {
  return /* @__PURE__ */ jsxs10(ThreadListItemPrimitive.Root, { className: "aui-thread-list-item flex items-center gap-2 rounded-lg transition-all hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-active:bg-muted", children: [
    /* @__PURE__ */ jsx16(ThreadListItemPrimitive.Trigger, { className: "aui-thread-list-item-trigger flex-grow px-3 py-2 text-start", children: /* @__PURE__ */ jsx16(ThreadListItemTitle, {}) }),
    /* @__PURE__ */ jsx16(ThreadListItemDelete, {})
  ] });
};
var ThreadListItemTitle = () => {
  return /* @__PURE__ */ jsx16("span", { className: "aui-thread-list-item-title text-sm", children: /* @__PURE__ */ jsx16(ThreadListItemPrimitive.Title, { fallback: "New Chat" }) });
};
var ThreadListItemDelete = () => {
  return /* @__PURE__ */ jsx16(ThreadListItemPrimitive.Delete, { asChild: true, children: /* @__PURE__ */ jsx16(
    TooltipIconButton,
    {
      className: "aui-thread-list-item-delete mr-3 ml-auto size-4 p-0 text-foreground hover:text-primary",
      variant: "ghost",
      tooltip: "Delete thread",
      onClick: (event) => {
        const confirmed = window.confirm(
          "Delete this chat? This action cannot be undone."
        );
        if (!confirmed) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      children: /* @__PURE__ */ jsx16(TrashIcon, {})
    }
  ) });
};

// src/components/assistant-ui/threadlist-sidebar.tsx
import { jsx as jsx17, jsxs as jsxs11 } from "react/jsx-runtime";
function ThreadListSidebar(_a) {
  var _b = _a, {
    footer
  } = _b, props = __objRest(_b, [
    "footer"
  ]);
  return /* @__PURE__ */ jsxs11(
    Sidebar,
    __spreadProps(__spreadValues({
      collapsible: "offcanvas",
      variant: "inset",
      className: "relative"
    }, props), {
      children: [
        /* @__PURE__ */ jsx17(SidebarHeader, { className: "aomi-sidebar-header", children: /* @__PURE__ */ jsx17("div", { className: "aomi-sidebar-header-content flex items-center justify-between", children: /* @__PURE__ */ jsx17(SidebarMenu, { children: /* @__PURE__ */ jsx17(SidebarMenuItem, { children: /* @__PURE__ */ jsx17(SidebarMenuButton, { size: "lg", asChild: true, children: /* @__PURE__ */ jsx17(
          Link,
          {
            href: "https://aomi.dev",
            target: "_blank",
            rel: "noopener noreferrer",
            children: /* @__PURE__ */ jsx17("div", { className: "aomi-sidebar-header-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-white", children: /* @__PURE__ */ jsx17(
              Image3,
              {
                src: "/assets/images/a.svg",
                alt: "Logo",
                width: 28,
                height: 28,
                className: "aomi-sidebar-header-icon size-7 ml-3",
                priority: true
              }
            ) })
          }
        ) }) }) }) }) }),
        /* @__PURE__ */ jsx17(SidebarContent, { className: "aomi-sidebar-content", children: /* @__PURE__ */ jsx17(ThreadList, {}) }),
        /* @__PURE__ */ jsx17(SidebarRail, {}),
        footer && /* @__PURE__ */ jsx17(SidebarFooter, { className: "aomi-sidebar-footer border-t border-sm py-4", children: footer })
      ]
    })
  );
}

// src/components/ui/breadcrumb.tsx
import { Slot as Slot3 } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { jsx as jsx18, jsxs as jsxs12 } from "react/jsx-runtime";
function Breadcrumb(_a) {
  var props = __objRest(_a, []);
  return /* @__PURE__ */ jsx18("nav", __spreadValues({ "aria-label": "breadcrumb", "data-slot": "breadcrumb" }, props));
}
function BreadcrumbList(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx18(
    "ol",
    __spreadValues({
      "data-slot": "breadcrumb-list",
      className: cn(
        "flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5",
        className
      )
    }, props)
  );
}
function BreadcrumbItem(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx18(
    "li",
    __spreadValues({
      "data-slot": "breadcrumb-item",
      className: cn("inline-flex items-center gap-1.5", className)
    }, props)
  );
}
function BreadcrumbLink(_a) {
  var _b = _a, {
    asChild,
    className
  } = _b, props = __objRest(_b, [
    "asChild",
    "className"
  ]);
  const Comp = asChild ? Slot3 : "a";
  return /* @__PURE__ */ jsx18(
    Comp,
    __spreadValues({
      "data-slot": "breadcrumb-link",
      className: cn("transition-colors hover:text-foreground", className)
    }, props)
  );
}
function BreadcrumbPage(_a) {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx18(
    "span",
    __spreadValues({
      "data-slot": "breadcrumb-page",
      role: "link",
      "aria-disabled": "true",
      "aria-current": "page",
      className: cn("font-normal text-foreground", className)
    }, props)
  );
}
function BreadcrumbSeparator(_a) {
  var _b = _a, {
    children,
    className
  } = _b, props = __objRest(_b, [
    "children",
    "className"
  ]);
  return /* @__PURE__ */ jsx18(
    "li",
    __spreadProps(__spreadValues({
      "data-slot": "breadcrumb-separator",
      role: "presentation",
      "aria-hidden": "true",
      className: cn("[&>svg]:size-3.5", className)
    }, props), {
      children: children != null ? children : /* @__PURE__ */ jsx18(ChevronRight, {})
    })
  );
}
function BreadcrumbEllipsis(_a) {
  var _b = _a, {
    className
  } = _b, props = __objRest(_b, [
    "className"
  ]);
  return /* @__PURE__ */ jsxs12(
    "span",
    __spreadProps(__spreadValues({
      "data-slot": "breadcrumb-ellipsis",
      role: "presentation",
      "aria-hidden": "true",
      className: cn("flex size-9 items-center justify-center", className)
    }, props), {
      children: [
        /* @__PURE__ */ jsx18(MoreHorizontal, { className: "size-4" }),
        /* @__PURE__ */ jsx18("span", { className: "sr-only", children: "More" })
      ]
    })
  );
}

// src/components/assistant-ui/runtime.tsx
import { createContext as createContext4, useCallback as useCallback4, useContext as useContext4, useEffect as useEffect5, useRef as useRef2, useState as useState8 } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime
} from "@assistant-ui/react";

// src/lib/backend-api.ts
function toQueryString(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === void 0 || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
async function postState(backendUrl, path, payload) {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;
  console.log("\u{1F535} [postState] URL:", url);
  console.log("\u{1F535} [postState] Payload:", payload);
  const response = await fetch(url, {
    method: "POST"
  });
  console.log("\u{1F535} [postState] Response status:", response.status);
  if (!response.ok) {
    console.error("\u{1F534} [postState] Error:", response.status, response.statusText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  console.log("\u{1F7E2} [postState] Success:", data);
  return data;
}
var BackendApi = class {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.connectionStatus = false;
    this.eventSource = null;
    this.updatesEventSources = /* @__PURE__ */ new Map();
  }
  async fetchState(sessionId) {
    console.log("\u{1F535} [fetchState] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [fetchState] URL:", url);
    const response = await fetch(url);
    console.log("\u{1F535} [fetchState] Response status:", response.status, response.statusText);
    if (!response.ok) {
      console.error("\u{1F534} [fetchState] Error:", response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [fetchState] Success:", data);
    return data;
  }
  async postChatMessage(sessionId, message) {
    console.log("\u{1F535} [postChatMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState(this.backendUrl, "/api/chat", { message, session_id: sessionId });
    console.log("\u{1F7E2} [postChatMessage] Success:", result);
    return result;
  }
  async postSystemMessage(sessionId, message) {
    console.log("\u{1F535} [postSystemMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState(this.backendUrl, "/api/system", { message, session_id: sessionId });
    console.log("\u{1F7E2} [postSystemMessage] Success:", result);
    return result;
  }
  async postInterrupt(sessionId) {
    console.log("\u{1F535} [postInterrupt] Called with sessionId:", sessionId);
    const result = await postState(this.backendUrl, "/api/interrupt", { session_id: sessionId });
    console.log("\u{1F7E2} [postInterrupt] Success:", result);
    return result;
  }
  disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionStatus(false);
  }
  setConnectionStatus(on) {
    this.connectionStatus = on;
  }
  async connectSSE(sessionId, publicKey) {
    this.disconnectSSE();
    try {
      const url = new URL(`${this.backendUrl}/api/chat/stream`);
      url.searchParams.set("session_id", sessionId);
      if (publicKey) {
        url.searchParams.set("public_key", publicKey);
      }
      this.eventSource = new EventSource(url.toString());
      this.eventSource.onopen = () => {
        console.log("\u{1F310} SSE connection opened to:", url.toString());
        this.setConnectionStatus(true);
      };
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
        } catch (error) {
          console.error("Failed to parse SSE data:", error);
        }
      };
      this.eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
      };
    } catch (error) {
      console.error("Failed to establish SSE connection:", error);
      this.handleConnectionError(sessionId, publicKey);
    }
  }
  handleConnectionError(sessionId, publicKey) {
    this.setConnectionStatus(false);
    let attempt = 0;
    let total = 3;
    if (attempt < total) {
      attempt++;
      console.log(`Attempting to reconnect (${attempt}/${total})...`);
      setTimeout(() => {
        this.connectSSE(sessionId, publicKey);
      }, 100);
    } else {
      console.error("Max reconnection attempts reached");
      this.setConnectionStatus(false);
    }
  }
  subscribeToUpdates(sessionId, onUpdate, onError) {
    const updatesUrl = new URL("/api/updates", this.backendUrl);
    updatesUrl.searchParams.set("session_id", sessionId);
    const existing = this.updatesEventSources.get(sessionId);
    if (existing) {
      existing.close();
    }
    const updatesEventSource = new EventSource(updatesUrl.toString());
    this.updatesEventSources.set(sessionId, updatesEventSource);
    console.log("\u{1F535} [subscribeToUpdates] URL:", updatesUrl.toString());
    updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse system update SSE:", error);
        onError == null ? void 0 : onError(error);
      }
    };
    updatesEventSource.onerror = (error) => {
      console.error("System updates SSE error:", error);
      onError == null ? void 0 : onError(error);
    };
    return () => {
      const current = this.updatesEventSources.get(sessionId);
      if (current === updatesEventSource) {
        current.close();
        this.updatesEventSources.delete(sessionId);
      } else {
        updatesEventSource.close();
      }
    };
  }
  async fetchEventsAfter(sessionId, afterId = 0, limit = 100) {
    const url = new URL("/api/events", this.backendUrl);
    url.searchParams.set("session_id", sessionId);
    if (afterId > 0) url.searchParams.set("after_id", String(afterId));
    if (limit) url.searchParams.set("limit", String(limit));
    console.log("\u{1F535} [fetchEventsAfter] URL:", url.toString());
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch events: HTTP ${response.status}`);
    }
    return await response.json();
  }
  // ==================== Thread Management API ====================
  /**
   * Fetch all threads/sessions for a given public key
   * @param publicKey - User's wallet address
   * @returns Array of thread metadata
   */
  async fetchThreads(publicKey) {
    console.log("\u{1F535} [fetchThreads] Called with publicKey:", publicKey);
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    console.log("\u{1F535} [fetchThreads] URL:", url);
    const response = await fetch(url);
    console.log("\u{1F535} [fetchThreads] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [fetchThreads] Error:", response.status);
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [fetchThreads] Success:", data);
    return data;
  }
  /**
   * Create a new thread/session
   * @param publicKey - Optional user's wallet address
   * @param title - Thread title (keep empty for backend to own the title)
   * @returns Created thread information with backend-generated ID
   */
  async createThread(publicKey, title) {
    console.log("\u{1F535} [createThread] Called with publicKey:", publicKey, "title:", title);
    const body = {};
    if (publicKey) {
      body.public_key = publicKey;
    }
    if (title) {
      body.title = title;
    }
    console.log("\u{1F535} [createThread] Request body:", body);
    const url = `${this.backendUrl}/api/sessions`;
    console.log("\u{1F535} [createThread] URL:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("\u{1F535} [createThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [createThread] Error:", response.status);
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [createThread] Success:", data);
    return data;
  }
  /**
   * Archive a thread/session
   * @param sessionId - The session ID to archive
   */
  async archiveThread(sessionId) {
    console.log("\u{1F535} [archiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    console.log("\u{1F535} [archiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("\u{1F535} [archiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [archiveThread] Error:", response.status);
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [archiveThread] Success");
  }
  /**
   * Unarchive a thread/session
   * @param sessionId - The session ID to unarchive
   */
  async unarchiveThread(sessionId) {
    console.log("\u{1F535} [unarchiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    console.log("\u{1F535} [unarchiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("\u{1F535} [unarchiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [unarchiveThread] Error:", response.status);
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [unarchiveThread] Success");
  }
  /**
   * Delete a thread/session permanently
   * @param sessionId - The session ID to delete
   */
  async deleteThread(sessionId) {
    console.log("\u{1F535} [deleteThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [deleteThread] URL:", url);
    const response = await fetch(url, { method: "DELETE" });
    console.log("\u{1F535} [deleteThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [deleteThread] Error:", response.status);
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [deleteThread] Success");
  }
  /**
   * Rename a thread/session
   * @param sessionId - The session ID to rename
   * @param newTitle - The new title for the thread
   */
  async renameThread(sessionId, newTitle) {
    console.log("\u{1F535} [renameThread] Called with sessionId:", sessionId, "newTitle:", newTitle);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [renameThread] URL:", url);
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle })
    });
    console.log("\u{1F535} [renameThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [renameThread] Error:", response.status);
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [renameThread] Success");
  }
};

// src/lib/conversion.ts
function constructThreadMessage(msg) {
  var _a;
  if (msg.sender === "system") return null;
  const content = [];
  const role = msg.sender === "user" ? "user" : "assistant";
  if (msg.content) {
    content.push({ type: "text", text: msg.content });
  }
  const [topic, toolContent] = (_a = parseToolStream(msg.tool_stream)) != null ? _a : [];
  if (topic && toolContent) {
    content.push({
      type: "tool-call",
      toolCallId: `tool_${Date.now()}`,
      toolName: topic,
      args: void 0,
      result: (() => {
        try {
          return JSON.parse(toolContent);
        } catch (e) {
          return { args: toolContent };
        }
      })()
    });
  }
  const threadMessage = __spreadValues({
    role,
    content: content.length > 0 ? content : [{ type: "text", text: "" }]
  }, msg.timestamp && { createdAt: new Date(msg.timestamp) });
  return threadMessage;
}
function constructSystemMessage(msg) {
  var _a;
  const [topic] = (_a = parseToolStream(msg.tool_stream)) != null ? _a : [];
  const messageText = topic || msg.content || "";
  const timestamp = parseTimestamp(msg.timestamp);
  if (!messageText.trim()) return null;
  return __spreadValues({
    role: "system",
    content: [{ type: "text", text: messageText }]
  }, timestamp && { createdAt: timestamp });
}
function parseTimestamp(timestamp) {
  if (!timestamp) return void 0;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.valueOf()) ? void 0 : parsed;
}
function parseToolStream(toolStream) {
  if (!toolStream) return null;
  if (Array.isArray(toolStream) && toolStream.length === 2) {
    const [topic, content] = toolStream;
    return [String(topic), content];
  } else if (typeof toolStream === "object") {
    const topic = toolStream.topic;
    const content = toolStream.content;
    return topic ? [String(topic), String(content)] : null;
  }
  return null;
}

// src/lib/notification-context.tsx
import { createContext as createContext3, useContext as useContext3, useCallback as useCallback3, useState as useState7 } from "react";
import { jsx as jsx19 } from "react/jsx-runtime";
var NotificationContext = createContext3(void 0);
function useNotification() {
  const context = useContext3(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState7([]);
  const showNotification = useCallback3((notification) => {
    var _a, _b;
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = __spreadProps(__spreadValues({}, notification), {
      id,
      duration: (_a = notification.duration) != null ? _a : 5e3
    });
    setNotifications((prev) => [newNotification, ...prev]);
    const duration = (_b = newNotification.duration) != null ? _b : 5e3;
    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    }
  }, []);
  const dismissNotification = useCallback3((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  return /* @__PURE__ */ jsx19(NotificationContext.Provider, { value: { showNotification, notifications, dismissNotification }, children });
}

// src/components/assistant-ui/runtime.tsx
import { jsx as jsx20 } from "react/jsx-runtime";
var RuntimeActionsContext = createContext4(void 0);
var isTempThreadId = (id) => id.startsWith("temp-");
async function pickInjectedProvider(publicKey) {
  const ethereum = globalThis.ethereum;
  if (!(ethereum == null ? void 0 : ethereum.request)) return void 0;
  const candidates = Array.isArray(ethereum.providers) ? ethereum.providers.filter((p) => !!(p == null ? void 0 : p.request)) : [ethereum];
  const target = publicKey == null ? void 0 : publicKey.toLowerCase();
  if (target) {
    for (const candidate of candidates) {
      try {
        const accounts = await candidate.request({ method: "eth_accounts" });
        const list = Array.isArray(accounts) ? accounts.map((a) => String(a).toLowerCase()) : [];
        if (list.includes(target)) return candidate;
      } catch (e) {
      }
    }
  }
  return candidates[0];
}
function normalizeWalletError(error) {
  var _a, _b, _c, _d, _e, _f, _g;
  const e = error;
  const cause = (_a = e == null ? void 0 : e.cause) != null ? _a : null;
  const code = (_b = typeof (e == null ? void 0 : e.code) === "number" ? e.code : void 0) != null ? _b : typeof (cause == null ? void 0 : cause.code) === "number" ? cause.code : void 0;
  const name = (_c = typeof (e == null ? void 0 : e.name) === "string" ? e.name : void 0) != null ? _c : typeof (cause == null ? void 0 : cause.name) === "string" ? cause.name : void 0;
  const msg = (_g = (_f = (_e = (_d = typeof (e == null ? void 0 : e.shortMessage) === "string" ? e.shortMessage : void 0) != null ? _d : typeof (cause == null ? void 0 : cause.shortMessage) === "string" ? cause.shortMessage : void 0) != null ? _e : typeof (e == null ? void 0 : e.message) === "string" ? e.message : void 0) != null ? _f : typeof (cause == null ? void 0 : cause.message) === "string" ? cause.message : void 0) != null ? _g : "Unknown wallet error";
  const rejected = code === 4001 || name === "UserRejectedRequestError" || name === "RejectedRequestError" || /user rejected|rejected the request|denied|request rejected|canceled|cancelled/i.test(msg);
  return { rejected, message: msg };
}
function parseBackendSystemEvent(value) {
  if (!value || typeof value !== "object") return null;
  const entries = Object.entries(value);
  if (entries.length !== 1) return null;
  const [key, payload] = entries[0];
  switch (key) {
    case "InlineDisplay":
      return { InlineDisplay: payload };
    case "SystemNotice":
      return { SystemNotice: typeof payload === "string" ? payload : String(payload) };
    case "SystemError":
      return { SystemError: typeof payload === "string" ? payload : String(payload) };
    case "AsyncUpdate":
      return { AsyncUpdate: payload };
    default:
      return null;
  }
}
function toHexQuantity(value) {
  const trimmed = value.trim();
  const asBigInt = BigInt(trimmed);
  return `0x${asBigInt.toString(16)}`;
}
var parseTimestamp2 = (value) => {
  if (value === void 0 || value === null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value < 1e12 ? value * 1e3 : value : 0;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric < 1e12 ? numeric * 1e3 : numeric;
  }
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};
var isPlaceholderTitle = (title) => {
  var _a;
  const normalized = (_a = title == null ? void 0 : title.trim()) != null ? _a : "";
  return !normalized || normalized.startsWith("#[");
};
var useRuntimeActions = () => {
  const context = useContext4(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
};
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
  onWalletTxRequest
}) {
  const {
    currentThreadId,
    setCurrentThreadId,
    bumpThreadViewKey,
    threads,
    setThreads,
    threadMetadata,
    setThreadMetadata,
    threadCnt,
    setThreadCnt,
    getThreadMessages,
    setThreadMessages,
    updateThreadMetadata
  } = useThreadContext();
  const { showNotification } = useNotification();
  const [isRunning, setIsRunning] = useState8(false);
  const [subscribableSessionId, setSubscribableSessionId] = useState8(null);
  const [updateSubscriptionsTick, setUpdateSubscriptionsTick] = useState8(0);
  const backendApiRef = useRef2(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef2(null);
  const pollingThreadIdRef = useRef2(null);
  const pendingSystemMessagesRef = useRef2(/* @__PURE__ */ new Map());
  const lastEventIdBySessionRef = useRef2(/* @__PURE__ */ new Map());
  const eventsInFlightRef = useRef2(/* @__PURE__ */ new Set());
  const updateSubscriptionsRef = useRef2(/* @__PURE__ */ new Map());
  const extraMessagesByThreadRef = useRef2(/* @__PURE__ */ new Map());
  const handledWalletTxRequestsRef = useRef2(/* @__PURE__ */ new Set());
  const walletTxQueueRef = useRef2([]);
  const walletTxInFlightRef = useRef2(false);
  const pendingChatMessagesRef = useRef2(/* @__PURE__ */ new Map());
  const creatingThreadIdRef = useRef2(null);
  const createThreadPromiseRef = useRef2(null);
  const bumpUpdateSubscriptions = useCallback4(() => {
    setUpdateSubscriptionsTick((prev) => prev + 1);
  }, []);
  const currentMessages = getThreadMessages(currentThreadId);
  const currentThreadIdRef = useRef2(currentThreadId);
  useEffect5(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);
  const skipInitialFetchRef = useRef2(/* @__PURE__ */ new Set());
  const tempToBackendIdRef = useRef2(/* @__PURE__ */ new Map());
  const resolveThreadId = useCallback4((threadId) => {
    return tempToBackendIdRef.current.get(threadId) || threadId;
  }, []);
  const findTempIdForBackendId = useCallback4((backendId) => {
    for (const [tempId, bId] of tempToBackendIdRef.current.entries()) {
      if (bId === backendId) return tempId;
    }
    return void 0;
  }, []);
  const isThreadReady = useCallback4((threadId) => {
    if (!isTempThreadId(threadId)) return true;
    return tempToBackendIdRef.current.has(threadId);
  }, []);
  const applySessionMessagesToThread = useCallback4(
    (threadId, msgs) => {
      var _a, _b, _c;
      if (!msgs) return;
      const hasPendingMessages = pendingChatMessagesRef.current.has(threadId) && ((_b = (_a = pendingChatMessagesRef.current.get(threadId)) == null ? void 0 : _a.length) != null ? _b : 0) > 0;
      if (hasPendingMessages) return;
      const threadMessages = [];
      for (const msg of msgs) {
        if (msg.sender === "system") {
          const systemMessage = constructSystemMessage(msg);
          if (systemMessage) threadMessages.push(systemMessage);
          continue;
        }
        const threadMessage = constructThreadMessage(msg);
        if (threadMessage) threadMessages.push(threadMessage);
      }
      const extras = (_c = extraMessagesByThreadRef.current.get(threadId)) != null ? _c : [];
      setThreadMessages(threadId, [...threadMessages, ...extras]);
    },
    [setThreadMessages]
  );
  const appendExtraMessages = useCallback4(
    (threadId, messages) => {
      var _a;
      if (!messages.length) return;
      const existing = (_a = extraMessagesByThreadRef.current.get(threadId)) != null ? _a : [];
      extraMessagesByThreadRef.current.set(threadId, [...existing, ...messages]);
    },
    []
  );
  const enqueueWalletTxRequest = useCallback4(
    (sessionId, threadId, request) => {
      var _a;
      const key = `${sessionId}:${(_a = request.timestamp) != null ? _a : JSON.stringify(request)}`;
      if (handledWalletTxRequestsRef.current.has(key)) return;
      handledWalletTxRequestsRef.current.add(key);
      walletTxQueueRef.current.push({ sessionId, threadId, request });
    },
    []
  );
  const drainWalletTxQueue = useCallback4(async () => {
    var _a, _b, _c;
    if (walletTxInFlightRef.current) return;
    const next = walletTxQueueRef.current.shift();
    if (!next) return;
    walletTxInFlightRef.current = true;
    try {
      if (onWalletTxRequest) {
        const txHash2 = await onWalletTxRequest(next.request, {
          sessionId: next.sessionId,
          threadId: next.threadId,
          publicKey
        });
        showNotification({
          type: "success",
          iconType: "transaction",
          title: "Transaction Sent",
          message: `Hash: ${txHash2}`
        });
        await backendApiRef.current.postSystemMessage(next.sessionId, `Transaction sent: ${txHash2}`);
        if (currentThreadIdRef.current === next.threadId) {
          try {
            const state = await backendApiRef.current.fetchState(next.sessionId);
            applySessionMessagesToThread(next.threadId, state.messages);
          } catch (refreshError) {
            console.error("Failed to refresh state after wallet tx:", refreshError);
          }
        }
        return;
      }
      const activeProvider = await pickInjectedProvider(publicKey);
      if (!(activeProvider == null ? void 0 : activeProvider.request)) {
        showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Found",
          message: "No wallet provider found (window.ethereum missing)."
        });
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          "No wallet provider found (window.ethereum missing)."
        );
        return;
      }
      const accounts = await activeProvider.request({ method: "eth_accounts" });
      const addresses = Array.isArray(accounts) ? accounts.map(String) : [];
      const from = publicKey || addresses[0];
      if (!from) {
        await activeProvider.request({ method: "eth_requestAccounts" });
      }
      const fromAddress = publicKey || await activeProvider.request({ method: "eth_accounts" });
      const resolvedFrom = publicKey || (Array.isArray(fromAddress) ? String((_a = fromAddress[0]) != null ? _a : "") : "");
      if (!resolvedFrom) {
        showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Connected",
          message: "Please connect a wallet to sign the requested transaction."
        });
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          "Wallet is not connected; please connect a wallet to sign the requested transaction."
        );
        return;
      }
      const gas = (_c = (_b = next.request.gas) != null ? _b : next.request.gas_limit) != null ? _c : void 0;
      let valueHex;
      let gasHex;
      try {
        valueHex = toHexQuantity(next.request.value);
        if (gas) gasHex = toHexQuantity(gas);
      } catch (error) {
        showNotification({
          type: "error",
          iconType: "transaction",
          title: "Invalid Transaction",
          message: error.message
        });
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          `Invalid wallet transaction request payload: ${error.message}`
        );
        return;
      }
      const txParams = __spreadValues({
        from: resolvedFrom,
        to: next.request.to,
        value: valueHex,
        data: next.request.data
      }, gasHex ? { gas: gasHex } : {});
      const txHash = await activeProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });
      showNotification({
        type: "success",
        title: "Transaction sent",
        message: `Transaction hash: ${txHash}`
      });
      await backendApiRef.current.postSystemMessage(next.sessionId, `Transaction sent: ${txHash}`);
      if (currentThreadIdRef.current === next.threadId) {
        try {
          const state = await backendApiRef.current.fetchState(next.sessionId);
          applySessionMessagesToThread(next.threadId, state.messages);
        } catch (refreshError) {
          console.error("Failed to refresh state after wallet tx:", refreshError);
        }
      }
    } catch (error) {
      const normalized = normalizeWalletError(error);
      const final = normalized.rejected ? "Transaction rejected by user." : `Transaction failed: ${normalized.message}`;
      showNotification({
        type: normalized.rejected ? "notice" : "error",
        iconType: normalized.rejected ? "transaction" : "error",
        title: normalized.rejected ? "Transaction Rejected" : "Transaction Failed",
        message: normalized.rejected ? "Transaction was rejected by user." : normalized.message
      });
      try {
        await backendApiRef.current.postSystemMessage(next.sessionId, final);
        if (currentThreadIdRef.current === next.threadId) {
          try {
            const state = await backendApiRef.current.fetchState(next.sessionId);
            applySessionMessagesToThread(next.threadId, state.messages);
          } catch (refreshError) {
            console.error("Failed to refresh state after wallet tx:", refreshError);
          }
        }
      } catch (postError) {
        console.error("Failed to report wallet tx result to backend:", postError);
      }
    } finally {
      walletTxInFlightRef.current = false;
      void drainWalletTxQueue();
    }
  }, [applySessionMessagesToThread, onWalletTxRequest, publicKey, showNotification]);
  const handleWalletTxRequest = useCallback4(
    (sessionId, threadId, request) => {
      if (currentThreadIdRef.current !== threadId) return;
      const description = request.description || request.topic || "Wallet transaction requested";
      showNotification({
        type: "notice",
        iconType: "wallet",
        title: "Transaction Request",
        message: description
      });
      enqueueWalletTxRequest(sessionId, threadId, request);
      void drainWalletTxQueue();
    },
    [drainWalletTxQueue, enqueueWalletTxRequest, showNotification]
  );
  const handleBackendSystemEvents = useCallback4(
    (sessionId, threadId, rawEvents) => {
      if (!(rawEvents == null ? void 0 : rawEvents.length)) return;
      for (const raw of rawEvents) {
        const parsed = parseBackendSystemEvent(raw);
        if (!parsed) continue;
        if ("InlineDisplay" in parsed) {
          const payload = parsed.InlineDisplay;
          if (!payload || typeof payload !== "object") continue;
          const type = payload.type;
          if (type !== "wallet_tx_request") continue;
          const requestValue = payload.payload;
          if (!requestValue || typeof requestValue !== "object") continue;
          const req = requestValue;
          if (typeof req.to !== "string" || typeof req.value !== "string" || typeof req.data !== "string") {
            continue;
          }
          handleWalletTxRequest(sessionId, threadId, req);
        }
        if ("SystemError" in parsed) {
          showNotification({
            type: "error",
            iconType: "error",
            title: "Error",
            message: parsed.SystemError
          });
        }
        if ("SystemNotice" in parsed) {
          showNotification({
            type: "notice",
            iconType: "notice",
            title: "Notice",
            message: parsed.SystemNotice
          });
        }
      }
    },
    [handleWalletTxRequest, showNotification]
  );
  const applyMessagesForThread = useCallback4(
    (threadId, msgs) => {
      applySessionMessagesToThread(threadId, msgs);
    },
    [applySessionMessagesToThread]
  );
  useEffect5(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);
  const stopPolling = useCallback4(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingThreadIdRef.current = null;
  }, []);
  const startPolling = useCallback4(() => {
    if (!isThreadReady(currentThreadId)) return;
    if (pollingIntervalRef.current) {
      if (pollingThreadIdRef.current === currentThreadId) return;
      stopPolling();
    }
    const threadIdForPolling = currentThreadId;
    const backendThreadId = resolveThreadId(currentThreadId);
    setIsRunning(true);
    pollingThreadIdRef.current = threadIdForPolling;
    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (currentThreadIdRef.current !== threadIdForPolling) return;
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          stopPolling();
          return;
        }
        handleBackendSystemEvents(backendThreadId, threadIdForPolling, state.system_events);
        applyMessagesForThread(threadIdForPolling, state.messages);
        if (!state.is_processing) {
          setIsRunning(false);
          stopPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
        setIsRunning(false);
      }
    }, 500);
  }, [
    currentThreadId,
    applyMessagesForThread,
    handleBackendSystemEvents,
    stopPolling,
    isThreadReady,
    resolveThreadId
  ]);
  const interruptThread = useCallback4(
    async (threadId) => {
      if (!isThreadReady(threadId)) return;
      const backendThreadId = resolveThreadId(threadId);
      try {
        await backendApiRef.current.postInterrupt(backendThreadId);
      } catch (error) {
        console.error("Failed to interrupt thread:", error);
      }
    },
    [isThreadReady, resolveThreadId]
  );
  useEffect5(() => {
    const fetchInitialState = async () => {
      const threadIdForFetch = currentThreadId;
      if (isTempThreadId(threadIdForFetch) && !tempToBackendIdRef.current.has(threadIdForFetch)) {
        if (currentThreadIdRef.current === threadIdForFetch) {
          setSubscribableSessionId(null);
          setIsRunning(false);
        }
        return;
      }
      if (skipInitialFetchRef.current.has(threadIdForFetch)) {
        skipInitialFetchRef.current.delete(threadIdForFetch);
        if (creatingThreadIdRef.current === threadIdForFetch) {
          if (isThreadReady(threadIdForFetch) && currentThreadIdRef.current === threadIdForFetch) {
            setSubscribableSessionId(resolveThreadId(threadIdForFetch));
          }
          if (currentThreadIdRef.current === threadIdForFetch) {
            setIsRunning(false);
          }
          return;
        }
      }
      const backendThreadId = resolveThreadId(threadIdForFetch);
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          if (currentThreadIdRef.current === threadIdForFetch) {
            setSubscribableSessionId(null);
            setIsRunning(false);
          }
          return;
        }
        handleBackendSystemEvents(backendThreadId, threadIdForFetch, state.system_events);
        applyMessagesForThread(threadIdForFetch, state.messages);
        if (currentThreadIdRef.current === threadIdForFetch) {
          setSubscribableSessionId(backendThreadId);
          if (state.is_processing) {
            setIsRunning(true);
            startPolling();
          } else {
            setIsRunning(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
      }
    };
    void fetchInitialState();
    return () => {
      stopPolling();
    };
  }, [
    currentThreadId,
    applyMessagesForThread,
    startPolling,
    stopPolling,
    resolveThreadId,
    isThreadReady
  ]);
  useEffect5(() => {
    if (!publicKey) return;
    const fetchThreadList = async () => {
      var _a, _b;
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const newMetadata = new Map(threadMetadata);
        let maxChatNum = threadCnt;
        for (const thread of threadList) {
          const rawTitle = (_a = thread.title) != null ? _a : "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive = thread.last_active_at || thread.updated_at || thread.created_at || ((_b = newMetadata.get(thread.session_id)) == null ? void 0 : _b.lastActiveAt) || (/* @__PURE__ */ new Date()).toISOString();
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive
          });
          const match = title.match(/^Chat (\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxChatNum) {
              maxChatNum = num;
            }
          }
        }
        setThreadMetadata(newMetadata);
        if (maxChatNum > threadCnt) {
          setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };
    void fetchThreadList();
  }, [publicKey]);
  const threadListAdapter = (() => {
    const sortByLastActiveDesc = ([, metaA], [, metaB]) => {
      const tsA = parseTimestamp2(metaA.lastActiveAt);
      const tsB = parseTimestamp2(metaB.lastActiveAt);
      return tsB - tsA;
    };
    const regularThreads = Array.from(threadMetadata.entries()).filter(([_, meta]) => meta.status === "regular").filter(([_, meta]) => !isPlaceholderTitle(meta.title)).sort(sortByLastActiveDesc).map(([id, meta]) => ({
      id,
      title: meta.title || "New Chat",
      status: "regular"
    }));
    const archivedThreadsArray = Array.from(threadMetadata.entries()).filter(([_, meta]) => meta.status === "archived").filter(([_, meta]) => !isPlaceholderTitle(meta.title)).sort(sortByLastActiveDesc).map(([id, meta]) => ({
      id,
      title: meta.title || "New Chat",
      status: "archived"
    }));
    return {
      threadId: currentThreadId,
      threads: regularThreads,
      archivedThreads: archivedThreadsArray,
      // Create new thread
      onSwitchToNewThread: async () => {
        var _a;
        const previousThreadId = currentThreadIdRef.current;
        stopPolling();
        if (isRunning) {
          void interruptThread(previousThreadId);
        }
        const preparePendingThread = (newId) => {
          creatingThreadIdRef.current = newId;
          pendingChatMessagesRef.current.delete(newId);
          pendingSystemMessagesRef.current.delete(newId);
          setThreadMetadata(
            (prev) => new Map(prev).set(newId, {
              title: "New Chat",
              status: "pending",
              lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
            })
          );
          setThreadMessages(newId, []);
          setCurrentThreadId(newId);
          setIsRunning(false);
          bumpThreadViewKey();
        };
        if (createThreadPromiseRef.current) {
          preparePendingThread((_a = creatingThreadIdRef.current) != null ? _a : `temp-${crypto.randomUUID()}`);
          return;
        }
        const tempId = `temp-${crypto.randomUUID()}`;
        preparePendingThread(tempId);
      },
      // Switch to existing thread
      onSwitchToThread: (threadId) => {
        setCurrentThreadId(threadId);
      },
      // Rename thread
      onRename: async (threadId, newTitle) => {
        updateThreadMetadata(threadId, { title: isPlaceholderTitle(newTitle) ? "" : newTitle });
        try {
          await backendApiRef.current.renameThread(threadId, newTitle);
        } catch (error) {
          console.error("Failed to rename thread:", error);
        }
      },
      // Archive thread
      onArchive: async (threadId) => {
        updateThreadMetadata(threadId, { status: "archived" });
        try {
          await backendApiRef.current.archiveThread(threadId);
        } catch (error) {
          console.error("Failed to archive thread:", error);
          updateThreadMetadata(threadId, { status: "regular" });
        }
      },
      // Unarchive thread
      onUnarchive: async (threadId) => {
        updateThreadMetadata(threadId, { status: "regular" });
        try {
          await backendApiRef.current.unarchiveThread(threadId);
        } catch (error) {
          console.error("Failed to unarchive thread:", error);
          updateThreadMetadata(threadId, { status: "archived" });
        }
      },
      // Delete thread
      onDelete: async (threadId) => {
        try {
          await backendApiRef.current.deleteThread(threadId);
          setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(threadId);
            return next;
          });
          setThreads((prev) => {
            const next = new Map(prev);
            next.delete(threadId);
            return next;
          });
          if (currentThreadId === threadId) {
            const firstRegularThread = Array.from(threadMetadata.entries()).find(([id, meta]) => meta.status === "regular" && id !== threadId);
            if (firstRegularThread) {
              setCurrentThreadId(firstRegularThread[0]);
            } else {
              const defaultId = "default-session";
              setThreadMetadata(
                (prev) => new Map(prev).set(defaultId, {
                  title: "New Chat",
                  status: "regular",
                  lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
                })
              );
              setThreadMessages(defaultId, []);
              setCurrentThreadId(defaultId);
            }
          }
        } catch (error) {
          console.error("Failed to delete thread:", error);
          throw error;
        }
      }
    };
  })();
  const sendSystemMessageNow = useCallback4(
    async (threadId, message) => {
      const backendThreadId = resolveThreadId(threadId);
      setIsRunning(true);
      try {
        const response = await backendApiRef.current.postSystemMessage(backendThreadId, message);
        if (currentThreadIdRef.current === threadId) {
          setSubscribableSessionId(backendThreadId);
        }
        if (response.res) {
          const systemMessage = constructSystemMessage(response.res);
          if (systemMessage) {
            const updatedMessages = [...getThreadMessages(threadId), systemMessage];
            setThreadMessages(threadId, updatedMessages);
          }
        }
        await startPolling();
      } catch (error) {
        console.error("Failed to send system message:", error);
        setIsRunning(false);
      }
    },
    [getThreadMessages, setThreadMessages, startPolling, resolveThreadId]
  );
  const flushPendingSystemMessages = useCallback4(
    async (threadId) => {
      const pending = pendingSystemMessagesRef.current.get(threadId);
      if (!(pending == null ? void 0 : pending.length)) return;
      pendingSystemMessagesRef.current.delete(threadId);
      for (const pendingMessage of pending) {
        await sendSystemMessageNow(threadId, pendingMessage);
      }
    },
    [sendSystemMessageNow]
  );
  const ensureBackendSessionForThread = useCallback4(
    (threadId) => {
      if (isThreadReady(threadId)) return;
      if (createThreadPromiseRef.current) return;
      creatingThreadIdRef.current = threadId;
      setThreadMetadata((prev) => {
        var _a, _b;
        const next = new Map(prev);
        const existing = next.get(threadId);
        next.set(threadId, {
          title: (_a = existing == null ? void 0 : existing.title) != null ? _a : "New Chat",
          status: "pending",
          lastActiveAt: (_b = existing == null ? void 0 : existing.lastActiveAt) != null ? _b : (/* @__PURE__ */ new Date()).toISOString()
        });
        return next;
      });
      skipInitialFetchRef.current.add(threadId);
      const createPromise = backendApiRef.current.createThread(publicKey, void 0).then(async (newThread) => {
        const backendId = newThread.session_id;
        tempToBackendIdRef.current.set(threadId, backendId);
        bumpUpdateSubscriptions();
        if (currentThreadIdRef.current === threadId) {
          setSubscribableSessionId(backendId);
        }
        const backendTitle = newThread.title;
        if (backendTitle && !isPlaceholderTitle(backendTitle)) {
          setThreadMetadata((prev) => {
            var _a;
            const next = new Map(prev);
            const existing = next.get(threadId);
            const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
            next.set(threadId, {
              title: backendTitle,
              status: nextStatus,
              lastActiveAt: (_a = existing == null ? void 0 : existing.lastActiveAt) != null ? _a : (/* @__PURE__ */ new Date()).toISOString()
            });
            return next;
          });
        }
        const pendingMessages = pendingChatMessagesRef.current.get(threadId);
        if (pendingMessages == null ? void 0 : pendingMessages.length) {
          pendingChatMessagesRef.current.delete(threadId);
          for (const text of pendingMessages) {
            try {
              await backendApiRef.current.postChatMessage(backendId, text);
            } catch (error) {
              console.error("Failed to send queued message:", error);
            }
          }
          await flushPendingSystemMessages(threadId);
          if (currentThreadIdRef.current === threadId) {
            startPolling();
          }
        }
      }).catch((error) => {
        console.error("Failed to create backend session:", error);
        createThreadPromiseRef.current = null;
      }).finally(() => {
        createThreadPromiseRef.current = null;
      });
      createThreadPromiseRef.current = createPromise;
    },
    [
      bumpUpdateSubscriptions,
      flushPendingSystemMessages,
      isThreadReady,
      publicKey,
      setThreadMetadata,
      startPolling
    ]
  );
  const onNew = useCallback4(
    async (message) => {
      const text = message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
      if (!text) return;
      const userMessage = {
        role: "user",
        content: [{ type: "text", text }],
        createdAt: /* @__PURE__ */ new Date()
      };
      setThreadMessages(currentThreadId, [...currentMessages, userMessage]);
      updateThreadMetadata(currentThreadId, { lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() });
      if (!isThreadReady(currentThreadId)) {
        console.log("Thread not ready yet; queuing message for later delivery.");
        setIsRunning(true);
        const pending = pendingChatMessagesRef.current.get(currentThreadId) || [];
        pendingChatMessagesRef.current.set(currentThreadId, [...pending, text]);
        ensureBackendSessionForThread(currentThreadId);
        return;
      }
      const backendThreadId = resolveThreadId(currentThreadId);
      try {
        setIsRunning(true);
        await backendApiRef.current.postChatMessage(backendThreadId, text);
        setSubscribableSessionId(backendThreadId);
        await flushPendingSystemMessages(currentThreadId);
        startPolling();
      } catch (error) {
        console.error("Failed to send message:", error);
        setIsRunning(false);
      }
    },
    [
      currentThreadId,
      currentMessages,
      ensureBackendSessionForThread,
      flushPendingSystemMessages,
      setThreadMessages,
      startPolling,
      isThreadReady,
      resolveThreadId,
      updateThreadMetadata
    ]
  );
  const sendSystemMessage = useCallback4(
    async (message) => {
      if (!isThreadReady(currentThreadId)) {
        const pending = pendingSystemMessagesRef.current.get(currentThreadId) || [];
        pendingSystemMessagesRef.current.set(currentThreadId, [...pending, message]);
        ensureBackendSessionForThread(currentThreadId);
        return;
      }
      const threadMessages = getThreadMessages(currentThreadId);
      const hasUserMessages = threadMessages.some((msg) => msg.role === "user");
      if (!hasUserMessages) {
        const pending = pendingSystemMessagesRef.current.get(currentThreadId) || [];
        pendingSystemMessagesRef.current.set(currentThreadId, [...pending, message]);
        return;
      }
      await sendSystemMessageNow(currentThreadId, message);
    },
    [
      currentThreadId,
      ensureBackendSessionForThread,
      getThreadMessages,
      isThreadReady,
      sendSystemMessageNow
    ]
  );
  const onCancel = useCallback4(async () => {
    if (!isThreadReady(currentThreadId)) return;
    stopPolling();
    const backendThreadId = resolveThreadId(currentThreadId);
    try {
      await backendApiRef.current.postInterrupt(backendThreadId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }, [currentThreadId, stopPolling, isThreadReady, resolveThreadId]);
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) => setThreadMessages(currentThreadId, [...msgs]),
    isRunning,
    onNew,
    onCancel,
    convertMessage: (msg) => msg,
    adapters: {
      threadList: threadListAdapter
      // 🎯 Thread list adapter enabled!
    }
  });
  useEffect5(() => {
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void flushPendingSystemMessages(currentThreadId);
    }
  }, [currentMessages, currentThreadId, flushPendingSystemMessages]);
  const applyTitleChanged = useCallback4(
    (sessionId, newTitle) => {
      const tempId = findTempIdForBackendId(sessionId);
      const threadIdToUpdate = tempId || sessionId;
      setThreadMetadata((prev) => {
        var _a;
        const next = new Map(prev);
        const existing = next.get(threadIdToUpdate);
        const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
        const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
        next.set(threadIdToUpdate, {
          title: normalizedTitle,
          status: nextStatus,
          lastActiveAt: (_a = existing == null ? void 0 : existing.lastActiveAt) != null ? _a : (/* @__PURE__ */ new Date()).toISOString()
        });
        return next;
      });
      if (!isPlaceholderTitle(newTitle) && creatingThreadIdRef.current === threadIdToUpdate) {
        creatingThreadIdRef.current = null;
      }
    },
    [findTempIdForBackendId, setThreadMetadata]
  );
  const drainEvents = useCallback4(
    async (sessionId) => {
      var _a;
      if (eventsInFlightRef.current.has(sessionId)) return;
      eventsInFlightRef.current.add(sessionId);
      try {
        let afterId = (_a = lastEventIdBySessionRef.current.get(sessionId)) != null ? _a : 0;
        for (; ; ) {
          const events = await backendApiRef.current.fetchEventsAfter(sessionId, afterId, 200);
          if (!events.length) break;
          for (const event of events) {
            const eventId = typeof event.event_id === "number" ? event.event_id : Number(event.event_id);
            if (Number.isFinite(eventId)) afterId = Math.max(afterId, eventId);
            if (event.type === "title_changed" && typeof event.new_title === "string") {
              applyTitleChanged(sessionId, event.new_title);
            }
            if (event.type === "wallet_tx_request") {
              const payload = event.payload;
              if (payload && typeof payload === "object") {
                const req = payload;
                if (typeof req.to === "string" && typeof req.value === "string" && typeof req.data === "string") {
                  const threadId = findTempIdForBackendId(sessionId) || sessionId;
                  handleWalletTxRequest(sessionId, threadId, req);
                }
              }
            }
          }
          if (events.length < 200) break;
        }
        lastEventIdBySessionRef.current.set(sessionId, afterId);
      } catch (error) {
        console.error("Failed to fetch async events:", error);
      } finally {
        eventsInFlightRef.current.delete(sessionId);
      }
    },
    [applyTitleChanged, findTempIdForBackendId, handleWalletTxRequest]
  );
  const ensureUpdateSubscription = useCallback4(
    (sessionId) => {
      if (updateSubscriptionsRef.current.has(sessionId)) return;
      const unsubscribe = backendApiRef.current.subscribeToUpdates(
        sessionId,
        (update) => {
          if (update.type !== "event_available") return;
          void drainEvents(update.session_id);
        },
        (error) => {
          console.error("Failed to handle system update SSE:", error);
        }
      );
      updateSubscriptionsRef.current.set(sessionId, unsubscribe);
    },
    [drainEvents]
  );
  const removeUpdateSubscription = useCallback4((sessionId) => {
    const unsubscribe = updateSubscriptionsRef.current.get(sessionId);
    if (!unsubscribe) return;
    unsubscribe();
    updateSubscriptionsRef.current.delete(sessionId);
  }, []);
  useEffect5(() => {
    const nextSessions = /* @__PURE__ */ new Set();
    if (subscribableSessionId) {
      nextSessions.add(subscribableSessionId);
    }
    for (const sessionId of updateSubscriptionsRef.current.keys()) {
      if (!nextSessions.has(sessionId)) {
        removeUpdateSubscription(sessionId);
      }
    }
    for (const sessionId of nextSessions) {
      ensureUpdateSubscription(sessionId);
    }
  }, [
    ensureUpdateSubscription,
    removeUpdateSubscription,
    subscribableSessionId,
    updateSubscriptionsTick
  ]);
  useEffect5(() => {
    return () => {
      for (const unsubscribe of updateSubscriptionsRef.current.values()) {
        unsubscribe();
      }
      updateSubscriptionsRef.current.clear();
    };
  }, []);
  return /* @__PURE__ */ jsx20(RuntimeActionsContext.Provider, { value: { sendSystemMessage }, children: /* @__PURE__ */ jsx20(AssistantRuntimeProvider, { runtime, children }) });
}

// src/utils/wallet.ts
import { useEffect as useEffect6, useRef as useRef3 } from "react";
var getNetworkName = (chainId) => {
  if (chainId === void 0) return "";
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base";
    case 10:
      return "optimism";
    case 11155111:
      return "sepolia";
    case 1337:
    case 31337:
      return "testnet";
    case 59140:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};
var formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";
function WalletSystemMessageEmitter({ wallet }) {
  const { sendSystemMessage } = useRuntimeActions();
  const { showNotification } = useNotification();
  const lastWalletRef = useRef3({ isConnected: false });
  useEffect6(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address == null ? void 0 : address.toLowerCase();
    if (isConnected && normalizedAddress && chainId && (!prev.isConnected || prev.address !== normalizedAddress)) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      showNotification({
        type: "success",
        iconType: "wallet",
        title: "Wallet Connected",
        message: `Connected to ${networkName} network (Chain ID: ${chainId})`
      });
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
      return;
    }
    if (!isConnected && prev.isConnected) {
      const message = "Wallet disconnected by user.";
      console.log(message);
      showNotification({
        type: "notice",
        iconType: "wallet",
        title: "Wallet Disconnected",
        message: "Wallet disconnected by user."
      });
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: false };
      return;
    }
    if (isConnected && normalizedAddress && chainId && prev.isConnected && prev.address === normalizedAddress && prev.chainId !== chainId) {
      const networkName = getNetworkName(chainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`;
      console.log(message);
      showNotification({
        type: "notice",
        iconType: "network",
        title: "Network Switched",
        message: `Switched to ${networkName} network (Chain ID: ${chainId})`
      });
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
    }
  }, [wallet, sendSystemMessage, showNotification]);
  return null;
}

// src/components/assistant-ui/notification.tsx
import {
  AlertTriangleIcon as AlertTriangleIcon2,
  CheckCircleIcon,
  XIcon as XIcon4,
  WalletIcon as WalletIcon2,
  SendIcon,
  Network,
  Info
} from "lucide-react";
import { useEffect as useEffect7, useRef as useRef4 } from "react";
import { jsx as jsx21, jsxs as jsxs13 } from "react/jsx-runtime";
function NotificationContainer() {
  const { notifications, dismissNotification } = useNotification();
  if (notifications.length === 0) return null;
  return /* @__PURE__ */ jsx21("div", { className: "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none", children: notifications.map((notification) => /* @__PURE__ */ jsx21(
    NotificationItem,
    {
      notification,
      onDismiss: dismissNotification
    },
    notification.id
  )) });
}
function NotificationItem({ notification, onDismiss }) {
  const timeoutRef = useRef4(null);
  useEffect7(() => {
    if (notification.duration && notification.duration > 0) {
      timeoutRef.current = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [notification.id, notification.duration, onDismiss]);
  const getIcon = () => {
    const iconType = notification.iconType || notification.type;
    switch (iconType) {
      case "wallet":
        return WalletIcon2;
      case "transaction":
        return SendIcon;
      case "network":
        return Network;
      case "error":
        return AlertTriangleIcon2;
      case "success":
        return CheckCircleIcon;
      case "warning":
        return AlertTriangleIcon2;
      case "notice":
      default:
        return Info;
    }
  };
  const Icon = getIcon();
  const getIconClassName = () => {
    const iconType = notification.iconType || notification.type;
    switch (iconType) {
      case "wallet":
        return "text-emerald-600 dark:text-emerald-300";
      case "transaction":
        return "text-blue-600 dark:text-blue-300";
      case "network":
        return "text-purple-600 dark:text-purple-300";
      case "error":
      case "warning":
        return "text-red-500 dark:text-red-300";
      case "success":
        return "text-emerald-600 dark:text-emerald-300";
      case "notice":
      default:
        return "text-blue-500 dark:text-blue-300";
    }
  };
  const iconClassName = getIconClassName();
  const bgClassName = notification.type === "error" ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : notification.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
  return /* @__PURE__ */ jsxs13(
    "div",
    {
      className: cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm shadow-lg animate-in slide-in-from-right fade-in",
        bgClassName
      ),
      role: "alert",
      children: [
        /* @__PURE__ */ jsx21(Icon, { className: cn("mt-0.5 size-4 shrink-0", iconClassName) }),
        /* @__PURE__ */ jsxs13("div", { className: "flex flex-1 flex-col gap-1 min-w-0", children: [
          /* @__PURE__ */ jsx21("span", { className: "font-medium text-foreground", children: notification.title }),
          /* @__PURE__ */ jsx21("div", { className: "leading-relaxed text-muted-foreground", children: notification.message })
        ] }),
        /* @__PURE__ */ jsx21(
          "button",
          {
            onClick: () => onDismiss(notification.id),
            className: "mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2",
            "aria-label": "Dismiss notification",
            children: /* @__PURE__ */ jsx21(XIcon4, { className: "size-4" })
          }
        )
      ]
    }
  );
}

// src/components/aomi-frame.tsx
import { jsx as jsx22, jsxs as jsxs14 } from "react/jsx-runtime";
var AomiFrame = ({
  width = "100%",
  height = "80vh",
  className,
  style,
  onWalletTxRequest,
  walletFooter,
  children
}) => {
  var _a;
  const backendUrl = (_a = process.env.NEXT_PUBLIC_BACKEND_URL) != null ? _a : "http://localhost:8080";
  const frameStyle = __spreadValues({ width, height }, style);
  const [wallet, setWalletState] = useState9({
    isConnected: false,
    address: void 0,
    chainId: void 0,
    ensName: void 0
  });
  const setWallet = useCallback5((data) => {
    setWalletState((prev) => __spreadValues(__spreadValues({}, prev), data));
  }, []);
  return /* @__PURE__ */ jsx22(ThreadContextProvider, { children: /* @__PURE__ */ jsx22(NotificationProvider, { children: /* @__PURE__ */ jsxs14(
    AomiRuntimeProvider,
    {
      backendUrl,
      publicKey: wallet.address,
      onWalletTxRequest,
      children: [
        /* @__PURE__ */ jsx22(WalletSystemMessageEmitter, { wallet }),
        /* @__PURE__ */ jsx22(NotificationContainer, {}),
        /* @__PURE__ */ jsx22(
          FrameShell,
          {
            className,
            frameStyle,
            walletFooter,
            wallet,
            setWallet,
            children
          }
        )
      ]
    }
  ) }) });
};
var FrameShell = ({
  className,
  frameStyle,
  walletFooter,
  wallet,
  setWallet,
  children
}) => {
  var _a, _b;
  const currentTitle = (_b = (_a = useCurrentThreadMetadata()) == null ? void 0 : _a.title) != null ? _b : "New Chat";
  const { currentThreadId, threadViewKey } = useThreadContext();
  return /* @__PURE__ */ jsxs14(SidebarProvider, { children: [
    children,
    /* @__PURE__ */ jsxs14(
      "div",
      {
        className: cn(
          "flex h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950",
          className
        ),
        style: frameStyle,
        children: [
          /* @__PURE__ */ jsx22(ThreadListSidebar, { footer: walletFooter == null ? void 0 : walletFooter({ wallet, setWallet }) }),
          /* @__PURE__ */ jsxs14(SidebarInset, { className: "relative", children: [
            /* @__PURE__ */ jsxs14("header", { className: "flex h-14 mt-1 shrink-0 items-center gap-2 border-b px-3", children: [
              /* @__PURE__ */ jsx22(SidebarTrigger, {}),
              /* @__PURE__ */ jsx22(Separator, { orientation: "vertical", className: "mr-2 h-4" }),
              /* @__PURE__ */ jsx22(Breadcrumb, { children: /* @__PURE__ */ jsxs14(BreadcrumbList, { children: [
                /* @__PURE__ */ jsx22(BreadcrumbItem, { className: "hidden md:block", children: currentTitle }),
                /* @__PURE__ */ jsx22(BreadcrumbSeparator, { className: "hidden md:block" })
              ] }) })
            ] }),
            /* @__PURE__ */ jsx22("div", { className: "flex-1 overflow-hidden", children: /* @__PURE__ */ jsx22(Thread, {}, `${currentThreadId}-${threadViewKey}`) })
          ] })
        ]
      }
    )
  ] });
};

// src/components/assistant-ui/base-sidebar.tsx
import Link2 from "next/link";
import Image4 from "next/image";
import { jsx as jsx23, jsxs as jsxs15 } from "react/jsx-runtime";
function BaseSidebar(_a) {
  var _b = _a, {
    footerLabel = "Connect Wallet",
    footerSecondaryLabel,
    onFooterClick,
    logoUrl = "/assets/images/a.svg",
    logoHref = "https://aomi.dev"
  } = _b, props = __objRest(_b, [
    "footerLabel",
    "footerSecondaryLabel",
    "onFooterClick",
    "logoUrl",
    "logoHref"
  ]);
  return /* @__PURE__ */ jsxs15(
    Sidebar,
    __spreadProps(__spreadValues({
      collapsible: "offcanvas",
      variant: "inset",
      className: "relative"
    }, props), {
      children: [
        /* @__PURE__ */ jsx23(SidebarHeader, { className: "aomi-sidebar-header", children: /* @__PURE__ */ jsx23("div", { className: "aomi-sidebar-header-content flex items-center justify-between", children: /* @__PURE__ */ jsx23(SidebarMenu, { children: /* @__PURE__ */ jsx23(SidebarMenuItem, { children: /* @__PURE__ */ jsx23(SidebarMenuButton, { size: "lg", asChild: true, children: /* @__PURE__ */ jsx23(
          Link2,
          {
            href: logoHref,
            target: "_blank",
            rel: "noopener noreferrer",
            children: /* @__PURE__ */ jsx23("div", { className: "aomi-sidebar-header-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-white", children: /* @__PURE__ */ jsx23(
              Image4,
              {
                src: logoUrl,
                alt: "Logo",
                width: 28,
                height: 28,
                className: "aomi-sidebar-header-icon size-7 ml-3",
                priority: true
              }
            ) })
          }
        ) }) }) }) }) }),
        /* @__PURE__ */ jsx23(SidebarContent, { className: "aomi-sidebar-content", children: /* @__PURE__ */ jsx23(ThreadList, {}) }),
        /* @__PURE__ */ jsx23(SidebarRail, {}),
        /* @__PURE__ */ jsx23(SidebarFooter, { className: "aomi-sidebar-footer border-t border-sm py-4", children: /* @__PURE__ */ jsx23(SidebarMenu, { children: /* @__PURE__ */ jsx23(SidebarMenuItem, { children: /* @__PURE__ */ jsx23(SidebarMenuButton, { size: "lg", asChild: true, children: /* @__PURE__ */ jsx23(
          Button,
          {
            className: "w-full justify-center rounded-full text-white shadow-lg hover:bg-[var(--muted-foreground)] hover:text-white",
            onClick: onFooterClick,
            children: /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx23("span", { className: "text-sm", children: footerLabel }),
              footerSecondaryLabel ? /* @__PURE__ */ jsxs15("span", { className: "text-[11px] text-white/80", children: [
                "\u2022 ",
                footerSecondaryLabel
              ] }) : null
            ] })
          }
        ) }) }) }) })
      ]
    })
  );
}

// src/components/ui/card.tsx
import * as React3 from "react";
import { jsx as jsx24 } from "react/jsx-runtime";
var Card = React3.forwardRef((_a, ref) => {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx24(
    "div",
    __spreadValues({
      ref,
      className: cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )
    }, props)
  );
});
Card.displayName = "Card";
var CardHeader = React3.forwardRef((_a, ref) => {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx24(
    "div",
    __spreadValues({
      ref,
      className: cn("flex flex-col space-y-1.5 p-6", className)
    }, props)
  );
});
CardHeader.displayName = "CardHeader";
var CardTitle = React3.forwardRef((_a, ref) => {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx24(
    "h3",
    __spreadValues({
      ref,
      className: cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )
    }, props)
  );
});
CardTitle.displayName = "CardTitle";
var CardDescription = React3.forwardRef((_a, ref) => {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx24(
    "p",
    __spreadValues({
      ref,
      className: cn("text-sm text-muted-foreground", className)
    }, props)
  );
});
CardDescription.displayName = "CardDescription";
var CardContent = React3.forwardRef((_a, ref) => {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx24("div", __spreadValues({ ref, className: cn("p-6 pt-0", className) }, props));
});
CardContent.displayName = "CardContent";
var CardFooter = React3.forwardRef((_a, ref) => {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx24(
    "div",
    __spreadValues({
      ref,
      className: cn("flex items-center p-6 pt-0", className)
    }, props)
  );
});
CardFooter.displayName = "CardFooter";

// src/components/ui/badge.tsx
import { cva as cva3 } from "class-variance-authority";
import { jsx as jsx25 } from "react/jsx-runtime";
var badgeVariants = cva3(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge(_a) {
  var _b = _a, { className, variant } = _b, props = __objRest(_b, ["className", "variant"]);
  return /* @__PURE__ */ jsx25("div", __spreadValues({ className: cn(badgeVariants({ variant }), className) }, props));
}

// src/components/ui/label.tsx
import * as React4 from "react";
import { jsx as jsx26 } from "react/jsx-runtime";
var Label = React4.forwardRef((_a, ref) => {
  var _b = _a, { className } = _b, props = __objRest(_b, ["className"]);
  return /* @__PURE__ */ jsx26(
    "label",
    __spreadValues({
      ref,
      className: cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )
    }, props)
  );
});
Label.displayName = "Label";
export {
  AomiFrame,
  AomiRuntimeProvider,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  BaseSidebar,
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ComposerAttachments,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  MarkdownText,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  Skeleton,
  Thread,
  ThreadContextProvider,
  ThreadList,
  ThreadListSidebar,
  ToolFallback,
  Tooltip,
  TooltipContent,
  TooltipIconButton,
  TooltipProvider,
  TooltipTrigger,
  UserMessageAttachments,
  badgeVariants,
  buttonVariants,
  cn,
  formatAddress,
  getNetworkName,
  useIsMobile,
  useRuntimeActions,
  useSidebar,
  useThreadContext
};
//# sourceMappingURL=index.js.map