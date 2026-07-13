import {
  Activity,
  Bell,
  Bot,
  CreditCard,
  KeyRound,
  Palette,
  Settings,
  ShieldAlert,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type SettingsSection = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  status: "available" | "project-scoped" | "planned";
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

export const settingsSections: SettingsSection[] = [
  {
    slug: "general",
    title: "General",
    description: "Profile and workspace defaults.",
    icon: UserRound,
    enabled: true,
    status: "available",
    detail: "Account profile persistence is not built yet.",
  },
  {
    slug: "secrets",
    title: "Secrets",
    description: "Per-project environment values.",
    icon: KeyRound,
    enabled: true,
    status: "project-scoped",
    detail: "Open a project Environment tab to edit secrets.",
  },
  {
    slug: "notifications",
    title: "Notifications",
    description: "Alert channels and thresholds.",
    icon: Bell,
    enabled: false,
    status: "planned",
    detail: "Not built yet.",
  },
  {
    slug: "appearance",
    title: "Appearance",
    description: "Theme and display.",
    icon: Palette,
    enabled: false,
    status: "planned",
    detail: "Not built yet. Build uses the dark shell theme.",
  },
  {
    slug: "integrations",
    title: "Integrations",
    description: "External bots and services.",
    icon: Settings,
    enabled: false,
    status: "planned",
    detail: "Use Account → Integrations in the sidebar.",
  },
  {
    slug: "billing",
    title: "Billing",
    description: "Spend and payment setup. Usage is under Operate.",
    icon: CreditCard,
    enabled: true,
    status: "planned",
    detail:
      "Invoices are not in Build yet. See Operate → Usage for spend.",
  },
  {
    slug: "bots",
    title: "Bot setup",
    description: "Telegram and deploy bots.",
    icon: Bot,
    enabled: false,
    status: "planned",
    detail: "Not built yet.",
  },
  {
    slug: "wallets",
    title: "Wallets",
    description: "Signer and wallet connections.",
    icon: WalletCards,
    enabled: false,
    status: "planned",
    detail: "Not built yet.",
  },
  {
    slug: "observability",
    title: "Observability",
    description: "Metrics and alert exports.",
    icon: Activity,
    enabled: false,
    status: "planned",
    detail: "Not built yet.",
  },
  {
    slug: "danger",
    title: "Danger zone",
    description: "Delete or transfer this workspace.",
    icon: ShieldAlert,
    enabled: false,
    status: "planned",
    detail: "Not built yet.",
  },
];

export function settingsStatusLabel(status: SettingsSection["status"]) {
  if (status === "available") return "Available";
  if (status === "project-scoped") return "Project-scoped";
  return "Planned";
}

export function getSettingsSection(slug: string) {
  return settingsSections.find((section) => section.slug === slug);
}
