import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aomi",
  description: "Aomi",
  other: {
    "base:app_id": "6a0087769ee68cd142d1b06c",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="aomi-browser-compat" strategy="beforeInteractive">
          {`
            (() => {
              const makeUUID = () => {
                const bytes = new Uint8Array(16);
                if (globalThis.crypto?.getRandomValues) {
                  globalThis.crypto.getRandomValues(bytes);
                } else {
                  for (let i = 0; i < bytes.length; i += 1) {
                    bytes[i] = Math.floor(Math.random() * 256);
                  }
                }
                bytes[6] = (bytes[6] & 0x0f) | 0x40;
                bytes[8] = (bytes[8] & 0x3f) | 0x80;
                const hex = Array.from(bytes, (byte) =>
                  byte.toString(16).padStart(2, "0"),
                );
                return (
                  hex.slice(0, 4).join("") +
                  "-" +
                  hex.slice(4, 6).join("") +
                  "-" +
                  hex.slice(6, 8).join("") +
                  "-" +
                  hex.slice(8, 10).join("") +
                  "-" +
                  hex.slice(10, 16).join("")
                );
              };

              try {
                if (!globalThis.crypto) {
                  Object.defineProperty(globalThis, "crypto", {
                    value: { randomUUID: makeUUID },
                    configurable: true,
                  });
                } else if (typeof globalThis.crypto.randomUUID !== "function") {
                  Object.defineProperty(globalThis.crypto, "randomUUID", {
                    value: makeUUID,
                    configurable: true,
                  });
                }
              } catch {
                // Ignore locked-down browser globals.
              }

              const unsupportedWalletConnect = (error) => {
                const message = String(
                  error?.shortMessage || error?.message || error?.details || error || "",
                );
                return (
                  error?.code === 4200 ||
                  error?.code === -32601 ||
                  /wallet_connect.*(not supported|unsupported)/i.test(message) ||
                  /method.*(not supported|unsupported|not found)/i.test(message)
                );
              };

              const hasRequestedCapabilities = (params) => {
                const first = Array.isArray(params) ? params[0] : params;
                const capabilities = first?.capabilities;
                return (
                  capabilities &&
                  typeof capabilities === "object" &&
                  Object.keys(capabilities).length > 0
                );
              };

              const normalizeChainId = (chainId) => {
                if (typeof chainId === "number") return "0x" + chainId.toString(16);
                if (typeof chainId === "string" && chainId.startsWith("0x")) {
                  return chainId;
                }
                if (typeof chainId === "string" && chainId) {
                  const parsed = Number(chainId);
                  if (Number.isFinite(parsed)) return "0x" + parsed.toString(16);
                }
                return "0x1";
              };

              const patchEthereumProvider = (provider) => {
                if (!provider?.request || provider.__aomiWalletConnectPatched) return;
                const originalRequest = provider.request.bind(provider);
                Object.defineProperty(provider, "__aomiWalletConnectPatched", {
                  value: true,
                  configurable: true,
                });
                provider.request = async (args) => {
                  if (
                    args?.method !== "wallet_connect" ||
                    !provider.isCoinbaseBrowser ||
                    hasRequestedCapabilities(args.params)
                  ) {
                    return originalRequest(args);
                  }

                  try {
                    return await originalRequest(args);
                  } catch (error) {
                    if (!unsupportedWalletConnect(error)) throw error;
                    const accounts = await originalRequest({
                      method: "eth_requestAccounts",
                    });
                    const chainId = await originalRequest({
                      method: "eth_chainId",
                    }).catch(() => "0x1");
                    return {
                      accounts: (accounts || []).map((address) => ({
                        address,
                        capabilities: {},
                      })),
                      chainIds: [normalizeChainId(chainId)],
                    };
                  }
                };
              };

              const patchInjectedProviders = () => {
                try {
                  patchEthereumProvider(globalThis.ethereum);
                } catch {}
                try {
                  if (globalThis.top && globalThis.top !== globalThis) {
                    patchEthereumProvider(globalThis.top.ethereum);
                  }
                } catch {}
              };

              patchInjectedProviders();
              globalThis.addEventListener?.("ethereum#initialized", patchInjectedProviders);
              let attempts = 0;
              const timer = globalThis.setInterval?.(() => {
                attempts += 1;
                patchInjectedProviders();
                if (attempts >= 20) globalThis.clearInterval?.(timer);
              }, 250);
            })();
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
