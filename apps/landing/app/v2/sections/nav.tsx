"use client";

import {
  BookOpen,
  Bot,
  Braces,
  Building2,
  ChevronDown,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  Newspaper,
  Store,
  TrendingUp,
  Wallet,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AomiLogo } from "../../components/aomi-logo";
import { menus, pricing, rightCtas, V2, type NavItem } from "../site";
import styles from "../v2.module.css";

const ICONS: Record<string, LucideIcon> = {
  widget: MessageSquare,
  "cli-mcp": Waypoints,
  api: Braces,
  console: LayoutDashboard,
  fintech: Landmark,
  defi: Store,
  trading: TrendingUp,
  nft: ImageIcon,
  wallets: Wallet,
  about: Building2,
  research: BookOpen,
  news: Newspaper,
  contact: Mail,
  docs: BookOpen,
  agents: Bot,
};

function itemHref(item: NavItem) {
  return item.href;
}

function isExternal(item: { href: string; external?: boolean }) {
  return Boolean(item.external) || /^https?:\/\//.test(item.href);
}

export function V2Nav() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 960) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header ref={rootRef} className={styles.navBar}>
      <div className={styles.navInner}>
        <Link href={V2} className={styles.navBrand} aria-label="Aomi home">
          <AomiLogo
            className="text-[15px] text-[color:var(--v2-heading)]"
            markClassName={`h-[15px] w-[15px] ${styles.navMark}`}
          />
        </Link>

        <nav className={styles.navMenus} aria-label="Primary">
          {menus.map((menu) => {
            const expanded = openMenu === menu.id;
            return (
              <div key={menu.id} className={styles.navMenuWrap}>
                <button
                  type="button"
                  className={`${styles.navTrigger} ${expanded ? styles.navTriggerOpen : ""}`}
                  aria-expanded={expanded}
                  aria-controls={`${menuId}-${menu.id}`}
                  onClick={() =>
                    setOpenMenu((current) =>
                      current === menu.id ? null : menu.id,
                    )
                  }
                >
                  {menu.label}
                  <ChevronDown
                    className={styles.navChevron}
                    strokeWidth={1.8}
                  />
                </button>
                {expanded ? (
                  <div
                    id={`${menuId}-${menu.id}`}
                    className={styles.navDropdown}
                    role="menu"
                  >
                    {menu.items.map((item) => (
                      <DropdownRow key={item.id} item={item} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <Link href={pricing.href} className={styles.navTrigger}>
            {pricing.title}
          </Link>
        </nav>

        <div className={styles.navRight}>
          {rightCtas.map((cta) => (
            <a
              key={cta.id}
              href={cta.href}
              className={
                cta.variant === "primary" ? styles.navCta : styles.navGhost
              }
              target="_blank"
              rel="noreferrer"
            >
              {cta.label}
            </a>
          ))}
          <button
            type="button"
            className={styles.navMenuBtn}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setMobileOpen((value) => !value);
              setOpenMenu(null);
            }}
          >
            {mobileOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className={styles.navSheet}>
          {menus.map((menu) => (
            <div key={menu.id} className={styles.navSheetGroup}>
              <p className={styles.navSheetLabel}>{menu.label}</p>
              {menu.items.map((item) => (
                <DropdownRow key={item.id} item={item} compact />
              ))}
            </div>
          ))}
          <Link href={pricing.href} className={styles.navSheetLink}>
            {pricing.title}
          </Link>
          <div className={styles.navSheetCtas}>
            {rightCtas.map((cta) => (
              <a
                key={cta.id}
                href={cta.href}
                className={
                  cta.variant === "primary" ? styles.navCta : styles.navGhost
                }
                target="_blank"
                rel="noreferrer"
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function DropdownRow({
  item,
  compact = false,
}: {
  item: NavItem;
  compact?: boolean;
}) {
  const Icon = ICONS[item.id] ?? BookOpen;
  const className = compact ? styles.navSheetItem : styles.navDropdownRow;
  const content = (
    <>
      <span className={styles.navIcon} aria-hidden>
        <Icon className="size-4" strokeWidth={1.7} />
      </span>
      <span>
        <span className={styles.navItemTitle}>{item.title}</span>
        <span className={styles.navItemJob}>{item.job}</span>
      </span>
    </>
  );

  if (isExternal(item)) {
    return (
      <a
        href={itemHref(item)}
        className={className}
        target="_blank"
        rel="noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={itemHref(item)} className={className}>
      {content}
    </Link>
  );
}
