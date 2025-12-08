"use client";

import { useThreadContext } from "@/lib/thread-context";
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

    console.log('✅ Created thread:', newThreadId);
  };

  // Test: Switch thread
  const handleSwitchThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    console.log('✅ Switched to thread:', threadId);
  };

  // Test: Archive current thread
  const handleArchiveThread = () => {
    updateThreadMetadata(currentThreadId, { status: "archived" });
    console.log('✅ Archived thread:', currentThreadId);
  };

  // Test: Unarchive current thread
  const handleUnarchiveThread = () => {
    updateThreadMetadata(currentThreadId, { status: "regular" });
    console.log('✅ Unarchived thread:', currentThreadId);
  };

  // Get current thread info
  const currentMessages = threads.get(currentThreadId) || [];
  const currentMeta = threadMetadata.get(currentThreadId);

  // Get all thread IDs
  const allThreadIds = Array.from(threads.keys());
  const regularThreads = allThreadIds.filter(
    id => threadMetadata.get(id)?.status === "regular"
  );
  const archivedThreads = allThreadIds.filter(
    id => threadMetadata.get(id)?.status === "archived"
  );

  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>🧪 Thread Context Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Thread Info */}
        <div className="border rounded p-4 bg-muted/50">
          <h3 className="font-semibold mb-2">Current Thread</h3>
          <div className="text-sm space-y-1">
            <p><strong>ID:</strong> {currentThreadId}</p>
            <p><strong>Title:</strong> {currentMeta?.title || 'N/A'}</p>
            <p><strong>Status:</strong> {currentMeta?.status || 'N/A'}</p>
            <p><strong>Messages:</strong> {currentMessages.length}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold">Actions</h3>
          <div className="flex gap-2 flex-wrap">
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
          <h3 className="font-semibold">Regular Threads ({regularThreads.length})</h3>
          <div className="space-y-1">
            {regularThreads.map(threadId => {
              const meta = threadMetadata.get(threadId);
              const isActive = threadId === currentThreadId;
              return (
                <button
                  key={threadId}
                  onClick={() => handleSwitchThread(threadId)}
                  className={`w-full text-left px-3 py-2 rounded border text-sm ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  {meta?.title || threadId}
                  {isActive && ' (active)'}
                </button>
              );
            })}
          </div>
        </div>

        {archivedThreads.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Archived Threads ({archivedThreads.length})</h3>
            <div className="space-y-1">
              {archivedThreads.map(threadId => {
                const meta = threadMetadata.get(threadId);
                const isActive = threadId === currentThreadId;
                return (
                  <button
                    key={threadId}
                    onClick={() => handleSwitchThread(threadId)}
                    className={`w-full text-left px-3 py-2 rounded border text-sm opacity-60 ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {meta?.title || threadId}
                    {isActive && ' (active)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Debug Info */}
        <details className="border rounded p-2 text-xs">
          <summary className="cursor-pointer font-semibold mb-2">Debug Info</summary>
          <pre className="whitespace-pre-wrap overflow-auto max-h-40">
            {JSON.stringify({
              currentThreadId,
              totalThreads: allThreadIds.length,
              regularCount: regularThreads.length,
              archivedCount: archivedThreads.length,
              threadIds: allThreadIds,
            }, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
