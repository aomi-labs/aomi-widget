"use client";

import { useState } from "react";
import { SettingsSidebar, SettingsCategory } from "./settings-sidebar";
import { GeneralSettings } from "./general-settings";
import { AppsSettings } from "./apps-settings";
import { AppKeys } from "./app-keys";
import { Bots } from "./bots";
import { Secrets } from "./secrets";
import { Byok } from "./byok";

export function SettingsLayout() {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general");

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />;
      case "apps":
        return <AppsSettings />;
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
