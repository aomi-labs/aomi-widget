"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  skillLabel,
  useSkillCatalog,
} from "../../lib/capabilities/skill-catalog";
import {
  useMemo,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  createElement,
  type ReactNode,
} from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Circle,
  CircleAlert,
  FileSignature,
  Layers3,
  LoaderCircle,
  Puzzle,
} from "lucide-react";
import {
  cn,
  getChainInfo,
  useAomiRuntime,
  type TaskRunState,
} from "@aomi-labs/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { getChainIcon } from "../icons/chain-map";
import { getSkillIcon } from "../icons/skills";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { selectActivity, type ActivityTransaction } from "./model";
import { friendlyTransactionLabel, transactionSemantic } from "./presentation";
import { WalletReview } from "./wallet-review";
import { useActivityPanel } from "./activity-panel-context";

export function ActivitySidebar() {
  const { threadViewKey } = useAomiRuntime();
  return <ActivitySidebarContent key={threadViewKey} />;
}

function ActivitySidebarContent() {
  const { events, pendingActions, actionAttempts, threadViewKey, isRunning } =
    useAomiRuntime();
  const reduceMotion = useReducedMotion();
  const {
    open: panelOpen,
    setOpen: setPanelOpen,
    setWorthShowing,
  } = useActivityPanel();
  const [open, setOpen] = useState(true);
  const [compact, setCompact] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const layoutParent = useRef<HTMLElement | null>(null);
  useEffect(
    () => () => {
      layoutParent.current?.style.removeProperty("--activity-chat-max-width");
    },
    [],
  );
  useLayoutEffect(() => {
    const parent = anchorRef.current?.parentElement;
    if (!parent || typeof ResizeObserver === "undefined") return;
    const update = () => setCompact(parent.clientWidth < 1100);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  const activity = useMemo(
    () => selectActivity(events, pendingActions),
    [events, pendingActions],
  );
  const pending = pendingActions[0];
  const signing = Boolean(
    pending &&
    (pending.request.type === "sign" ||
      (pending.request.simulation.status !== "failed" &&
        !pending.request.simulation.guards.some(
          (guard) => guard.status === "failed",
        ))),
  );
  const expanded = signing || open;
  const current = activity.transactions.filter(
    (tx) =>
      (!tx.action || tx.action.state === "pending") &&
      (!pending || tx.action?.id === pending.id),
  );
  const transactions = [
    ...new Map(
      [...activity.transactions, ...activity.history].map((tx) => [tx.id, tx]),
    ).values(),
  ].sort(
    (a, b) =>
      (b.sequence ?? b.action?.sequence ?? 0) -
        (a.sequence ?? a.action?.sequence ?? 0) ||
      (b.actionIndex ?? 0) - (a.actionIndex ?? 0),
  );
  const card = (tx: ActivityTransaction, historical = false) => (
    <TransactionCard
      key={tx.id}
      transaction={tx}
      reviewing={Boolean(pending && tx.action?.id === pending.id)}
      active={
        !historical &&
        tx.turnId === activity.turnId &&
        (isRunning ||
          pendingActions.some((action) => action.id === tx.action?.id))
      }
      executing={
        !historical &&
        Boolean(
          tx.action &&
          ["executing", "responding"].includes(
            actionAttempts.get(tx.action.id)?.state ?? "",
          ),
        )
      }
    />
  );
  const hasActivity = Boolean(
    activity.agents.length ||
    activity.skills.length ||
    activity.transactions.length ||
    activity.history.length ||
    pendingActions.length,
  );
  useEffect(() => {
    setWorthShowing(hasActivity, Boolean(pending));
  }, [hasActivity, pending, setWorthShowing]);
  useEffect(() => () => setWorthShowing(false, false), [setWorthShowing]);
  const showRail = hasActivity && panelOpen;
  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      <AnimatePresence>
        {showRail && (
          <m.aside
            ref={railRef}
            onUpdate={(latest) => {
              const parent = railRef.current?.parentElement;
              if (!parent || typeof latest.width !== "number") return;
              layoutParent.current = parent;
              const progress = Math.max(0, Math.min(1, latest.width / 352));
              parent.style.setProperty(
                "--activity-chat-max-width",
                `calc(100% - (100cqw - 960px) * ${progress})`,
              );
            }}
            key={threadViewKey ?? "activity"}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 352, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            aria-label="Chat activity"
            onKeyDown={(event) => {
              if (event.key === "Escape" && compact) {
                setPanelOpen(false);
              }
            }}
            className={cn(
              "aui-activity-sidebar max-h-full max-w-full shrink-0 overflow-y-auto overflow-x-hidden",
              compact ? "absolute right-0 top-0 z-30" : "relative top-0 block",
            )}
          >
            <div className="w-[352px] max-w-[100cqw] py-4 pl-3 pr-6">
              <div className="border-aomi-border bg-aomi-raised divide-aomi-border divide-y rounded-3xl border px-4">
                {activity.agents.length > 0 && (
                  <Group title="Subagents" count={activity.agents.length}>
                    {activity.agents.map((agent, index) => (
                      <SubagentRow
                        key={agent.agentId}
                        agent={agent}
                        index={index}
                      />
                    ))}
                  </Group>
                )}
                {activity.skills.length > 0 && (
                  <Group title="Skills" count={activity.skills.length}>
                    <InvokedSkills ids={activity.skills} />
                  </Group>
                )}
                {(transactions.length > 0 || pending) && (
                  <section className="py-4" aria-label="Transactions">
                    {signing ? (
                      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-medium">
                        Transactions{" "}
                        <span className="text-aomi-muted font-normal">
                          {transactions.length}
                        </span>
                      </h2>
                    ) : (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpen(!open)}
                        className="mb-3 flex w-full items-center gap-2 text-[13px] font-medium"
                      >
                        Transactions{" "}
                        <span className="text-aomi-muted font-normal">
                          {transactions.length}
                        </span>
                        <ChevronDown
                          className={cn(
                            "text-aomi-muted ml-auto size-3.5 transition-transform motion-reduce:transition-none",
                            expanded && "rotate-180",
                          )}
                        />
                      </button>
                    )}
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <m.div
                          key="transaction-content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.22,
                            ease: "easeOut",
                          }}
                          className="overflow-hidden"
                        >
                          <TransactionList
                            newestId={transactions[0]?.id}
                            count={transactions.length}
                          >
                            {transactions.map((tx) =>
                              card(
                                tx,
                                Boolean(
                                  tx.action
                                    ? tx.action.state !== "pending"
                                    : tx.turnId !== activity.turnId,
                                ),
                              ),
                            )}
                          </TransactionList>
                          {pending && transactions.length > current.length && (
                            <p className="text-aomi-muted mt-3 text-[11px]">
                              Wallet request: {current.length} transaction
                              {current.length === 1 ? "" : "s"}.
                            </p>
                          )}
                          {pending && (
                            <WalletReview
                              key={`${pending!.id}:${pending!.revision}`}
                              embedded
                            />
                          )}
                        </m.div>
                      )}
                    </AnimatePresence>
                  </section>
                )}
              </div>
            </div>
          </m.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function SubagentRow({ agent, index }: { agent: TaskRunState; index: number }) {
  const [open, setOpen] = useState(false);
  const hasMessage = Boolean(agent.message?.trim());
  const label = agent.label || agent.app || "Subagent";
  const status =
    agent.status === "completed"
      ? "Completed"
      : agent.status === "running"
        ? "Working"
        : agent.status === "failed"
          ? "Failed"
          : agent.status === "cancelled"
            ? "Cancelled"
            : "Stalled";

  return (
    <section className="py-2" aria-label={label}>
      <button
        type="button"
        aria-expanded={hasMessage ? open : undefined}
        aria-controls={hasMessage ? `subagent-${agent.agentId}` : undefined}
        onClick={() => hasMessage && setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-2.5 text-left",
          hasMessage ? "cursor-pointer" : "cursor-default",
        )}
      >
        <Bot
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0",
            index % 2 ? "text-pink-500" : "text-aomi-accent",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-[13px]" title={label}>
          {label}
        </span>
        <SubagentStatus status={agent.status} label={status} />
      </button>
      {hasMessage && (
        <div
          id={`subagent-${agent.agentId}`}
          aria-hidden={!open}
          inert={!open}
          data-subagent-content={agent.agentId}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="text-aomi-muted overflow-hidden break-words pl-[26px] pt-2 text-[12px] leading-5 [&_.aui-md>*:first-child]:mt-0 [&_.aui-md>*:last-child]:mb-0 [&_.aui-md]:text-[12px] [&_.aui-md]:leading-5">
              <TextMessagePartProvider text={agent.message!} isRunning={false}>
                <MarkdownText />
              </TextMessagePartProvider>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SubagentStatus({
  status,
  label,
}: {
  status: TaskRunState["status"];
  label: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-5 shrink-0 place-items-center",
        status === "completed"
          ? "text-aomi-success"
          : status === "failed"
            ? "text-aomi-danger"
            : status === "running"
              ? "text-aomi-accent"
              : "text-aomi-muted",
      )}
    >
      {status === "completed" ? (
        <Check aria-hidden="true" className="size-4" strokeWidth={2.2} />
      ) : status === "running" ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <CircleAlert aria-hidden="true" className="size-4" />
      )}
    </span>
  );
}

