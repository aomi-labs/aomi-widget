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

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-1 list-none flex-col items-stretch gap-1 pl-2">
      <ThreadListNew />
      <div className="aui-thread-list-separator border-border/30 mx-4 my-2 border-t" />
      <ThreadListItems />
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        className="aui-thread-list-new hover:bg-accent data-active:bg-accent flex items-center justify-start gap-2 rounded-2xl px-4 py-2 text-start text-sm"
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

  if (isLoading) {
    return <ThreadListSkeleton />;
  }

  return <ThreadListPrimitive.Items components={{ ThreadListItem }} />;
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
          className="aui-thread-list-skeleton-wrapper flex h-9 shrink-0 items-center rounded-2xl px-4"
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
    <ThreadListItemPrimitive.Root className="aui-thread-list-item hover:bg-accent focus-visible:bg-accent data-active:bg-accent flex w-full min-w-0 items-center rounded-2xl pl-4 pr-2 transition-all focus-visible:outline-none">
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
        className="aui-thread-list-item-delete text-foreground hover:text-primary shrink-0 pl-2"
        variant="ghost"
        size="icon"
        aria-label="Delete thread"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <TrashIcon className="size-3.5" />
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
