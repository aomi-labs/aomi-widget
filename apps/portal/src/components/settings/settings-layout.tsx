"use client";

import { useState } from "react";
import { SettingsSidebar, SettingsCategory } from "./settings-sidebar";
import { GeneralSettings } from "./general-settings";
import { AppsSettings } from "./apps-settings";
import { AppKeys } from "./app-keys";
import { Secrets } from "./secrets";
import { Byok } from "./byok";

export function SettingsLayout() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />;
      case "apps":
        return <AppsSettings />;
      case "app-keys":
        return <AppKeys />;
      case "secrets":
        return <Secrets />;
      case "byok":
        return <Byok />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="h-screen w-full flex bg-background">
      <SettingsSidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
