"use client";

import { cn } from "@portal/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function SettingsPanel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="border-border/60 shrink-0 border-b px-5 py-4">
        <h2 className="text-foreground text-[17px] font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-[13px] leading-5">
            {description}
          </p>
        ) : null}
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
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/50 flex items-center justify-between gap-4 border-b px-3 py-3.5 last:border-b-0",
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
        "border-border bg-muted/40 mx-3 my-3 flex items-start justify-between gap-3 rounded-xl border px-3.5 py-3",
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
          "border-foreground/20 bg-foreground text-background hover:opacity-90",
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
        "border-border bg-background text-foreground hover:bg-accent/40 h-8 rounded-full border px-3 text-[12.5px] outline-none",
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
    <div className="mx-3 my-3 overflow-x-auto rounded-xl border border-border/60">
      <table className="min-w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-border/60 text-muted-foreground border-b">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2.5 font-medium">
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
