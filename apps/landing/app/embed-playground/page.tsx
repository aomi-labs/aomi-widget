// For Mintlify iframe embed — zero chrome, bare PlaygroundConfigurator

import { PlaygroundConfigurator } from "@/content/components/playground/PlaygroundConfigurator";

export const metadata = {
  title: "Playground — Aomi",
  description: "Interactively configure the AomiFrame widget and copy the generated code.",
  robots: { index: false },
};

export default function EmbedPlaygroundPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "auto", background: "#0f0f0f" }}>
      <PlaygroundConfigurator />
    </div>
  );
}
