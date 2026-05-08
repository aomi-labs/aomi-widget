"use client";

import { type FC, useState } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import { PlusIcon, TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-1 list-none flex-col items-stretch gap-1 pl-2">
      <ThreadListNew />
      <div className="aui-thread-list-separator mx-4 my-2 flex items-center gap-2">
        <span className="text-muted-foreground/40 text-[10px] font-medium uppercase tracking-widest">
          Recent
        </span>
        <div className="border-border/30 flex-1 border-t" />
      </div>
      <ThreadListItems />
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        className="aui-thread-list-new hover:bg-accent data-active:bg-accent flex items-center justify-start gap-2 rounded-3xl px-4 py-2 text-start"
        variant="ghost"
      >
        <PlusIcon className="size-4" />
        New Chat
      </Button>
    </ThreadListPrimitive.New>
  );
};

const ThreadListItems: FC = () => {
  const isLoading = useAssistantState(({ threads }) => threads.isLoading);
  const { identity } = useAomiAuthAdapter();

  if (isLoading) {
    return <ThreadListSkeleton />;
  }

  return (
    <>
      {!identity.isConnected && <ThreadListConnectHint />}
      <ThreadListPrimitive.Items components={{ ThreadListItem }} />
    </>
  );
};

const ThreadListConnectHint: FC = () => {
  return (
    <p className="aui-thread-list-connect-hint text-muted-foreground/60 px-4 py-8 text-center text-xs">
      Connect wallet to see threads
    </p>
  );
};

const SKELETON_WIDTHS = [
  "85%",
  "72%",
  "90%",
  "68%",
  "78%",
  "95%",
  "74%",
  "82%",
  "70%",
  "88%",
  "76%",
  "92%",
  "80%",
  "69%",
  "86%",
  "73%",
  "91%",
  "77%",
  "84%",
  "71%",
];

const ThreadListSkeleton: FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading threads"
      aria-live="polite"
      className="aui-thread-list-skeleton-root flex flex-1 flex-col gap-1 overflow-hidden"
    >
      {SKELETON_WIDTHS.map((width, i) => (
        <div
          key={i}
          className="aui-thread-list-skeleton-wrapper flex h-9 shrink-0 items-center rounded-3xl px-4"
        >
          <Skeleton
            className="aui-thread-list-skeleton h-3"
            style={{ width }}
          />
        </div>
      ))}
    </div>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="aui-thread-list-item hover:bg-accent focus-visible:bg-accent data-active:bg-accent flex w-full min-w-0 items-center rounded-3xl pl-4 transition-all focus-visible:outline-none">
      <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger min-w-0 flex-1 py-2 text-start">
        <ThreadListItemTitle />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemDelete />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemTitle: FC = () => {
  return (
    <span className="aui-thread-list-item-title block truncate text-sm">
      <ThreadListItemPrimitive.Title fallback="New Chat" />
    </span>
  );
};

const ThreadListItemDelete: FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        className="aui-thread-list-item-delete text-foreground hover:text-primary mr-3 size-4 shrink-0 p-0"
        variant="ghost"
        size="icon"
        aria-label="Delete thread"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <TrashIcon />
      </Button>
      <DialogContent className="aui-thread-list-delete-dialog sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete chat?</DialogTitle>
          <DialogDescription>
            This will permanently delete this thread and its message history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <ThreadListItemPrimitive.Delete asChild>
            <Button
              variant="default"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
              }}
            >
              Delete
            </Button>
          </ThreadListItemPrimitive.Delete>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
