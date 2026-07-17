"use client";

import { cn } from "@portal/lib/utils";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export function SettingsPanel({
  title,
  description,
  children,
  className,
  badge,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="border-border/50 shrink-0 border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-foreground text-[17px] font-medium tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                {description}
              </p>
            ) : null}
          </div>
          {badge}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1 sm:px-3">
        {children}
      </div>
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/40 flex items-center justify-between gap-4 border-b px-3 py-3.5 last:border-b-0",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-[13.5px] font-medium leading-5">
          {label}
        </p>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-[12.5px] leading-4">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

export function SettingsPromoCard({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "aomi-card mx-3 my-3 flex items-start justify-between gap-3 px-3.5 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-foreground text-[13.5px] font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-[12.5px] leading-4">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function SettingsPill({
  children,
  tone = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "default" | "danger" | "primary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "default" &&
          "border-border text-foreground hover:bg-accent/60 bg-transparent",
        tone === "primary" &&
          "border-transparent bg-foreground text-background hover:opacity-90",
        tone === "danger" &&
          "border-destructive/40 text-destructive hover:bg-destructive/10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Two-click destructive action: first click arms, second confirms; auto-cancels. */
export function SettingsConfirmPill({
  label,
  confirmLabel = "Confirm?",
  busyLabel,
  busy = false,
  onConfirm,
  className,
}: {
  label: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!armed) return;
    timerRef.current = window.setTimeout(() => setArmed(false), 4000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [armed]);

  return (
    <SettingsPill
      tone="danger"
      disabled={busy}
      className={cn(armed && "bg-destructive/15 ring-destructive/40 ring-1", className)}
      onClick={() => {
        if (busy) return;
        if (armed) {
          setArmed(false);
          void onConfirm();
          return;
        }
        setArmed(true);
      }}
      onBlur={() => {
        // Keep armed briefly so users can still confirm; timeout clears it.
      }}
    >
      {busy ? (busyLabel ?? "Working…") : armed ? confirmLabel : label}
    </SettingsPill>
  );
}

export function SettingsSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "border-border bg-background text-foreground hover:bg-accent/50 h-8 rounded-full border px-3 text-[12.5px] outline-none",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function creditMeterPercent(used: number, limit: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export function SettingsUsageMeter({
  used,
  limit,
  compact = false,
  className,
}: {
  used: number;
  limit: number;
  compact?: boolean;
  className?: string;
}) {
  const percent = creditMeterPercent(used, limit);
  const remaining = Math.max(0, limit - used);
  const format = (value: number) => new Intl.NumberFormat().format(value);

  return (
    <div
      className={cn(
        "aomi-card bg-muted/45",
        compact ? "min-w-52 px-3 py-2.5" : "mx-3 my-3 px-3.5 py-3",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-foreground aomi-numeric text-[13.5px] font-medium">
            {format(used)} / {format(limit)}{" "}
            <span className="font-sans text-[12px] font-normal">credits</span>
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11.5px]">
            {limit > 0 ? (
              <>
                <span className="aomi-numeric">{format(remaining)}</span> remaining
              </>
            ) : (
              "No credit limit"
            )}
          </p>
        </div>
        <span className="text-muted-foreground aomi-numeric text-[12px] font-medium">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Credits used"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, limit)}
        aria-valuenow={Math.max(0, Math.min(used, limit))}
        aria-valuetext={`${format(used)} of ${format(limit)} credits used`}
        className="bg-foreground/10 mt-2 h-1.5 overflow-hidden rounded-full"
      >
        <div
          className="bg-foreground h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function SettingsSkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="px-3 py-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border-border/40 flex items-center justify-between border-b py-3.5 last:border-b-0"
        >
          <div className="space-y-2">
            <div className="bg-muted h-3.5 w-28 animate-pulse rounded" />
            <div className="bg-muted/70 h-3 w-44 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-8 w-20 animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsEmpty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-3 py-10 text-center">
      <p className="text-foreground text-[13.5px] font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 text-[12.5px]">{description}</p>
      ) : null}
    </div>
  );
}

export function SettingsStatus({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-3 my-2 rounded-xl border px-3 py-2 text-[12.5px]",
        tone === "success" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "error" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </div>
  );
}

export function SettingsTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="aomi-card mx-3 my-3 overflow-x-auto">
      <table className="min-w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-border/60 border-b">
            {headers.map((header) => (
              <th key={header} className="aomi-eyebrow px-3 py-2.5">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
