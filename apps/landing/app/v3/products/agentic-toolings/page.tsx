import type { Metadata } from "next";
import { AgentToolingsPageContent } from "../../../v2/products/cli-mcp/page";
import toolingStyles from "../../../v2/products/cli-mcp/agentic-surfaces.module.css";

export const metadata: Metadata = {
  title: "Agent Toolings | Aomi V3",
  description:
    "Connect existing agents through Skills, hosted MCP, or the Aomi CLI over one account-owned execution harness.",
  robots: { index: false, follow: false },
};

export default function AgentToolingsPage() {
  return (
    <div className={toolingStyles.v3Tokens}>
      <AgentToolingsPageContent productName="Agent Toolings" />
    </div>
  );
}
