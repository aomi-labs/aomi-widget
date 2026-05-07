"use client";

import { useState } from "react";
import { SettingsSidebar, SettingsCategory } from "./settings-sidebar";
import { GeneralSettings } from "./general-settings";
import { AppsSettings } from "./apps-settings";
import { ApiKeySettings } from "./api-key-settings";
import { PaymentSettings } from "./payment-settings";

export function SettingsLayout() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />;
      case "apps":
        return <AppsSettings />;
      case "api-keys":
        return <ApiKeySettings />;
      case "payment":
        return <PaymentSettings />;
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
