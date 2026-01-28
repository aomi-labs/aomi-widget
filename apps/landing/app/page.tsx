import { Hero } from "./sections/hero";
import { Technology } from "./sections/technology";
import { Solution } from "./sections/solution";
import { Resources } from "./sections/resources";
import { LandingEffects } from "./landing-effects";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#1c1917] text-stone-200 antialiased selection:bg-stone-500/30 selection:text-white">
      <div
        className="pointer-events-none fixed top-0 z-0 h-screen w-full bg-cover bg-center"
        style={{ backgroundImage: 'url("/assets/hero-bg.jpg")' }}
      ></div>
      <div
        id="bg-dim"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0)",
          backdropFilter: "blur(0px)",
        }}
      ></div>
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-slate-900/40"></div>
      <main
        id="top"
        className="relative z-10 flex min-h-screen w-full flex-col"
      >
        <Hero />
        <Technology />
        <Solution />
        <Resources />
      </main>
      <LandingEffects />
    </div>
  );
}
