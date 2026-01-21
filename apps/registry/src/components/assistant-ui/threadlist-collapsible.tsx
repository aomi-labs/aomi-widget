"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { MenuIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Separator } from "@/components/ui/separator";
import { cn } from "@aomi-labs/react";

type ThreadListCollapsibleProps = {
  /** Optional footer component (e.g., WalletFooter from consumer app) */
  footer?: React.ReactNode;
  /** Default open state */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Additional className */
  className?: string;
};

export function ThreadListCollapsible({
  footer,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
}: ThreadListCollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else {
        setIsOpen(newOpen);
      }
    },
    [onOpenChange],
  );

  const isControlled = open !== undefined;
  const collapsibleOpen = isControlled ? open : isOpen;

  return (
    <div
      className={cn(
        "bg-background flex flex-col border-r transition-all duration-200",
        collapsibleOpen ? "w-64" : "w-16",
        className,
      )}
    >
      <Collapsible
        open={collapsibleOpen}
        onOpenChange={handleOpenChange}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="aomi-collapsible-header flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <div className="flex w-full items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={
                  collapsibleOpen ? "Collapse sidebar" : "Expand sidebar"
                }
              >
                <MenuIcon className="size-5" />
              </Button>
            </CollapsibleTrigger>

            {collapsibleOpen && (
              <Link
                href="https://aomi.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
              >
                <div className="aomi-collapsible-header-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                  <Image
                    src="/assets/images/a.svg"
                    alt="Aomi Logo"
                    width={28}
                    height={28}
                    className="aomi-collapsible-header-icon ml-3 size-7"
                    priority
                  />
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        <CollapsibleContent className="flex flex-1 flex-col overflow-hidden data-[state=closed]:hidden">
          <div className="aomi-collapsible-content flex flex-1 flex-col overflow-hidden p-2">
            <ThreadList />
          </div>
          {footer && (
            <>
              <Separator />
              <div className="aomi-collapsible-footer border-sm border-t px-2 py-4">
                {footer}
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
