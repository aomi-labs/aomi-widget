import { McpAuthorizeResume } from "@portal/components/shell/mcp-authorize-resume";
import { PortalAomiFrame } from "@portal/components/shell/portal-aomi-frame";
import { SettingsShell } from "@portal/components/settings/settings-shell";

export default function Home() {
  return (
    <SettingsShell>
      <McpAuthorizeResume />
      <PortalAomiFrame />
    </SettingsShell>
  );
}
