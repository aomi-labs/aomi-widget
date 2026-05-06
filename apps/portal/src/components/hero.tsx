"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { AomiFrame } from "./aomi-frame";

export const Hero = () => {
  return (
    <div className="h-screen w-full bg-background overflow-hidden relative">
      {/* Settings Button - Top Right */}
      <Link
        href="/settings"
        className="fixed top-4 right-4 z-50 p-2 text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white transition-colors focus:outline-none"
        aria-label="Open settings"
      >
        <Settings className="w-5 h-5" />
      </Link>

      {/* Full-Screen Chat Container */}
      <AomiFrame.Root height="100%" width="100%" walletPosition="footer">
        <AomiFrame.Header />
        <AomiFrame.Composer withControl/>
      </AomiFrame.Root>
    </div>
  );
};
