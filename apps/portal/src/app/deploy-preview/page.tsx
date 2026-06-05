// LOCAL preview-only route to view the Deploy settings tab without the wallet
// provider chain. NOT committed — see git: deploy-preview was removed from the PR.
import { DeploySettings } from "@portal/components/settings/deploy-settings";

export default function DeployPreviewPage() {
  return (
    <div className="bg-background min-h-screen px-8 py-10 lg:px-12">
      <div className="mx-auto w-full max-w-4xl">
        <DeploySettings />
      </div>
    </div>
  );
}
