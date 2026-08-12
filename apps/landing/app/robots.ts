import type { MetadataRoute } from "next";

const SITE = "https://aomi.dev";

const AGENT_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Applebot",
  "CCBot",
  "Bytespider",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AGENT_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: [`${SITE}/sitemap.xml`, `${SITE}/docs/sitemap.xml`],
    host: SITE,
  };
}
