import Link from "next/link";
import { notFound } from "next/navigation";

import { getSettingsSection, settingsSections } from "../settings-data";
import { SettingsBillingPanel } from "../settings-billing-panel";
import { SettingsSecretsPanel } from "../settings-secrets-panel";

export function generateStaticParams() {
  return settingsSections.map((section) => ({ section: section.slug }));
}

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = getSettingsSection(slug);
  if (!section) notFound();

  const Icon = section.icon;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-dim" />
          <h1 className="text-2xl font-semibold text-foreground">
            {section.title}
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-subtle">{section.description}</p>
      </div>

      {slug === "secrets" ? (
        <SettingsSecretsPanel />
      ) : slug === "billing" ? (
        <SettingsBillingPanel />
      ) : (
        <section className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="text-sm font-medium text-foreground">
            {section.enabled ? "About" : "Coming later"}
          </div>
          <p className="mt-2 text-[13px] text-dim">{section.detail}</p>
          {section.actionHref ? (
            <Link
              href={section.actionHref}
              className="mt-4 inline-flex h-8 items-center rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground transition hover:bg-brand-hover"
            >
              {section.actionLabel}
            </Link>
          ) : null}
        </section>
      )}
    </div>
  );
}
