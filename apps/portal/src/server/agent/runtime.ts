import "server-only";

import { AgentFacade } from "./facade";
import { CursorCodec } from "./cursor";
import type { PublicPrincipal } from "./internal-principal";
import { RustAgentKernel } from "./kernel";

export function createAgentFacade(principal: PublicPrincipal): AgentFacade {
  const secret =
    process.env.AOMI_AGENT_CURSOR_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) throw new Error("AOMI_AGENT_CURSOR_SECRET is required");
  return new AgentFacade(
    principal,
    new RustAgentKernel(principal),
    new CursorCodec(Buffer.from(secret)),
  );
}
