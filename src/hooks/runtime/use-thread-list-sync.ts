"use client";

import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";

import type { BackendApi } from "@/lib/backend-api";
import type { ThreadMetadata } from "@/lib/thread-context";
import { isPlaceholderTitle } from "@/lib/runtime-utils";

type UseThreadListSyncParams = {
  backendApiRef: RefObject<BackendApi>;
  publicKey?: string;
  threadMetadata: Map<string, ThreadMetadata>;
  threadCnt: number;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  setThreadCnt: Dispatch<SetStateAction<number>>;
};

export function useThreadListSync({
  backendApiRef,
  publicKey,
  threadMetadata,
  threadCnt,
  setThreadMetadata,
  setThreadCnt,
}: UseThreadListSyncParams) {
  const threadMetadataRef = useRef(threadMetadata);
  const threadCntRef = useRef(threadCnt);

  useEffect(() => {
    threadMetadataRef.current = threadMetadata;
  }, [threadMetadata]);

  useEffect(() => {
    threadCntRef.current = threadCnt;
  }, [threadCnt]);

  useEffect(() => {
    if (!publicKey) return;

    const fetchThreadList = async () => {
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const newMetadata = new Map(threadMetadataRef.current);

        // Track highest chat number.
        let maxChatNum = threadCntRef.current;

        for (const thread of threadList) {
          const rawTitle = thread.title ?? "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive =
            thread.last_active_at ||
            thread.updated_at ||
            thread.created_at ||
            newMetadata.get(thread.session_id)?.lastActiveAt ||
            new Date().toISOString();
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive,
          });

          // Extract chat number if title follows "Chat N" format.
          const match = title.match(/^Chat (\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxChatNum) {
              maxChatNum = num;
            }
          }
        }

        setThreadMetadata(newMetadata);
        // Sync counter to highest chat number.
        if (maxChatNum > threadCntRef.current) {
          setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };

    void fetchThreadList();
  }, [backendApiRef, publicKey, setThreadCnt, setThreadMetadata]);
}
