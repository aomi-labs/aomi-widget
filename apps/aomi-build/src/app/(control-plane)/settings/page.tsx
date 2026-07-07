import { SettingsCard } from "./settings-card";
import { settingsSections } from "./settings-data";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
      <div className="space-y-2">
        <p className="text-[12px] uppercase tracking-wide text-dim">Account</p>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="max-w-2xl text-sm text-subtle">
          Account and workspace controls from the mock are kept here as the
          target IA. Only sections backed by the current app behavior are
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
