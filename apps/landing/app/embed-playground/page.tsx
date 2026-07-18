// For Mintlify iframe embed — zero chrome, bare PlaygroundConfigurator
// Supports ?embed=true param for compact iframe layout
// Theme follows system prefers-color-scheme via CSS light-dark()

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
      className="embed-playground-root"
      style={
        isEmbed
          ? { width: "100%", minHeight: "80vh" }
          : { width: "100vw", height: "100vh", overflow: "auto" }
      }
    >
      <PlaygroundConfigurator forceEmbed={isEmbed} />
      <style>{`
        .embed-playground-root {
          color-scheme: light dark;
          background: light-dark(oklch(0.985 0 0), #0f0f0f);
          --background: light-dark(oklch(1 0 0), oklch(0.141 0.005 285.823));
          --foreground: light-dark(oklch(0.141 0.005 285.823), oklch(0.985 0 0));
          --card: light-dark(oklch(1 0 0), oklch(0.21 0.006 285.885));
          --card-foreground: light-dark(oklch(0.141 0.005 285.823), oklch(0.985 0 0));
          --popover: light-dark(oklch(1 0 0), oklch(0.21 0.006 285.885));
          --popover-foreground: light-dark(oklch(0.141 0.005 285.823), oklch(0.985 0 0));
          --primary: light-dark(oklch(0.21 0.006 285.885), oklch(0.92 0.004 286.32));
          --primary-foreground: light-dark(oklch(0.985 0 0), oklch(0.21 0.006 285.885));
          --secondary: light-dark(oklch(0.967 0.001 286.375), oklch(0.274 0.006 286.033));
          --secondary-foreground: light-dark(oklch(0.21 0.006 285.885), oklch(0.985 0 0));
          --muted: light-dark(oklch(0.967 0.001 286.375), oklch(0.274 0.006 286.033));
          --muted-foreground: light-dark(oklch(0.552 0.016 285.938), oklch(0.705 0.015 286.067));
          --accent: light-dark(oklch(0.967 0.001 286.375), oklch(0.274 0.006 286.033));
          --accent-foreground: light-dark(oklch(0.21 0.006 285.885), oklch(0.985 0 0));
          --destructive: light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216));
          --border: light-dark(oklch(0.92 0.004 286.32), oklch(1 0 0 / 10%));
          --input: light-dark(oklch(0.92 0.004 286.32), oklch(0.6 0 0 / 15%));
          --ring: light-dark(oklch(0.705 0.015 286.067), oklch(0.552 0.016 285.938));
          --radius: 0.625rem;
        }
      `}</style>
    </div>
  );
}
