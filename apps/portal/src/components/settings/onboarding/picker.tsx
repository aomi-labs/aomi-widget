"use client";

import { Zap, Wrench, ArrowRight } from "lucide-react";
import type { OnboardingPath } from "@portal/lib/onboarding";

type CardSpec = {
  path: OnboardingPath;
  icon: typeof Zap;
  title: string;
  blurb: string;
  grants: string;
};

const CARDS: CardSpec[] = [
  {
    path: "oneshot",
    icon: Zap,
    title: "One-click",
    blurb:
      "We create the repo in your account and deploy it for you. Fastest path to a live agent.",
    grants: "broad — can create repositories",
  },
  {
    path: "bootstrap",
    icon: Wrench,
    title: "Fork & customize",
    blurb:
      "You make your own repo from our template, then we deploy it. A few more steps, narrower access.",
    grants: "narrow — one repo, pull requests & checks",
  },
];

export function Picker({
  onChoose,
}: {
  onChoose: (path: OnboardingPath) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Deploy an example agent
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-5">
          Get a working Aomi agent running in your account, then clone it and
          make it yours. Pick how much access you want to grant.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <button
            key={card.path}
            type="button"
            onClick={() => onChoose(card.path)}
            className="border-input bg-background hover:border-foreground/30 hover:bg-muted/30 group flex flex-col gap-3 rounded-3xl border p-6 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <card.icon className="text-foreground h-5 w-5" />
              <span className="text-foreground text-lg font-medium">
                {card.title}
              </span>
            </div>
            <p className="text-muted-foreground min-h-[3.5rem] text-sm leading-5">
              {card.blurb}
            </p>
            <div className="text-muted-foreground text-xs">
              Grants:{" "}
              <span className="text-foreground font-medium">{card.grants}</span>
            </div>
            <span className="text-foreground mt-1 inline-flex items-center gap-1 text-sm font-medium">
              Choose
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
