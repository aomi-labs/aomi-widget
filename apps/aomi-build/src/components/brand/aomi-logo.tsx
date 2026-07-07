import Link from "next/link";

import { cn } from "@build/lib/utils";

type AomiLogoProps = {
  href?: string;
  markOnly?: boolean;
  showBuildLabel?: boolean;
  className?: string;
  markClassName?: string;
  onClick?: () => void;
};

export function AomiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 208 208"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0 text-foreground", className)}
    >
      <path
        d="M184.214 54.146C184.214 37.0059 170.37 23.1111 153.293 23.1111C136.215 23.1111 122.371 37.0059 122.371 54.146C122.371 71.2861 136.215 85.1809 153.293 85.1809C170.37 85.1809 184.214 71.2861 184.214 54.146ZM207.241 54.146C207.241 84.0501 183.088 108.292 153.293 108.292C123.498 108.292 99.3442 84.0501 99.3442 54.146C99.3442 24.242 123.498 7.65756e-07 153.293 0C183.088 0 207.241 24.242 207.241 54.146Z"
        fill="currentColor"
      />
      <path
        d="M103.621 0C105.791 0 107.946 0.0668813 110.084 0.198934C108.49 1.57713 106.96 3.02745 105.499 4.54484C97.8939 11.9278 91.9814 21.0558 88.4036 31.2867C54.8263 38.3294 29.6059 68.2082 29.6059 104C29.6059 145.027 62.7434 178.286 103.621 178.286C139.282 178.286 169.051 152.973 176.068 119.272C186.268 115.679 195.367 109.74 202.726 102.101C204.233 100.638 205.674 99.1078 207.042 97.5132C207.174 99.6585 207.241 101.821 207.241 104C207.241 161.438 160.849 208 103.621 208C46.3925 208 0 161.438 0 104C0 46.5624 46.3925 0 103.621 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AomiLogo({
  href = "/",
  markOnly = false,
  showBuildLabel = true,
  className,
  markClassName,
  onClick,
}: AomiLogoProps) {
  const content = (
    <div
      className={cn(
        "flex min-w-0 items-center",
        markOnly ? "justify-center" : "gap-2.5",
        className,
      )}
    >
      <AomiMark className={cn("h-5 w-5", markClassName)} />
      {!markOnly && (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold leading-none text-foreground">
            Aomi
          </span>
          {showBuildLabel ? (
            <span className="shrink-0 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle">
              Build
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-1 focus-visible:ring-ring"
    >
      {content}
    </Link>
  );
}
