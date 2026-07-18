import { SettingsLayout } from "@portal/components/settings/settings-layout";
import { SettingsRuntimeProvider } from "@portal/components/providers/settings-runtime-provider";

export default function SettingsPage() {
  return (
    <SettingsRuntimeProvider>
      <SettingsLayout />
    </SettingsRuntimeProvider>
  );
}
