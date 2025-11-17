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
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { MyRuntimeProvider } from "@/components/assistant-ui/runtime";

type AomiFrameProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
};

export const AomiFrame = ({
  width = "100%",
  height = "80vh",
  className,
  style,
}: AomiFrameProps) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
  const sessionId = "default-session";
  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <MyRuntimeProvider backendUrl={backendUrl} sessionId={sessionId}>
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
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink
                      href="https://www.assistant-ui.com/docs/getting-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Build Your Own ChatGPT UX
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Starter Template</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </MyRuntimeProvider>
  );
};
