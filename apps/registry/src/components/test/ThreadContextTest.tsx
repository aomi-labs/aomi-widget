"use client";

import { useThreadContext } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Test Component for Thread Context
 *
 * This component demonstrates and tests the ThreadContext functionality.
 * Use this to verify Phase 2 is working correctly.
 *
 * Usage:
 * 1. Wrap your app with <ThreadContextProvider>
 * 2. Add <ThreadContextTest /> somewhere in your component tree
 * 3. Click buttons to test thread operations
 */
export function ThreadContextTest() {
  const {
    currentThreadId,
    setCurrentThreadId,
    threads,
    threadMetadata,
    setThreadMessages,
    updateThreadMetadata,
  } = useThreadContext();

  // Test: Create a new thread
  const handleCreateThread = () => {
    const newThreadId = `thread-${Date.now()}`;

    // Add empty messages for new thread
    setThreadMessages(newThreadId, []);

    // Add metadata for new thread
    updateThreadMetadata(newThreadId, {
      title: `Thread ${newThreadId.slice(-4)}`,
      status: "regular",
    });

    // Switch to new thread
    setCurrentThreadId(newThreadId);

    console.log("✅ Created thread:", newThreadId);
  };

  // Test: Switch thread
  const handleSwitchThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    console.log("✅ Switched to thread:", threadId);
  };

  // Test: Archive current thread
  const handleArchiveThread = () => {
    updateThreadMetadata(currentThreadId, { status: "archived" });
    console.log("✅ Archived thread:", currentThreadId);
  };

  // Test: Unarchive current thread
  const handleUnarchiveThread = () => {
    updateThreadMetadata(currentThreadId, { status: "regular" });
    console.log("✅ Unarchived thread:", currentThreadId);
  };

  // Get current thread info
  const currentMessages = threads.get(currentThreadId) || [];
  const currentMeta = threadMetadata.get(currentThreadId);

  // Get all thread IDs
  const allThreadIds = Array.from(threads.keys());
  const regularThreads = allThreadIds.filter(
    (id) => threadMetadata.get(id)?.status === "regular",
  );
  const archivedThreads = allThreadIds.filter(
    (id) => threadMetadata.get(id)?.status === "archived",
  );

  return (
    <Card className="mx-auto my-8 w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🧪 Thread Context Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Thread Info */}
        <div className="bg-muted/50 rounded border p-4">
          <h3 className="mb-2 font-semibold">Current Thread</h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>ID:</strong> {currentThreadId}
            </p>
            <p>
              <strong>Title:</strong> {currentMeta?.title || "N/A"}
            </p>
            <p>
              <strong>Status:</strong> {currentMeta?.status || "N/A"}
            </p>
            <p>
              <strong>Messages:</strong> {currentMessages.length}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateThread} variant="default">
              Create New Thread
            </Button>
            <Button
              onClick={handleArchiveThread}
              variant="outline"
              disabled={currentMeta?.status === "archived"}
            >
              Archive Current
            </Button>
            <Button
              onClick={handleUnarchiveThread}
              variant="outline"
              disabled={currentMeta?.status === "regular"}
            >
              Unarchive Current
            </Button>
          </div>
        </div>

        {/* Thread List */}
        <div className="space-y-2">
          <h3 className="font-semibold">
            Regular Threads ({regularThreads.length})
          </h3>
          <div className="space-y-1">
            {regularThreads.map((threadId) => {
              const meta = threadMetadata.get(threadId);
              const isActive = threadId === currentThreadId;
              return (
                <button
                  key={threadId}
                  onClick={() => handleSwitchThread(threadId)}
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {meta?.title || threadId}
                  {isActive && " (active)"}
                </button>
              );
            })}
          </div>
        </div>

        {archivedThreads.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">
              Archived Threads ({archivedThreads.length})
            </h3>
            <div className="space-y-1">
              {archivedThreads.map((threadId) => {
                const meta = threadMetadata.get(threadId);
                const isActive = threadId === currentThreadId;
                return (
                  <button
                    key={threadId}
                    onClick={() => handleSwitchThread(threadId)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm opacity-60 ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {meta?.title || threadId}
                    {isActive && " (active)"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Debug Info */}
        <details className="rounded border p-2 text-xs">
          <summary className="mb-2 cursor-pointer font-semibold">
            Debug Info
          </summary>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(
              {
                currentThreadId,
                totalThreads: allThreadIds.length,
                regularCount: regularThreads.length,
                archivedCount: archivedThreads.length,
                threadIds: allThreadIds,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
