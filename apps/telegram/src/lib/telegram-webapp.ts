"use client";

export function getTelegramUserId(): string | undefined {
  return (
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ||
    new URLSearchParams(window.location.search).get("user_id") ||
    undefined
  );
}

export function getTelegramStartParam(): string | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? null;
}

export function readyTelegramWebApp() {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
  }
}
