import { Hero } from "./sections/hero";
import { Technology } from "./sections/technology";
import { Solution } from "./sections/solution";
import { Resources } from "./sections/resources";
import { LandingEffects } from "./landing-effects";

export default function HomePage() {
  return (
    <div className="antialiased min-h-screen overflow-x-hidden selection:bg-stone-500/30 selection:text-white text-stone-200 relative bg-[#1c1917]">
      <div
        className="fixed top-0 w-full h-screen bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: "url(\"/assets/hero-bg.jpg\")" }}
      ></div>
      <div
        id="bg-dim"
        className="fixed inset-0 pointer-events-none bg-black/30 opacity-0"
        style={{ backdropFilter: "blur(0px)" }}
      ></div>
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-slate-900/40"></div>
      <main id="top" className="flex flex-col min-h-screen z-10 w-full relative">
        <Hero />
        <Technology />
        <Solution />
        <Resources />
      </main>
      <LandingEffects />
    </div>
  );
}
