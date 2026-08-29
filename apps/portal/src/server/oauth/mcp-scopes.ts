import type { ApiPrincipal } from "./principal";
import { ApiPrincipalError } from "./principal";

const AGENT_READ = new Set(["aomi_check", "aomi_list_sessions"]);
const AGENT_WRITE = new Set(["aomi_chat", "aomi_interrupt"]);
const PIPELINE_EXECUTE = new Set(["aomi_call_tool", "aomi_run"]);

export async function narrowMcpPrincipal(
  request: Request,
  principal: ApiPrincipal,
  kind: "agent" | "pipeline",
): Promise<ApiPrincipal> {
  const transportScope = kind === "agent" ? "mcp:agent" : "mcp:pipeline";
  const required = [transportScope];
  const message = (await request
    .clone()
    .json()
    .catch(() => null)) as {
    method?: unknown;
    params?: { name?: unknown };
  } | null;
  const tool =
    message?.method === "tools/call" && typeof message.params?.name === "string"
      ? message.params.name
      : undefined;
  if (tool && kind === "agent") {
    if (AGENT_READ.has(tool)) required.push("agent:read");
    if (AGENT_WRITE.has(tool)) required.push("agent:write");
  }
  if (tool && kind === "pipeline") {
    required.push(
      PIPELINE_EXECUTE.has(tool) ? "pipeline:execute" : "pipeline:catalog",
    );
  }
  if (
    tool &&
    request.headers.has("payment-signature") &&
    (kind === "pipeline" ? PIPELINE_EXECUTE.has(tool) : AGENT_WRITE.has(tool))
  ) {
    required.push("payments:submit");
  }
  for (const scope of required) {
    if (!principal.scopes.includes(scope)) {
      throw new ApiPrincipalError(403, "insufficient_scope", required);
    }
  }
  const scopes = [...required];
  if (
    tool &&
    principal.scopes.includes("custody:delegate") &&
    (kind === "pipeline" ? PIPELINE_EXECUTE.has(tool) : AGENT_WRITE.has(tool))
  ) {
    scopes.push("custody:delegate");
  }
  return { ...principal, scopes };
}
