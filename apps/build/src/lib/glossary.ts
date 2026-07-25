/**
 * Shared product language for Aomi Build.
 * One job, one name — keep UI copy aligned with these terms.
 */
export const BUILD_GLOSSARY = {
  project: {
    term: "Project",
    meaning: "A GitHub repository connected to Build.",
  },
  app: {
    term: "App",
    meaning: "A deployable unit inside a project.",
  },
  deployment: {
    term: "Deployment",
    meaning: "A published build of an app that can go live.",
  },
  environment: {
    term: "Environment",
    meaning: "API keys and secrets for an app (not Billing).",
  },
} as const;

export type GlossaryKey = keyof typeof BUILD_GLOSSARY;

export function glossaryLine(
  keys: GlossaryKey[] = ["project", "app", "deployment", "environment"],
): string {
  return keys
    .map((key) => {
      const entry = BUILD_GLOSSARY[key];
      return `${entry.term}: ${entry.meaning}`;
    })
    .join(" ");
}
