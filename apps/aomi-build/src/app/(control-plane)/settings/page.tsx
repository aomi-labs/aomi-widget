import { SettingsCard } from "./settings-card";
import { settingsSections } from "./settings-data";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold">Settings</h1>
        <p className="text-subtle max-w-2xl text-sm">
          Account and workspace controls for the current GitHub-scoped Aomi
          Build session. Only sections backed by current app behavior are
          interactive.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {settingsSections.map((section) => (
          <SettingsCard key={section.slug} section={section} />
        ))}
      </section>
    </div>
  );
}
