// For Mintlify iframe embed — zero chrome, bare PlaygroundConfigurator
// Supports ?embed=true param for compact iframe layout

import { PlaygroundConfigurator } from "@/content/components/playground/PlaygroundConfigurator";

export const metadata = {
  title: "Playground — Aomi",
  description: "Interactively configure the AomiFrame widget and copy the generated code.",
  robots: { index: false },
};

export default async function EmbedPlaygroundPage(props: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const { embed } = await props.searchParams;
  const isEmbed = embed === "true";

  return (
    <div
      style={
        isEmbed
          ? { width: "100%", minHeight: "80vh", background: "#0f0f0f" }
          : { width: "100vw", height: "100vh", overflow: "auto", background: "#0f0f0f" }
      }
    >
      <PlaygroundConfigurator forceEmbed={isEmbed} />
    </div>
  );
}
