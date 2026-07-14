"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Files, History, LayoutTemplate } from "lucide-react";

import { BuildStreamTimeline } from "@build/features/build/components/build-stream-timeline";
import {
  ChatMessage,
  TypingIndicator,
} from "@build/features/build/components/chat-message";
import { CompileTestPanel } from "@build/features/build/components/compile-test-panel";
import { FileTreePreview } from "@build/features/build/components/file-tree-preview";
import { IntentComposer } from "@build/features/build/components/intent-composer";
import { SessionHistory } from "@build/features/build/components/session-history";
import { ShipHandoffBanner } from "@build/features/build/components/ship-handoff-banner";
import { SmithersNodes } from "@build/features/build/components/smithers-nodes";
import { TemplateGallery } from "@build/features/build/components/template-gallery";
import { JOURNEY_STAGES } from "@build/features/build/contracts";
import { useBuildSession } from "@build/features/build/hooks/use-build-session";
import { useStreamingText } from "@build/features/build/hooks/use-streaming-text";
import { BUILD_TEMPLATES } from "@build/features/build/templates";
import { cn } from "@build/lib/utils";
import { useToast } from "@build/components/control-plane/toast";

const actionPills = [
  { label: "Plan from idea", hint: "⇧Tab", action: "plan" },
];

function StreamingMessage({
  content,
  onDone,
  model,
}: {
  content: string;
  onDone: () => void;
  model?: string;
}) {
  const { displayed, isStreaming, skipToEnd } = useStreamingText(content, true);

  useEffect(() => {
    if (!isStreaming && displayed) onDone();
  }, [isStreaming, displayed, onDone]);

  return (
    <ChatMessage
      role="assistant"
      content={displayed}
      isStreaming={isStreaming}
      onStop={skipToEnd}
      model={model}
    />
  );
}

function ContextPanelSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof History;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="text-subtle flex items-center gap-1.5 px-1 text-[12px] font-medium">
        <Icon className="text-dim size-3.5" />
        {title}
      </div>
      {children}
    </section>
  );
}

/**
 * AI Builder Create surface. Nested in ControlPlaneShell — no BuildLayout.
 */
