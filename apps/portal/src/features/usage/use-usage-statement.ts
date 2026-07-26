"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { explainAccountError } from "@portal/features/account/account-api";
import { useAccountOverview } from "@portal/lib/account-overview";
import type { MonthlyStatement } from "./types";
import {
  currentMonthKey,
  fetchModelStatement,
  recentMonthKeys,
  toMonthlyStatement,
} from "./statement-api";

export type StatementStatus = "loading" | "ready" | "error";

/**
 * Real statement months, fetched per month key on demand and cached for the
 * session. The current month loads immediately; the picker's other months
 * load when selected. The allowance meter comes from the profile's embedded
 * monthly credit position, so it's only exact for the current month — for
 * past months the credits meter is hidden rather than shown wrong.
 */
export function useUsageStatement(monthCount = 6) {
  const account = useAccountOverview();
  const monthKeys = useMemo(() => recentMonthKeys(monthCount), [monthCount]);
  const [selectedKey, setSelectedKey] = useState(() => currentMonthKey());
  const [months, setMonths] = useState<Record<string, MonthlyStatement>>({});
  const [status, setStatus] = useState<StatementStatus>("loading");
  const [error, setError] = useState<string | undefined>();
  const inflight = useRef<Set<string>>(new Set());

  const allowance = useMemo(
    () => ({
      included: account?.usage?.credit_paid ?? 0,
      used: account?.usage?.credit_used ?? 0,
    }),
    [account],
  );

  const load = useCallback(
    async (monthKey: string) => {
      if (inflight.current.has(monthKey)) return;
      inflight.current.add(monthKey);
      setStatus("loading");
      try {
        const wire = await fetchModelStatement(monthKey);
        setMonths((cache) => ({
          ...cache,
          [monthKey]: toMonthlyStatement(wire, monthKey, allowance),
        }));
        setStatus("ready");
        setError(undefined);
      } catch (cause) {
        setStatus("error");
        setError(explainAccountError(cause));
      } finally {
        inflight.current.delete(monthKey);
      }
    },
    [allowance],
  );

  useEffect(() => {
    if (!months[selectedKey]) {
      void load(selectedKey);
    } else {
      setStatus("ready");
    }
  }, [selectedKey, months, load]);

  const selectMonth = useCallback((monthKey: string) => {
    setSelectedKey(monthKey);
  }, []);

  return {
    status,
    error,
    monthKeys,
    selectedKey,
    selectMonth,
    month: months[selectedKey] ?? null,
    isCurrentMonth: selectedKey === currentMonthKey(),
    retry: () => void load(selectedKey),
  };
}
