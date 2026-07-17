/**
 * Lucide-name → Hugeicons free (Stroke Rounded) icon map for portal migration.
 *
 * Rico target: Hugeicons **Solid**. Free npm only ships Stroke Rounded
 * (`@hugeicons/core-free-icons`). Pro solid packages live on the private
 * Hugeicons registry (`@hugeicons-pro/core-solid-rounded`, etc.). When Pro is
 * licensed, re-point these imports and keep the Lucide-shaped export names.
 */
import type { IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowLeft01Icon,
  BookOpen01Icon,
  BotIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleIcon,
  Clock01Icon,
  Copy01Icon,
  Delete02Icon,
  ExternalLinkIcon,
  GitCommitHorizontalIcon,
  GithubIcon,
  InformationCircleIcon,
  Key01Icon,
  Layers01Icon,
  Loading03Icon,
  LockIcon,
  Logout01Icon,
  PlayIcon,
  Plug01Icon,
  PlusSignIcon,
  PowerOffIcon,
  RefreshIcon,
  ReloadIcon,
  RocketIcon,
  SecurityCheckIcon,
  Settings01Icon,
  UserCircleIcon,
  CancelCircleIcon,
} from "@hugeicons/core-free-icons";

/** Named like common Lucide exports so call sites migrate with minimal churn. */
export const Icons = {
  AlertTriangle: Alert02Icon,
  ArrowLeft: ArrowLeft01Icon,
  BookOpen: BookOpen01Icon,
  Bot: BotIcon,
  CheckCircle2: CheckmarkCircle02Icon,
  ChevronDown: ChevronDownIcon,
  ChevronRight: ChevronRightIcon,
  Circle: CircleIcon,
  CircleUserRound: UserCircleIcon,
  Clock3: Clock01Icon,
  Copy: Copy01Icon,
  ExternalLink: ExternalLinkIcon,
  GitCommitHorizontal: GitCommitHorizontalIcon,
  Github: GithubIcon,
  Info: InformationCircleIcon,
  KeyRound: Key01Icon,
  Layers: Layers01Icon,
  Loader2: Loading03Icon,
  Lock: LockIcon,
  LogOut: Logout01Icon,
  Play: PlayIcon,
  Plus: PlusSignIcon,
  PowerOff: PowerOffIcon,
  RefreshCw: RefreshIcon,
  RotateCcw: ReloadIcon,
  Rocket: RocketIcon,
  Settings: Settings01Icon,
  ShieldCheck: SecurityCheckIcon,
  Trash2: Delete02Icon,
  Unplug: Plug01Icon,
  X: Cancel01Icon,
  XCircle: CancelCircleIcon,
} as const satisfies Record<string, IconSvgElement>;

export type PortalIconName = keyof typeof Icons;