function TransactionList({
  children,
  newestId,
  count,
}: {
  children: ReactNode;
  newestId?: string;
  count: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const reduceMotion = useReducedMotion();
  const [edges, setEdges] = useState({ top: false, bottom: false });
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [newestId]);
  const update = () => {
    const el = ref.current;
    if (el)
      setEdges({
        top: el.scrollTop > 2,
        bottom: el.scrollHeight - el.clientHeight - el.scrollTop > 2,
      });
  };
  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [children]);
  return (
    <div>
      <div className="relative">
        <m.div
          ref={ref}
          initial={false}
          animate={{
            height: Math.max(
              0,
              (showAll ? count : Math.min(3, count)) * 94 - 10,
            ),
          }}
          transition={{ duration: reduceMotion ? 0 : 0.26, ease: "easeOut" }}
          onScroll={update}
          tabIndex={0}
          role="region"
          aria-label="Transactions, newest first"
          className="aui-current-transactions overflow-y-auto overscroll-contain rounded-2xl outline-offset-2 [overflow-anchor:none]"
        >
          <div className="space-y-2.5">{children}</div>
        </m.div>
        <div
          aria-hidden="true"
          data-scroll-fade="top"
          className={cn(
            "from-aomi-raised pointer-events-none absolute inset-x-0 top-0 h-5 rounded-t-2xl bg-gradient-to-b to-transparent transition-opacity motion-reduce:transition-none",
            edges.top ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden="true"
          data-scroll-fade="bottom"
          className={cn(
            "from-aomi-raised pointer-events-none absolute inset-x-0 bottom-0 h-5 rounded-b-2xl bg-gradient-to-t to-transparent transition-opacity motion-reduce:transition-none",
            edges.bottom ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      {count > 3 && (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => {
            if (ref.current) ref.current.scrollTop = 0;
            setShowAll(!showAll);
          }}
          className="text-aomi-muted hover:text-aomi-fg mt-2 flex items-center gap-2 py-1 text-[12px] transition-colors motion-reduce:transition-none"
        >
          <span aria-hidden="true">⋯</span>
          {showAll
            ? "Show fewer transactions"
            : `Show all ${count} transactions`}
        </button>
      )}
    </div>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="py-4" aria-label={title}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 text-left text-[13px] font-medium"
      >
        {title}
        <span className="text-aomi-muted font-normal tabular-nums">
          {count}
        </span>
        <ChevronDown
          className={cn(
            "text-aomi-muted ml-auto size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        aria-hidden={!open}
        inert={!open}
        data-activity-group-content={title}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function InvokedSkills({ ids }: { ids: string[] }) {
  const { skills } = useSkillCatalog();
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const Icon = getSkillIcon(id) ?? Puzzle;
        const skill = skills?.find((skill) => skill.id === id);
        const label = skillLabel(
          skill ?? {
            name:
              id === "common_erc20"
                ? "ERC-20"
                : id === "lifi_swap"
                  ? "LI.FI"
                  : id,
          },
        );
        return (
          <span
            key={id}
            title={label}
            className="border-aomi-border bg-aomi-surface inline-flex max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-[12px]"
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

function TransactionCard({
  transaction: tx,
  reviewing = false,
  executing,
  active,
}: {
  transaction: ActivityTransaction;
  reviewing?: boolean;
  executing: boolean;
  active: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const label = friendlyTransactionLabel(tx.label, tx.kind);
  const Icon =
    tx.kind === "signature"
      ? FileSignature
      : (transactionSemantic(label, tx.kind).Icon ?? Layers3);
  const Chain = useMemo(
    () => (tx.chainId ? (getChainIcon(tx.chainId) ?? Circle) : Circle),
    [tx.chainId],
  );
  const network = tx.chainId
    ? (getChainInfo(tx.chainId)?.name ?? `Chain ${tx.chainId}`)
    : (tx.cluster ?? "Solana");
  const step = tx.stage === "staged" ? 0 : tx.stage === "committed" ? 2 : 1;
  const result = tx.action?.result;
  const leg =
    result?.status === "submitted"
      ? result.legs.find((leg) => leg.id === `leg_${(tx.actionIndex ?? 0) + 1}`)
      : undefined;
  const signed =
    leg?.status === "submitted" ||
    (result?.status === "signed" && result.outputs.length > 0);
  const rejected =
    leg?.status === "rejected" ||
    result?.status === "rejected" ||
    tx.action?.state === "rejected";
  const failed =
    tx.stage === "simulation-failed" ||
    (tx.action?.request.type !== "sign" &&
      (tx.action?.request.simulation.status === "failed" ||
        tx.action?.request.simulation.guards.some(
          (guard) => guard.status === "failed",
        )));
  const terminal = tx.action && tx.action.state !== "pending";
  const animating =
    (active || executing) && !signed && !rejected && !failed && !terminal;
  const animatedStep = executing ? 3 : step;
  const pendingStyle =
    !signed &&
    !rejected &&
    !terminal &&
    (active || tx.action?.state === "pending");
  return (
    <div
      className={cn(
        "group/tx bg-aomi-surface flex h-[84px] flex-col justify-center rounded-2xl border px-3 py-3 transition-colors duration-200 motion-reduce:transition-none",
        pendingStyle
          ? reviewing
            ? "border-aomi-accent/50 border-dashed"
            : "border-aomi-muted/40 border-dashed"
          : "border-aomi-border",
      )}
      data-pending={pendingStyle || undefined}
      aria-description={
        reviewing && pendingStyle
          ? "Included in the current wallet request"
          : undefined
      }
      data-testid="activity-transaction"
    >
      <div>
        <div className="flex items-center gap-2">
          <Icon className="text-aomi-muted size-4 shrink-0" />
          <span
            className="min-w-0 flex-1 truncate text-[13px] font-medium"
            title={label}
          >
            {label}
          </span>
          <span
            className="bg-aomi-surface-2 text-aomi-muted inline-flex max-w-[100px] items-center gap-1.5 rounded-full px-2 py-1 text-[10px]"
            title={network}
          >
            {createElement(Chain, { className: "size-3 shrink-0" })}
            <span className="truncate">{network}</span>
          </span>
        </div>
        <div
          className="mt-2.5 grid grid-cols-4 gap-1.5"
          aria-label={`Transaction preparation: ${tx.stage}; signing: ${rejected ? "rejected" : signed ? "signed" : "not signed"}`}
        >
          {["Stage", "Simulate", "Commit", "Signed"].map((name, index) => (
            <div
              key={name}
              title={
                index === 3
                  ? rejected
                    ? "Signing rejected"
                    : signed
                      ? "Signed"
                      : "Not yet signed"
                  : name
              }
            >
              <m.div
                data-active-phase={
                  (animating && index === animatedStep) || undefined
                }
                style={
                  animating && index === animatedStep
                    ? {
                        backgroundImage:
                          "linear-gradient(90deg, var(--aomi-accent-subtle), var(--aomi-accent), var(--aomi-accent-subtle))",
                        backgroundSize: "200% 100%",
                      }
                    : undefined
                }
                animate={{
                  backgroundPosition:
                    animating && index === animatedStep && !reduceMotion
                      ? ["0% 0%", "-200% 0%"]
                      : "0% 0%",
                }}
                transition={{
                  duration: 1.3,
                  ease: "linear",
                  repeat:
                    animating && index === animatedStep && !reduceMotion
                      ? Infinity
                      : 0,
                }}
                className={cn(
                  "h-[3px] rounded-full transition-colors motion-reduce:transition-none",
                  (index === 1 && failed) || (index === 3 && rejected)
                    ? "bg-aomi-danger"
                    : index === 1 && tx.kind === "signature"
                      ? "bg-aomi-border"
                      : index <= step || (index === 3 && signed)
                        ? "bg-aomi-accent"
                        : "bg-aomi-border",
                )}
              />
              <span className="text-aomi-muted mt-1.5 block text-[10px] leading-3">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
