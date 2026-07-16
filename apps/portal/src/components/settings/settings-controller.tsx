"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  parseSettingsCategory,
  SETTINGS_QUERY_KEY,
  type SettingsCategory,
} from "./settings-types";

type SettingsControllerValue = {
  open: boolean;
  category: SettingsCategory;
  openSettings: (category?: SettingsCategory) => void;
  closeSettings: () => void;
  setCategory: (category: SettingsCategory) => void;
};

const SettingsControllerContext =
  createContext<SettingsControllerValue | null>(null);

function writeSettingsQuery(
  pathname: string,
  current: URLSearchParams,
  next: { open: boolean; category: SettingsCategory },
) {
  const params = new URLSearchParams(current.toString());
  if (next.open) {
    params.set(SETTINGS_QUERY_KEY, next.category);
  } else {
    params.delete(SETTINGS_QUERY_KEY);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function SettingsControllerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryCategory = parseSettingsCategory(
    searchParams.get(SETTINGS_QUERY_KEY),
  );

  const [open, setOpen] = useState(Boolean(queryCategory));
  const [category, setCategoryState] = useState<SettingsCategory>(
    queryCategory ?? "general",
  );
  const pendingCategoryRef = useRef<SettingsCategory | null>(null);

  // Hydrate from URL only when it changes and we're not mid local navigation.
  useEffect(() => {
    if (!queryCategory) {
      setOpen(false);
      pendingCategoryRef.current = null;
      return;
    }
    setOpen(true);
    if (pendingCategoryRef.current === queryCategory) {
      pendingCategoryRef.current = null;
      return;
    }
    if (pendingCategoryRef.current) {
      // Local click is ahead of the URL; wait for replace to catch up.
      return;
    }
    setCategoryState(queryCategory);
  }, [queryCategory]);

  const syncUrl = useCallback(
    (nextOpen: boolean, nextCategory: SettingsCategory) => {
      if (pathname !== "/" && pathname !== "/settings") return;
      const href = writeSettingsQuery(
        pathname === "/settings" ? "/" : pathname,
        searchParams,
        {
          open: nextOpen,
          category: nextCategory,
        },
      );
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openSettings = useCallback(
    (nextCategory: SettingsCategory = "general") => {
      pendingCategoryRef.current = nextCategory;
      setCategoryState(nextCategory);
      setOpen(true);
      syncUrl(true, nextCategory);
    },
    [syncUrl],
  );

  const closeSettings = useCallback(() => {
    pendingCategoryRef.current = null;
    setOpen(false);
    syncUrl(false, category);
  }, [category, syncUrl]);

  const setCategory = useCallback(
    (nextCategory: SettingsCategory) => {
      pendingCategoryRef.current = nextCategory;
      setCategoryState(nextCategory);
      if (open) syncUrl(true, nextCategory);
    },
    [open, syncUrl],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSettings();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSettings, open]);

  const value = useMemo(
    () => ({
      open,
      category,
      openSettings,
      closeSettings,
      setCategory,
    }),
    [open, category, openSettings, closeSettings, setCategory],
  );

  return (
    <SettingsControllerContext.Provider value={value}>
      {children}
    </SettingsControllerContext.Provider>
  );
}

export function useSettingsController() {
  const value = useContext(SettingsControllerContext);
  if (!value) {
    throw new Error(
      "useSettingsController must be used within SettingsControllerProvider",
    );
  }
  return value;
}
