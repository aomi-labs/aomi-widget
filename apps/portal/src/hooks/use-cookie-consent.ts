"use client";

import { useState, useEffect, useCallback } from "react";

const CONSENT_KEY = "aomi-cookie-consent";

export type ConsentStatus = "pending" | "accepted" | "declined";

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>("pending");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load consent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored);
    }
    setIsLoaded(true);
  }, []);

  const acceptCookies = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setConsent("accepted");
  }, []);

  const declineCookies = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setConsent("declined");
  }, []);

  return {
    consent,
    isLoaded,
    acceptCookies,
    declineCookies,
    showBanner: isLoaded && consent === "pending",
  };
}
