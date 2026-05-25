"use client";

import {
  Settings,
  Layers,
  ArrowLeft,
  KeyRound,
  Lock,
  Unplug,
} from "lucide-react";
import Link from "next/link";

export type SettingsCategory =
  | "general"
  | "apps"
  | "app-keys"
  | "secrets"
  | "byok";

interface SettingsSidebarProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}

const categories: Array<{
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "general", label: "General", icon: Settings },
  { id: "apps", label: "Usage", icon: Layers },
  { id: "app-keys", label: "App Keys", icon: KeyRound },
  { id: "secrets", label: "Secrets", icon: Lock },
  { id: "byok", label: "BYOK", icon: Unplug },
];

const AomiLogo = ({ className }: { className?: string }) => (
  <svg
    width="362"
    height="362"
    viewBox="0 0 362 362"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M321.778 94.2349C321.778 64.4045 297.595 40.2222 267.765 40.2222C237.935 40.2222 213.752 64.4045 213.752 94.2349C213.752 124.065 237.935 148.248 267.765 148.248C297.595 148.248 321.778 124.065 321.778 94.2349ZM362 94.2349C362 146.279 319.81 188.47 267.765 188.47C215.721 188.47 173.53 146.279 173.53 94.2349C173.53 42.1904 215.721 1.33271e-06 267.765 0C319.81 0 362 42.1904 362 94.2349Z"
      fill="currentColor"
    />
    <path
      d="M181 0C184.792 0 188.556 0.116399 192.289 0.346221C189.506 2.74481 186.833 5.26892 184.28 7.90977C170.997 20.759 160.669 36.6452 154.42 54.4509C95.7682 66.7078 51.7143 118.709 51.7143 181C51.7143 252.403 109.597 310.286 181 310.286C243.292 310.286 295.291 266.231 307.547 207.58C325.364 201.327 341.259 190.99 354.113 177.695C356.745 175.149 359.261 172.486 361.653 169.71C361.883 173.444 362 177.208 362 181C362 280.964 280.964 362 181 362C81.0365 362 0 280.964 0 181C0 81.0365 81.0365 0 181 0Z"
      fill="currentColor"
    />
  </svg>
);

export function SettingsSidebar({
  activeCategory,
  onCategoryChange,
}: SettingsSidebarProps) {
  return (
    <div className="bg-sidebar flex h-full w-64 flex-col overflow-y-auto">
      {/* Header with logo */}
      <div className="p-5">
        <Link
          href="https://aomi.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center"
        >
          <AomiLogo className="text-sidebar-foreground size-6" />
        </Link>
      </div>

      {/* Back to chat */}
      <div className="mb-2 px-3">
        <Link
          href="/"
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground flex items-center gap-2 px-3 py-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to chat</span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="space-y-1 px-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
