import { AomiClient } from "@aomi-labs/client";
import type {
  ApiChatResponse,
  ApiCreateThreadResponse,
  ApiInterruptResponse,
  ApiSSEEvent,
  ApiStateResponse,
  ApiSystemEvent,
  ApiSystemResponse,
  ApiThread,
} from "@aomi-labs/client";
import type { UserState } from "../contexts/user-context";

/**
 * Thin wrapper around AomiClient that preserves the legacy method signatures
 * used throughout the React package internals.
 *
 * New code should use AomiClient directly from `@aomi-labs/client`.
 */
export class BackendApi {
  private client: AomiClient;

  constructor(backendUrl: string) {
    this.client = new AomiClient({ baseUrl: backendUrl });
  }

  async fetchState(
    sessionId: string,
    userState?: UserState,
  ): Promise<ApiStateResponse> {
    return this.client.fetchState(sessionId, userState);
  }

  async postChatMessage(
    sessionId: string,
    message: string,
    namespace: string,
    publicKey?: string,
    apiKey?: string,
    userState?: UserState,
  ): Promise<ApiChatResponse> {
    return this.client.sendMessage(sessionId, message, {
      namespace,
      publicKey,
      apiKey,
      userState,
    });
  }

  async postSystemMessage(
    sessionId: string,
    message: string,
  ): Promise<ApiSystemResponse> {
    return this.client.sendSystemMessage(sessionId, message);
  }

  async postInterrupt(sessionId: string): Promise<ApiInterruptResponse> {
    return this.client.interrupt(sessionId);
  }

  subscribeSSE(
    sessionId: string,
    onUpdate: (event: ApiSSEEvent) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    return this.client.subscribeSSE(sessionId, onUpdate, onError);
  }

  async fetchThreads(publicKey: string): Promise<ApiThread[]> {
    return this.client.listThreads(publicKey);
  }

  async fetchThread(sessionId: string): Promise<ApiThread> {
    return this.client.getThread(sessionId);
  }

  async createThread(
    threadId: string,
    publicKey?: string,
  ): Promise<ApiCreateThreadResponse> {
    return this.client.createThread(threadId, publicKey);
  }

  async archiveThread(sessionId: string): Promise<void> {
    return this.client.archiveThread(sessionId);
  }

  async unarchiveThread(sessionId: string): Promise<void> {
    return this.client.unarchiveThread(sessionId);
  }

  async deleteThread(sessionId: string): Promise<void> {
    return this.client.deleteThread(sessionId);
  }

  async renameThread(sessionId: string, newTitle: string): Promise<void> {
    return this.client.renameThread(sessionId, newTitle);
  }

  async getSystemEvents(
    sessionId: string,
    count?: number,
  ): Promise<ApiSystemEvent[]> {
    return this.client.getSystemEvents(sessionId, count);
  }

  async getNamespaces(
    sessionId: string,
    publicKey?: string,
    apiKey?: string,
  ): Promise<string[]> {
    return this.client.getNamespaces(sessionId, { publicKey, apiKey });
  }

  async getModels(sessionId: string): Promise<string[]> {
    return this.client.getModels(sessionId);
  }

  async setModel(
    sessionId: string,
    rig: string,
    namespace?: string,
    apiKey?: string,
  ): Promise<{
    success: boolean;
    rig: string;
    baml: string;
    created: boolean;
  }> {
    return this.client.setModel(sessionId, rig, { namespace, apiKey });
  }
}