export function BuildView() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    activeSessionId,
    stageId,
    messages,
    streamEvents,
    fileTree,
    nodes,
    isGenerating,
    streamingMessageId,
    setStreamingMessageId,
    awaitingVerify,
    compileDone,
    testDone,
    verifyBusy,
    shipReady,
    showStreamInThread,
    loadSession,
    startNewSession,
    runBuildPipeline,
    handleStreamComplete,
    runCompile,
    runTest,
    recentSessions,
  } = useBuildSession();

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [
    messages,
    streamingMessageId,
    showStreamInThread,
    shipReady,
    scrollToBottom,
  ]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput("");
    runBuildPipeline(text, (assistantMsg) => {
      setStreamingMessageId(assistantMsg.id);
    });
  }, [input, isGenerating, runBuildPipeline, setStreamingMessageId]);

  const handleStreamDone = useCallback(() => {
    handleStreamComplete();
  }, [handleStreamComplete]);

  const handleActionPill = useCallback((action: string) => {
    if (action === "plan") {
      setInput("Help me plan a new agent idea: ");
    }
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob(
      [
        "# Aomi Build — local mock export\n",
        "# Real archive lands when Smithers / codegen is wired.\n",
        fileTree.map((n) => n.path).join("\n"),
        "\n",
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aomi-build-mock-export.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded mock export",
      description: "Placeholder file list — not a real repo archive.",
    });
  }, [fileTree, toast]);

  const handleTemplateSelect = useCallback(
    (template: (typeof BUILD_TEMPLATES)[0]) => {
      setInput(template.prompt);
    },
    [],
  );

  const handleSelectSession = useCallback(
    (id: string) => {
      loadSession(id);
    },
    [loadSession],
  );

  const handleNewSession = useCallback(() => {
    startNewSession();
    setInput("");
  }, [startNewSession]);

  const isEmpty = messages.length === 0;
  const stageIndex = JOURNEY_STAGES.findIndex((s) => s.id === stageId);

  return (
    <div className="flex h-[calc(100dvh-2.75rem)] min-h-0 w-full">
      {/* Optional thin session column — in-page, not BuildLayout rail */}
      <aside className="border-border hidden w-[220px] shrink-0 flex-col gap-3 overflow-y-auto border-r p-3 xl:flex">
        <SessionHistory
          sessions={recentSessions}
          activeSessionId={activeSessionId}
          onSelect={handleSelectSession}
          onNewSession={handleNewSession}
        />
      </aside>

      <section className="bg-background flex min-w-0 flex-1 flex-col">
        {!isEmpty ? (
          <div className="border-border hidden h-10 items-center justify-between border-b px-4 sm:flex">
            <ol className="flex flex-wrap items-center gap-1.5">
              {JOURNEY_STAGES.map((stage, index) => {
                const active = index === stageIndex;
                const done = index < stageIndex;
                return (
                  <li
                    key={stage.id}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      active
                        ? "border-foreground/30 text-foreground bg-surface-1"
                        : done
                          ? "border-border text-dim"
                          : "border-border/60 text-dim/70",
                    )}
                  >
                    {stage.title}
                  </li>
                );
              })}
            </ol>
            <span className="text-dim text-[11px]">Local mock · timers</span>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              {isEmpty ? (
                <div className="flex h-full items-center justify-center px-4 py-10">
                  <div className="w-full max-w-[640px]">
                    <div className="mb-6 space-y-1 text-center sm:text-left">
                      <h1 className="text-foreground text-base font-medium">
                        Build
                      </h1>
                      <p className="text-dim text-sm leading-6">
                        Describe what you want — local mock plans and generates
                        — then ship to Projects. Real Smithers SSE comes later.
                      </p>
                    </div>
                    <IntentComposer
                      value={input}
                      onChange={setInput}
                      onSubmit={handleSend}
                      disabled={isGenerating}
                      isLoading={isGenerating}
                      actionPills={actionPills}
                      onActionPillClick={handleActionPill}
                      placeholder="What do you want to build?"
                    />
                    <TemplateGallery
                      templates={BUILD_TEMPLATES}
                      onSelect={handleTemplateSelect}
                    />
                  </div>
                </div>
              ) : (
                <div className="px-4">
                  {messages.map((msg) => {
                    if (streamingMessageId === msg.id) {
                      return (
                        <StreamingMessage
                          key={msg.id}
                          content={msg.content}
                          model={msg.model}
                          onDone={handleStreamDone}
                        />
                      );
                    }
                    return (
                      <ChatMessage
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        timestamp={msg.timestamp}
                        model={msg.model}
                      />
                    );
                  })}

                  {showStreamInThread ? (
                    <div className="mx-auto my-4 max-w-3xl">
                      <BuildStreamTimeline events={streamEvents} />
                    </div>
                  ) : null}

                  {nodes.length > 0 ? <SmithersNodes nodes={nodes} /> : null}

                  {awaitingVerify ? (
                    <CompileTestPanel
                      compileDone={compileDone}
                      testDone={testDone}
                      busy={verifyBusy}
                      onCompile={runCompile}
                      onTest={runTest}
                    />
                  ) : null}

                  {shipReady ? (
                    <ShipHandoffBanner onDownload={handleDownload} />
                  ) : null}

                  {isGenerating && !streamingMessageId ? (
                    <TypingIndicator />
                  ) : null}
                </div>
              )}
            </div>

            {!isEmpty ? (
              <div className="border-border border-t p-4">
                <div className="mx-auto max-w-3xl">
                  <IntentComposer
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSend}
                    disabled={isGenerating}
                    isLoading={isGenerating}
                    compact
                    showContextStrip={false}
                    footerHint=""
                    actionPills={actionPills}
                    onActionPillClick={handleActionPill}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {!isEmpty ? (
            <aside className="border-border bg-surface-1/40 hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l p-3 lg:flex">
              <ContextPanelSection title="Build stream" icon={History}>
                <BuildStreamTimeline events={streamEvents} compact />
              </ContextPanelSection>

              {nodes.length > 0 ? (
                <ContextPanelSection title="Smithers nodes" icon={History}>
                  <SmithersNodes
                    nodes={nodes}
                    caption="Plan graph (local mock)"
                  />
                </ContextPanelSection>
              ) : null}

              <ContextPanelSection title="Files" icon={Files}>
                <FileTreePreview tree={fileTree} />
              </ContextPanelSection>

              <ContextPanelSection title="Templates" icon={LayoutTemplate}>
                <div className="space-y-1">
                  {BUILD_TEMPLATES.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="panel-row w-full text-left"
                    >
                      <p className="text-foreground text-[13px]">
                        {template.name}
                      </p>
                      <p className="text-subtle mt-0.5 text-[12px]">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </ContextPanelSection>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}
