import type { ComponentType } from "react";
import Link from "next/link";

type MDXComponents = Record<string, ComponentType<any>>;

export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    h1: ({ className, ...props }) => (
      <h1 className={["text-3xl font-semibold leading-tight tracking-tight", className].filter(Boolean).join(" ")} {...props} />
    ),
    h2: ({ className, ...props }) => (
      <h2 className={["mt-8 text-2xl font-semibold leading-snug", className].filter(Boolean).join(" ")} {...props} />
    ),
    h3: ({ className, ...props }) => (
      <h3 className={["mt-6 text-xl font-semibold leading-snug", className].filter(Boolean).join(" ")} {...props} />
    ),
    p: ({ className, ...props }) => (
      <p className={["mt-4 text-base text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />
    ),
    ul: ({ className, ...props }) => (
      <ul className={["mt-4 list-disc space-y-2 pl-5 text-base text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />
    ),
    ol: ({ className, ...props }) => (
      <ol className={["mt-4 list-decimal space-y-2 pl-5 text-base text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />
    ),
    li: ({ className, ...props }) => (
      <li className={["leading-relaxed text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />
    ),
    code: ({ className, ...props }) => (
      <code
        className={[
          "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    ),
    pre: ({ className, ...props }) => (
      <pre
        className={[
          "mt-4 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100 shadow-inner shadow-black/40",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    ),
    a: ({ className, ...props }) => (
      <Link
        className={["font-semibold text-primary underline-offset-4 hover:text-primary/80 hover:underline", className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    ),
    blockquote: ({ className, ...props }) => (
      <blockquote
        className={[
          "mt-4 border-l-4 border-primary/60 bg-primary/5 px-4 py-3 text-base text-foreground shadow-inner shadow-primary/10",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    ),
    ...components,
  };
}
