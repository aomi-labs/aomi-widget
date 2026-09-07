"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  skillLabel,
  useSkillCatalog,
} from "../../lib/capabilities/skill-catalog";
import {
  useMemo,
  useEffect,
  useState,
  useRef,
  createElement,
  type ReactNode,
} from "react";
import {
  Bot,
  ChevronDown,
  Circle,
  FileSignature,
  Layers3,
  Puzzle,
  X,
  PanelRight,
} from "lucide-react";
import { cn, getChainInfo, useAomiRuntime } from "@aomi-labs/react";
import { getChainIcon } from "../icons/chain-map";
import { getSkillIcon } from "../icons/skills";
import { selectActivity, type ActivityTransaction } from "./model";
import { friendlyTransactionLabel, transactionSemantic } from "./presentation";
import { WalletReview } from "./wallet-review";

export function ActivitySidebar() {
  const { threadViewKey } = useAomiRuntime();
  return <ActivitySidebarContent key={threadViewKey} />;
}

function ActivitySidebarContent() {
  const { events, pendingActions, actionAttempts, threadViewKey, isRunning } =
    useAomiRuntime();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const layoutParent = useRef<HTMLElement | null>(null);
  useEffect(
    () => () => {
      layoutParent.current?.style.removeProperty("--activity-chat-max-width");
    },
    [],
  );
  const closeDrawer = () => {
    setDrawer(false);
    toggleRef.current?.focus();
  };
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
  return (
    <>
      {hasActivity && (
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={drawer}
          aria-label={pending ? "Review transactions" : "Open chat activity"}
          onClick={() => setDrawer(!drawer)}
          className="@[1100px]:hidden border-aomi-border bg-aomi-raised text-aomi-fg absolute right-4 top-2 z-20 flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] shadow-sm"
        >
          <PanelRight className="size-3.5" />
          {pending ? "Review transactions" : "Activity"}
        </button>
      )}
      <AnimatePresence>
        {hasActivity && (
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
              if (event.key === "Escape" && drawer) closeDrawer();
            }}
            className={cn(
              "aui-activity-sidebar @[1100px]:relative @[1100px]:block @[1100px]:top-0 @[1100px]:max-h-full absolute right-0 top-12 z-30 max-h-[calc(100%-3rem)] max-w-full shrink-0 overflow-y-auto overflow-x-hidden",
              drawer ? "block" : "hidden",
            )}
          >
            <div className="w-[352px] max-w-[100cqw] py-4 pl-3 pr-6">
              <button
                type="button"
                onClick={closeDrawer}
                className="@[1100px]:hidden border-aomi-border bg-aomi-raised mb-2 ml-auto flex items-center gap-1 rounded-full border px-2 py-1 text-[12px]"
              >
                <X className="size-3.5" />
                Close activity
              </button>
              <div className="border-aomi-border bg-aomi-raised divide-aomi-border divide-y rounded-3xl border px-4">
                {activity.agents.length > 0 && (
                  <Group title="Subagents" count={activity.agents.length}>
                    {activity.agents.map((agent, index) => (
                      <details key={agent.agentId} className="group py-2">
                        <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
                          <Bot
                            className={cn(
                              "size-4 shrink-0",
                              index % 2 ? "text-pink-500" : "text-aomi-accent",
                            )}
                          />
                          <span
                            className="min-w-0 flex-1 truncate text-[13px]"
                            title={agent.label || agent.app}
                          >
                            {agent.label || agent.app || "Subagent"}
                          </span>
                          <span
                            className={cn(
                              "text-[11px]",
                              agent.status === "completed"
                                ? "text-aomi-success"
                                : agent.status === "failed"
                                  ? "text-aomi-danger"
                                  : "text-aomi-muted",
                            )}
                          >
                            {agent.status === "completed"
                              ? "Done"
                              : agent.status === "running"
                                ? "Working"
                                : agent.status}
                          </span>
                        </summary>
                        <div className="text-aomi-muted mt-2 space-y-2 pl-[26px] text-[12px]">
                          {agent.phase && <p>{agent.phase}</p>}
                          {agent.message && (
                            <p className="break-words">{agent.message}</p>
                          )}
                          {agent.steps.map((step) => (
                            <p key={step.childSeq} className="break-words">
                              {step.kind === "note"
                                ? step.text
                                : step.toolName.replaceAll("_", " ")}
                            </p>
                          ))}
                        </div>
                      </details>
                    ))}
                  </Group>
                )}
                {activity.skills.length > 0 && (
                  <Group title="Skills invoked" count={activity.skills.length}>
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
  return (
    <details open className="group/activity py-4">
      <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-aomi-muted font-normal tabular-nums">
          {count}
        </span>
        <ChevronDown className="text-aomi-muted ml-auto size-3.5 transition-transform group-open/activity:rotate-180 motion-reduce:transition-none" />
      </summary>
      {children}
    </details>
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
