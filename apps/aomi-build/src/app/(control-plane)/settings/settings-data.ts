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
    description: "Workspace identity and local profile defaults.",
    icon: UserRound,
    enabled: true,
    status: "available",
    detail:
      "Useful as the account entry point. Real profile and organization persistence still needs an account backend.",
  },
  {
    slug: "secrets",
    title: "Secrets",
    description:
      "Per-project environment values. Pick a project to manage its secrets.",
    icon: KeyRound,
    enabled: true,
    status: "project-scoped",
    detail:
      "Secrets live on each project Environment tab. There is no account-wide secret store — choose a project below.",
  },
  {
    slug: "notifications",
    title: "Notifications",
    description: "Alert channels, delivery rules, and thresholds.",
    icon: Bell,
    enabled: false,
    status: "planned",
    detail:
      "Notification preferences need backend storage and delivery channels before this can be actionable.",
  },
  {
    slug: "appearance",
    title: "Appearance",
    description: "Theme and display preferences.",
    icon: Palette,
    enabled: false,
    status: "planned",
    detail:
      "The shell currently uses the dark Aomi Build theme. User theme persistence is not implemented.",
  },
  {
    slug: "integrations",
    title: "Integrations",
    description: "GitHub app, provider keys, and external services.",
    icon: Settings,
    enabled: false,
    status: "planned",
    detail:
      "GitHub sign-in is wired for deployments, but a full integration-management page is not implemented.",
  },
  {
    slug: "billing",
    title: "Billing",
    description:
      "Credits, plans, and invoices — when wired. Spend today is on Usage.",
    icon: CreditCard,
    enabled: true,
    status: "planned",
    detail:
      "Invoices and plan management are not connected yet. See Operate → Usage for credit spend; set API keys on Project → Environment (via Account → Secrets).",
  },
  {
    slug: "bots",
    title: "Bot setup",
    description: "Telegram and deployment notification bots.",
    icon: Bot,
    enabled: false,
    status: "planned",
    detail:
      "Bot configuration needs backend support before this can be actionable.",
  },
  {
    slug: "wallets",
    title: "Wallets",
    description: "Signer and wallet connection management.",
    icon: WalletCards,
    enabled: false,
    status: "planned",
    detail:
      "Wallet management belongs here, but the current deployments flow does not expose this account API yet.",
  },
  {
    slug: "observability",
    title: "Observability",
    description: "Metrics export, alerts, and Grafana links.",
    icon: Activity,
    enabled: false,
    status: "planned",
    detail:
      "Runtime metrics and alert exports are not wired in the current frontend/backend contract.",
  },
  {
    slug: "danger",
    title: "Danger zone",
    description: "Workspace deletion, transfer, and access revocation.",
    icon: ShieldAlert,
    enabled: false,
    status: "planned",
    detail:
      "Destructive workspace operations need real account auth and audit logging before we expose them.",
  },
];

export function getSettingsSection(slug: string) {
  return settingsSections.find((section) => section.slug === slug);
}
