import { SettingsRuntimeProvider } from "@portal/components/providers/settings-runtime-provider";
import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { DeployDashboard } from "@portal/features/launch/components";

export default function DeploymentsPage() {
  return (
    <SettingsRuntimeProvider>
      <main className="bg-background min-h-screen px-6 py-8 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <ErrorBoundary>
            <DeployDashboard />
          </ErrorBoundary>
        </div>
      </main>
    </SettingsRuntimeProvider>
  );
}
