"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  Square,
  WalletIcon,
  ArrowLeftRightIcon,
  LayersIcon,
  CableIcon,
} from "lucide-react";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

import type { FC } from "react";
import { useEffect } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import * as m from "motion/react-m";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

import { cn, useNotification, useThreadContext } from "@aomi-labs/react";
import { useComposerControl } from "@/components/aomi-frame";
import { ModelSelect } from "@/components/control-bar/model-select";
import { AppSelect } from "@/components/control-bar/app-select";
import { ApiKeyInput } from "@/components/control-bar/api-key-input";
import { NetworkSelect } from "@/components/control-bar/network-select";
import { ConnectButton } from "@/components/control-bar/connect-button";
import {
  useAssistantApi,
  useAssistantState,
  useMessage,
} from "@assistant-ui/react";

const seenSystemMessages = new Set<string>();

export const Thread: FC = () => {
  const api = useAssistantApi();
  const { threadViewKey } = useThreadContext();

  useEffect(() => {
    try {
      const composer = api.composer();
      composer.setText("");
    } catch (error) {
      console.error("Failed to reset composer input:", error);
    }
  }, [api, threadViewKey]);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <ThreadPrimitive.Root
          className="aui-root aui-thread-root @container bg-background flex h-full flex-col"
          style={{
            ["--thread-max-width" as string]: "44rem",
          }}
        >
          <ThreadPrimitive.Viewport className="aui-thread-viewport relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-scroll px-2 [scrollbar-gutter:stable_both-edges]">
            <ThreadPrimitive.If empty>
              <ThreadWelcome />
            </ThreadPrimitive.If>

            <ThreadLoadingSkeleton />

            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                EditComposer,
                AssistantMessage,
                SystemMessage,
              }}
            />

            <ThreadPrimitive.If empty={false}>
              <div className="aui-thread-viewport-spacer min-h-36 grow" />
            </ThreadPrimitive.If>
          </ThreadPrimitive.Viewport>

          <Composer />
        </ThreadPrimitive.Root>
      </MotionConfig>
    </LazyMotion>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  const isLoading = useAssistantState(({ thread }) => thread.isLoading);

  if (isLoading) return null;

  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col px-2">
      <div className="aui-thread-welcome-center flex w-full flex-grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-8">
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="aui-thread-welcome-message-motion-1 text-2xl font-medium antialiased [color:var(--aomi-welcome-title,oklch(0.42_0.006_285.823))]"
          >
            Hello there!
          </m.div>
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.1 }}
            className="aui-thread-welcome-message-motion-2 text-2xl antialiased [color:var(--aomi-welcome-subtitle,oklch(0.68_0.012_286))]"
          >
            How can I help you today?
          </m.div>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions @md:grid-cols-2 grid w-full gap-2 px-1 pb-4">
      {[
        {
          title: "Show my wallet balances",
          label: "and positions",
          action: "Show my wallet balances and positions",
          icon: WalletIcon,
        },
        {
          title: "Swap 1 ETH to USDC",
          label: "with the best price",
          action: "Swap 1 ETH to USDC with the best price",
          icon: ArrowLeftRightIcon,
        },
        {
          title: "Stake half of my ETH",
          label: "in the highest yield pool",
          action: "Stake half of my ETH in the highest yield pool",
          icon: LayersIcon,
        },
        {
          title: "Bridge 100 USDC",
          label: "from Ethereum to Arbitrum",
          action: "Bridge 100 USDC from Ethereum to Arbitrum",
          icon: CableIcon,
        },
      ].map((suggestedAction, index) => (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className="aui-thread-welcome-suggestion-display @md:[&:nth-child(n+3)]:block [&:nth-child(n+3)]:hidden"
        >
          <ThreadPrimitive.Suggestion
            prompt={suggestedAction.action}
            send
            asChild
          >
            <Button
              variant="ghost"
              className="aui-thread-welcome-suggestion group/suggestion @md:flex-col dark:hover:bg-accent/60 h-auto w-full min-w-0 flex-col items-start justify-start gap-0.5 overflow-hidden whitespace-normal rounded-2xl border px-4 py-3 text-left text-sm font-normal transition-colors"
              aria-label={suggestedAction.action}
            >
              <span className="aui-thread-welcome-suggestion-text-1 text-foreground flex min-w-0 items-start gap-2 break-words leading-tight">
                <suggestedAction.icon className="text-muted-foreground/40 group-hover/suggestion:text-primary size-3.5 shrink-0 transition-colors" />
                <span className="min-w-0 break-words">
                  {suggestedAction.title}
                </span>
              </span>
              <span className="aui-thread-welcome-suggestion-text-2 text-muted-foreground/60 ml-[22px] min-w-0 break-words text-xs leading-tight">
                {suggestedAction.label}
              </span>
            </Button>
          </ThreadPrimitive.Suggestion>
        </m.div>
      ))}
    </div>
  );
};

