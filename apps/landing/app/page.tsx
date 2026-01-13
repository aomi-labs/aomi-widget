import { Hero } from "./sections/hero";
import { Technology } from "./sections/technology";
import { Solution } from "./sections/solution";
import { Resources } from "./sections/resources";

export default function HomePage() {
  return (
    <div className="antialiased min-h-screen overflow-x-hidden selection:bg-stone-500/30 selection:text-white text-stone-200 relative bg-[#1c1917]">
      <div
        className="fixed top-0 w-full h-screen bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: "url(\"/assets/hero-bg.jpg\")" }}
      ></div>
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-slate-900/40"></div>
      <main id="top" className="flex flex-col min-h-screen z-10 w-full relative">
        <Hero />
        <Technology />
        <Solution />
        <Resources />
      </main>
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const elements = Array.from(document.querySelectorAll(".js-animate"));
  if (prefersReduced) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = el.getAttribute("data-delay");
        if (delay) {
          el.style.transitionDelay = delay + "ms";
        }
        el.classList.add("is-visible");
        observer.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
  );
  elements.forEach((el) => observer.observe(el));
})();`,
        }}
      />
    </div>
  );
}
