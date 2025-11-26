"use client";

import { useState, useEffect } from "react";
import { ThreadContextProvider, useThreadContext } from "@/src/lib/thread-context";
import { BackendApi, type ThreadMetadata } from "@/src/lib/backend-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

/**
 * Comprehensive Test Page for Phase 1 & Phase 2
 *
 * Tests:
 * - Phase 1: Backend API methods (fetchThreads, createThread, archiveThread, etc.)
 * - Phase 2: Thread Context (state management, switching, metadata)
 * - Integration: Backend API + Thread Context working together
 */

function TestPageContent() {
  // Configuration
  const [backendUrl, setBackendUrl] = useState("http://localhost:8080");
  const [publicKey, setPublicKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  // Backend API
  const [api, setApi] = useState<BackendApi | null>(null);
  const [backendThreads, setBackendThreads] = useState<ThreadMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string>("");

  // Thread Context
  const {
    currentThreadId,
    setCurrentThreadId,
    threads,
    threadMetadata,
    setThreadMessages,
    updateThreadMetadata,
  } = useThreadContext();

  // Test results
  const [testResults, setTestResults] = useState<Array<{ test: string; status: "pass" | "fail"; message: string }>>([]);

  // Initialize API
  useEffect(() => {
    if (backendUrl) {
      setApi(new BackendApi(backendUrl));
    }
  }, [backendUrl]);

  // Configure connection
  const handleConfigure = () => {
    if (!backendUrl || !publicKey) {
      setError("Please enter both Backend URL and Public Key");
      return;
    }
    setIsConfigured(true);
    setError(null);
    addTestResult("Configuration", "pass", `Connected to ${backendUrl}`);
  };

  // Helper to add test results
  const addTestResult = (test: string, status: "pass" | "fail", message: string) => {
    setTestResults(prev => [...prev, { test, status, message }]);
  };

  // ==================== Phase 1 Tests (Backend API) ====================

  const testFetchThreads = async () => {
    if (!api || !publicKey) return;

    setIsLoading(true);
    setError(null);
    setLastAction("Fetching threads from backend...");

    try {
      const threads = await api.fetchThreads(publicKey);
      setBackendThreads(threads);
      setLastAction(`✅ Fetched ${threads.length} threads from backend`);
      addTestResult("fetchThreads", "pass", `Retrieved ${threads.length} threads`);

      // Sync to context
      threads.forEach(thread => {
        updateThreadMetadata(thread.session_id, {
          title: thread.title || "Untitled",
          status: thread.is_archived ? "archived" : "regular",
        });
      });
      addTestResult("Context Sync", "pass", "Synced backend threads to context");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLastAction(`❌ Failed to fetch threads: ${message}`);
      addTestResult("fetchThreads", "fail", message);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateThread = async () => {
    if (!api || !publicKey) return;

    setIsLoading(true);
    setError(null);
    setLastAction("Creating new thread...");

    try {
      const newThread = await api.createThread(publicKey, `Test Thread ${Date.now()}`);
      setLastAction(`✅ Created thread: ${newThread.session_id}`);
      addTestResult("createThread", "pass", `Created ${newThread.session_id}`);

      // Add to context
      updateThreadMetadata(newThread.session_id, {
        title: newThread.title || "Test Thread",
        status: "regular",
      });
      setThreadMessages(newThread.session_id, []);
      setCurrentThreadId(newThread.session_id);

      addTestResult("Context Integration", "pass", "Added new thread to context");

      // Refresh list
      await testFetchThreads();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLastAction(`❌ Failed to create thread: ${message}`);
      addTestResult("createThread", "fail", message);
    } finally {
      setIsLoading(false);
    }
  };

  const testArchiveThread = async (threadId: string) => {
    if (!api) return;

    setIsLoading(true);
    setError(null);
    setLastAction(`Archiving thread ${threadId}...`);

    try {
      await api.archiveThread(threadId);
      setLastAction(`✅ Archived thread ${threadId}`);
      addTestResult("archiveThread", "pass", `Archived ${threadId}`);

      // Update context
      updateThreadMetadata(threadId, { status: "archived" });
      addTestResult("Context Update", "pass", "Updated thread status in context");

      // Refresh list
      await testFetchThreads();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLastAction(`❌ Failed to archive: ${message}`);
      addTestResult("archiveThread", "fail", message);
    } finally {
      setIsLoading(false);
    }
  };

  const testUnarchiveThread = async (threadId: string) => {
    if (!api) return;

    setIsLoading(true);
    setError(null);
    setLastAction(`Unarchiving thread ${threadId}...`);

    try {
      await api.unarchiveThread(threadId);
      setLastAction(`✅ Unarchived thread ${threadId}`);
      addTestResult("unarchiveThread", "pass", `Unarchived ${threadId}`);

      // Update context
      updateThreadMetadata(threadId, { status: "regular" });
      addTestResult("Context Update", "pass", "Updated thread status in context");

      // Refresh list
      await testFetchThreads();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLastAction(`❌ Failed to unarchive: ${message}`);
      addTestResult("unarchiveThread", "fail", message);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteThread = async (threadId: string) => {
    if (!api) return;

    if (!confirm(`Are you sure you want to delete thread ${threadId}?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastAction(`Deleting thread ${threadId}...`);

    try {
      await api.deleteThread(threadId);
      setLastAction(`✅ Deleted thread ${threadId}`);
      addTestResult("deleteThread", "pass", `Deleted ${threadId}`);

      // Remove from context
      const newThreads = new Map(threads);
      newThreads.delete(threadId);

      const newMetadata = new Map(threadMetadata);
      newMetadata.delete(threadId);

      if (currentThreadId === threadId) {
        const firstThread = Array.from(newMetadata.keys())[0];
        if (firstThread) {
          setCurrentThreadId(firstThread);
        }
      }

      addTestResult("Context Cleanup", "pass", "Removed thread from context");

      // Refresh list
      await testFetchThreads();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLastAction(`❌ Failed to delete: ${message}`);
      addTestResult("deleteThread", "fail", message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== Phase 2 Tests (Thread Context) ====================

  const testContextSwitchThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    setLastAction(`✅ Switched to thread: ${threadId}`);
    addTestResult("Context Switch", "pass", `Switched to ${threadId}`);
  };

  const testContextCreateThread = () => {
    const newId = `local-thread-${Date.now()}`;
    updateThreadMetadata(newId, {
      title: `Local Thread ${newId.slice(-4)}`,
      status: "regular",
    });
    setThreadMessages(newId, []);
    setCurrentThreadId(newId);
    setLastAction(`✅ Created local thread: ${newId}`);
    addTestResult("Context Create", "pass", `Created local thread ${newId}`);
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults([]);
    setLastAction("Running all tests...");

    if (!api || !publicKey) {
      setError("Please configure Backend URL and Public Key first");
      return;
    }

    // Test 1: Fetch threads
    await testFetchThreads();

    // Test 2: Create thread
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testCreateThread();

    // Test 3: Context operations
    testContextCreateThread();

    setLastAction("✅ All tests completed! Check results below.");
  };

  // Get context stats
  const contextThreads = Array.from(threads.keys());
  const contextMetadata = Array.from(threadMetadata.entries());
  const regularThreads = contextMetadata.filter(([_, meta]) => meta.status === "regular");
  const archivedThreads = contextMetadata.filter(([_, meta]) => meta.status === "archived");

  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">🧪 Phase 1 & 2 Integration Test</h1>
        <p className="text-muted-foreground">
          Test Backend API + Thread Context working together
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Configuration</CardTitle>
          <CardDescription>
            Enter your backend URL and wallet address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backend-url">Backend URL</Label>
              <Input
                id="backend-url"
                placeholder="http://localhost:8080"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                disabled={isConfigured}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public-key">Public Key (Wallet Address)</Label>
              <Input
                id="public-key"
                placeholder="0x..."
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                disabled={isConfigured}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isConfigured ? (
              <Button onClick={handleConfigure}>
                Connect
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsConfigured(false)}>
                Reconfigure
              </Button>
            )}
            <Button onClick={runAllTests} disabled={!isConfigured || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Run All Tests"
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {lastAction && (
            <div className="text-sm text-muted-foreground">
              {lastAction}
            </div>
          )}
        </CardContent>
      </Card>

      {isConfigured && (
        <>
          {/* Phase 1: Backend API Tests */}
          <Card>
            <CardHeader>
              <CardTitle>📡 Phase 1: Backend API</CardTitle>
              <CardDescription>
                Test Backend API methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={testFetchThreads}
                  disabled={isLoading}
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Fetch Threads
                </Button>
                <Button
                  onClick={testCreateThread}
                  disabled={isLoading}
                >
                  Create Thread
                </Button>
              </div>

              {backendThreads.length > 0 && (
                <div className="border rounded p-4 space-y-2">
                  <h4 className="font-semibold">Backend Threads ({backendThreads.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {backendThreads.map((thread) => (
                      <div
                        key={thread.session_id}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{thread.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {thread.session_id}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={thread.is_archived ? "secondary" : "default"}>
                            {thread.is_archived ? "Archived" : "Regular"}
                          </Badge>
                          {thread.is_archived ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testUnarchiveThread(thread.session_id)}
                            >
                              Unarchive
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testArchiveThread(thread.session_id)}
                            >
                              Archive
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => testDeleteThread(thread.session_id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 2: Thread Context */}
          <Card>
            <CardHeader>
              <CardTitle>🗂️ Phase 2: Thread Context</CardTitle>
              <CardDescription>
                Current thread state in React context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="border rounded p-4">
                  <div className="text-2xl font-bold">{contextThreads.length}</div>
                  <div className="text-sm text-muted-foreground">Total Threads</div>
                </div>
                <div className="border rounded p-4">
                  <div className="text-2xl font-bold">{regularThreads.length}</div>
                  <div className="text-sm text-muted-foreground">Regular</div>
                </div>
                <div className="border rounded p-4">
                  <div className="text-2xl font-bold">{archivedThreads.length}</div>
                  <div className="text-sm text-muted-foreground">Archived</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Current Thread</h4>
                  <Button size="sm" onClick={testContextCreateThread}>
                    Create Local Thread
                  </Button>
                </div>
                <div className="border rounded p-3 bg-muted/50">
                  <div className="text-sm space-y-1">
                    <p><strong>ID:</strong> {currentThreadId}</p>
                    <p><strong>Title:</strong> {threadMetadata.get(currentThreadId)?.title || "N/A"}</p>
                    <p><strong>Status:</strong> {threadMetadata.get(currentThreadId)?.status || "N/A"}</p>
                    <p><strong>Messages:</strong> {threads.get(currentThreadId)?.length || 0}</p>
                  </div>
                </div>
              </div>

              {contextMetadata.length > 0 && (
                <div className="border rounded p-4 space-y-2">
                  <h4 className="font-semibold">All Context Threads</h4>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {contextMetadata.map(([id, meta]) => (
                      <button
                        key={id}
                        onClick={() => testContextSwitchThread(id)}
                        className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                          id === currentThreadId
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{meta.title}</span>
                          <Badge variant={meta.status === "archived" ? "secondary" : "default"} className="ml-2">
                            {meta.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {id}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📋 Test Results</CardTitle>
                <CardDescription>
                  {testResults.filter(r => r.status === "pass").length} passed,{" "}
                  {testResults.filter(r => r.status === "fail").length} failed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {testResults.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded border ${
                        result.status === "pass"
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                          : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                      }`}
                    >
                      {result.status === "pass" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{result.test}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function TestMigrationPage() {
  return (
    <ThreadContextProvider>
      <TestPageContent />
    </ThreadContextProvider>
  );
}
