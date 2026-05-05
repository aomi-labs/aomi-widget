"use client";

import { useState, useEffect, useCallback } from "react";

const API_KEY_STORAGE_KEY = "aomi_api_key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
      setApiKeyState(stored || "");
      setIsLoading(false);
    }
  }, []);

  // Set API key and persist to localStorage
  const setApiKey = useCallback((key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
      setApiKeyState(key);
    }
  }, []);

  // Clear API key from localStorage
  const clearApiKey = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKeyState("");
    }
  }, []);

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    isLoading,
  };
}
