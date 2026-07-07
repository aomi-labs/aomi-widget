"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  CircleUserRound,
  FolderKanban,
  Gauge,
  Hammer,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Rocket,
  ScrollText,
  Settings,
  Star,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AomiLogo } from "@portal/components/brand/aomi-logo";
import { cn } from "@portal/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Overview", href: "/", icon: Home, enabled: true }],
  },
  {
    title: "Build",
    items: [
      { label: "Build", href: "/build", icon: Hammer, enabled: false },
      { label: "Projects", href: "/projects", icon: FolderKanban, enabled: true },
    ],
  },
  {
    title: "Operate",
    items: [
      {
        label: "Deployments",
        href: "/operate/deployments",
        icon: Rocket,
        enabled: true,
      },
      {
        label: "Transactions",
        href: "/operate/transactions",
        icon: WalletCards,
        enabled: false,
      },
      {
        label: "Observability",
        href: "/observability",
        icon: Activity,
        enabled: false,
      },
      { label: "Usage", href: "/usage", icon: Gauge, enabled: false },
      { label: "Agents", href: "/operate/agents", icon: Bot, enabled: false },
      { label: "Logs", href: "/logs", icon: ScrollText, enabled: false },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Integrations", href: "/integrations", icon: Plug, enabled: false },
      { label: "Settings", href: "/settings", icon: Settings, enabled: true },
    ],
  },
];

const notifications = [
  {
    id: "deploy-failed",
    title: "Deploy failed",
    detail: "Last build step needs attention",
  },
  {
    id: "service-key",
    title: "Service auth restored",
    detail: "aomi-bff local key is loaded",
  },
];

function IconButton({
  children,
  label,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition hover:bg-accent-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavItemLink({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon className="nav-icon size-4 shrink-0" />
      {expanded ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {!item.enabled ? (
            <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-dim">
              Soon
            </span>
          ) : null}
        </>
      ) : null}
    </>
  );

  if (!item.enabled) {
    return (
      <div
        className="nav-link cursor-not-allowed opacity-45"
        title={!expanded ? `${item.label} - soon` : undefined}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-active={active ? "true" : "false"}
      className="nav-link"
      title={!expanded ? item.label : undefined}
    >
      {content}
    </Link>
  );
}

function NavGroupList({
  group,
  expanded,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  expanded: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-1">
      {expanded ? (
        <div className="px-2.5 py-1.5 text-[11px] font-medium text-dim">
          {group.title}
        </div>
      ) : null}
      <div className="space-y-0.5 px-1">
        {group.items.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            expanded={expanded}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarNav({
  expanded,
  pathname,
  onNavigate,
}: {
  expanded: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pb-3">
      {navGroups.map((group) => (
        <NavGroupList
          key={group.title}
          group={group}
          expanded={expanded}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}

      {expanded ? (
        <div className="mt-auto space-y-2 px-2 pt-4">
          <div className="rounded-lg border border-border bg-surface-1 p-3 transition-colors hover:border-border-hover">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  Aomi Build Pass
                </p>
                <p className="mt-1 text-[11px] text-dim">
                  Up to 50% free AI credits
                </p>
              </div>
              <Star className="size-4 shrink-0 text-dim" />
            </div>
            <button
              type="button"
              disabled
              className="mt-2 flex h-8 w-full cursor-not-allowed items-center justify-center rounded-md bg-primary/60 text-[12px] font-medium text-primary-foreground opacity-70"
            >
              Get Pass
            </button>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-1 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-medium text-foreground">
              HX
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] text-foreground">Han</p>
              <p className="truncate text-[11px] text-dim">han@aomi.dev</p>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

function TopBarMenu({
  label,
  children,
  trigger,
}: {
  label: string;
  children: React.ReactNode;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        aria-expanded={open}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-dim transition hover:bg-accent-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
      >
        {trigger}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-md border border-border bg-surface-2 p-1 text-subtle shadow-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  return (
    <div className="flex items-center gap-2">
      <TopBarMenu
        label={`Notifications, ${notifications.length} unread`}
        trigger={
          <>
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-negative" />
          </>
        }
      >
        <div className="px-2 py-1.5 text-[12px] font-medium text-foreground">
          Notifications
        </div>
        <div className="-mx-1 my-1 h-px bg-border" />
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="rounded-md px-2 py-2 transition hover:bg-accent-hover"
          >
            <p className="text-[13px] text-foreground">{notification.title}</p>
            <p className="mt-0.5 text-[11px] text-dim">
              {notification.detail}
            </p>
          </div>
        ))}
        <div className="-mx-1 my-1 h-px bg-border" />
        <Link
          href="/settings/notifications"
          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-accent-hover hover:text-foreground"
        >
          Notification settings
        </Link>
      </TopBarMenu>

      <TopBarMenu
        label="Account menu"
        trigger={
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[11px] font-medium text-foreground">
            HX
          </span>
        }
      >
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-medium text-foreground">
            HX
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              Han
            </p>
            <p className="truncate text-[11px] text-dim">han@aomi.dev</p>
          </div>
        </div>
        <div className="-mx-1 my-1 h-px bg-border" />
        <Link
          href="/settings/general"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition hover:bg-accent-hover hover:text-foreground"
        >
          <CircleUserRound className="size-3.5" />
          Profile
        </Link>
        <Link
          href="/settings"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition hover:bg-accent-hover hover:text-foreground"
        >
          <Settings className="size-3.5" />
          Settings
        </Link>
        <div className="-mx-1 my-1 h-px bg-border" />
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-xs opacity-50"
        >
          <LogOut className="size-3.5" />
          Log out
        </button>
      </TopBarMenu>
    </div>
  );
}

export function ControlPlaneShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="grid h-screen min-h-0 grid-cols-1 bg-background text-foreground lg:grid-cols-[auto_minmax(0,1fr)]">
      <aside
        className={cn(
          "hidden min-h-0 flex-col border-r border-border bg-sidebar transition-all duration-200 lg:flex",
          expanded ? "w-56" : "w-14",
        )}
      >
        <div className="relative border-b border-border">
          <div
            className={cn(
              "flex h-11 items-center gap-2 px-3",
              expanded ? "justify-between" : "justify-center px-2",
            )}
          >
            <AomiLogo
              href="/"
              markOnly={!expanded}
              showBuildLabel={expanded}
              className={cn(expanded && "min-w-0 flex-1")}
            />
            {expanded ? (
              <IconButton
                label="Collapse sidebar"
                onClick={() => setExpanded(false)}
                className="shrink-0"
              >
                <PanelLeftClose className="size-4" />
              </IconButton>
            ) : null}
          </div>
          {!expanded ? (
            <div className="flex justify-center pb-2">
              <IconButton
                label="Expand sidebar"
                onClick={() => setExpanded(true)}
                className="h-7 w-7"
              >
                <PanelLeftOpen className="size-3.5" />
              </IconButton>
            </div>
          ) : null}
        </div>

        <SidebarNav expanded={expanded} pathname={pathname} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="h-full flex-1 bg-black/50"
            aria-label="Close sidebar"
          />
          <aside className="flex h-full w-72 flex-col border-l border-border bg-sidebar">
            <div className="flex h-11 items-center justify-between gap-3 border-b border-border px-3">
              <AomiLogo
                href="/"
                className="min-w-0 flex-1"
                onClick={() => setMobileOpen(false)}
              />
              <IconButton label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="size-4" />
              </IconButton>
            </div>
            <SidebarNav
              expanded
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <IconButton
            label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
          >
            <Menu className="size-4" />
          </IconButton>
          <div className="hidden lg:block" />
          <UserMenu />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
