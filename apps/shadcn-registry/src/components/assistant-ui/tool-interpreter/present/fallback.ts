import type { LucideIcon } from "lucide-react";

import {
  DEFAULT_TOOL_ICON,
  TOPIC_ICON_REGISTRY,
} from "@/components/assistant-ui/tool-registry";

export const iconFromTopic = (topic: string): LucideIcon | null => {
  const lower = topic.toLowerCase();
  for (const [pattern, icon] of TOPIC_ICON_REGISTRY) {
    if (pattern.test(lower)) return icon;
  }
  return null;
};

export const fallbackIcon = (topic: string): LucideIcon =>
  iconFromTopic(topic) ?? DEFAULT_TOOL_ICON;
