import { Aomi } from "@aomi-labs/client";

const baseUrl = process.env.AOMI_BASE_URL?.trim() || "http://localhost:3000";

// Guest mode can inspect the guest-safe Pipeline catalog without an OAuth
// client. Executing protected operations requires the appropriate authority.
const aomi = new Aomi({ baseUrl });
const [apps, skills] = await Promise.all([
  aomi.raw.pipeline.apps.list(),
  aomi.raw.pipeline.skills.list(),
]);

console.log(`Guest-visible Pipeline apps: ${apps.entries.length}`);
console.log(`Guest-visible Pipeline skills: ${skills.entries.length}`);
