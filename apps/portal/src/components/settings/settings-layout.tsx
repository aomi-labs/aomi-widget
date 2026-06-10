"use client";

import { useEffect, useState } from "react";
import { SettingsSidebar, SettingsCategory } from "./settings-sidebar";
import { GeneralSettings } from "./general-settings";
import { AppsSettings } from "./apps-settings";
import { DeploySettings } from "./deploy-settings";
import { Onboarding } from "./onboarding/onboarding";
import { AppKeys } from "./app-keys";
import { Bots } from "./bots";
import { Secrets } from "./secrets";
import { Byok } from "./byok";

export function SettingsLayout() {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general");

  // Returning from a GitHub App install lands on /settings?installation_id=…
  // (category is React state, not the URL), so open the Deploy tab where the
  // onboarding flow can pick the redirect up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("installation_id")) {
      setActiveCategory("deploy");
    }
  }, []);

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />;
      case "apps":
        return <AppsSettings />;
      case "deploy":
        // Onboarding picker + two-path wizards on top; the manual / advanced
        // deploy flow is preserved below, unchanged.
        return (
          <div className="min-w-0 space-y-8">
            <Onboarding />
            <hr className="border-input" />
            <p className="text-muted-foreground pl-4 text-xs uppercase tracking-wide">
              Manual / advanced deploy
            </p>
            <DeploySettings />
          </div>
        );
      case "app-keys":
        return <AppKeys />;
      case "bots":
        return <Bots />;
      case "secrets":
        return <Secrets />;
      case "byok":
        return <Byok />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="bg-background flex h-screen w-full min-w-0">
      <SettingsSidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-10 lg:px-12">
        <div className="mx-auto w-full min-w-0 max-w-4xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