const Composer: FC = () => {
  return (
    <div className="aui-composer-wrapper bg-background mx-auto flex w-full max-w-[var(--thread-max-width)] shrink-0 flex-col gap-4 overflow-visible px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-6">
      <ThreadScrollToBottom />
      <ComposerPrimitive.Root className="aui-composer-root rounded-4xl bg-muted/20 text-card-foreground border-border/40 relative flex w-full flex-col border px-1 pt-2">
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="aui-composer-input text-foreground placeholder:text-muted-foreground/60 ml-3 mt-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-3.5 pb-2 pt-1.5 text-sm outline-none dark:text-white"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <ComposerAction />
      </ComposerPrimitive.Root>
    </div>
  );
};

const ComposerAction: FC = () => {
  const composerControl = useComposerControl();
  const controlBarProps = composerControl.controlBarProps ?? {};
  const hideModel = controlBarProps.hideModel ?? false;
  const hideApp = controlBarProps.hideApp ?? false;
  const hideApiKey = controlBarProps.hideApiKey ?? false;
  const hideWallet = controlBarProps.hideWallet ?? true;
  const hideNetwork = controlBarProps.hideNetwork ?? false;

  return (
    <div className="aui-composer-action-wrapper relative mx-1 mb-3 mt-2 flex min-h-[38px] items-center gap-1">
      {/* Inline controls — horizontally scrollable on mobile */}
      {composerControl.enabled && (
        <div className="aui-composer-action-scroll ml-1 flex min-w-0 flex-1 items-center gap-0 overflow-x-auto md:ml-2 md:gap-2">
          {!hideNetwork && <NetworkSelect />}
          {!hideModel && <ModelSelect />}
          {!hideApp && <AppSelect />}
          {!hideWallet && <ConnectButton />}
          {!hideApiKey && <ApiKeyInput />}
        </div>
      )}

      {/* Spacer — only when no inline controls */}
      {!composerControl.enabled && <div className="flex-1" />}

      <div className="shrink-0">
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send asChild>
            <Button
              type="submit"
              variant="default"
              size="icon"
              className="aui-composer-send mr-2 size-[38px] shrink-0 rounded-full p-1 md:mr-3 md:size-[34px]"
              aria-label="Send message"
            >
              <ArrowUpIcon className="aui-composer-send-icon size-5" />
            </Button>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>

        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel border-muted-foreground/60 hover:bg-primary/75 dark:border-muted-foreground/90 mr-2 size-[38px] shrink-0 rounded-full border md:mr-3 md:size-[34px]"
              aria-label="Stop generating"
            >
              <Square className="aui-composer-cancel-icon size-3.5 fill-white dark:fill-black" />
            </Button>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const ThreadLoadingSkeleton: FC = () => {
  const isLoading = useAssistantState(({ thread }) => thread.isLoading);

  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-label="Loading conversation"
      aria-live="polite"
      className="aui-thread-loading-skeleton mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-6 px-2 py-5"
    >
      <AssistantMessageSkeleton widths={["76%", "58%", "68%"]} />
      <UserMessageSkeleton width="44%" />
      <AssistantMessageSkeleton widths={["82%", "71%", "38%"]} />
      <UserMessageSkeleton width="56%" />
      <AssistantMessageSkeleton widths={["64%", "46%"]} />
    </div>
  );
};

const AssistantMessageSkeleton: FC<{ widths?: string[] }> = ({
  widths = ["72%", "56%", "64%"],
}) => {
  return (
    <div className="aui-assistant-message-skeleton flex flex-col gap-2 px-2">
      {widths.map((width, index) => (
        <Skeleton
          key={`${width}-${index}`}
          className="aui-assistant-message-skeleton-line h-3 rounded-full"
          style={{ width }}
        />
      ))}
    </div>
  );
};

const UserMessageSkeleton: FC<{ width?: string }> = ({ width = "48%" }) => {
  return (
    <div className="aui-user-message-skeleton flex justify-end px-2">
      <Skeleton
        className="aui-user-message-skeleton-bubble h-10 rounded-3xl"
        style={{ width }}
      />
    </div>
  );
};

const AssistantLoadingDot: FC = () => {
  return (
    <div className="aui-assistant-loading-dot-wrapper flex min-h-6 items-center px-1">
      <span className="aui-assistant-loading-dot bg-foreground block size-2.5 animate-pulse rounded-full" />
    </div>
  );
};

const AssistantMessage: FC = () => {
  const isEmpty = useMessage((state) => state.content.length === 0);
  const isRunning = useMessage((state) => state.status?.type === "running");
  const isLast = useMessage((state) => state.isLast);
  const notice = useMessage((state) => state.metadata?.custom) as
    | { aomiNoticeKind?: string; aomiNoticeTitle?: string }
    | undefined;
  const isPaymentRequiredNotice = notice?.aomiNoticeKind === "payment_required";
  const showLoadingDot = isEmpty && isRunning && isLast;
  const showFinishedEmptyMessage = isEmpty && !showLoadingDot;

  return (
    <MessagePrimitive.Root asChild>
      <div
        className={cn(
          "aui-assistant-message-root animate-in fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-[var(--thread-max-width)] duration-150 ease-out",
          showFinishedEmptyMessage ? "-mt-3 py-0" : "py-4",
        )}
        data-role="assistant"
      >
        {!showFinishedEmptyMessage && isPaymentRequiredNotice && (
          <div className="aui-assistant-payment-required bg-sidebar text-sidebar-foreground border-border/70 dark:border-border mx-3 rounded-2xl border px-4 py-3 text-sm shadow-sm">
            <div className="aui-assistant-payment-required-title mb-1 font-medium">
              {notice?.aomiNoticeTitle ?? "Credits needed"}
            </div>
            <div className="aui-assistant-payment-required-message text-muted-foreground leading-5">
              <MessagePrimitive.Parts
                components={{
                  Text: MarkdownText,
                  tools: { Fallback: ToolFallback },
                }}
              />
            </div>
          </div>
        )}

        {!showFinishedEmptyMessage && !isPaymentRequiredNotice && (
          <div className="aui-assistant-message-content text-foreground break-words px-3 text-sm leading-5">
            {showLoadingDot ? (
              <AssistantLoadingDot />
            ) : (
              <MessagePrimitive.Parts
                components={{
                  Text: MarkdownText,
                  tools: { Fallback: ToolFallback },
                }}
              />
            )}
            <MessageError />
          </div>
        )}

        {!showLoadingDot && (
          <div
            className={cn(
              "aui-assistant-message-footer flex px-3",
              showFinishedEmptyMessage ? "mt-0" : "mt-2",
            )}
          >
            <BranchPicker />
            <AssistantActionBar />
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="aui-assistant-action-bar-root text-muted-foreground data-floating:absolute data-floating:rounded-xl data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm col-start-3 row-start-2 -ml-1 flex gap-1"
    >
      <ActionBarPrimitive.Copy asChild>
        <Button
          variant="ghost"
          size="icon"
          className="aui-button-icon size-6 rounded-xl p-1"
          aria-label="Copy"
        >
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </Button>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <Button
          variant="ghost"
          size="icon"
          className="aui-button-icon size-6 rounded-xl p-1"
          aria-label="Refresh"
        >
          <RefreshCwIcon />
        </Button>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  const isEmpty = useMessage((state) => state.content.length === 0);

  return (
    <MessagePrimitive.Root asChild>
      <div
        className="aui-user-message-root animate-in fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-4 duration-150 ease-out first:mt-3 last:mb-5 [&:where(>*)]:col-start-2"
        data-role="user"
      >
        <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
          <div className="aui-user-message-content bg-muted text-foreground break-words rounded-3xl px-5 py-2.5 text-sm">
            {isEmpty ? (
              <Skeleton className="aui-user-message-content-skeleton h-4 w-28 rounded-full" />
            ) : (
              <MessagePrimitive.Parts />
            )}
          </div>
          {!isEmpty && (
            <div className="aui-user-action-bar-wrapper absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-2">
              <UserActionBar />
            </div>
          )}
        </div>

        <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      </div>
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <Button
          variant="ghost"
          size="icon"
          className="aui-button-icon aui-user-action-edit size-6 rounded-xl p-4"
          aria-label="Edit"
        >
          <PencilIcon />
        </Button>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <div className="aui-edit-composer-wrapper mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 px-2 first:mt-4">
      <ComposerPrimitive.Root className="aui-edit-composer-root max-w-7/8 bg-muted ml-auto flex w-full flex-col rounded-xl">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground flex min-h-[60px] w-full resize-none bg-transparent p-4 outline-none dark:text-white"
          autoFocus
        />

        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center justify-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm" aria-label="Cancel edit">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" aria-label="Update message">
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ml-2 mr-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const SystemMessage: FC = () => {
  const { showNotification } = useNotification();
  const messageId = useMessage((state) => state.id);
  const content = useMessage((state) => state.content) as Array<{
    type: string;
    text?: string;
  }>;
  const custom = useMessage((state) => state.metadata?.custom) as
    | { kind?: string; title?: string }
    | undefined;
  useEffect(() => {
    const text = content
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) return;

    const key = messageId ?? text;
    if (seenSystemMessages.has(key)) return;
    seenSystemMessages.add(key);

    const inferredKind =
      custom?.kind ??
      (text.startsWith("Wallet transaction request:")
        ? "wallet_tx_request"
        : "system_notice");

    const type =
      inferredKind === "system_error"
        ? "error"
        : inferredKind === "system_success"
          ? "success"
          : "notice";

    const title =
      custom?.title ??
      (inferredKind === "wallet_tx_request"
        ? "Wallet transaction request"
        : inferredKind === "system_error"
          ? "Error"
          : "System notice");

    showNotification({ type, title, message: text });
  }, [content, custom, showNotification, messageId]);

  return null;
};
