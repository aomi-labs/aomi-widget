import { describe, expect, it, vi } from "vitest";
import { createSseSubscriber } from "../src/sse";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function fetchCapturingUrl(urls: string[]) {
  return vi.fn(async (url: RequestInfo | URL) => {
    urls.push(String(url));
    return new Response(streamOf([":\n\n"]), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  });
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

describe("SSE URL construction", () => {
  // Regression: the portal uses an empty same-origin base URL, and building
  // the stream URL with `new URL("/api/…")` (no base) throws before fetch,
  // silently killing every browser SSE subscription through the retry loop.
  it("builds a relative URL for an empty same-origin base", async () => {
    const urls: string[] = [];
    const subscriber = createSseSubscriber({
      backendUrl: "",
      getHeaders: () => ({}),
      fetchImpl: fetchCapturingUrl(urls) as unknown as typeof fetch,
    });
    const unsubscribe = subscriber.subscribe("thread-1", () => {});
    await flush();
    unsubscribe();
    expect(urls).toEqual(["/api/thread/updates"]);
  });

  it("keeps absolute bases absolute and appends application_id", async () => {
    const urls: string[] = [];
    const subscriber = createSseSubscriber({
      backendUrl: "http://127.0.0.1:8080/",
      getHeaders: () => ({}),
      fetchImpl: fetchCapturingUrl(urls) as unknown as typeof fetch,
    });
    const unsubscribe = subscriber.subscribe("thread-2", () => {}, undefined, {
      applicationId: 7,
    });
    await flush();
    unsubscribe();
    expect(urls).toEqual([
      "http://127.0.0.1:8080/api/thread/updates?application_id=7",
    ]);
  });
});
