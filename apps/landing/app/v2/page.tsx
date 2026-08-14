import type { Metadata } from "next";
import { FaqSection } from "./sections/faq";
import { FooterSection } from "./sections/footer";
import { V2Hero } from "./sections/hero";
import { InstallSection } from "./sections/install";
import { V2Nav } from "./sections/nav";
import { CaseStudySection } from "./sections/case-study";
import { PatternSection } from "./sections/pattern";
import { PipelineSection } from "./sections/pipeline";
import { RuntimeSection } from "./sections/runtime";
import { SectorSection } from "./sections/sector";
import { SurfacesSection } from "./sections/surfaces";
import { WhySection } from "./sections/why";

export const metadata: Metadata = {
  title: "Aomi: Execution infrastructure (preview)",
  description:
    "You bring the API. We bring the harness. Build, simulate, sign, broadcast. Keys stay with users.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Visitors × v3 redesign preview.
 * Live homepage remains at `/` until cutover.
 */
export default function LandingV2Page() {
  return (
    <>
      <V2Nav />
      <main>
        <V2Hero />
        <WhySection />
        <PatternSection />
        <CaseStudySection />
        <PipelineSection />
        <RuntimeSection />
        <SurfacesSection />
        <InstallSection />
        <SectorSection />
        <FaqSection />
        <FooterSection />
      </main>
    </>
  );
}
