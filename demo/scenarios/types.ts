/**
 * A demo scenario: one prompt, one recorded master, three usable cuts.
 *
 * The studio records a single high-fidelity take per scenario and emits markers
 * alongside it. Short-form cuts (social loop, docs loop) are derived from those
 * markers, never re-shot — re-shooting is how demo libraries drift out of sync
 * with each other and with the product.
 */

export type Scenario = {
  /** Stable slug; names the output directory. */
  id: string;
  /** One line, for the catalog and the video description. */
  title: string;
  /**
   * Id from product-mono's story catalog
   * (docs/topics/testing-automation/facts/aomi-transact-automation.md), when
   * this scenario rides on an already-passing test path. Scenarios with a story
   * id are known to work; ones without need their path proven first.
   */
  story?: string;
  /** EVM chain ids this scenario touches; each is reforked before the take. */
  chains: number[];
  /**
   * SDK apps this scenario needs, by name (`zerox`, `polymarket-rewards`, …).
   * Empty means the scenario runs on built-in protocol skills alone — staking
   * via Lido / Rocket Pool / Ether.fi needs no app at all.
   *
   * These are resolved from a LOCAL aomi-sdk build, not from a GitHub release.
   * That is the point: it lets us record an integration that has not shipped
   * yet — write the app, record the demo, no release cycle. It also keeps the
   * backend from reconciling the whole production catalog, which is what makes
   * a local backend unusable today.
   */
  apps: string[];
  /**
   * Conversation turns, typed in order; each waits for the agent's response to
   * complete before the next is sent. One entry = a single-shot demo. Most
   * execution demos need two: the ask, then the go-ahead — a real agent
   * proposes before it spends, and the approval beat is part of the story.
   */
  prompts: string[];
  /**
   * The frame that sells it. Free text — it tells whoever cuts the video what
   * they are looking for, and it tells us whether the scenario has a point.
   */
  moneyShot: string;
  /**
   * Upper bound for the agent's turn. Not a sleep: the recorder waits on the
   * streaming indicator and only uses this to fail a hung take.
   */
  timeoutMs?: number;
  /**
   * True when the scenario is supposed to put a transaction on chain. The
   * recorder then fails the take if the fork mined no block — which is how we
   * catch "the agent explained what it would do" masquerading as a demo.
   */
  expectsExecution?: boolean;
};

/** Beats worth timestamping so cuts can be derived from one master. */
export type MarkerName =
  | "page-ready"
  | "prompt-typed"
  | "prompt-submitted"
  | "trace-appeared"
  | "response-complete";

export type Marker = {
  name: MarkerName;
  /** Milliseconds from the start of the video, not wall-clock. */
  offsetMs: number;
};

export type CaptureResult = {
  scenarioId: string;
  videoPath: string;
  markers: Marker[];
  /** Text of the final assistant message, for eyeballing whether it's usable. */
  finalMessage: string;
};
