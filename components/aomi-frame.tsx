"use client";

import type { CSSProperties } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn, generateSessionId } from "@/lib/utils";
import { AomiRuntimeProvider } from "@/components/assistant-ui/runtime";

type AomiFrameProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  sessionId?: string;
};

export const AomiFrame = ({
  width = "100%",
  height = "80vh",
  className,
  style,
  sessionId,
}: AomiFrameProps) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
  const frameSessionId = sessionId ?? generateSessionId();
  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <AomiRuntimeProvider backendUrl={backendUrl} sessionId={frameSessionId}>
      <SidebarProvider>
        <div
          className={cn(
            "flex h-full w-full overflow-hidden rounded-2xl border border-neutral-800 bg-white shadow-2xl dark:bg-neutral-950",
            className
          )}
          style={frameStyle}
        >
          <ThreadListSidebar />
          <SidebarInset className = "relative">
            <header className="flex h-14 mt-1 shrink-0 items-center gap-2 border-b px-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    Your First Conversation
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AomiRuntimeProvider>
  );
};
