import type { Metadata } from "next";
import { FaqSection } from "./sections/faq";
import { FooterSection } from "./sections/footer";
import { V2Hero } from "./sections/hero";
import { InstallSection } from "./sections/install";
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
    "A hosted solution for blockchain automation. Clients bring APIs, we bring the harness that execute across protocols and blockchains. Build, simulate, sign, broadcast. Wallets stays with users.",
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
