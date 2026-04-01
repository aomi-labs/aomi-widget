"use client";

import { useEffect, useState } from "react";

/**
 * Resolve the current page origin after mount so the live demo can route all
 * runtime requests through the same host that served the page, including ngrok.
 */
export function useDemoBackendUrl(): string | null {
  const [backendUrl, setBackendUrl] = useState<string | null>(null);

  useEffect(() => {
    setBackendUrl(window.location.origin);
  }, []);

  return backendUrl;
}

