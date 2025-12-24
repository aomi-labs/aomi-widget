"use client";

import { useEffect, useRef } from "react";

import { BackendApi } from "@/lib/backend-api";

export function useBackendApi(backendUrl: string) {
  const backendApiRef = useRef<BackendApi>(new BackendApi(backendUrl));

  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);

  return backendApiRef;
}
