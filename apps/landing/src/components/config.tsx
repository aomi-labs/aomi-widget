import type { AppKitNetwork } from "@reown/appkit-common";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
} from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Enable localhost/Anvil network for E2E testing with `pnpm --filter landing dev:localhost`
const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";

// Custom localhost network for Anvil (local testing)
const localhost = {
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
} as const satisfies AppKitNetwork;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = useLocalhost
  ? [localhost, mainnet, arbitrum, optimism, base, polygon]
  : [mainnet, arbitrum, optimism, base, polygon];

// Keep AppKit network gating aligned with wagmi adapter networks.
const appKitNetworks = networks;

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
});

export const appKitProviderConfig = {
  adapters: [wagmiAdapter],
  projectId,
  networks: appKitNetworks,
  defaultNetwork: useLocalhost ? localhost : mainnet,
  metadata: {
    name: "aomi-widget-docs",
    description: "Aomi widget docs demo",
    url: "https://appkitexampleapp.com", // origin must match your domain & subdomain
    icons: ["https://avatars.githubusercontent.com/u/179229932"],
  },
  features: { analytics: !useLocalhost },
};
