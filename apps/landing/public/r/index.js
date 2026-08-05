"use client";
import {
  AomiFrame,
  AomiWidget,
  Button,
  DEFAULT_SIDEBAR_PRODUCTS,
  DualWalletBar,
  Input,
  ModalBackdrop,
  NetworkSelect,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "./chunk-EJHQSUOS.js";
import {
  AomiWalletKitProvider,
  FullTestnetWalletRouter,
  isFullTestnet,
  useFullTestnet
} from "./chunk-ZHZS6DK6.js";
import {
  usePrivyDelegation
} from "./chunk-DWCD4CNY.js";
import {
  AOMI_SESSION_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY,
  AomiWalletKitContextProvider,
  formatAuthMethod,
  formatWalletProvider,
  inferAuthMethod,
  useAomiWalletKit
} from "./chunk-FUKWMD3O.js";

// src/components/ui/notification.tsx
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNotification } from "@aomi-labs/react";

// src/components/ui/notification-icon.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function NoticeIcon() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M12 3.5v2" }),
    /* @__PURE__ */ jsx("path", { d: "M12 18.5v2" }),
    /* @__PURE__ */ jsx("path", { d: "m5.99 5.99 1.42 1.42" }),
    /* @__PURE__ */ jsx("path", { d: "m16.59 16.59 1.42 1.42" }),
    /* @__PURE__ */ jsx("path", { d: "M3.5 12h2" }),
    /* @__PURE__ */ jsx("path", { d: "M18.5 12h2" }),
    /* @__PURE__ */ jsx("path", { d: "m5.99 18.01 1.42-1.42" }),
    /* @__PURE__ */ jsx("path", { d: "m16.59 7.41 1.42-1.42" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3.25" })
  ] });
}
function SuccessIcon() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "8.5" }),
    /* @__PURE__ */ jsx("path", { d: "m8.25 12.25 2.4 2.4 5.1-5.3" })
  ] });
}
function ErrorIcon() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M10.35 4.5 2.9 17.4A1.4 1.4 0 0 0 4.1 19.5h15.8a1.4 1.4 0 0 0 1.2-2.1L13.65 4.5a1.9 1.9 0 0 0-3.3 0Z" }),
    /* @__PURE__ */ jsx("path", { d: "M12 9v4" }),
    /* @__PURE__ */ jsx("path", { d: "M12 16.5h.01" })
  ] });
}
function WalletIcon() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M4 7.25A2.25 2.25 0 0 1 6.25 5h10.5A2.25 2.25 0 0 1 19 7.25v10.5A2.25 2.25 0 0 1 16.75 20H6.25A2.25 2.25 0 0 1 4 17.75V7.25Z" }),
    /* @__PURE__ */ jsx("path", { d: "M4 8h13.75A2.25 2.25 0 0 1 20 10.25v3.5A2.25 2.25 0 0 1 17.75 16H14a3 3 0 0 1 0-6h6" }),
    /* @__PURE__ */ jsx("circle", { cx: "14", cy: "13", r: ".75", fill: "currentColor", stroke: "none" })
  ] });
}
var icons = {
  notice: NoticeIcon,
  success: SuccessIcon,
  error: ErrorIcon,
  wallet: WalletIcon
};
function NotificationIcon({ type }) {
  const Icon = icons[type];
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "text-aomi-accent flex size-8 shrink-0 items-center justify-center",
      "data-notification-icon": type,
      children: /* @__PURE__ */ jsx(
        "svg",
        {
          width: "22",
          height: "22",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.8",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true",
          children: /* @__PURE__ */ jsx(Icon, {})
        }
      )
    }
  );
}

