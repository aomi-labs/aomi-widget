import {
  Aomi,
  type AgentRun,
  type MessageEvent,
  type SessionSnapshot,
} from "@aomi-labs/client";

const baseUrl = process.env.AOMI_BASE_URL?.trim() || "http://127.0.0.1:3000";
const aomi = new Aomi({ baseUrl });
const sessionId = crypto.randomUUID();

console.log(`Portal: ${baseUrl}`);
console.log(`Session: ${sessionId}`);

const first = await turn(
  "Remember that the demo word is cobalt. Reply with only: remembered.",
);
console.log(`Agent: ${lastAgentText(first)}`);

const second = await turn("What is the demo word?");
console.log(`Agent: ${lastAgentText(second)}`);

await optionalPipelineSimulation();

async function turn(prompt: string): Promise<readonly MessageEvent[]> {
  console.log(`\nUser: ${prompt}`);
  const run = aomi.agent.run(prompt, { sessionId });
  const unsubscribe = trace(run);
  run.on("action", (action) => {
    console.log(`Action ${action.id} requires host review:`);
    console.log(JSON.stringify(action.request, null, 2));
    void run.reject(action.id, "Headless example does not execute wallets");
  });
  try {
    return (await run.result()).messages;
  } finally {
    unsubscribe();
  }
}

function trace(run: AgentRun): () => void {
  let sequence = -1;
  return run.session.subscribe(() => {
    const snapshot = run.session.getSnapshot();
    for (const event of snapshot.events) {
      if (event.sequence <= sequence) continue;
      sequence = event.sequence;
      printEvent(event.type, snapshot);
    }
  });
}

function printEvent(type: string, snapshot: SessionSnapshot): void {
  const state = snapshot.turnState ?? "not_started";
  console.log(
    `  event=${type} state=${state} cursor=${snapshot.cursor ?? "none"}`,
  );
}

function lastAgentText(messages: readonly MessageEvent[]): string {
  return (
    [...messages]
      .reverse()
      .find((message) => message.sender === "agent")
      ?.content.trim() || "(no agent message)"
  );
}

async function optionalPipelineSimulation(): Promise<void> {
  const app = process.env.AOMI_PIPELINE_APP?.trim();
  const operation = process.env.AOMI_PIPELINE_OPERATION?.trim();
  const encodedArguments = process.env.AOMI_PIPELINE_ARGS?.trim();
  if (!app || !operation || !encodedArguments) {
    console.log("\nPipeline: skipped (no operation configured)");
    return;
  }

  const argumentsValue: unknown = JSON.parse(encodedArguments);
  if (
    argumentsValue === null ||
    Array.isArray(argumentsValue) ||
    typeof argumentsValue !== "object"
  ) {
    throw new TypeError("AOMI_PIPELINE_ARGS must be a JSON object");
  }

  const build = await aomi.pipeline
    .app(app)
    .build(operation, argumentsValue as Record<string, unknown>);
  console.log(`\nPipeline: ${app}/${operation}`);
  console.log(`Status: ${build.status}`);
  console.log(`Simulation: ${build.simulation.status}`);
  console.log("Commit: skipped");
}
