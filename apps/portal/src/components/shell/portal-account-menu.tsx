"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CircleUserRound,
  LogOut,
  Rocket,
  Settings,
} from "lucide-react";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import { useSettingsController } from "@portal/components/settings/settings-controller";
import { useAccountSummary } from "@portal/components/settings/use-account-summary";
import { cn } from "@portal/lib/utils";

export function PortalAccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { openSettings } = useSettingsController();
  const adapter = useAomiWalletKit();
  const summary = useAccountSummary();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 items-center justify-center rounded-full transition-colors",
          open && "bg-accent text-foreground",
        )}
      >
        {summary.connected && summary.address ? (
          <span className="bg-foreground/10 text-foreground flex size-6 items-center justify-center rounded-full text-[10px] font-semibold">
            {summary.address.slice(2, 4).toUpperCase()}
          </span>
        ) : (
          <CircleUserRound className="size-4" />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="aomi-card bg-popover text-popover-foreground absolute top-full right-0 z-[90] mt-2 w-56 overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
              {summary.connected && summary.address
                ? summary.address.slice(2, 4).toUpperCase()
                : "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {summary.identityLabel}
              </p>
              <p className="text-muted-foreground truncate text-[11px] capitalize">
                {summary.statusLabel}
              </p>
            </div>
          </div>
          {summary.creditUsed !== null && summary.creditPaid !== null ? (
            <button
              type="button"
              role="menuitem"
              className="hover:bg-accent mx-1 mb-1 flex w-[calc(100%-0.5rem)] items-center justify-between rounded-md px-2 py-1.5 text-[11.5px] transition-colors"
              onClick={() => {
                setOpen(false);
                openSettings("apps");
              }}
            >
              <span className="aomi-eyebrow">Credits</span>
              <span className="aomi-numeric font-medium">
                {new Intl.NumberFormat().format(summary.creditUsed)} /{" "}
                {new Intl.NumberFormat().format(summary.creditPaid)}
              </span>
            </button>
          ) : null}
          <div className="bg-border h-px" />
          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                openSettings("general");
              }}
            >
              <Settings className="size-3.5 opacity-70" />
              Settings
            </button>
            <a
              href="https://aomi.dev/docs"
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <BookOpen className="size-3.5 opacity-70" />
              Docs
            </a>
            <Link
              href="/deployments"
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Rocket className="size-3.5 opacity-70" />
              Deployments
            </Link>
          </div>
          <div className="bg-border h-px" />
          <div className="p-1">
            {summary.connected ? (
              <button
                type="button"
                role="menuitem"
                className={cn(itemClass, "text-destructive")}
                onClick={() => {
                  setOpen(false);
                  void adapter.disconnect?.({ family: "all" });
                }}
              >
                <LogOut className="size-3.5 opacity-70" />
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                disabled={!summary.canConnect}
                onClick={() => {
                  setOpen(false);
                  summary.connect();
                }}
              >
                <CircleUserRound className="size-3.5 opacity-70" />
                Connect
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