// src/components/ui/sonner.tsx
import { Toaster as Sonner } from "sonner";
import { cn } from "@aomi-labs/react";
import { jsx as jsx2 } from "react/jsx-runtime";
function Toaster({ className, toastOptions, ...props }) {
  return /* @__PURE__ */ jsx2(
    Sonner,
    {
      className: cn("toaster group", className),
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
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function NotificationToaster() {
  const { notifications, dismissNotification } = useNotification();
  const shownRef = useRef(/* @__PURE__ */ new Set());
  useEffect(() => {
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
  return /* @__PURE__ */ jsx3(
    Toaster,
    {
      position: "top-right",
      offset: { top: 72, right: 16 },
      mobileOffset: { top: 68, right: 16, left: 16 }
    }
  );
}
function showToast(notification, dismissNotification) {
  const options = {
    id: notification.id,
    duration: notification.duration ?? 6e3,
    unstyled: true,
    onDismiss: () => dismissNotification(notification.id),
    onAutoClose: () => dismissNotification(notification.id)
  };
  toast.custom(
    () => /* @__PURE__ */ jsxs2("div", { className: "border-aomi-border bg-aomi-surface-2 text-aomi-fg group relative flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-2xl border p-3.5 shadow-2xl", children: [
      /* @__PURE__ */ jsx3(NotificationIcon, { type: notification.type }),
      /* @__PURE__ */ jsxs2("div", { className: "min-w-0 flex-1 pt-0.5 text-left", children: [
        /* @__PURE__ */ jsx3("div", { className: "pr-7 text-sm font-semibold leading-5", children: notification.title }),
        notification.message && notification.message !== notification.title && /* @__PURE__ */ jsx3("div", { className: "text-aomi-muted mt-0.5 pr-7 text-sm leading-5", children: notification.message })
      ] }),
      /* @__PURE__ */ jsx3(
        "button",
        {
          type: "button",
          "aria-label": "Close notification",
          className: "text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm opacity-70 transition-colors group-hover:opacity-100",
          onClick: () => {
            dismissNotification(notification.id);
            toast.dismiss(notification.id);
          },
          children: "\xD7"
        }
      )
    ] }),
    options
  );
}

// src/components/ui/card.tsx
import * as React from "react";
import { cn as cn2 } from "@aomi-labs/react";
import { jsx as jsx4 } from "react/jsx-runtime";
var Card = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx4(
  "div",
  {
    ref,
    className: cn2(
      "bg-card text-card-foreground rounded-lg border shadow-sm",
      className
    ),
    ...props
  }
));
Card.displayName = "Card";
var CardHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx4(
  "div",
  {
    ref,
    className: cn2("flex flex-col space-y-1.5 p-6", className),
    ...props
  }
));
CardHeader.displayName = "CardHeader";
var CardTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx4(
  "h3",
  {
    ref,
    className: cn2(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    ),
    ...props
  }
));
CardTitle.displayName = "CardTitle";
var CardDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx4(
  "p",
  {
    ref,
    className: cn2("text-muted-foreground text-sm", className),
    ...props
  }
));
CardDescription.displayName = "CardDescription";
var CardContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx4("div", { ref, className: cn2("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
var CardFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx4(
  "div",
  {
    ref,
    className: cn2("flex items-center p-6 pt-0", className),
    ...props
  }
));
CardFooter.displayName = "CardFooter";

// src/index.ts
import {
  formatAddress,
  getChainInfo,
  getNetworkName,
  SUPPORTED_CHAINS
} from "@aomi-labs/react";
import { ExtUserProvider, useUser, UserState } from "@aomi-labs/react";
import { megaeth, monad, monadTestnet, robinhood } from "@aomi-labs/client";

// src/lib/wallet-kit/providers/index.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
function AomiWalletProvider(props) {
  const { provider, ...rest } = props;
  if (!provider) return /* @__PURE__ */ jsx5(AomiWalletKitProvider, { ...rest });
  return /* @__PURE__ */ jsx5(AomiWalletKitProvider, { ...rest, preset: provider });
}

// src/lib/wallet-kit/providers/base-account.tsx
import { base, baseSepolia } from "wagmi/chains";
import { jsx as jsx6 } from "react/jsx-runtime";
function AomiBaseAccountProvider({
  appLogoUrl,
  appName,
  chains,
  children,
  includeBaseSepolia,
  sponsorship
}) {
  const resolvedChains = chains ?? (includeBaseSepolia ? [base, baseSepolia] : [base]);
  return /* @__PURE__ */ jsx6(
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
  DEFAULT_SIDEBAR_PRODUCTS,
  DualWalletBar,
  ExtUserProvider,
  FullTestnetWalletRouter,
  Input,
  ModalBackdrop,
  NetworkSelect,
  NotificationToaster,
  SUPPORTED_CHAINS,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  UserState,
  formatAddress,
  formatAuthMethod,
  formatWalletProvider,
  getChainInfo,
  getNetworkName,
  inferAuthMethod,
  isFullTestnet,
  megaeth,
  monad,
  monadTestnet,
  robinhood,
  useAomiWalletKit as useAomiAuthAdapter,
  useAomiWalletKit,
  useFullTestnet,
  usePrivyDelegation,
  useUser
};
//# sourceMappingURL=index.js.map