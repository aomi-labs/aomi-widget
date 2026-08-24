"use client";

import { Component, type ReactNode } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { LandingWalletKitProvider } from "../components/landing-wallet-kit-provider";
import styles from "./hero.module.css";

const DEMO_BACKEND_URL = "/";

class DemoErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[520px] w-full flex-col items-center justify-center gap-2 bg-white/10 px-6 text-center">
          <p className="font-geist text-sm font-medium text-white">
            Demo failed to load
          </p>
          <p className="font-geist max-w-md text-xs text-white/70">
            {this.state.error.message || "Unknown error"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Lazy-loaded so compiling `/` does not block the rest of the dev server. */
export function LegacyHumanDemo() {
  return (
    <DemoErrorBoundary>
      <LandingWalletKitProvider>
        <AomiFrame.Root
          height="100%"
          width="100%"
          className={`${styles.demoFrame} aui-suggestions-marquee`}
          defaultSidebarOpen={false}
          walletPosition="footer"
          walletFamilies={["evm", "solana"]}
          backendUrl={DEMO_BACKEND_URL}
        >
          <AomiFrame.Header />
          <AomiFrame.Composer
            withControl
            welcomeTitle="What should happen on-chain?"
            controlBarProps={{ hideApiKey: true, hideNetwork: false }}
          />
        </AomiFrame.Root>
      </LandingWalletKitProvider>
    </DemoErrorBoundary>
  );
}
