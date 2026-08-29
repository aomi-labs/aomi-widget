import { Aomi } from "@aomi-labs/client";

const baseUrl = process.env.AOMI_BASE_URL?.trim() || "http://localhost:3000";

// Guest mode is the SDK default. The first request creates an anonymous
// session; the client then keeps and reuses its official session cookie.
const aomi = new Aomi({ baseUrl });
const sessionId = crypto.randomUUID();

const result = await aomi.agent.run(
  "Introduce Aomi in one sentence for a TypeScript developer.",
  { sessionId },
);
const reply = [...result.messages]
  .reverse()
  .find((message) => message.sender === "agent")?.content;

console.log(`Guest Agent session: ${result.sessionId}`);
console.log(reply ?? "The Agent returned no text.");
