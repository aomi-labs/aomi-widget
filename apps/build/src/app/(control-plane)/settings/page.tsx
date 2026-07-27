import { SettingsCard } from "./settings-card";
import { settingsSections } from "./settings-data";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-foreground text-2xl font-normal tracking-tight">
          Settings
        </h1>
        <p className="text-subtle max-w-2xl text-sm">
          Account controls for this GitHub session. Live sections work today;
          others stay listed as Soon.
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
