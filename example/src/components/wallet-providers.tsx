"use client"

import { AppKitProvider } from "@reown/appkit/react"
import { Config, WagmiProvider, cookieToInitialState } from "wagmi"
import React, { type ReactNode } from 'react'
import { initializeAppKit } from "@aomi-labs/widget-lib"

import { appKitProviderConfig, wagmiAdapter } from "@/components/config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

initializeAppKit(appKitProviderConfig)


function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <AppKitProvider {...appKitProviderConfig}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  )
}

console.log("</AppKitProvider>")

export default ContextProvider
