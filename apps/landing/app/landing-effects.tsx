"use client";

import { useEffect } from "react";

export function LandingEffects() {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const elements = Array.from(document.querySelectorAll(".js-animate"));
    const dimmer = document.getElementById("bg-dim");

    const updateDimmer = () => {
      if (!dimmer) return;
      const maxScroll = Math.max(
        300,
        document.body.scrollHeight - window.innerHeight,
      );
      const progress = Math.min(1, window.scrollY / maxScroll);
      const opacity = 0.45 * progress;
      const blur = 10 * progress;
      dimmer.style.backgroundColor =
        "rgba(0, 0, 0, " + opacity.toFixed(3) + ")";
      dimmer.style.backdropFilter = "blur(" + blur.toFixed(2) + "px)";
    };

    updateDimmer();
    window.addEventListener("scroll", updateDimmer, { passive: true });
    window.addEventListener("resize", updateDimmer);

    if (prefersReduced) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return () => {
        window.removeEventListener("scroll", updateDimmer);
        window.removeEventListener("resize", updateDimmer);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
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

    return () => {
      window.removeEventListener("scroll", updateDimmer);
      window.removeEventListener("resize", updateDimmer);
      observer.disconnect();
    };
  }, []);

  return null;
}
