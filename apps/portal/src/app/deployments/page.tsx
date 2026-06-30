import { SettingsRuntimeProvider } from "@portal/components/providers/settings-runtime-provider";
import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { DeploymentConsole } from "@portal/features/launch/components";

export default function DeploymentsPage() {
  return (
    <SettingsRuntimeProvider>
      <ErrorBoundary>
        <DeploymentConsole />
      </ErrorBoundary>
    </SettingsRuntimeProvider>
  );
}
